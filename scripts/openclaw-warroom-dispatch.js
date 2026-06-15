#!/usr/bin/env node
/**
 * OpenClaw War Room Dispatcher
 *
 * Creates model-specific task packets inside a War Room session and triggers
 * real model CLIs through the existing OpenClaw file queue.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SESSION_ROOT = path.join(ROOT, 'wiki', 'ai-war-room', 'sessions');
const TRIGGER = path.join(ROOT, 'scripts', 'trigger-ai.js');

const args = process.argv.slice(2);

function getArg(name, fallback = null) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
}

function hasFlag(name) {
  return args.includes(`--${name}`);
}

function fail(message) {
  console.error(message);
  console.error('Usage: node scripts/openclaw-warroom-dispatch.js --task TASK_ID --phase 3 [--dry-run]');
  process.exit(1);
}

const taskId = getArg('task');
const phase = getArg('phase', '3');
const dryRun = hasFlag('dry-run');

if (!taskId) fail('Missing --task');
if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(taskId)) fail('Invalid task id');

const sessionDir = path.join(SESSION_ROOT, taskId);
if (!fs.existsSync(sessionDir)) fail(`Session not found: ${sessionDir}`);

const dispatchDir = path.join(sessionDir, 'openclaw-dispatch');
fs.mkdirSync(dispatchDir, { recursive: true });

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

function readMaybe(file, limit = 4000) {
  try {
    const content = fs.readFileSync(path.join(sessionDir, file), 'utf8');
    return content.length > limit ? content.slice(0, limit) + '\n...[truncated]' : content;
  } catch {
    return '';
  }
}

function writePacket(name, body) {
  const file = path.join(dispatchDir, name);
  fs.writeFileSync(file, body.trim() + '\n', 'utf8');
  return file;
}

function trigger(to, packetFile, priority = 'normal') {
  const childTask = `${taskId}-p${phase}-${to}`.slice(0, 80);
  const instruction = `Read ${rel(packetFile)} and answer the requested deliverable only.`;
  const cmd = [
    TRIGGER,
    '--from', 'codex',
    '--to', to,
    '--task', childTask,
    '--priority', priority,
    '--max-hops', '1',
    '--instruction', instruction,
  ];

  if (dryRun) {
    console.log(`[DRY] node ${cmd.map(x => JSON.stringify(x)).join(' ')}`);
    return;
  }

  const result = spawnSync(process.execPath, cmd, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  process.stdout.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  if (result.status !== 0) process.exitCode = result.status;
}

const phase1 = readMaybe('phase-1-conflict-map.md');
const phase2State = readMaybe('phase-2-payment-state-machine.md');
const phase2Brief = readMaybe('phase-2-meeting-brief.md');
const phase2Wording = readMaybe('phase-2-safe-wording.md');

const sharedHeader = `
# OpenClaw Dispatch Packet

War Room task: ${taskId}
Phase: ${phase}
Created: ${new Date().toISOString()}

## Non-Negotiable Rules
- Work in your assigned model/persona mask.
- Do not claim final legal/tax compliance.
- Do not edit files unless explicitly asked by the packet.
- Return concise output with confidence labels.
- End with \`FINAL:\` if complete, or one \`[TRIGGER:codex]\` line if Codex must integrate.

## Context Summary
Jong Jaroen needs a low-cost payment operations system for community service jobs. Current safe direction is neutral ledger + evidence + payout queue + human approval, supporting central PromptPay, Direct P2P fallback, or future PSP.
`;

const claudePacket = writePacket('CLAUDE-PHASE3-LEGAL-ACCOUNTING-REVIEW.md', `
${sharedHeader}

## Model Mask
Claude / Kitti Lawyer + Pim Accounting + Kom Risk

## Your Deliverable
Review the Phase 2 payment state machine for legal/accounting/risk gaps before Codex turns it into a technical blueprint.

## Questions To Answer
1. What fields are mandatory for legal/accounting evidence?
2. What states are risky or need rename before public/internal use?
3. What payout controls are missing?
4. What reports must exist for monthly close and audit?
5. What no-go conditions should block Phase 4 implementation?

## Evidence
### Phase 1 Conflict Map
${phase1}

### Phase 2 State Machine
${phase2State}

### Phase 2 Meeting Brief
${phase2Brief}
`);

const geminiPacket = writePacket('GEMINI-PHASE3-VENDOR-TECH-REVIEW.md', `
${sharedHeader}

## Model Mask
Gemini / Ferin Procurement + Mira Market Intel + Phattama Finance

## Your Deliverable
Review the technical blueprint direction from a bank/vendor/cost perspective before Codex implements schema and admin ops.

## Questions To Answer
1. What table/API design keeps manual PromptPay, bulk payout, bank API, and PSP compatible?
2. What fields are needed for bank statement reconciliation and payout batch export?
3. What cost dashboard metrics should exist from day one?
4. Which parts should stay configurable instead of hard-coded?
5. What vendor/bank questions remain before implementation?

## Evidence
### Phase 1 Conflict Map
${phase1}

### Phase 2 State Machine
${phase2State}

### Phase 2 Safe Wording
${phase2Wording}
`);

const indexFile = writePacket('README.md', `
# OpenClaw Dispatch - Phase ${phase}

Created: ${new Date().toISOString()}

## Packets
- ${rel(claudePacket)}
- ${rel(geminiPacket)}

## Triggered Targets
- Claude: legal/accounting/risk review
- Gemini: vendor/bank/cost technical review

## Integration Rule
Codex reads model outputs from:
- wiki/ai-war-room/sessions/${taskId}-p${phase}-claude/claude-output.md
- wiki/ai-war-room/sessions/${taskId}-p${phase}-gemini/gemini-output.md

Then Codex integrates Phase ${phase} technical blueprint in the main session.
`);

console.log(`[DISPATCH] packets written: ${rel(indexFile)}`);
// The watcher is sequential, so send the usually faster research target first.
trigger('gemini', geminiPacket, 'urgent');
trigger('claude', claudePacket, 'urgent');
