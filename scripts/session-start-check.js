#!/usr/bin/env node
/**
 * session-start-check.js
 * Auto-runs on every session via UserPromptSubmit hook
 * Checks: urgent mini-projects + Gemini returns waiting
 * Output goes into Claude's context automatically
 */

const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '..');
const MINI_PROJECTS = path.join(BASE, 'wiki', 'mini-projects');
const TO_B3 = path.join(BASE, 'wiki', 'to-b3');

const alerts = [];

// Check 1: Urgent mini-projects
try {
  const files = fs.readdirSync(MINI_PROJECTS).filter(f => f.endsWith('.md') && !f.startsWith('_') && f !== 'README.md');
  for (const file of files) {
    const content = fs.readFileSync(path.join(MINI_PROJECTS, file), 'utf8');
    if (content.includes('🔴 Urgent') && (content.includes('🔄 In Progress') || content.includes('🔁 Handoff') || content.includes('⏸ Blocked'))) {
      const titleMatch = content.match(/^# (.+)/m);
      const title = titleMatch ? titleMatch[1] : file;
      alerts.push(`🔴 [URGENT MINI-PROJECT] ${title} → ใช้ CMD 9 "รับงานต่อ ${file.replace('.md','')}"`);
    }
  }
} catch (e) {}

// Check 2: Gemini returns waiting
try {
  const files = fs.readdirSync(TO_B3).filter(f => f.startsWith('GEMINI-RETURN') && f.endsWith('.md'));
  for (const file of files) {
    alerts.push(`📬 [GEMINI RETURN WAITING] ${file} → Gemini ส่งงานกลับมา รอ Claude implement`);
  }
} catch (e) {}

// Check 3: Normal handoff mini-projects
try {
  const files = fs.readdirSync(MINI_PROJECTS).filter(f => f.endsWith('.md') && !f.startsWith('_') && f !== 'README.md');
  for (const file of files) {
    const content = fs.readFileSync(path.join(MINI_PROJECTS, file), 'utf8');
    if (content.includes('🔁 Handoff') && !content.includes('🔴 Urgent')) {
      const titleMatch = content.match(/^# (.+)/m);
      const title = titleMatch ? titleMatch[1] : file;
      alerts.push(`🔁 [HANDOFF READY] ${title} → มีงานรอส่งต่อ`);
    }
  }
} catch (e) {}

// Check 4: War Room status (active tasks, locks, pending approvals)
const info = [];
try {
  const BOARD = path.join(BASE, 'wiki', 'ai-war-room', 'board.json');
  const LOCKS = path.join(BASE, 'wiki', 'ai-war-room', 'locks.json');
  if (fs.existsSync(BOARD)) {
    const board = JSON.parse(fs.readFileSync(BOARD, 'utf8'));
    const active = (board.active_tasks || []).length;
    if (active > 0) {
      info.push(`📋 War Room: ${active} active task(s) — ${(board.active_tasks || []).map(t => t.id.split('-').slice(3).join('-').slice(0,30)).join(', ')}`);
    }
  }
  if (fs.existsSync(LOCKS)) {
    const locks = JSON.parse(fs.readFileSync(LOCKS, 'utf8'));
    const activeLocks = (locks.locks || []).filter(l => {
      if (!l.expires_at) return true;
      return Date.parse(l.expires_at) > Date.now();
    });
    if (activeLocks.length > 0) {
      info.push(`🔒 Active locks: ${activeLocks.length} (${activeLocks.map(l => l.file.split('/').pop()).join(', ').slice(0, 60)})`);
    }
  }
} catch (e) {}

// Check 5: Approvals waiting from Supabase (via local status cache)
try {
  const STATUS = path.join(BASE, 'wiki', 'to-b3', 'STATUS-SUMMARY.md');
  if (fs.existsSync(STATUS)) {
    const content = fs.readFileSync(STATUS, 'utf8');
    const match = content.match(/pending approvals.*?(\d+)/i);
    if (match && parseInt(match[1]) > 0) {
      info.push(`⚠️ ${match[1]} pending approval(s) รอ B3 — https://b3-team-avenger.vercel.app/approvals`);
    }
  }
} catch (e) {}

// Check 8: Open RFCs รอความเห็นจากทีม
try {
  const RFC_DIR = path.join(BASE, 'wiki', 'ai-war-room', 'RFC');
  if (fs.existsSync(RFC_DIR)) {
    const openRFCs = fs.readdirSync(RFC_DIR).filter(f => f.endsWith('.md') && !f.startsWith('_')).filter(f => {
      try {
        const content = fs.readFileSync(path.join(RFC_DIR, f), 'utf8');
        return content.includes('status: open') || content.includes('status: voting');
      } catch { return false; }
    });
    if (openRFCs.length > 0) {
      alerts.push(`💬 [RFC OPEN] ${openRFCs.length} proposal รอความเห็น → wiki/ai-war-room/RFC/`);
    }
  }
} catch (e) {}

// Check 10: Local AI (Ollama port 11434) + Auto-start watchdog
try {
  const http = require('http');
  const { spawn } = require('child_process');

  // 10a: Auto-start watchdog ถ้ายังไม่รัน
  const PID_FILE = path.join(BASE, 'wiki', 'ai-war-room', 'triggers', 'watcher.pid');
  let watcherAlive = false;
  if (fs.existsSync(PID_FILE)) {
    const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim(), 10);
    try { process.kill(pid, 0); watcherAlive = true; } catch {}
  }
  if (!watcherAlive) {
    const watchdog = spawn('node', [path.join(__dirname, 'openclaw-watchdog.js')], {
      detached: true, stdio: 'ignore', cwd: BASE,
    });
    watchdog.unref();
    info.push(`🔄 OpenClaw Watchdog: auto-started (watcher ไม่รัน → watchdog จะ restart ใน 30s)`);
  }

  // 10b: Local AI health check — Ollama port 11434
  const req = http.request({
    hostname: '127.0.0.1', port: 11434,
    path: '/v1/models', method: 'GET',
    timeout: 2000,
  }, res => {
    if (res.statusCode === 200) {
      info.push(`🖥️  Local AI: 🟢 ONLINE (Ollama) — route งานเล็กไป local ประหยัด token`);
    } else {
      info.push(`🖥️  Local AI: ⚠️ Ollama ตอบ ${res.statusCode}`);
    }
  });
  req.on('error', () => {
    info.push(`🖥️  Local AI: 🔴 OFFLINE — รัน Ollama ก่อน: ollama serve`);
  });
  req.on('timeout', () => { req.destroy(); });
  req.end();
} catch (e) {}

// Check 9: CHANGELOG ล่าสุด (3 รายการ) — รู้ว่าระบบเปลี่ยนอะไรไปบ้าง
try {
  const CHANGELOG = path.join(BASE, 'wiki', 'ai-war-room', 'CHANGELOG.md');
  if (fs.existsSync(CHANGELOG)) {
    const content = fs.readFileSync(CHANGELOG, 'utf8');
    const entries = content.match(/^## .+/gm) || [];
    if (entries.length > 0) {
      info.push(`📋 CHANGELOG ล่าสุด: ${entries.slice(0, 3).map(e => e.replace('## ', '')).join(' | ')}`);
    }
  }
} catch (e) {}

// Check 7: Stale INBOX-CLAUDE-*.md older than 24h
try {
  const TRIGGERS = path.join(BASE, 'wiki', 'ai-war-room', 'triggers');
  if (fs.existsSync(TRIGGERS)) {
    const now = Date.now();
    const ONE_DAY = 24 * 60 * 60 * 1000;
    const stale = fs.readdirSync(TRIGGERS).filter(f => f.startsWith('INBOX-CLAUDE-') && f.endsWith('.md')).filter(f => {
      try { return (now - fs.statSync(path.join(TRIGGERS, f)).mtimeMs) > ONE_DAY; } catch { return false; }
    });
    if (stale.length > 0) info.push(`🗑 Stale INBOX: ${stale.length} ไฟล์เกิน 24h → ลบด้วย npm run war:doctor`);
  }
} catch (e) {}

// Check 6: OpenClaw INBOX-CLAUDE task triggers — ต้องรับงานก่อนตอบ B3
try {
  const TRIGGERS = path.join(BASE, 'wiki', 'ai-war-room', 'triggers');
  if (fs.existsSync(TRIGGERS)) {
    const inboxFiles = fs.readdirSync(TRIGGERS).filter(f =>
      f.startsWith('INBOX-CLAUDE-') && f.endsWith('.md')
    );
    for (const file of inboxFiles) {
      const content = fs.readFileSync(path.join(TRIGGERS, file), 'utf8');
      const fromMatch = content.match(/\*\*From:\*\*\s*(\S+)/);
      const taskMatch = content.match(/\*\*Task:\*\*\s*(\S+)/);
      const instrMatch = content.match(/## Instruction\n([\s\S]*?)(?:\n---|$)/);
      const from = fromMatch ? fromMatch[1] : '?';
      const task = taskMatch ? taskMatch[1] : file.replace('INBOX-CLAUDE-', '').replace('.md', '');
      const instr = instrMatch ? instrMatch[1].trim().replace(/\n/g, ' ').slice(0, 100) : file;
      alerts.unshift(`🚨 [INBOX จาก ${from.toUpperCase()}] ${task} → ${instr}... (ลบไฟล์หลังทำเสร็จ)`);
    }
  }
} catch (e) {}

// Output
const W = 52;
const line = (s) => console.log(`║ ${s.padEnd(W - 2)} ║`);
const div  = (c = '─') => console.log(`╠${c.repeat(W)}╣`);

if (alerts.length > 0 || info.length > 0) {
  console.log(`\n╔${'═'.repeat(W)}╗`);
  console.log(`║${' B3 BRAIN — SESSION CHECK '.padStart((W + 26) / 2).padEnd(W)}║`);
  div();
  if (alerts.length > 0) {
    console.log(`║ ${'📋 INBOX TASKS'.padEnd(W - 2)} ║`);
    alerts.forEach((a, i) => line(`  ${i + 1}. ${a.slice(0, W - 5)}`));
    if (info.length > 0) div();
  }
  if (info.length > 0) {
    console.log(`║ ${'ℹ️  INFO'.padEnd(W - 2)} ║`);
    info.forEach(i => line(`  ${i.slice(0, W - 4)}`));
  }
  console.log(`╚${'═'.repeat(W)}╝\n`);
} else {
  console.log('[B3 Brain] ✅ ไม่มีงานเร่งด่วน — War Room clean — พร้อมรับคำสั่ง');
}
