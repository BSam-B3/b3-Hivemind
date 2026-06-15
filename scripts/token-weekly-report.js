#!/usr/bin/env node
/**
 * token-weekly-report.js — สรุป token usage รายสัปดาห์ของทีม AI
 * ดึงข้อมูลจาก cost.md ใน sessions + watcher.log
 *
 * Usage:
 *   node scripts/token-weekly-report.js          # สัปดาห์นี้
 *   node scripts/token-weekly-report.js --weeks 2  # 2 สัปดาห์ย้อนหลัง
 *   node scripts/token-weekly-report.js --write    # บันทึกรายงานลงไฟล์
 */

const fs   = require('fs');
const path = require('path');

const ROOT         = path.join(__dirname, '..');
const SESSIONS_DIR = path.join(ROOT, 'wiki', 'ai-war-room', 'sessions');
const CHANGELOG    = path.join(ROOT, 'wiki', 'ai-war-room', 'CHANGELOG.md');
const REPORT_DIR   = path.join(ROOT, 'wiki', 'ai-war-room', 'reports');

const args  = process.argv.slice(2);
const weeks = Number(args[args.indexOf('--weeks') + 1] || 1);
const write = args.includes('--write');

const COST_PER_1K = {
  'claude-sonnet-4-6':    0.003,   // $3/1M output ~ $0.003/1k
  'claude-opus-4-8':      0.015,
  'claude-haiku-4-5':     0.00025,
  'gemini-2.5-flash':     0.00015,
  'codex':                0.002,
  'qwen2.5-coder:1.5b':   0,       // local — ฟรี
  'gemma2:2b':            0,       // local — ฟรี
  'groq':                 0,       // free tier
  'local':                0,
};

function getModel(agent) {
  const map = { claude: 'claude-sonnet-4-6', gemini: 'gemini-2.5-flash', codex: 'codex', local: 'local', groq: 'groq' };
  return map[agent] || 'claude-sonnet-4-6';
}

const since = new Date(Date.now() - weeks * 7 * 24 * 60 * 60 * 1000);

// ─── 1. Scan sessions/*/cost.md ──────────────────────────────────────────────
const rows = []; // { agent, tokens, model, taskId, date }

