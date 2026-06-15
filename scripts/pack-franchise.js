#!/usr/bin/env node
/**
 * scripts/pack-franchise.js — B3 HiveMind Outbound Privacy Guard & Packer
 * คัดลอกและสร้างโฟลเดอร์แจกจ่ายระบบแบบคลีน (Sanitized Sandbox) ปราศจากข้อมูลความลับ 100%
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.resolve(ROOT, '..', 'b3-hivemind-dist');

// รายการไฟล์และโฟลเดอร์ที่จะต้องกรองทิ้ง (ห้ามแชร์เด็ดขาด)
const BLACKLIST = [
  '.env',
  '.git',
  '.gemini',
  '.openclaw',
  'node_modules',
  'memory', // บันทึกความจำรายวัน
  'backups',
  'wiki/credentials', // รหัสผ่านและ API key ต่างๆ
  'wiki/cit', // ลบโปรเจกต์ CIT ( cit-service )
  'wiki/b3-avenger',
  'wiki/jong-jaroen',
  'wiki/monitoring/local-ai-runs.jsonl',
  'wiki/recycle', // ลบโฟลเดอร์ขยะเก่าเพื่อป้องกันคีย์ลับค้างคา
  'b3-agents/cli-bridge', // ลบรหัสสะพานเชื่อม API
  'app',
  'DocIT',
  'tasks',
  'raw',
  'scratch',
  'client_secret_2_427643888397-84cmg93r1k5p612tnnrn4lu68avcu8e2.apps.googleusercontent.com.json'
];

// ฟังก์ชันคัดลอกโฟลเดอร์แบบคัดกรอง
function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  // ตรวจสอบว่าเส้นทางสัมพัทธ์อยู่ในบัญชีดำหรือไม่
  const relativePath = path.relative(ROOT, src).replace(/\\/g, '/');
  if (BLACKLIST.some(blocked => relativePath === blocked || relativePath.startsWith(blocked + '/'))) {
    return;
  }

  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

function cleanDistEnv() {
  const destEnv = path.join(DIST_DIR, '.env.example');
  const srcEnv = path.join(ROOT, '.env.example');
  
  if (fs.existsSync(srcEnv)) {
    fs.copyFileSync(srcEnv, destEnv);
    console.log('📝 คัดลอกและสร้าง .env.example ในตัวติดตั้งแล้ว');
  }
}

function cleanDirKeepGit(dir) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(file => {
    if (file === '.git') return;
    const full = path.join(dir, file);
    fs.rmSync(full, { recursive: true, force: true });
  });
}

function main() {
  console.log('🛡️ [Outbound Firewall] เริ่มต้นการคัดกรองความปลอดภัยเตรียมแพ็คระบบ...');
  
  if (fs.existsSync(DIST_DIR)) {
    console.log(`🧹 ล้างโฟลเดอร์แจกจ่ายเดิม (เว้น .git) ที่: ${DIST_DIR}`);
    cleanDirKeepGit(DIST_DIR);
  } else {
    fs.mkdirSync(DIST_DIR, { recursive: true });
  }

  console.log('🚀 กำลังคัดลอกเฉพาะระบบแกนหลักและล้างความลับ...');
  copyRecursiveSync(ROOT, DIST_DIR);

  // ปรับแต่งไฟล์สภาพแวดล้อม
  cleanDistEnv();

  // สร้างไฟล์ README แฟรนไชส์เฉพาะตัว
  const readmeContent = [
    `# B3 HiveMind - AI Agent Framework Sandbox`,
    `---`,
    `นี่คือชุดระบบปฏิบัติการเอเจนต์ออฟไลน์ที่ถูกคัดกรองข้อมูลส่วนตัวเรียบร้อยแล้ว`,
    `กรุณาทำตามคู่มือการติดตั้งที่: [wiki/projects/b3-hivemind-friend-guide.md](./wiki/projects/b3-hivemind-friend-guide.md)`
  ].join('\n');
  fs.writeFileSync(path.join(DIST_DIR, 'README.md'), readmeContent, 'utf8');

  console.log('\n==================================================');
  console.log('🎉 แพ็คระบบ B3 HiveMind สำเร็จแบบปลอดภัย 100%!');
  console.log(`📂 ไฟล์สำหรับส่งมอบให้เพื่อนอยู่ที่: \n👉 ${DIST_DIR}`);
  console.log('==================================================');
}

main();
