#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'wiki', 'to-b3', 'B3-CONTROL-PANEL.md');
const HTML_OUT = path.join(ROOT, 'wiki', 'to-b3', 'B3-CONTROL-PANEL.html');
const TRIGGERS = path.join(ROOT, 'wiki', 'ai-war-room', 'triggers');
const SESSIONS = path.join(ROOT, 'wiki', 'ai-war-room', 'sessions');
const APPROVALS = path.join(ROOT, 'wiki', 'ai-war-room', 'approvals');
const SHOULD_OPEN = process.argv.includes('--open');

function run(command) {
  try {
    return childProcess.execSync(command, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch (error) {
    return (error.stdout?.toString() || error.stderr?.toString() || error.message).trim();
  }
}

function list(dir, predicate) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).filter(predicate).map((entry) => path.join(dir, entry.name));
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  } catch {
    return null;
  }
}

function watcherPids() {
  if (process.platform !== 'win32') return [];
  const raw = run('powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -like \'*node.exe\' -and $_.CommandLine -like \'*scripts/openclaw-trigger-watcher.js*\' } | Select-Object ProcessId,CommandLine | ConvertTo-Json -Compress"');
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return (Array.isArray(parsed) ? parsed : [parsed]).map((row) => row.ProcessId);
  } catch {
    return [];
  }
}

function htmlEscape(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function telegramConfig() {
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    return { token: process.env.TELEGRAM_BOT_TOKEN, chatId: process.env.TELEGRAM_CHAT_ID };
  }
  const envFiles = [
    path.join(ROOT, '.env'),
    path.join(ROOT, 'b3-agents', '.env'),
  ];
  for (const file of envFiles) {
    if (!fs.existsSync(file)) continue;
    const map = {};
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match) map[match[1]] = match[2].trim();
    }
    if (map.TELEGRAM_BOT_TOKEN && map.TELEGRAM_CHAT_ID) {
      return { token: map.TELEGRAM_BOT_TOKEN, chatId: map.TELEGRAM_CHAT_ID };
    }
  }
  return null;
}

function sendTelegramIfNeeded(data) {
  if (data.ok) return;
  const cfg = telegramConfig();
  if (!cfg) return;
  const text = [
    'B3 Control Panel: มีเรื่องที่ควรดู',
    `trigger ค้าง: ${data.pendingTriggers.length}`,
    `ต้องกู้/ส่งต่อ: ${data.attention.length}`,
    `รออนุมัติ: ${data.pendingApprovals.length}`,
    `prompt temp ค้าง: ${data.promptTemps.length}`,
  ].join('\n');
  const body = JSON.stringify({ chat_id: cfg.chatId, text });
  const req = https.request({
    hostname: 'api.telegram.org',
    path: `/bot${cfg.token}/sendMessage`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    },
  });
  req.on('error', () => {});
  req.write(body);
  req.end();
}

function openDashboard() {
  if (!SHOULD_OPEN) return;
  try {
    if (process.platform === 'win32') {
      childProcess.execFile('cmd', ['/c', 'start', '', HTML_OUT], { cwd: ROOT, windowsHide: true });
    } else if (process.platform === 'darwin') {
      childProcess.execFile('open', [HTML_OUT]);
    } else {
      childProcess.execFile('xdg-open', [HTML_OUT]);
    }
  } catch {}
}

function writeHtml(data) {
  const tone = data.ok ? 'ok' : 'warn';
  const html = `<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>B3 Control Panel</title>
  <style>
    body { margin: 0; font-family: "Segoe UI", Tahoma, sans-serif; background: #f6f7f9; color: #1f2937; }
    main { max-width: 980px; margin: 0 auto; padding: 28px 18px 48px; }
    h1 { margin: 0 0 6px; font-size: 30px; }
    h2 { margin-top: 28px; font-size: 20px; }
    .muted { color: #6b7280; }
    .status { display: inline-block; padding: 8px 12px; border-radius: 8px; font-weight: 700; }
    .status.ok { background: #dcfce7; color: #166534; }
    .status.warn { background: #fef3c7; color: #92400e; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; margin-top: 16px; }
    .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; }
    .num { display: block; font-size: 28px; font-weight: 800; margin-top: 4px; }
    ul { padding-left: 22px; }
    code { background: #eef2f7; padding: 2px 5px; border-radius: 5px; }
  </style>
</head>
<body>
  <main>
    <h1>B3 Control Panel</h1>
    <div class="muted">อัปเดตล่าสุด: ${htmlEscape(data.now)}</div>
    <p><span class="status ${tone}">${htmlEscape(data.statusText)}</span></p>
    <div class="grid">
      <div class="card">OpenClaw watcher<span class="num">${data.pids.length === 1 ? `PID ${data.pids[0]}` : data.pids.length}</span></div>
      <div class="card">Trigger ค้าง<span class="num">${data.pendingTriggers.length}</span></div>
      <div class="card">Prompt temp ค้าง<span class="num">${data.promptTemps.length}</span></div>
      <div class="card">ต้องกู้/ส่งต่อ<span class="num">${data.attention.length}</span></div>
      <div class="card">รออนุมัติ<span class="num">${data.pendingApprovals.length}</span></div>
      <div class="card">Watchdog sessions<span class="num">${data.statuses.length}</span></div>
    </div>
    <h2>สิ่งที่ต้องให้บีสามตัดสินใจ</h2>
    <ul>${data.pendingApprovals.length ? data.pendingApprovals.map((file) => `<li>${htmlEscape(path.basename(file))}</li>`).join('') : '<li>ไม่มี</li>'}</ul>
    <h2>งานที่ควรดู</h2>
    <ul>${data.attention.length ? data.attention.map((status) => `<li>${htmlEscape(status.taskId)}: ${htmlEscape(status.reason || status.status)} -> ${htmlEscape(status.nextAction || 'ตรวจสอบ')}</li>`).join('') : '<li>ไม่มี</li>'}</ul>
    <h2>คำสั่งที่ใช้บ่อย</h2>
    <ul>
      <li>เช็กสุขภาพทีม: <code>npm run b3:check</code></li>
      <li>กู้ task: <code>npm run trigger:recover -- TASK_ID</code></li>
      <li>สรุปวันนี้: <code>npm run team:digest</code></li>
      <li>เปิด War Room: <code>npm run war:standup</code></li>
    </ul>
  </main>
</body>
</html>`;
  fs.writeFileSync(HTML_OUT, html, 'utf8');
}

