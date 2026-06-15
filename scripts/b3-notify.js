#!/usr/bin/env node
/**
 * b3-notify.js — ส่งสรุปภาษาไทยหา B3 ผ่าน Telegram
 * Usage:
 *   node scripts/b3-notify.js                    ← digest อัตโนมัติ
 *   node scripts/b3-notify.js --message "ข้อความ"  ← ส่งข้อความตรง
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const BASE = path.resolve(__dirname, '..');
const CHANGELOG = path.join(BASE, 'wiki', 'ai-war-room', 'CHANGELOG.md');
const RFC_DIR = path.join(BASE, 'wiki', 'ai-war-room', 'RFC');
const TRIGGERS = path.join(BASE, 'wiki', 'ai-war-room', 'triggers');
const BOARD = path.join(BASE, 'wiki', 'ai-war-room', 'board.json');
const ENV_FILE = path.join(BASE, '.env');

// ── Load env ──────────────────────────────────────────────────────────────────
function loadEnv() {
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    return { token: process.env.TELEGRAM_BOT_TOKEN, chatId: process.env.TELEGRAM_CHAT_ID };
  }
  // อ่านจาก b3-team-avenger/.env.local (เหมือน war-room.js)
  const candidates = [
    path.join(BASE, '..', 'b3-team-avenger', '.env.local'),
    path.join(BASE, '.env.local'),
    ENV_FILE,
  ];
  for (const envPath of candidates) {
    if (!fs.existsSync(envPath)) continue;
    const map = {};
    fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach(line => {
      const m = line.match(/^([A-Z_]+)=(.+)/);
      if (m) map[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '');
    });
    if (map.TELEGRAM_BOT_TOKEN && map.TELEGRAM_CHAT_ID) {
      return { token: map.TELEGRAM_BOT_TOKEN, chatId: map.TELEGRAM_CHAT_ID };
    }
  }
  return { token: '', chatId: '' };
}

// ── Send Telegram ─────────────────────────────────────────────────────────────
function sendTelegram(text) {
  const { token, chatId } = loadEnv();
  if (!token || !chatId) {
    console.error('[b3-notify] TELEGRAM_BOT_TOKEN หรือ TELEGRAM_CHAT_ID ไม่ได้ตั้งค่าใน .env');
    process.exit(1);
  }
  const body = JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' });
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${token}/sendMessage`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        const json = JSON.parse(data);
        if (json.ok) { console.log('[b3-notify] ส่ง Telegram สำเร็จ ✅'); resolve(); }
        else { console.error('[b3-notify] Telegram error:', json.description); reject(json.description); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Read CHANGELOG (24h) ──────────────────────────────────────────────────────
function recentChangelog(hours = 24) {
  if (!fs.existsSync(CHANGELOG)) return [];
  const content = fs.readFileSync(CHANGELOG, 'utf8');
  const entries = content.match(/^## .+/gm) || [];
  // เอาแค่ที่ระบุวันที่ในรูปแบบ YYYY-MM-DD
  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  return entries.filter(e => {
    const m = e.match(/(\d{4}-\d{2}-\d{2})/);
    if (!m) return false;
    return new Date(m[1]).getTime() >= cutoff - 86400000; // ยืดหยุ่น 1 วัน
  }).map(e => e.replace('## ', '').trim());
}

// ── Open RFCs ─────────────────────────────────────────────────────────────────
function openRFCs() {
  if (!fs.existsSync(RFC_DIR)) return [];
  return fs.readdirSync(RFC_DIR)
    .filter(f => f.endsWith('.md') && !f.startsWith('_'))
    .filter(f => {
      try {
        const c = fs.readFileSync(path.join(RFC_DIR, f), 'utf8');
        return c.includes('status: open') || c.includes('status: voting');
      } catch { return false; }
    })
    .map(f => {
      try {
        const c = fs.readFileSync(path.join(RFC_DIR, f), 'utf8');
        const topic = c.match(/^topic: (.+)/m);
        return topic ? topic[1].trim() : f.replace('.md', '');
      } catch { return f; }
    });
}

// ── Pending INBOX ─────────────────────────────────────────────────────────────
function pendingInbox() {
  if (!fs.existsSync(TRIGGERS)) return 0;
  return fs.readdirSync(TRIGGERS).filter(f => f.startsWith('INBOX-CLAUDE-') && f.endsWith('.md')).length;
}

// ── Active tasks ──────────────────────────────────────────────────────────────
function activeTasks() {
  try {
    const board = JSON.parse(fs.readFileSync(BOARD, 'utf8'));
    return (board.active_tasks || []).map(t => t.title || t.id);
  } catch { return []; }
}

// ── Build Thai summary ────────────────────────────────────────────────────────
function buildDigest() {
  const changes = recentChangelog(24);
  const rfcs = openRFCs();
  const inbox = pendingInbox();
  const tasks = activeTasks();
  const now = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'short', timeStyle: 'short' });

  const lines = [
    `🤖 <b>สรุปทีม AI — ${now}</b>`,
    '',
  ];

  if (changes.length > 0) {
    lines.push('📣 <b>อัปเดตระบบล่าสุด</b>');
    changes.slice(0, 5).forEach(c => lines.push(`  • ${c}`));
    lines.push('');
  }

  if (rfcs.length > 0) {
    lines.push(`💬 <b>RFC รอความเห็น (${rfcs.length})</b>`);
    rfcs.forEach(r => lines.push(`  • ${r}`));
    lines.push('');
  }

  if (tasks.length > 0) {
    lines.push(`⚙️ <b>งานที่กำลังทำ (${tasks.length})</b>`);
    tasks.slice(0, 5).forEach(t => lines.push(`  • ${t}`));
    lines.push('');
  }

  if (inbox > 0) {
    lines.push(`📬 <b>INBOX รอรับงาน: ${inbox} รายการ</b>`);
    lines.push('');
  }

  if (changes.length === 0 && rfcs.length === 0 && tasks.length === 0 && inbox === 0) {
    lines.push('✅ ไม่มีอัปเดต — ทีม AI พักผ่อนอยู่ครับ');
  }

  return lines.join('\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const customMsg = args.indexOf('--message') >= 0 ? args[args.indexOf('--message') + 1] : null;
const message = customMsg || buildDigest();

sendTelegram(message).catch(e => { console.error(e); process.exit(1); });
