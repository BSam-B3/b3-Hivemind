#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'wiki', 'context', 'team-health-dashboard.md');
const BRAIN = path.join(ROOT, 'wiki', 'context', 'brain-health-latest.md');
const OPENCLAW = path.join(ROOT, 'wiki', 'context', 'openclaw-health-latest.md');
const TRIGGERS = path.join(ROOT, 'wiki', 'ai-war-room', 'triggers');
const SESSIONS = path.join(ROOT, 'wiki', 'ai-war-room', 'sessions');
const SCORECARD = path.join(ROOT, 'wiki', 'context', 'post-run-scorecard.md');
const LESSONS = path.join(ROOT, 'wiki', 'context', 'auto-lessons.md');

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

function run(cmd) {
  try {
    return childProcess.execSync(cmd, { cwd: ROOT, encoding: 'utf8' });
  } catch {
    return '';
  }
}

function countPendingTriggers() {
  if (!fs.existsSync(TRIGGERS)) return 0;
  return fs.readdirSync(TRIGGERS).filter((file) => file.endsWith('.json') && !file.startsWith('_')).length;
}

function sessionStatuses() {
  if (!fs.existsSync(SESSIONS)) return [];
  return fs.readdirSync(SESSIONS, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(SESSIONS, entry.name, 'session-status.json'))
    .filter((file) => fs.existsSync(file))
    .map((file) => {
      try { return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')); } catch { return null; }
    })
    .filter(Boolean);
}

function extractSummary(file) {
  if (!fs.existsSync(file)) return 'No report yet.';
  const text = fs.readFileSync(file, 'utf8');
  const match = text.match(/## Summary[\s\S]*?(?=\n## |\nReport written:|$)/);
  return (match ? match[0] : text.split('\n').slice(0, 20).join('\n')).trim();
}

function main() {
  run('node scripts/brain-doctor.js --write-report');
  run('node scripts/openclaw-doctor.js --write-report');
  run('node scripts/session-scorecard.js');
  run('node scripts/lesson-extractor.js');

  const statuses = sessionStatuses();
  const attention = statuses.filter((status) => ['handoff_required', 'failed'].includes(status.status));
  const pending = countPendingTriggers();

  const body = [
    '---',
    'type: project-status',
    'project: b3-second-brain',
    'status: active',
    'owner: Codex',
    'source: team-health-dashboard',
    `created: ${new Date().toISOString().slice(0, 10)}`,
    `last_reviewed: ${new Date().toISOString().slice(0, 10)}`,
    'confidence: high',
    '---',
    '',
    '# Team Health Dashboard',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Result',
    '',
    `- Pending triggers: ${pending}`,
    `- Sessions with watchdog status: ${statuses.length}`,
    `- Sessions needing attention: ${attention.length}`,
    `- Brain report: ${rel(BRAIN)}`,
    `- OpenClaw report: ${rel(OPENCLAW)}`,
    `- Scorecard: ${rel(SCORECARD)}`,
    `- Lessons: ${rel(LESSONS)}`,
    '',
    '## Attention',
    '',
    ...(attention.length ? attention.slice(0, 10).map((status) => `- ${status.taskId}: ${status.reason || status.status} -> ${status.nextAction || 'review'}`) : ['- None']),
    '',
    '## Brain Summary',
    '',
    extractSummary(BRAIN),
    '',
    '## OpenClaw Summary',
    '',
    extractSummary(OPENCLAW),
    '',
    '## Scorecard',
    '',
    fs.existsSync(SCORECARD) ? fs.readFileSync(SCORECARD, 'utf8').split('\n').slice(10, 20).join('\n') : 'No scorecard yet.',
    '',
    '## Lessons',
    '',
    fs.existsSync(LESSONS) ? fs.readFileSync(LESSONS, 'utf8').split('\n').slice(10, 24).join('\n') : 'No lessons yet.',
    '',
    '## Next Actions',
    '',
    '- Restart OpenClaw watcher when no trigger is mid-flight so v3 guardrails are loaded.',
    '- Run the first live Gemini link test with maxHops 0 after restart.',
    '- Use recovery command for any handoff_required session.',
    '',
    '```bash',
    'npm run openclaw:doctor:report',
    'npm run brain:doctor:report',
    'npm run trigger:recover -- TASK_ID',
    '```',
    '',
  ].join('\n');

  fs.writeFileSync(OUT, body, 'utf8');
  console.log(`Team dashboard written: ${rel(OUT)}`);
}

main();
