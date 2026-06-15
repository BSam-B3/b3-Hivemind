#!/usr/bin/env node

/**
 * Manual recovery trigger for failed AI handoffs.
 * Usage:
 *   node scripts/trigger-recover.js TASK_ID [--to claude|gemini|codex]
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SESSIONS_DIR = path.join(ROOT, 'wiki', 'ai-war-room', 'sessions');
const TRIGGER = path.join(ROOT, 'scripts', 'trigger-ai.js');
const VALID_AIS = ['claude', 'gemini', 'codex'];
const args = process.argv.slice(2);

function getArg(name) {
  const index = args.indexOf(`--${name}`);
  return index !== -1 ? args[index + 1] : null;
}

function fail(message) {
  console.error(message);
  console.error('Usage: node scripts/trigger-recover.js TASK_ID [--to claude|gemini|codex]');
  process.exit(1);
}

const taskId = args.find((arg) => !arg.startsWith('--'));
const to = String(getArg('to') || 'claude').toLowerCase();
if (!taskId) fail('Missing TASK_ID.');
if (!VALID_AIS.includes(to)) fail(`Invalid --to. Must be one of: ${VALID_AIS.join(', ')}`);

const sessionDir = path.join(SESSIONS_DIR, taskId);
const statusFile = path.join(sessionDir, 'session-status.json');
const handoffFile = path.join(sessionDir, 'handoff.md');

if (!fs.existsSync(sessionDir)) fail(`Session not found: ${sessionDir}`);

let status = {};
try {
  if (fs.existsSync(statusFile)) status = JSON.parse(fs.readFileSync(statusFile, 'utf8').replace(/^\uFEFF/, ''));
} catch {}

const instruction = [
  `Manual recovery for task ${taskId}.`,
  `Read the session folder: ${sessionDir.replace(/\\/g, '/')}`,
  fs.existsSync(handoffFile) ? `Start with handoff file: ${handoffFile.replace(/\\/g, '/')}` : 'No handoff.md found; inspect available output files.',
  '',
  'Goal:',
  '- Continue from the failed point if safe.',
  '- If production/core rules/database/security are involved, ask B3 before changes.',
  '- Do not auto-trigger another AI. Produce a clear next action.',
  '',
  `Last known status: ${JSON.stringify(status)}`,
].join('\n');

const result = spawnSync(process.execPath, [
  TRIGGER,
  '--from', 'system',
  '--to', to,
  '--task', `${taskId}-RECOVERY`,
  '--instruction', instruction,
  '--priority', 'normal',
  '--max-hops', '0',
], {
  cwd: ROOT,
  encoding: 'utf8',
  shell: false,
});

process.stdout.write(result.stdout || '');
process.stderr.write(result.stderr || '');
process.exit(result.status ?? 0);
