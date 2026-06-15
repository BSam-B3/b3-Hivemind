#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const TRIGGERS_DIR = path.join(ROOT, 'wiki', 'ai-war-room', 'triggers');
const SESSIONS_DIR = path.join(ROOT, 'wiki', 'ai-war-room', 'sessions');
const REPORT_FILE = path.join(ROOT, 'wiki', 'context', 'openclaw-health-latest.md');
const WATCHER = path.join(ROOT, 'scripts', 'openclaw-trigger-watcher.js');

const writeReport = process.argv.includes('--write-report');
const lines = [];

function line(text = '') {
  lines.push(text);
  console.log(text);
}

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

function run(command) {
  try {
    return childProcess.execSync(command, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) {
    return error.stdout?.toString() || error.stderr?.toString() || '';
  }
}

function findWatcherProcesses() {
  if (process.platform === 'win32') {
    const out = run('powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like \'*openclaw-trigger-watcher.js*\' } | Select-Object ProcessId,ExecutablePath,CommandLine | ConvertTo-Json -Compress"');
    if (!out.trim()) return [];
    try {
      const parsed = JSON.parse(out);
      const rows = Array.isArray(parsed) ? parsed : [parsed];
      return rows.filter((row) => {
        const command = String(row.CommandLine || '').toLowerCase();
        const executable = String(row.ExecutablePath || '').toLowerCase();
        return executable.endsWith('node.exe') && command.includes('scripts/openclaw-trigger-watcher.js');
      });
    } catch {
      return [];
    }
  }
  return run("ps -eo pid,args | grep openclaw-trigger-watcher.js | grep -v grep")
    .split('\n')
    .filter(Boolean)
    .map((row) => ({ ProcessId: row.trim().split(/\s+/)[0], CommandLine: row.trim() }));
}

function listFiles(dir, filter) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(filter)
    .map((entry) => path.join(dir, entry.name));
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  } catch {
    return null;
  }
}

function main() {
  line('# OpenClaw Doctor');
  line(`Generated: ${new Date().toISOString()}`);

  line('\n## Watcher');
  const watchers = findWatcherProcesses();
  if (watchers.length === 0) line('WARN watcher not running');
  for (const proc of watchers) line(`OK watcher PID ${proc.ProcessId}: ${proc.CommandLine}`);
  line(`Watcher file: ${rel(WATCHER)}`);

  line('\n## Triggers');
  const pending = listFiles(TRIGGERS_DIR, (entry) => entry.isFile() && entry.name.endsWith('.json') && !entry.name.startsWith('_'));
  const prompts = listFiles(TRIGGERS_DIR, (entry) => entry.isFile() && entry.name.startsWith('_prompt-') && entry.name.endsWith('.txt'));
  const inboxes = listFiles(TRIGGERS_DIR, (entry) => entry.isFile() && entry.name.startsWith('INBOX-'));
  line(`Pending triggers: ${pending.length}`);
  pending.slice(0, 10).forEach((file) => line(`- ${rel(file)}`));
  line(`Prompt temp files: ${prompts.length}`);
  prompts.slice(0, 10).forEach((file) => line(`- ${rel(file)} (${Math.round((Date.now() - fs.statSync(file).mtimeMs) / 60000)} min old)`));
  line(`Inbox files: ${inboxes.length}`);

  line('\n## Sessions');
  const sessions = listFiles(SESSIONS_DIR, (entry) => entry.isDirectory());
  const statuses = sessions
    .map((dir) => ({ dir, status: readJson(path.join(dir, 'session-status.json')) }))
    .filter((item) => item.status);
  const failed = statuses.filter((item) => ['handoff_required', 'failed'].includes(item.status.status));
  line(`Sessions: ${sessions.length}`);
  line(`Sessions with status: ${statuses.length}`);
  line(`Need attention: ${failed.length}`);
  failed.slice(0, 10).forEach((item) => line(`- ${path.basename(item.dir)}: ${item.status.reason || item.status.status} -> ${item.status.nextAction || 'review'}`));

  line('\n## Recommended Next Action');
  if (watchers.length > 1) line('Multiple watcher-like processes detected. Confirm before restart.');
  else if (watchers.length === 1) line('Watcher is running. Restart only when no trigger is mid-flight so v3 code is loaded.');
  else line('Start watcher with npm run openclaw:start after checking pending triggers.');
  if (prompts.length) line('Review stale _prompt-*.txt files before cleanup.');
  if (failed.length) line('Run npm run trigger:recover -- TASK_ID for handoff_required sessions.');

  if (writeReport) {
    const report = [
      '---',
      'type: project-status',
      'project: b3-second-brain',
      'status: active',
      'owner: Codex',
      'source: openclaw-doctor',
      `created: ${new Date().toISOString().slice(0, 10)}`,
      `last_reviewed: ${new Date().toISOString().slice(0, 10)}`,
      'confidence: high',
      '---',
      '',
      ...lines,
      '',
    ].join('\n');
    fs.mkdirSync(path.dirname(REPORT_FILE), { recursive: true });
    fs.writeFileSync(REPORT_FILE, report, 'utf8');
    line(`\nReport written: ${rel(REPORT_FILE)}`);
  }
}

main();
