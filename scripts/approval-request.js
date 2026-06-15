#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'wiki', 'ai-war-room', 'approvals');
const args = process.argv.slice(2);

function getArg(name) {
  const index = args.indexOf(`--${name}`);
  return index !== -1 ? args[index + 1] : null;
}

function fail(message) {
  console.error(message);
  console.error('Usage: node scripts/approval-request.js --task TASK_ID --action "..." --risk read|write|danger --reason "..."');
  process.exit(1);
}

const task = getArg('task');
const action = getArg('action');
const risk = getArg('risk') || 'danger';
const reason = getArg('reason') || '';

if (!task || !action) fail('Missing --task or --action.');
if (!['read', 'write', 'danger'].includes(risk)) fail('Invalid --risk.');

fs.mkdirSync(OUT_DIR, { recursive: true });
const file = path.join(OUT_DIR, `${Date.now()}-${task}.md`);
const body = [
  '---',
  'type: approval-request',
  'project: b3-second-brain',
  'status: pending',
  'owner: B3',
  'source: openclaw',
  `created: ${new Date().toISOString().slice(0, 10)}`,
  'confidence: high',
  '---',
  '',
  `# Approval Request - ${task}`,
  '',
  `**Risk:** ${risk}`,
  `**Action:** ${action}`,
  `**Reason:** ${reason || '(not provided)'}`,
  `**Time:** ${new Date().toISOString()}`,
  '',
  '## B3 Decision',
  '',
  '- [ ] Approved',
  '- [ ] Rejected',
  '- [ ] Needs changes',
  '',
].join('\n');

fs.writeFileSync(file, body, 'utf8');
console.log(`Approval request written: ${path.relative(ROOT, file).replace(/\\/g, '/')}`);

