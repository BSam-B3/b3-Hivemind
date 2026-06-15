#!/usr/bin/env node
/**
 * claude-inbox-poller.js
 * รันผ่าน Windows Task Scheduler ทุก 10 นาที
 * ถ้ามี INBOX-CLAUDE-*.md → spawn claude -p รับงานอัตโนมัติ
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const TRIGGERS = path.join(ROOT, 'wiki', 'ai-war-room', 'triggers');
const LOG = path.join(TRIGGERS, 'poller.log');

function log(msg) {
  const ts = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok' }).replace('T', ' ');
  const line = `[${ts} ICT] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG, line + '\n', 'utf8'); } catch {}
}

function getInboxFiles() {
  if (!fs.existsSync(TRIGGERS)) return [];
  return fs.readdirSync(TRIGGERS)
    .filter(f => f.startsWith('INBOX-CLAUDE-') && f.endsWith('.md'))
    .map(f => path.join(TRIGGERS, f));
}

function readInstruction(file) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const m = content.match(/## Instruction\n([\s\S]*?)(?:\n---|$)/);
    return m ? m[1].trim() : null;
  } catch { return null; }
}

function isComplex(instruction) {
  if (!instruction) return false;
  if (instruction.length > 500) return true;
  const patterns = [
    /\band\b.*\band\b/i,
    /แล้ว.*แล้ว/,
    /(implement|design|build|create|setup).*(implement|design|build|create|setup)/i,
    /(frontend|backend|database|api|ui|migration).*(frontend|backend|database|api|ui|migration)/i,
  ];
  return patterns.some(p => p.test(instruction));
}

const inboxFiles = getInboxFiles();

if (inboxFiles.length === 0) {
  log('[POLL] ไม่มี INBOX — ข้าม');
  process.exit(0);
}

log(`[POLL] พบ ${inboxFiles.length} INBOX รอรับงาน`);

let processed = 0;
for (const file of inboxFiles) {
  const instruction = readInstruction(file);
  if (!instruction) continue;

  if (isComplex(instruction)) {
    log(`[SKIP] ${path.basename(file)} — งานซับซ้อนเกิน รอ B3 session`);
    continue;
  }

  log(`[RUN] claude -p "${instruction.slice(0, 80)}..."`);

  const prompt = `คุณกำลังทำงาน autonomous ผ่าน OpenClaw inbox poller\nINBOX: ${path.basename(file)}\n\n${instruction}\n\nหลังทำเสร็จ ให้ลบไฟล์ ${file} แล้วจบด้วย FINAL: หรือ [TRIGGER:*]`;

  const result = spawnSync('claude', ['-p', prompt, '--dangerously-skip-permissions'], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 300000,
  });

  if (result.status === 0 && result.stdout?.trim()) {
    log(`[DONE] ${path.basename(file)} — claude ตอบแล้ว`);
    // ลบ INBOX หลังรับงานสำเร็จ
    try { fs.unlinkSync(file); } catch {}
    processed++;
  } else {
    log(`[FAIL] ${path.basename(file)} — claude ไม่ตอบ หรือ timeout`);
  }
}

log(`[POLL] เสร็จ — processed ${processed}/${inboxFiles.length}`);
