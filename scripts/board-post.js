#!/usr/bin/env node
/**
 * board-post.js — Post to RFC Board, CHANGELOG, or Think Tank
 * Usage:
 *   node scripts/board-post.js --type rfc       --topic "ชื่อ" --body "รายละเอียด" [--notify gemini,codex]
 *   node scripts/board-post.js --type changelog  --agent claude --message "อัปเดตอะไร"
 *   node scripts/board-post.js --type opinion    --rfc RFC-id --agent gemini --body "ความเห็น"
 *   node scripts/board-post.js --type close-rfc  --rfc RFC-id --decision "approved|rejected" --reason "..."
 *   node scripts/board-post.js --type think-tank --topic "หัวข้อ" --body "context" [--notify gemini,codex]
 *   node scripts/board-post.js --type thought    --tt TT-id --agent gemini --body "ความคิด"
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BASE = path.resolve(__dirname, '..');
const RFC_DIR = path.join(BASE, 'wiki', 'ai-war-room', 'RFC');
const TT_DIR  = path.join(BASE, 'wiki', 'ai-war-room', 'think-tank');
const CHANGELOG = path.join(BASE, 'wiki', 'ai-war-room', 'CHANGELOG.md');

const args = process.argv.slice(2);
const get = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };

const type = get('--type');
const agent = get('--agent') || 'claude';

function nowICT() {
  return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok' }).replace('T', ' ').slice(0, 16) + ' ICT';
}

function dateSlug() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' });
}

function toSlug(text) {
  return text
    .toLowerCase()
    .replace(/[ก-๙]/g, '')          // ลบภาษาไทย
    .replace(/[^a-z0-9]+/g, '-')    // แทนที่ non-alphanumeric ด้วย -
    .replace(/^-+|-+$/g, '')        // ลบ - หัวท้าย
    .slice(0, 40) || 'topic';
}

// ── RFC: สร้าง proposal ใหม่ ─────────────────────────────────────────────────
if (type === 'rfc') {
  const topic = get('--topic');
  const body = get('--body') || '';
  const notify = get('--notify') || '';
  if (!topic) { console.error('--topic required'); process.exit(1); }

  const slug = toSlug(topic);
  const id = `RFC-${dateSlug()}-${slug}`;
  const file = path.join(RFC_DIR, `${id}.md`);

  const content = [
    `---`,
    `id: ${id}`,
    `status: open`,
    `author: ${agent}`,
    `created: ${nowICT()}`,
    `topic: ${topic}`,
    `---`,
    ``,
    `# RFC: ${topic}`,
    ``,
    `## Proposal`,
    body,
    ``,
    `---`,
    ``,
    `## Opinions`,
    ``,
    `<!-- AI แต่ละตัว append [OPINION:name] ต่อท้าย -->`,
    ``,
    `---`,
    ``,
    `## Decision`,
    `status: open`,
    `decision: (pending)`,
  ].join('\n');

  fs.writeFileSync(file, content, 'utf8');
  console.log(`[RFC] Created: ${path.basename(file)}`);

  // trigger ทีมที่ระบุ
  if (notify) {
    notify.split(',').forEach(ai => {
      ai = ai.trim().toLowerCase();
      if (!['gemini', 'codex', 'claude'].includes(ai)) return;
      try {
        execSync(`node "${path.join(__dirname, 'trigger-ai.js')}" --from ${agent} --to ${ai} --task "${id}" --priority normal --instruction "มี RFC ใหม่รอความเห็น RFC ID: ${id} อ่านที่ wiki/ai-war-room/RFC/${id}.md แล้วเขียนความเห็นของคุณ watcher จะ auto-append ให้เอง เมื่อเสร็จ trigger กลับ ${agent}"`, { cwd: BASE, stdio: 'inherit' });
      } catch (e) { console.error(`trigger ${ai} failed: ${e.message}`); }
    });
  }
}

// ── OPINION: เพิ่มความเห็นใน RFC ────────────────────────────────────────────
else if (type === 'opinion') {
  const rfcId = get('--rfc');
  const body = get('--body') || '';
  if (!rfcId) { console.error('--rfc required'); process.exit(1); }

  const file = path.join(RFC_DIR, `${rfcId}.md`);
  if (!fs.existsSync(file)) { console.error(`RFC not found: ${file}`); process.exit(1); }

  const opinion = `\n### [OPINION:${agent}] ${nowICT()}\n${body}\n`;
  const content = fs.readFileSync(file, 'utf8');
  const updated = content.replace('<!-- AI แต่ละตัว append [OPINION:name] ต่อท้าย -->', `<!-- AI แต่ละตัว append [OPINION:name] ต่อท้าย -->${opinion}`);
  fs.writeFileSync(file, updated, 'utf8');
  console.log(`[RFC] Opinion added to ${rfcId}`);
}

// ── CLOSE RFC ────────────────────────────────────────────────────────────────
else if (type === 'close-rfc') {
  const rfcId = get('--rfc');
  const decision = get('--decision') || 'approved';
  const reason = get('--reason') || '';
  if (!rfcId) { console.error('--rfc required'); process.exit(1); }

  const file = path.join(RFC_DIR, `${rfcId}.md`);
  if (!fs.existsSync(file)) { console.error(`RFC not found: ${file}`); process.exit(1); }

  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/^status: open|^status: voting/m, `status: ${decision}`);
  content = content.replace(/^decision: \(pending\)/m, `decision: ${reason}`);
  fs.writeFileSync(file, content, 'utf8');
  console.log(`[RFC] Closed as ${decision}: ${rfcId}`);
}

// ── CHANGELOG: append entry ──────────────────────────────────────────────────
else if (type === 'changelog') {
  const message = get('--message') || '';
  if (!message) { console.error('--message required'); process.exit(1); }

  const entry = `\n## ${nowICT()} — [${agent}] ${message}\n`;
  const content = fs.existsSync(CHANGELOG) ? fs.readFileSync(CHANGELOG, 'utf8') : '# AI War Room — System Changelog\n\n---\n';
  const insertAt = content.indexOf('\n---\n') + 5;
  const updated = content.slice(0, insertAt) + entry + content.slice(insertAt);
  fs.writeFileSync(CHANGELOG, updated, 'utf8');
  console.log(`[CHANGELOG] Appended: ${message}`);
}

// ── THINK-TANK: สร้าง thread ใหม่ ────────────────────────────────────────────
else if (type === 'think-tank') {
  const topic = get('--topic');
  const body  = get('--body') || '';
  const notify = get('--notify') || '';
  if (!topic) { console.error('--topic required'); process.exit(1); }

  const slug = toSlug(topic);
  const id   = `TT-${dateSlug()}-${slug}`;
  const file = path.join(TT_DIR, `${id}.md`);
  fs.mkdirSync(TT_DIR, { recursive: true });

  const content = [
    `---`, `id: ${id}`, `status: open`, `author: ${agent}`,
    `created: ${nowICT()}`, `topic: ${topic}`, `---`, ``,
    `# Think Tank: ${topic}`, ``,
    `> ห้องถกแบบ free-form — ไม่ต้องมี conclusion ก็ได้`, ``,
    `## Context`, body, ``, `---`, ``, `## Thoughts`, ``,
    `<!-- AI แต่ละตัว append [THOUGHT:name] ต่อท้าย -->`, ``,
    `### [THOUGHT:${agent}] ${nowICT()}`, `(เริ่มต้น thread)`, ``,
  ].join('\n');

  fs.writeFileSync(file, content, 'utf8');
  console.log(`[THINK-TANK] Created: ${path.basename(file)}`);

  // item 6: บันทึก deadline 30 นาที ใน session status
  const deadlineFile = path.join(TT_DIR, `${id}-deadline.json`);
  fs.writeFileSync(deadlineFile, JSON.stringify({
    id, created: new Date().toISOString(),
    deadline: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    notified: false,
  }, null, 2), 'utf8');

  if (notify) {
    notify.split(',').forEach(ai => {
      ai = ai.trim().toLowerCase();
      if (!['gemini', 'codex', 'claude'].includes(ai)) return;
      try {
        // trigger กลับหา creator (agent) ไม่ใช่ claude เสมอ
        execSync(`node "${path.join(__dirname, 'trigger-ai.js')}" --from ${agent} --to ${ai} --task "${id}" --priority normal --instruction "มี Think Tank thread ใหม่ topic: ${topic} อ่านที่ wiki/ai-war-room/think-tank/${id}.md แล้วเพิ่มความคิดเห็นต่อท้าย Thoughts section ด้วย tag [THOUGHT:${ai}] เมื่อเสร็จ trigger กลับ ${agent} พร้อม [TRIGGER:${agent}] TT-done: ${id}"`, { cwd: BASE, stdio: 'inherit' });
      } catch (e) { console.error(`trigger ${ai} failed: ${e.message}`); }
    });
  }
}

// ── THOUGHT: เพิ่มความคิดใน Think Tank ──────────────────────────────────────
else if (type === 'thought') {
  const ttId = get('--tt');
  const body  = get('--body') || '';
  if (!ttId) { console.error('--tt required'); process.exit(1); }

  const file = path.join(TT_DIR, `${ttId}.md`);
  if (!fs.existsSync(file)) { console.error(`Think Tank not found: ${file}`); process.exit(1); }

  const thought = `\n### [THOUGHT:${agent}] ${nowICT()}\n${body}\n`;
  const c = fs.readFileSync(file, 'utf8');
  const updated = c.replace('<!-- AI แต่ละตัว append [THOUGHT:name] ต่อท้าย -->', `<!-- AI แต่ละตัว append [THOUGHT:name] ต่อท้าย -->${thought}`);
  fs.writeFileSync(file, updated, 'utf8');
  console.log(`[THINK-TANK] Thought added to ${ttId}`);
}

else {
  console.log(`Usage:
  --type rfc        --topic "..." --body "..." [--notify gemini,codex] [--agent claude]
  --type opinion    --rfc RFC-id --body "..." [--agent gemini]
  --type close-rfc  --rfc RFC-id --decision approved|rejected --reason "..."
  --type think-tank --topic "..." --body "context" [--notify gemini,codex]
  --type thought    --tt TT-id --body "ความคิด" [--agent gemini]
  --type changelog  --message "สิ่งที่อัปเดต" [--agent claude]`);
}