function main() {
  run('node scripts/brain-doctor.js --write-report');
  run('node scripts/openclaw-doctor.js --write-report');
  run('node scripts/session-scorecard.js');
  run('node scripts/lesson-extractor.js');
  run('node scripts/team-health-dashboard.js');
  run('node scripts/team-daily-digest.js');
  run('node scripts/drive-sync-doctor.js');
  run('node scripts/secret-inventory.js');

  const pendingTriggers = list(TRIGGERS, (entry) => entry.isFile() && entry.name.endsWith('.json') && !entry.name.startsWith('_'));
  const promptTemps = list(TRIGGERS, (entry) => entry.isFile() && entry.name.startsWith('_prompt-'));
  const pendingApprovals = list(APPROVALS, (entry) => entry.isFile() && entry.name.endsWith('.md'))
    .filter((file) => fs.readFileSync(file, 'utf8').includes('status: pending'));
  const statuses = list(SESSIONS, (entry) => entry.isDirectory())
    .map((dir) => readJson(path.join(dir, 'session-status.json')))
    .filter(Boolean);
  const attention = statuses.filter((status) => ['handoff_required', 'failed'].includes(status.status));
  const pids = watcherPids();
  const ok = pendingTriggers.length === 0 && promptTemps.length === 0 && attention.length === 0 && pendingApprovals.length === 0 && pids.length === 1;
  const statusText = ok ? 'ปกติ พร้อมทำงาน' : 'มีเรื่องที่ควรดู';
  const now = new Date().toISOString();
  const data = { ok, statusText, now, pendingTriggers, promptTemps, pendingApprovals, statuses, attention, pids };

  const body = [
    '---',
    'type: project-status',
    'project: b3-second-brain',
    'status: active',
    'owner: B3',
    'source: b3-control-panel',
    `created: ${now.slice(0, 10)}`,
    `last_reviewed: ${now.slice(0, 10)}`,
    'confidence: high',
    '---',
    '',
    '# B3 Control Panel',
    '',
    `อัปเดตล่าสุด: ${now}`,
    '',
    '## สรุปสำหรับบีสาม',
    '',
    `สถานะรวม: ${statusText}`,
    '',
    `- OpenClaw watcher: ${pids.length === 1 ? `ทำงานอยู่ PID ${pids[0]}` : `ควรตรวจสอบ (${pids.length} process)`}`,
    `- งาน trigger ค้าง: ${pendingTriggers.length}`,
    `- ไฟล์ prompt ชั่วคราวค้าง: ${promptTemps.length}`,
    `- งานที่ต้องกู้/ส่งต่อ: ${attention.length}`,
    `- รายการรออนุมัติ: ${pendingApprovals.length}`,
    `- session ที่มี watchdog status: ${statuses.length}`,
    '',
    '## เปิดแบบ Dashboard',
    '',
    '- เปิดไฟล์ HTML: [B3-CONTROL-PANEL.html](B3-CONTROL-PANEL.html)',
    '',
    '## สิ่งที่ต้องให้บีสามตัดสินใจ',
    '',
    ...(pendingApprovals.length ? pendingApprovals.map((file) => `- ${path.basename(file)}`) : ['- ไม่มี']),
    '',
    '## งานที่ควรดู',
    '',
    ...(attention.length ? attention.map((status) => `- ${status.taskId}: ${status.reason || status.status} -> ${status.nextAction || 'ตรวจสอบ'}`) : ['- ไม่มี']),
    '',
    '## คำสั่งภาษาคนที่ใช้ได้',
    '',
    '- "เช็กสุขภาพทีม" -> รัน `npm run b3:check`',
    '- "ส่ง Gemini แกะลิงก์นี้" -> ใช้ CMD 11 / `npm run trigger -- ...`',
    '- "กู้ task นี้" -> `npm run trigger:recover -- TASK_ID`',
    '- "เปิด War Room" -> `npm run war:standup`',
    '- "ขอสรุปวันนี้" -> `npm run team:digest`',
    '',
    '## Next Action',
    '',
    ok ? '- ไม่มีงานด่วน ระบบพร้อมรับงานต่อ' : '- เปิดไฟล์รายงานด้านบน แล้วจัดการรายการที่ค้างก่อนเริ่มงานใหญ่',
    '',
  ].join('\n');

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, body, 'utf8');
  writeHtml(data);
  sendTelegramIfNeeded(data);
  openDashboard();
  console.log(`B3 Control Panel written: ${path.relative(ROOT, OUT).replace(/\\/g, '/')}`);
  console.log(`B3 HTML Control Panel written: ${path.relative(ROOT, HTML_OUT).replace(/\\/g, '/')}`);
  console.log(`สถานะรวม: ${statusText}`);
}

main();
