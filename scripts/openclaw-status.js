#!/usr/bin/env node
/**
 * openclaw-status.js
 * เช็กสถานะ OpenClaw Watcher + pending triggers + last activity
 * Usage: node scripts/openclaw-status.js [--json]
 */

const fs   = require('fs');
const path = require('path');

const ROOT         = path.resolve(__dirname, '..');
const TRIGGERS_DIR = path.join(ROOT, 'wiki', 'ai-war-room', 'triggers');
const PID_FILE     = path.join(TRIGGERS_DIR, 'watcher.pid');
const LOG_FILE     = path.join(TRIGGERS_DIR, 'watcher.log');
const DONE_DIR     = path.join(TRIGGERS_DIR, 'done');
const asJson       = process.argv.includes('--json');

function isAlive(pid) {
  try { process.kill(pid, 0); return true; } catch { return false; }
}

const result = {
  watcher:          { running: false, pid: null, uptime: null },
  pending_triggers: [],
  inbox:            { claude: false, gemini: false, codex: false },
  last_log:         null,
  done_count:       0,
};

// ── Watcher PID ─────────────────────────────────────────────────────────────
if (fs.existsSync(PID_FILE)) {
  try {
    const raw  = JSON.parse(fs.readFileSync(PID_FILE, 'utf8'));
    const pid  = Number(raw.pid || raw);
    const alive = isAlive(pid);
    result.watcher = {
      running: alive,
      pid,
      started: raw.started_at || null,
    };
  } catch { result.watcher.running = false; }
}

// ── Pending trigger files ────────────────────────────────────────────────────
if (fs.existsSync(TRIGGERS_DIR)) {
  fs.readdirSync(TRIGGERS_DIR)
    .filter(f => f.endsWith('.json') && !f.startsWith('watcher'))
    .forEach(f => {
      try {
        const t = JSON.parse(fs.readFileSync(path.join(TRIGGERS_DIR, f), 'utf8'));
        result.pending_triggers.push({
          file:     f,
          from:     t.from,
          to:       t.to,
          task:     t.taskId,
          priority: t.priority,
          created:  t.createdAt,
        });
      } catch {}
    });

  // INBOX files
  ['claude','gemini','codex'].forEach(ai => {
    result.inbox[ai] = fs.existsSync(path.join(TRIGGERS_DIR, `INBOX-${ai.toUpperCase()}.md`));
  });
}

// ── Last log line ────────────────────────────────────────────────────────────
if (fs.existsSync(LOG_FILE)) {
  const lines = fs.readFileSync(LOG_FILE, 'utf8').trim().split('\n');
  result.last_log = lines[lines.length - 1] || null;
}

// ── Done count ───────────────────────────────────────────────────────────────
if (fs.existsSync(DONE_DIR)) {
  result.done_count = fs.readdirSync(DONE_DIR).filter(f => f.endsWith('.json')).length;
}

// ── Output ───────────────────────────────────────────────────────────────────
if (asJson) {
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

const W = result.watcher;
const icon = W.running ? '🟢' : '🔴';
console.log(`\n${icon} OpenClaw Watcher: ${W.running ? `RUNNING (PID ${W.pid})` : 'NOT RUNNING'}`);
if (!W.running) {
  console.log('   ▶  npm run openclaw:start   ← รันก่อน trigger ทุกครั้ง');
}

if (result.pending_triggers.length > 0) {
  console.log(`\n📤 Pending triggers (${result.pending_triggers.length}):`);
  result.pending_triggers.forEach(t =>
    console.log(`   ${t.from} → ${t.to} | ${t.task} [${t.priority}]`)
  );
} else {
  console.log('\n📤 Pending triggers: none');
}

const inboxList = Object.entries(result.inbox).filter(([,v]) => v).map(([k]) => k.toUpperCase());
if (inboxList.length > 0) {
  console.log(`\n📬 INBOX waiting: ${inboxList.join(', ')}`);
}

console.log(`\n✅ Done triggers: ${result.done_count}`);
if (result.last_log) console.log(`📋 Last log: ${result.last_log}`);
console.log('');
