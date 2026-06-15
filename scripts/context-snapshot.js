#!/usr/bin/env node
/**
 * context-snapshot.js — B3 Persistent Session Context
 *
 * เขียน/อ่าน session state กลางที่ทุก AI (Claude/Codex/Gemini) ใช้ร่วมกัน
 * ทำให้ทุก session ตื่นมารู้สถานะทันที ไม่ต้องอ่านไฟล์กระจาย
 *
 * Usage:
 *   node scripts/context-snapshot.js write          ← เขียน snapshot ตอนปิด session
 *   node scripts/context-snapshot.js read           ← แสดง snapshot สั้นๆ ตอนเปิด session
 *   node scripts/context-snapshot.js update-field key value  ← แก้ field เดียว
 */

const fs   = require('fs');
const path = require('path');

const ROOT     = path.join(__dirname, '..');
const OUT_FILE = path.join(ROOT, 'wiki', 'ai-war-room', 'context-snapshot.json');

// ─── helpers ──────────────────────────────────────────────────────────────────

function readJson(file, fallback = null) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return fallback; }
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function ictNow() {
  return new Date(Date.now() + 7 * 3600000).toISOString().replace('T', ' ').slice(0, 19) + ' ICT';
}

// ─── collectors ───────────────────────────────────────────────────────────────

function collectActiveTasks() {
  const board = readJson(path.join(ROOT, 'wiki', 'ai-war-room', 'board.json'), { tasks: [] });
  return (board.tasks || [])
    .filter(t => t.status && t.status !== 'done')
    .map(t => ({ id: t.id, status: t.status, owner: t.owner || t.agent, title: t.title || t.description || '' }))
    .slice(0, 10);
}

function collectRecentLessons() {
  const file = path.join(ROOT, 'wiki', 'ai-war-room', 'lessons.md');
  if (!fs.existsSync(file)) return [];
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  // Grab last 5 "Lesson:" lines
  return lines
    .filter(l => l.startsWith('Lesson:') || l.match(/^## 20/))
    .slice(-10)
    .map(l => l.trim())
    .filter(Boolean);
}

function collectHotFiles() {
  // Files touched in the last 24h via git
  const { spawnSync } = require('child_process');
  const r = spawnSync('git', ['diff', '--name-only', 'HEAD~5', 'HEAD'], {
    cwd: ROOT, encoding: 'utf8', shell: false,
  });
  if (r.status !== 0) return [];
  return [...new Set((r.stdout || '').split('\n').filter(Boolean))].slice(0, 15);
}

function collectOpenInbox() {
  const inboxDir = path.join(ROOT, 'wiki', 'ai-war-room', 'triggers');
  if (!fs.existsSync(inboxDir)) return [];
  return fs.readdirSync(inboxDir)
    .filter(f => f.startsWith('INBOX-') && f.endsWith('.md'))
    .map(f => f.replace('INBOX-', '').replace('.md', '').toLowerCase());
}

function collectRoutingStats() {
  const runsFile = path.join(ROOT, 'wiki', 'monitoring', 'local-ai-runs.jsonl');
  if (!fs.existsSync(runsFile)) return {};
  const lines = fs.readFileSync(runsFile, 'utf8').trim().split('\n').filter(Boolean);
  const recent = lines.slice(-50).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  const total = recent.length;
  const ok    = recent.filter(r => r.status === 'ok').length;
  return { local_runs_last50: total, local_success_rate: total ? Math.round((ok / total) * 100) : 0 };
}

// ─── commands ─────────────────────────────────────────────────────────────────

function cmdWrite() {
  const existing = readJson(OUT_FILE, {});

  const snapshot = {
    version: '1.0',
    last_updated: ictNow(),
    active_tasks:    collectActiveTasks(),
    open_inbox:      collectOpenInbox(),
    recent_lessons:  collectRecentLessons(),
    hot_files:       collectHotFiles(),
    routing_stats:   collectRoutingStats(),
    // Preserve manually set fields from previous snapshot
    pending_for_next_session: existing.pending_for_next_session || [],
    decisions:               existing.decisions               || [],
    notes:                   existing.notes                   || {},
  };

  writeJson(OUT_FILE, snapshot);
  console.log(`[context-snapshot] Written → ${OUT_FILE}`);
  console.log(`  active_tasks: ${snapshot.active_tasks.length}`);
  console.log(`  hot_files:    ${snapshot.hot_files.length}`);
  console.log(`  open_inbox:   ${snapshot.open_inbox.join(', ') || 'none'}`);
}

function cmdRead() {
  const s = readJson(OUT_FILE);
  if (!s) {
    console.log('[context-snapshot] No snapshot found. Run: node scripts/context-snapshot.js write');
    return;
  }

  console.log(`\n📸 CONTEXT SNAPSHOT — ${s.last_updated}`);
  console.log('─'.repeat(60));

  if (s.open_inbox?.length) {
    console.log(`\n🔴 INBOX PENDING: ${s.open_inbox.map(a => a.toUpperCase()).join(', ')}`);
  }

  if (s.active_tasks?.length) {
    console.log('\n📋 Active Tasks:');
    s.active_tasks.forEach(t => console.log(`  [${t.status}] ${t.id} — ${t.title}`));
  }

  if (s.hot_files?.length) {
    console.log('\n🔥 Hot Files (last 5 commits):');
    s.hot_files.slice(0, 8).forEach(f => console.log(`  ${f}`));
  }

  if (s.recent_lessons?.length) {
    console.log('\n🧠 Recent Lessons:');
    s.recent_lessons.slice(-3).forEach(l => console.log(`  ${l}`));
  }

  if (s.pending_for_next_session?.length) {
    console.log('\n⏭️  Pending for next session:');
    s.pending_for_next_session.forEach(p => console.log(`  • ${p}`));
  }

  if (s.routing_stats?.local_runs_last50) {
    const r = s.routing_stats;
    console.log(`\n⚙️  Local AI: ${r.local_success_rate}% success (last ${r.local_runs_last50} runs)`);
  }

  console.log('─'.repeat(60) + '\n');
}

function cmdUpdateField(key, value) {
  const s = readJson(OUT_FILE, {});
  // Support dot notation: pending_for_next_session.push or simple key
  if (key === 'pending_for_next_session.push') {
    s.pending_for_next_session = [...(s.pending_for_next_session || []), value];
  } else if (key === 'decisions.push') {
    s.decisions = [...(s.decisions || []), value];
  } else {
    s[key] = value;
  }
  s.last_updated = ictNow();
  writeJson(OUT_FILE, s);
  console.log(`[context-snapshot] Updated ${key}`);
}

// ─── main ─────────────────────────────────────────────────────────────────────

const [,, cmd, ...rest] = process.argv;

if (cmd === 'write')        cmdWrite();
else if (cmd === 'read')    cmdRead();
else if (cmd === 'update-field') cmdUpdateField(rest[0], rest.slice(1).join(' '));
else {
  console.log('Usage:');
  console.log('  node scripts/context-snapshot.js write');
  console.log('  node scripts/context-snapshot.js read');
  console.log('  node scripts/context-snapshot.js update-field pending_for_next_session.push "งานค้าง"');
  console.log('  node scripts/context-snapshot.js update-field decisions.push "ใช้ createBrowserClient แทน createClient"');
}
