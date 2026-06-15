#!/usr/bin/env node
/**
 * local-privacy-guard.js - B3 Privacy Guard & PII Scrubbing
 * สแกนเซ็นเซอร์ตรวจจับข้อมูลส่วนบุคคล (PDPA) ในโค้ดหรือข้อความก่อนส่งออกนอกเครื่อง
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const { chat, ROOT } = require('./local-ai-client');

async function scrubPII(text) {
  const systemPrompt = `You are the B3 Privacy Guard.
- หน้าที่ของคุณคือสแกนข้อความภาษาไทยและอังกฤษ
- ทำการเซ็นเซอร์/ลบข้อมูลส่วนบุคคล (PII/PDPA) เช่น ชื่อบุคคลจริง เบอร์โทรศัพท์ เลขบัญชีธนาคาร หรือรหัสผ่านต่างๆ
- แทนที่ด้วยคำแทน เช่น [REDACTED_NAME], [REDACTED_PHONE], [REDACTED_ACCOUNT]
- ส่งข้อความที่ถูกเซ็นเซอร์เรียบร้อยแล้วกลับมาทั้งหมด โดยห้ามละทิ้งเนื้อหาอื่นๆ หรือพูดจาโต้ตอบใดๆ`;

  const response = await chat({
    model: 'qwen2.5:3b',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text }
    ],
    temperature: 0.1
  });

  return response.text;
}

async function main() {
  const args = process.argv.slice(2);
  const targetFile = args[0];
  if (!targetFile) {
    console.log('Usage: npm run local:privacy [path_to_file]');
    process.exit(0);
  }

  const fullPath = path.resolve(ROOT, targetFile);
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ ไม่พบไฟล์ที่กำหนด: ${targetFile}`);
    process.exit(1);
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  console.log(`🛡️ กำลังแอบสแกนเซ็นเซอร์ไฟล์ PDPA/PII: ${targetFile}...`);

  try {
    const scrubbedContent = await scrubPII(content);
    fs.writeFileSync(fullPath, scrubbedContent);
    console.log(`✅ เซ็นเซอร์ปกป้องข้อมูลส่วนบุคคลในไฟล์เรียบร้อยแล้วค่ะ! -> ${targetFile}`);
  } catch (err) {
    console.error(`❌ เกิดข้อผิดพลาดในการป้องกันความเป็นส่วนตัว: ${err.message}`);
  }
}

main();
