#!/usr/bin/env node
/**
 * scripts/hivemind-dashboard.js — B3 HiveMind ASCII Terminal Dashboard
 * หน้าจอแสดงสถานะกำลังพลเอเจนต์ออฟไลน์ คิวงาน และปริมาณโทเค็นที่ประหยัดได้ในปุ่มเดียว
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const RUNS_FILE = path.join(ROOT, 'wiki', 'monitoring', 'local-ai-runs.jsonl');
const QUARANTINE_DIR = path.join(ROOT, 'wiki', 'quarantine');
const TRIGGERS_DIR = path.join(ROOT, 'wiki', 'ai-war-room', 'triggers');

function getQuarantineCount() {
  if (!fs.existsSync(QUARANTINE_DIR)) return 0;
  return fs.readdirSync(QUARANTINE_DIR).filter(f => f.endsWith('.json') || f.endsWith('.md')).length;
}

function getPendingTriggersCount() {
  if (!fs.existsSync(TRIGGERS_DIR)) return 0;
  return fs.readdirSync(TRIGGERS_DIR).filter(f => f.startsWith('INBOX-')).length;
}

function calculateSavings() {
  let totalSavedTokens = 0;
  let totalRuns = 0;
  let successCount = 0;

  if (fs.existsSync(RUNS_FILE)) {
    fs.readFileSync(RUNS_FILE, 'utf8').split(/\n/).forEach(line => {
      if (!line.trim()) return;
      try {
        const json = JSON.parse(line);
        totalRuns++;
        if (json.status === 'ok') {
          successCount++;
          totalSavedTokens += json.tokens || 0;
        }
      } catch (e) {
        // ละเว้นไลน์ที่เพี้ยน
      }
    });
  }

  // สมมติค่าเฉลี่ยราคาคลาวด์ Claude 3.5 Sonnet ที่ $3 ต่อ 1M tokens ($0.000003 ต่อ token)
  const moneySavedUsd = totalSavedTokens * 0.000003;
  const moneySavedThb = moneySavedUsd * 36.5; // อัตราแลกเปลี่ยนจำลอง

  return { totalRuns, successCount, totalSavedTokens, moneySavedThb };
}

function getLocalAiStatus() {
  try {
    const output = execSync('node scripts/local-doctor.js --json', { cwd: ROOT, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    const json = JSON.parse(output.trim());
    return json.ok ? '🟢 ONLINE (Ollama)' : '🔴 ERROR (Check doctor)';
  } catch (e) {
    return '🔴 OFFLINE / DISCONNECTED';
  }
}

function main() {
  console.log('\x1b[33m%s\x1b[0m', '==================================================');
  console.log('\x1b[36m%s\x1b[0m', '🐝 B3 HiveMind (บีสาม ไฮฟ์มายด์) — DASHBOARD');
  console.log('\x1b[33m%s\x1b[0m', '==================================================');

  // 1. ตรวจสอบสถานะการเชื่อมต่อ
  console.log(`📡 Local Gateway Status : ${getLocalAiStatus()}`);
  
  // 2. ตรวจสอบข้อมูลคิวงาน
  const qCount = getQuarantineCount();
  const tCount = getPendingTriggersCount();
  console.log(`📥 Quarantine Queue    : \x1b[35m${qCount}\x1b[0m รายการรอวิเคราะห์`);
  console.log(`📬 Active Inbox Queue   : \x1b[32m${tCount}\x1b[0m งานรอ AI สั่งการ`);

  // 3. ตรวจสอบบัญชีเงินที่เซฟ (Passive Income)
  const savings = calculateSavings();
  console.log('\x1b[33m%s\x1b[0m', '--------------------------------------------------');
  console.log('\x1b[32m%s\x1b[0m', '📈สถิติการใช้งานและมูลค่าที่ประหยัดได้ (Ailocal):');
  console.log(`  - จำนวนรันออฟไลน์สะสม   : ${savings.totalRuns} ครั้ง (สำเร็จ ${savings.successCount})`);
  console.log(`  - จำนวนโทเค็นที่เซฟได้   : \x1b[36m${savings.totalSavedTokens.toLocaleString()}\x1b[0m Tokens`);
  console.log(`  - มูลค่าที่ประหยัดได้จริง : ฿\x1b[32m${savings.moneySavedThb.toFixed(2)}\x1b[0m บาท`);
  console.log('\x1b[33m%s\x1b[0m', '==================================================');
}

main();
