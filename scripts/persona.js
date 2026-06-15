#!/usr/bin/env node
/**
 * persona.js — Persona Loader & Upskill System
 *
 * Usage:
 *   node scripts/persona.js load enjoy          ← โหลด persona context
 *   node scripts/persona.js list                ← รายชื่อ persona ทั้งหมด
 *   node scripts/persona.js upskill enjoy "lesson"  ← บันทึก lesson ลง persona
 *   node scripts/persona.js review enjoy        ← ดู skills ที่สะสมมา
 */

const fs = require('fs');
const path = require('path');

const BASE = path.resolve(__dirname, '..');
const TEAM_DIR = path.join(BASE, 'wiki', 'ai-team');

// ── Persona name map (ชื่อย่อ / ชื่อไทย → filename) ─────────────────────────
const PERSONA_MAP = {
  enjoy: 'enjoy_uidev.md',       เอนจอย: 'enjoy_uidev.md',
  joe: 'joe_backend.md',         โจ: 'joe_backend.md',
  choe: 'choe_editor.md',        ชเว: 'choe_editor.md',
  janie: 'janie_secretary.md',   เจนี่: 'janie_secretary.md',
  nam: 'nam_support.md',         น้ำ: 'nam_support.md',
  kong: 'kong_hacker.md',        ก้อง: 'kong_hacker.md',
  kitti: 'kitti_lawyer.md',      กิตติ: 'kitti_lawyer.md',
  win: 'win_bizdev.md',          วิน: 'win_bizdev.md',
  metha: 'phattama_finance.md',  เมธา: 'phattama_finance.md',
  pim: 'pim_accounting.md',      พิม: 'pim_accounting.md',
  kom: 'kom_risk.md',            คมน์: 'kom_risk.md',
  raps: 'raps_hr.md',            แรปส์: 'raps_hr.md',
  ferin: 'ferin_procurement.md', เฟริน: 'ferin_procurement.md',
  nara: 'nara_creator.md',       นารา: 'nara_creator.md',
  karn: 'karn_community.md',     กานต์: 'karn_community.md',
  dana: 'dana_analyst.md',       ดาน่า: 'dana_analyst.md',
  mira: 'mira_market_intel.md',  มิรา: 'mira_market_intel.md',
  qara: 'qara_tester.md',        คาร่า: 'qara_tester.md',
  booko: 'booko_data.md',        บุ้กโก้: 'booko_data.md',
  finley: 'finley_finance.md',   ฟินลีย์: 'finley_finance.md',
  jobs: 'jobs_advisor.md',       จ๊อบส์: 'jobs_advisor.md',
  elon: 'elon_advisor.md',       มัสก์: 'elon_advisor.md',
  naval: 'naval_advisor.md',     นาวาล: 'naval_advisor.md',
  graham: 'graham_advisor.md',   เกรแฮม: 'graham_advisor.md',
};

function nowICT() {
  return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok' })
    .replace('T', ' ').slice(0, 16) + ' ICT';
}

function resolvePersona(name) {
  const key = name.toLowerCase().trim();
  const file = PERSONA_MAP[key] || PERSONA_MAP[name] || `${key}.md`;
  return path.join(TEAM_DIR, file);
}

const [,, cmd, personaArg, ...rest] = process.argv;

// ── LIST ─────────────────────────────────────────────────────────────────────
if (cmd === 'list') {
  const names = [...new Set(Object.keys(PERSONA_MAP).filter(k => !/[฀-๿]/.test(k)))];
  console.log('\n🎭 Personas ที่มี:\n');
  names.forEach(n => {
    const file = path.join(TEAM_DIR, PERSONA_MAP[n]);
    const exists = fs.existsSync(file) ? '✅' : '❌';
    const content = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
    const title = (content.match(/^# (.+)/m) || [])[1] || n;
    const skills = (content.match(/## 🧠 Skills & Learnings/)) ? '📈 มี skills' : '';
    console.log(`  ${exists} ${n.padEnd(10)} ${title.slice(0, 40)} ${skills}`);
  });
  console.log('');
  process.exit(0);
}

// ── LOAD ─────────────────────────────────────────────────────────────────────
if (cmd === 'load') {
  const file = resolvePersona(personaArg);
  if (!fs.existsSync(file)) {
    console.error(`[PERSONA] ไม่พบ ${personaArg} → ${file}`);
    process.exit(1);
  }
  const content = fs.readFileSync(file, 'utf8');
  console.log('\n' + '─'.repeat(60));
  console.log(`🎭 สวมหน้ากาก: ${personaArg.toUpperCase()}`);
  console.log('─'.repeat(60));
  console.log(content);
  console.log('─'.repeat(60) + '\n');
  process.exit(0);
}

// ── UPSKILL ──────────────────────────────────────────────────────────────────
if (cmd === 'upskill') {
  const lesson = rest.join(' ').trim();
  if (!lesson) { console.error('[PERSONA] --lesson required'); process.exit(1); }

  const file = resolvePersona(personaArg);
  if (!fs.existsSync(file)) { console.error(`[PERSONA] ไม่พบ ${file}`); process.exit(1); }

  let content = fs.readFileSync(file, 'utf8');

  // สร้าง section ถ้ายังไม่มี
  if (!content.includes('## 🧠 Skills & Learnings')) {
    content += `\n\n---\n\n## 🧠 Skills & Learnings\n\n> บันทึกจากการทำงานจริง — อัปเดตอัตโนมัติ\n`;
  }

  const entry = `\n### ${nowICT()}\n${lesson}\n`;
  content = content.replace(
    '## 🧠 Skills & Learnings',
    `## 🧠 Skills & Learnings${entry}`
  );

  fs.writeFileSync(file, content, 'utf8');
  console.log(`[PERSONA] ✅ Lesson บันทึกลง ${path.basename(file)}`);
  process.exit(0);
}

// ── REVIEW ───────────────────────────────────────────────────────────────────
if (cmd === 'review') {
  const file = resolvePersona(personaArg);
  if (!fs.existsSync(file)) { console.error(`[PERSONA] ไม่พบ ${file}`); process.exit(1); }
  const content = fs.readFileSync(file, 'utf8');
  const idx = content.indexOf('## 🧠 Skills & Learnings');
  if (idx === -1) {
    console.log(`[PERSONA] ${personaArg} ยังไม่มี Skills & Learnings`);
  } else {
    console.log('\n' + content.slice(idx));
  }
  process.exit(0);
}

console.log(`Usage:
  node scripts/persona.js list
  node scripts/persona.js load    [name]
  node scripts/persona.js upskill [name] "[lesson]"
  node scripts/persona.js review  [name]`);
