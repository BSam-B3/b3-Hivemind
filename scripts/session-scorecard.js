#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SESSIONS = path.join(ROOT, 'wiki', 'ai-war-room', 'sessions');
const OUT = path.join(ROOT, 'wiki', 'context', 'post-run-scorecard.md');

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')); } catch { return null; }
}

function score(status) {
  let value = 100;
  if (status.status === 'handoff_required') value -= 30;
  if (status.status === 'failed') value -= 50;
  if (status.reason) value -= 10;
  if ((status.hopCount || 0) > 1) value -= 5;
  return Math.max(0, value);
}

function main() {
  const rows = [];
  if (fs.existsSync(SESSIONS)) {
    for (const entry of fs.readdirSync(SESSIONS, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const status = readJson(path.join(SESSIONS, entry.name, 'session-status.json'));
      if (!status) continue;
      rows.push({
        taskId: status.taskId || entry.name,
        status: status.status || 'unknown',
        lastAgent: status.lastAgent || '',
        reason: status.reason || '',
        nextAction: status.nextAction || '',
        score: score(status),
      });
    }
  }

  const body = [
    '---',
    'type: project-status',
    'project: b3-second-brain',
    'status: active',
    'owner: Codex',
    'source: session-scorecard',
    `created: ${new Date().toISOString().slice(0, 10)}`,
    `last_reviewed: ${new Date().toISOString().slice(0, 10)}`,
    'confidence: medium',
    '---',
    '',
    '# Post-Run Scorecard',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '| Task | Score | Status | Agent | Reason | Next Action |',
    '|---|---:|---|---|---|---|',
    ...(rows.length ? rows.map((row) => `| ${row.taskId} | ${row.score} | ${row.status} | ${row.lastAgent} | ${row.reason || '-'} | ${row.nextAction || '-'} |`) : ['| - | - | - | - | - | - |']),
    '',
  ].join('\n');

  fs.writeFileSync(OUT, body, 'utf8');
  console.log(`Scorecard written: ${path.relative(ROOT, OUT).replace(/\\/g, '/')}`);
}

main();