if (fs.existsSync(SESSIONS_DIR)) {
  for (const task of fs.readdirSync(SESSIONS_DIR)) {
    const costFile = path.join(SESSIONS_DIR, task, 'cost.md');
    if (!fs.existsSync(costFile)) continue;
    const content = fs.readFileSync(costFile, 'utf8');
    const blocks = content.split(/^## /m).filter(Boolean);
    for (const block of blocks) {
      const dateMatch = block.match(/^(\d{4}-\d{2}-\d{2}T[\d:.Z]+)/);
      const agentMatch = block.match(/Agent:\s*(\S+)/);
      const tokensMatch = block.match(/Tokens:\s*(\d+)/);
      if (!tokensMatch) continue;
      const date = dateMatch ? new Date(dateMatch[1]) : new Date();
      if (date < since) continue;
      rows.push({
        taskId: task,
        agent: (agentMatch?.[1] || 'unknown').toLowerCase(),
        tokens: Number(tokensMatch[1]),
        model: getModel((agentMatch?.[1] || '').toLowerCase()),
        date,
      });
    }
  }
}

// ─── 2. Scan CHANGELOG for token hints (e.g. "~45k tokens") ─────────────────
if (fs.existsSync(CHANGELOG)) {
  const content = fs.readFileSync(CHANGELOG, 'utf8');
  const lines = content.split('\n').filter(l => l.includes('token'));
  for (const line of lines) {
    const m = line.match(/~?([\d.]+)k?\s*token/i);
    if (!m) continue;
    const tokens = m[1].includes('.') ? Math.round(parseFloat(m[1]) * 1000) : Number(m[1]) * (line.includes('k') ? 1000 : 1);
    if (!tokens || tokens > 500000) continue;
    const agentMatch = line.match(/\b(claude|gemini|codex|local|groq)\b/i);
    rows.push({
      taskId: 'changelog',
      agent: (agentMatch?.[1] || 'claude').toLowerCase(),
      tokens,
      model: getModel((agentMatch?.[1] || 'claude').toLowerCase()),
      date: new Date(),
    });
  }
}

// ─── 3. Aggregate ─────────────────────────────────────────────────────────────
const byAgent = {};
let totalTokens = 0;
let totalCost = 0;

for (const row of rows) {
  if (!byAgent[row.agent]) byAgent[row.agent] = { tokens: 0, cost: 0, tasks: 0 };
  const ratePerK = COST_PER_1K[row.model] ?? 0.003;
  const cost = (row.tokens / 1000) * ratePerK;
  byAgent[row.agent].tokens += row.tokens;
  byAgent[row.agent].cost   += cost;
  byAgent[row.agent].tasks  += 1;
  totalTokens += row.tokens;
  totalCost   += cost;
}

// ─── 4. Format report ─────────────────────────────────────────────────────────
const now = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
const lines = [
  `# Token Usage Report`,
  `**ช่วงเวลา:** ${weeks} สัปดาห์ล่าสุด | **สร้างเมื่อ:** ${now} ICT`,
  ``,
  `## สรุปรวม`,
  `| AI | Tokens | ค่าใช้จ่าย (USD) | Tasks |`,
  `|---|---|---|---|`,
];

const EMOJIS = { claude: '🤖', gemini: '🌐', codex: '💻', local: '🖥️', groq: '⚡', unknown: '❓' };

const sorted = Object.entries(byAgent).sort((a, b) => b[1].tokens - a[1].tokens);
for (const [agent, data] of sorted) {
  const emoji = EMOJIS[agent] || '🤖';
  const costStr = data.cost === 0 ? '**ฟรี 🎉**' : `$${data.cost.toFixed(4)}`;
  lines.push(`| ${emoji} ${agent} | ${data.tokens.toLocaleString()} | ${costStr} | ${data.tasks} |`);
}

lines.push(`| **รวม** | **${totalTokens.toLocaleString()}** | **$${totalCost.toFixed(4)}** | **${rows.length}** |`);

if (totalTokens > 0) {
  const freeTokens = (byAgent['local']?.tokens || 0) + (byAgent['groq']?.tokens || 0);
  const savings = ((freeTokens / totalTokens) * 100).toFixed(1);
  lines.push(``, `## ประสิทธิภาพ`);
  lines.push(`- **Token ฟรี (local + groq):** ${freeTokens.toLocaleString()} (${savings}% ของทั้งหมด)`);
  lines.push(`- **Token ที่เสียเงิน:** ${(totalTokens - freeTokens).toLocaleString()}`);
  lines.push(`- **ประหยัดได้:** $${((freeTokens / 1000) * 0.003).toFixed(4)} เทียบกับถ้าใช้ Claude ทั้งหมด`);
  if (parseFloat(savings) < 20) {
    lines.push(``, `> ⚠️ **แนะนำ:** local AI ใช้แค่ ${savings}% — ยังมีโอกาสลดต้นทุนได้มาก route งานเล็กไป local เพิ่ม`);
  } else if (parseFloat(savings) >= 50) {
    lines.push(``, `> ✅ **ดีมาก!** ทีมใช้ local AI ได้ ${savings}% — ประหยัด token ได้ดี`);
  }
}

lines.push(``, `## Top 5 Tasks ที่ใช้ Token มากสุด`);
const topTasks = rows.filter(r => r.taskId !== 'changelog')
  .sort((a, b) => b.tokens - a.tokens)
  .slice(0, 5);
if (topTasks.length === 0) {
  lines.push(`_ยังไม่มีข้อมูล — ใส่ --tokens ตอน finalize task_`);
} else {
  lines.push(`| Task | Agent | Tokens |`, `|---|---|---|`);
  for (const t of topTasks) {
    lines.push(`| ${t.taskId.slice(0, 40)} | ${t.agent} | ${t.tokens.toLocaleString()} |`);
  }
}

const report = lines.join('\n');

// ─── 5. Output ────────────────────────────────────────────────────────────────
console.log('\n' + report + '\n');

if (write) {
  if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  const outFile = path.join(REPORT_DIR, `token-report-${date}.md`);
  fs.writeFileSync(outFile, report, 'utf8');
  console.log(`[report] ✅ บันทึกแล้วที่ ${outFile}`);
}

if (totalTokens === 0) {
  console.log(`\n💡 ยังไม่มีข้อมูล token — เพิ่มข้อมูลได้โดย:\n  node scripts/war-room.js finalize TASK_ID "summary" --agent claude --tokens 45000`);
}
