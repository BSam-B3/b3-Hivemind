#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SESSIONS = path.join(ROOT, 'wiki', 'ai-war-room', 'sessions');
const OUT = path.join(ROOT, 'wiki', 'context', 'auto-lessons.md');

function read(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch { return ''; }
}

function readJson(file) {
  try { return JSON.parse(read(file).replace(/^\uFEFF/, '')); } catch { return null; }
}

function main() {
  const lessons = [];
  if (fs.existsSync(SESSIONS)) {
    for (const entry of fs.readdirSync(SESSIONS, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const dir = path.join(SESSIONS, entry.name);
      const status = readJson(path.join(dir, 'session-status.json'));
      const compact = read(path.join(dir, 'compact-summary.md'));
      if (!status && !compact) continue;

      if (status?.status === 'handoff_required') {
        lessons.push(`- ${entry.name}: handoff required due to ${status.reason || 'unknown reason'}; next action ${status.nextAction || 'review'}.`);
      } else if (status?.status === 'done') {
        lessons.push(`- ${entry.name}: completed by ${status.lastAgent || 'unknown agent'}; keep compact summary for fast review.`);
      }

      if (compact.toLowerCase().includes('inaccessible')) {
        lessons.push(`- ${entry.name}: source inaccessible; record access status explicitly and avoid guessing.`);
      }
    }
  }

  const body = [
    '---',
    'type: reference',
    'project: b3-second-brain',
    'status: active',
    'owner: Codex',
    'source: lesson-extractor',
    `created: ${new Date().toISOString().slice(0, 10)}`,
    `last_reviewed: ${new Date().toISOString().slice(0, 10)}`,
    'confidence: medium',
    '---',
    '',
    '# Auto Lessons',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    ...(lessons.length ? lessons : ['- No session lessons found yet.']),
    '',
  ].join('\n');

  fs.writeFileSync(OUT, body, 'utf8');
  console.log(`Lessons written: ${path.relative(ROOT, OUT).replace(/\\/g, '/')}`);
}

main();

