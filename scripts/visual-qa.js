#!/usr/bin/env node
/**
 * visual-qa.js — Gemini Visual QA Gate
 * Browse a live URL and get design audit before merge
 *
 * Usage:
 *   node scripts/visual-qa.js --url https://example.vercel.app/page
 *   node scripts/visual-qa.js --url https://... --ref https://shopee.co.th/mall --task my-task
 *   npm run visual-qa -- --url https://...
 */

const fs      = require('fs');
const path    = require('path');
const { execSync } = require('child_process');

const ROOT         = path.resolve(__dirname, '..');
const TRIGGERS_DIR = path.join(ROOT, 'wiki', 'ai-war-room', 'triggers');
const TO_B3        = path.join(ROOT, 'wiki', 'to-b3');

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : null;
}

const url     = arg('url');
const ref     = arg('ref') || '';
const taskArg = arg('task');

if (!url) {
  console.error('Usage: node scripts/visual-qa.js --url <live-url> [--ref <reference-url>] [--task <id>]');
  process.exit(1);
}

const ts     = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
const taskId = taskArg || `visual-qa-${ts}`;
const returnFile = path.join(TO_B3, `GEMINI-RETURN-${taskId}.md`);

// ── Check watcher running ────────────────────────────────────────────────────
const pidFile = path.join(TRIGGERS_DIR, 'watcher.pid');
let watcherRunning = false;
if (fs.existsSync(pidFile)) {
  try {
    const raw = JSON.parse(fs.readFileSync(pidFile, 'utf8'));
    const pid = Number(raw.pid || raw);
    process.kill(pid, 0);
    watcherRunning = true;
  } catch {}
}

if (!watcherRunning) {
  console.error('❌ OpenClaw Watcher ไม่ได้รัน — รัน: npm run openclaw:start ก่อน');
  process.exit(1);
}

// ── Build instruction ────────────────────────────────────────────────────────
const refSection = ref
  ? `\nเทียบกับ reference: ${ref} — ระบุความแตกต่างที่เห็นได้ชัด`
  : '';

const instruction = `Visual QA Audit task ${taskId}:

1. Browse URL: ${url}
2. อธิบาย UI ที่เห็น: layout, สี, component หลัก, ปัญหาที่เห็นได้ชัด${refSection}
3. ให้คะแนน UX 1-10 พร้อมเหตุผล
4. ระบุ top 3 ปัญหาที่ต้องแก้ก่อน
5. เขียน spec แก้ไขที่ Codex implement ได้เลย (ระบุ file + code change)

เขียนผลลง: wiki/to-b3/GEMINI-RETURN-${taskId}.md
Format ตาม RETURN file template ใน GEMINI.md
แล้ว trigger กลับ claude: node scripts/trigger-ai.js --from gemini --to claude --task ${taskId} --instruction "[DONE] Visual QA เสร็จ ผลอยู่ที่ wiki/to-b3/GEMINI-RETURN-${taskId}.md"`;

// ── Trigger Gemini ───────────────────────────────────────────────────────────
try {
  execSync(
    `node scripts/trigger-ai.js --from claude --to gemini --task ${taskId} --priority urgent --instruction "${instruction.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`,
    { cwd: ROOT, stdio: 'inherit' }
  );
  console.log(`\n✅ Visual QA triggered → Gemini`);
  console.log(`   Task:   ${taskId}`);
  console.log(`   URL:    ${url}`);
  console.log(`   Return: ${returnFile}`);
  console.log('\nรอผลกลับมา session หน้า (hook จะแจ้ง 📬 GEMINI RETURN)\n');
} catch (e) {
  console.error('❌ Trigger failed:', e.message);
  process.exit(1);
}
