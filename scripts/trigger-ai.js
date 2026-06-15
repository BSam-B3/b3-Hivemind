#!/usr/bin/env node

/**
 * Universal AI Trigger CLI
 * Usage:
 *   node scripts/trigger-ai.js --from claude --to gemini --task TASK001 --instruction "Do X"
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TRIGGERS_DIR = path.join(ROOT, 'wiki', 'ai-war-room', 'triggers');
const VALID_AIS = ['claude', 'gemini', 'codex', 'local'];
const VALID_SENDERS = ['system', ...VALID_AIS];
const SAFE_TASK_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;
const MAX_INSTRUCTION_CHARS = 12000;

const { classify } = require('./complexity-router');

const args = process.argv.slice(2);

function getArg(name) {
  const index = args.indexOf(`--${name}`);
  return index !== -1 ? args[index + 1] : null;
}

function fail(message) {
  console.error(message);
  console.error('Usage: node scripts/trigger-ai.js --from <ai> --to <ai> --task <id> --instruction "<text>" [--context "<text>"] [--priority urgent|normal|low] [--max-hops 0..5]');
  process.exit(1);
}

const from = String(getArg('from') || '').toLowerCase();
let to = String(getArg('to') || '').toLowerCase();
const taskId = getArg('task') || `TRIGGER-${Date.now()}`;
const instruction = getArg('instruction') || '';
const context = getArg('context') || '';
const priority = getArg('priority') || 'normal';
const maxHopsRaw = getArg('max-hops');
const maxHops = maxHopsRaw == null ? 2 : Number(maxHopsRaw);
const runId = getArg('run-id') || `run-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 8)}`;

if (!from || !to || !instruction) fail('Missing required --from, --to, or --instruction.');

// Dynamic AI routing check
if (to === 'ai') {
  const complexity = classify(instruction);
  if (complexity === 'local') {
    to = 'local';
    console.log(`[ROUTE-DECISION] Auto-routing generic 'ai' to 'local' (free model) based on summary/thai keywords`);
  } else if (complexity === 'premium') {
    to = 'claude';
    console.log(`[ROUTE-DECISION] Auto-routing generic 'ai' to 'claude' (premium tier) for DB/API/complex tasks`);
  } else {
    to = 'codex';
    console.log(`[ROUTE-DECISION] Auto-routing generic 'ai' to 'codex' (mid tier) for coding/UI tasks`);
  }
}

if (!VALID_SENDERS.includes(from)) fail(`Invalid sender. Must be one of: ${VALID_SENDERS.join(', ')}`);
if (!VALID_AIS.includes(to)) fail(`Invalid target AI. Must be one of: ${VALID_AIS.join(', ')} (use 'local' for free CPU models via One API)`);
if (to === 'local' && !getArg('local-model')) {
  console.warn('[WARN] --local-model not specified. Will auto-route: coding→qwen2.5-coder:3b, other→qwen2.5:3b');
}
if (!SAFE_TASK_ID.test(taskId)) fail('Invalid task id. Use 1-80 chars: letters, numbers, dot, underscore, hyphen. Must start with a letter or number.');
if (!['normal', 'urgent', 'low'].includes(priority)) fail('Invalid priority. Must be one of: normal, urgent, low.');
if (!Number.isInteger(maxHops) || maxHops < 0 || maxHops > 5) fail('Invalid --max-hops. Must be an integer from 0 to 5.');
if (instruction.length > MAX_INSTRUCTION_CHARS) fail(`Instruction too large. Limit: ${MAX_INSTRUCTION_CHARS} characters.`);
if (to === 'local' && instruction.length > 300) {
  console.warn(`[WARN] Local AI instruction is ${instruction.length} chars (>300). Local models work best with short, focused prompts. Consider shortening or routing to claude/codex instead.`);
}

// ── Atomic task enforcement — hard block สำหรับทุก AI (item 5) ──────────────
if (['claude', 'codex', 'gemini'].includes(to)) {
  const NON_ATOMIC_PATTERNS = [
    /\band\b.*\band\b/i,
    /แล้ว.*แล้ว/,
    /\b(implement|design|build|create|setup)\b.*\b(implement|design|build|create|setup)\b/i,
    /(frontend|backend|database|api|ui|migration).*(frontend|backend|database|api|ui|migration)/i,
    /ทั้ง.*(และ|กับ|พร้อม)/,
  ];
  const tooLong = instruction.length > 600;
  const hasMultipleVerbs = NON_ATOMIC_PATTERNS.some(p => p.test(instruction));
  if (tooLong || hasMultipleVerbs) {
    console.error(`[BLOCKED] instruction ไม่ atomic — Claude จะ timeout`);
    console.error(`[BLOCKED] กฎ: 1 trigger = 1 งาน`);
    console.error(`[BLOCKED] ตัวอย่างถูก: "write SQL migration for agent_handoffs table"`);
    console.error(`[BLOCKED] ตัวอย่างผิด: "implement backend and design UI and push"`);
    console.error(`[TIP] ใช้ --force เพื่อ bypass (เฉพาะกรณีจำเป็น)`);
    if (!args.includes('--force')) process.exit(1);
    console.warn(`[WARN] --force: bypassing atomic check`);
  }
}

const localModel = getArg('local-model') || null;
const payload = {
  from,
  to,
  taskId,
  instruction,
  context,
  priority,
  runId,
  hopCount: 0,
  maxHops,
  createdAt: new Date().toISOString(),
  ...(to === 'local' && { localModel }),
};

if (args.includes('--dry-run')) {
  console.log(`\n[DRY RUN] Simulation mode active. No files will be written.`);
  console.log(`[DRY RUN] Target: ${to}`);
  console.log(`[DRY RUN] Task ID: ${taskId}`);
  console.log(`[DRY RUN] Payload Size: ~${JSON.stringify(payload).length} bytes`);
  console.log(`[DRY RUN] Instruction Preview: ${instruction.slice(0, 100)}...`);
  console.log(`[DRY RUN] Would write to: ${path.join(TRIGGERS_DIR, `${from}-to-${to}-${taskId}.json`)}\n`);
  process.exit(0);
}

if (!fs.existsSync(TRIGGERS_DIR)) fs.mkdirSync(TRIGGERS_DIR, { recursive: true });

const fileName = `${from}-to-${to}-${taskId}.json`;
const filePath = path.join(TRIGGERS_DIR, fileName);
fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');

console.log(`[TRIGGER] OK ${from} -> ${to} | Task: ${taskId} | Hops: 0/${maxHops}`);
console.log(`[FILE]    ${filePath}`);
console.log(`[STATUS]  Watcher will pick up and deliver to ${to}`);
