#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'wiki', 'to-b3', 'DAILY-DIGEST.md');
const TEAM_DASHBOARD = path.join(ROOT, 'wiki', 'context', 'team-health-dashboard.md');
const OPENCLAW = path.join(ROOT, 'wiki', 'context', 'openclaw-health-latest.md');
const BRAIN = path.join(ROOT, 'wiki', 'context', 'brain-health-latest.md');

function run(command) {
  try {
    return childProcess.execSync(command, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch (error) {
    return (error.stdout?.toString() || error.stderr?.toString() || error.message).trim();
  }
}

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

function section(file, title) {
  if (!fs.existsSync(file)) return `## ${title}\n\nNo report yet.\n`;
  const text = fs.readFileSync(file, 'utf8');
  const result = text.match(/## Result[\s\S]*?(?=\n## |$)/);
  const summary = text.match(/## Summary[\s\S]*?(?=\n## |$)/);
  return [`## ${title}`, '', (result || summary || [text.split('\n').slice(0, 20).join('\n')])[0].trim(), ''].join('\n');
}

function main() {
  run('node scripts/brain-doctor.js --write-report');
  run('node scripts/openclaw-doctor.js --write-report');
  run('node scripts/session-scorecard.js');
  run('node scripts/lesson-extractor.js');
  run('node scripts/team-health-dashboard.js');
  const warStatus = run('node scripts/war-room.js status');

  const body = [
    '---',
    'type: project-status',
    'project: b3-second-brain',
    'status: active',
    'owner: Codex',
    'source: team-daily-digest',
    `created: ${new Date().toISOString().slice(0, 10)}`,
    `last_reviewed: ${new Date().toISOString().slice(0, 10)}`,
    'confidence: high',
    '---',
    '',
    '# Daily Digest',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Result',
    '',
    `- Team dashboard: ${rel(TEAM_DASHBOARD)}`,
    `- Brain health: ${rel(BRAIN)}`,
    `- OpenClaw health: ${rel(OPENCLAW)}`,
    '- War room status refreshed below.',
    '',
    section(TEAM_DASHBOARD, 'Team Health'),
    '## War Room',
    '',
    '```text',
    warStatus || '(no output)',
    '```',
    '',
    '## Next Action',
    '',
    '- Review Attention section in team dashboard.',
    '- Use `npm run trigger:recover -- TASK_ID` for any handoff_required task.',
    '- Keep durable knowledge writes behind synthesis when research comes from another AI.',
    '',
  ].join('\n');

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, body, 'utf8');
  console.log(`Daily digest written: ${rel(OUT)}`);
}

main();
