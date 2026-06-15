#!/usr/bin/env node
/**
 * local-self-healing.js - B3 Compiler Self-Healing Assistant
 * ตรวจสอบ Error Log จากการคอมไพล์โค้ด Next.js และทำการแก้ไขไฟล์อัตโนมัติด้วย Local AI (Qwen)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const { chat, ROOT } = require('./local-ai-client');

async function askQwen(prompt) {
  const systemPrompt = `You are Qwen Coder, the B3 Self-healing system.
- คุณมีหน้าที่วิเคราะห์ Error Log ของภาษา TypeScript/Next.js
- และส่งคืนคำตอบในรูปแบบ Patch การแก้ไขเฉพาะเนื้อหาโค้ดที่เป็นตัวอักษรดิบที่จะนำไปแก้ไขเขียนทับลงไฟล์โดยตรง
- ห้ามมีคำอธิบายอื่นๆ นอกเหนือจากตัวโค้ดที่ถูกต้องสมบูรณ์แล้วในกล่องข้อความ`;

  const response = await chat({
    model: 'qwen2.5-coder:3b',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ],
    temperature: 0.1
  });

  return response.text;
}

async function main() {
  const errorLogPath = path.join(ROOT, 'errors.log');
  if (!fs.existsSync(errorLogPath)) {
    console.log('✅ ไม่มีไฟล์ errors.log อยู่ในขณะนี้ ระบบทำงานปกติไม่มีจุดผิดพลาดค่ะ');
    process.exit(0);
  }

  const errorLogs = fs.readFileSync(errorLogPath, 'utf8');
  console.log('🚨 ตรวจพบจุดพังใน errors.log กำลังเรียก Qwen มาประเมินเพื่อซ่อมแซมโค้ด...');

  // วิเคราะห์หาชื่อไฟล์จาก Log เพื่อนำมารับการแก้ไข
  const fileRegex = /([a-zA-Z0-9_\-\/]+\.(ts|tsx|js|jsx))/;
  const match = errorLogs.match(fileRegex);
  if (!match) {
    console.log('❌ ไม่พบชื่อไฟล์ที่พังใน Error Logs');
    process.exit(1);
  }

  const relativePath = match[1];
  const targetFile = path.resolve(ROOT, relativePath);
  if (!fs.existsSync(targetFile)) {
    console.log(`❌ ไฟล์เป้าหมายไม่มีอยู่จริงในเครื่อง: ${targetFile}`);
    process.exit(1);
  }

  const originalContent = fs.readFileSync(targetFile, 'utf8');
  const prompt = `นี่คือไฟล์ที่เกิด Error:\n--- File Path: ${relativePath} ---\n${originalContent}\n\nนี่คือข้อความพังของ compiler (Error Logs):\n${errorLogs}\n\nช่วยเขียนแก้ไขโค้ดทั้งหมดของไฟล์นี้ให้ถูกต้องสมบูรณ์และไม่มี Error ห้ามพิมพ์คำอธิบายอื่นนอกจากตัวโค้ดที่ถูกต้องเท่านั้นค่ะ`;

  try {
    const fixedCode = await askQwen(prompt);
    if (fixedCode && fixedCode.trim().length > 10) {
      // ทำการเขียนทับซ่อมแซมไฟล์
      fs.writeFileSync(targetFile, fixedCode.replace(/^```[a-z]*\r?\n|```$/g, ''));
      console.log(`🩹 ซ่อมแซมไฟล์โค้ดอัตโนมัติสำเร็จแล้วค่ะ! -> ${relativePath}`);
      fs.unlinkSync(errorLogPath); // ลบไฟล์ log
    } else {
      console.log('❌ Qwen ไม่สามารถหาวิธีซ่อมแซมโค้ดที่เหมาะสมได้ค่ะ');
    }
  } catch (err) {
    console.error(`❌ เกิดความล้มเหลวในการซ่อมแซม: ${err.message}`);
  }
}

main();
