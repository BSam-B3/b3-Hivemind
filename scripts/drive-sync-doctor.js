#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'wiki', 'context', 'drive-sync-health-latest.md');
const LARGE_BYTES = 50 * 1024 * 1024;
const SENSITIVE_NAMES = [/^\.env$/, /^\.env\./, /client_secret.*\.json$/i, /api-keys/i, /credentials/i];
const TEMP_NAMES = [/^\.tmp\./, /\.tmp$/i, /^_prompt-/, /\.swp$/i, /\.swo$/i];

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

function matchesAny(name, patterns) {
  return patterns.some((pattern) => pattern.test(name));
}

function main() {
  const files = walk(ROOT);
  const large = [];
  const sensitive = [];
  const temp = [];

  for (const file of files) {
    const name = path.basename(file);
    const relative = rel(file);
    const size = fs.statSync(file).size;
    if (size > LARGE_BYTES) large.push({ file: relative, mb: (size / 1024 / 1024).toFixed(1) });
    if (matchesAny(name, SENSITIVE_NAMES) || relative.includes('/credentials/')) sensitive.push(relative);
    if (matchesAny(name, TEMP_NAMES) || relative.includes('/.tmp.')) temp.push(relative);
  }

  const body = [
    '---',
    'type: project-status',
    'project: b3-second-brain',
    'status: active',
    'owner: B3',
    'source: drive-sync-doctor',
    `created: ${new Date().toISOString().slice(0, 10)}`,
    `last_reviewed: ${new Date().toISOString().slice(0, 10)}`,
    'confidence: medium',
    '---',
    '',
    '# Drive Sync Doctor',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## สรุปสำหรับบีสาม',
    '',
    `- ไฟล์ใหญ่กว่า 50MB: ${large.length}`,
    `- ไฟล์/โฟลเดอร์ที่อาจมีข้อมูลลับ: ${sensitive.length}`,
    `- ไฟล์ชั่วคราวที่อาจไม่ควร sync: ${temp.length}`,
    '',
    '## ไฟล์ใหญ่',
    '',
    ...(large.length ? large.slice(0, 30).map((item) => `- ${item.file} (${item.mb} MB)`) : ['- ไม่มี']),
    '',
    '## ข้อมูลลับที่ควรระวัง',
    '',
    ...(sensitive.length ? sensitive.slice(0, 50).map((file) => `- ${file}`) : ['- ไม่มี']),
    '',
    '## ไฟล์ชั่วคราวที่ควรระวัง',
    '',
    ...(temp.length ? temp.slice(0, 50).map((file) => `- ${file}`) : ['- ไม่มี']),
    '',
    '## คำแนะนำ',
    '',
    '- Google Drive sync ช่วยกันเครื่องพัง/ไฟล์หายได้ดี',
    '- แต่ไม่ควรพึ่งเป็นระบบ version control แทน Git',
    '- ไฟล์ secret เช่น `.env` และ client secret ควรเก็บด้วยความระวัง',
    '- ไฟล์ใหญ่ เช่น video recording อาจทำให้ sync ช้า',
    '',
  ].join('\n');

  fs.writeFileSync(REPORT, body, 'utf8');
  console.log(`Drive sync report written: ${rel(REPORT)}`);
}

main();
