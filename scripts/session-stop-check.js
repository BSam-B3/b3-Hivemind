#!/usr/bin/env node
// session-stop-check.js — รันตอน Claude Stop
// item 9: ตรวจ INBOX ใหม่ที่มาระหว่าง session
// item 6: เช็ค TT deadline
// แล้วส่ง b3-notify digest

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const TRIGGERS = path.join(ROOT, 'wiki', 'ai-war-room', 'triggers');

// ตรวจ INBOX ที่มาใหม่
const newInbox = fs.existsSync(TRIGGERS)
  ? fs.readdirSync(TRIGGERS).filter(f => f.startsWith('INBOX-CLAUDE-') && f.endsWith('.md'))
  : [];

if (newInbox.length > 0) {
  console.log(`[STOP-CHECK] ⚠️  มี INBOX ใหม่ ${newInbox.length} รายการ — ควรจัดการก่อนปิด session`);
  newInbox.forEach(f => console.log(`  • ${f}`));
}

// เขียน context-snapshot ก่อนปิด — ทีมทุกคนได้ state ล่าสุด session ถัดไป
const snapshotScript = path.join(__dirname, 'context-snapshot.js');
if (fs.existsSync(snapshotScript)) {
  spawnSync('node', [snapshotScript, 'write'], { cwd: ROOT, stdio: 'inherit' });
}

// ส่ง b3-notify digest
spawnSync('node', [path.join(__dirname, 'b3-notify.js')], { cwd: ROOT, stdio: 'inherit' });
