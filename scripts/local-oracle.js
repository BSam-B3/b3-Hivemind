#!/usr/bin/env node
/**
 * local-oracle.js - B3 Codebase Oracle
 * ค้นหาข้อมูลโครงสร้างโปรเจกต์และตอบคำถามเชิงลึกเกี่ยวกับโค้ดออฟไลน์
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const { chat, ROOT } = require('./local-ai-client');

async function askOracle(prompt) {
  const systemPrompt = `You are the B3 Codebase Oracle. 
- ให้วิเคราะห์โครงสร้างโค้ดและตอบกลับเป็นภาษาไทยอธิบายรายละเอียดหลัก 
- กำกับด้วยคำศัพท์ภาษาอังกฤษเชิงพัฒนาซอฟต์แวร์ (Technical English Terms) เสมอเพื่อให้คุณบีสามได้เรียนรู้
- รวบรวมข้อมูลไฟล์และเส้นทาง (File Paths) ให้แม่นยำ`;

  const response = await chat({
    model: 'qwen2.5:3b',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ],
    temperature: 0.2
  });

  return response.text;
}

// ค้นหาคำหลักในไฟล์สำคัญเบื้องต้น
function searchKeywords(query) {
  const filesToScan = [
    'wiki/cit/cit-project.md',
    'wiki/cit/schema-reference.md',
    'CLAUDE.md',
    'GEMINI.md'
  ];
  let context = '';
  for (const f of filesToScan) {
    const full = path.join(ROOT, f);
    if (fs.existsSync(full)) {
      const content = fs.readFileSync(full, 'utf8');
      if (content.toLowerCase().includes(query.toLowerCase())) {
        context += `### จากไฟล์: ${f}\n${content.slice(0, 1000)}...\n\n`;
      }
    }
  }
  return context || 'ไม่มีข้อมูลดิบเพิ่มเติม';
}

async function main() {
  const args = process.argv.slice(2);
  const query = args.join(' ');
  if (!query) {
    console.log('Usage: npm run local:oracle "คำถามเกี่ยวกับโครงสร้างโค้ดหรือฐานข้อมูล"');
    process.exit(0);
  }

  console.log(`🔮 Oracle กำลังวิเคราะห์คำถามเกี่ยวกับ: "${query}"...`);
  const rawData = searchKeywords(query);
  const prompt = `คำถามของคุณบีสาม: "${query}"\n\nนี่คือข้อมูลโครงสร้างระบบที่ค้นพบเบื้องต้นในเครื่อง:\n${rawData}\n\nช่วยตอบคำถามนี้ให้ละเอียดหน่อยค่ะ`;

  try {
    const answer = await askOracle(prompt);
    console.log('\n==================================================');
    console.log('🔮 B3 CODEBASE ORACLE ANSWER (ผลลัพธ์การขุดหาข้อมูลระบบ)');
    console.log('==================================================\n');
    console.log(answer);
    console.log('\n==================================================');
  } catch (err) {
    console.error(`❌ Oracle ทำงานพลาด: ${err.message}`);
  }
}

main();
