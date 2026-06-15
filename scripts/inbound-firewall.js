#!/usr/bin/env node
/**
 * scripts/inbound-firewall.js — B3 HiveMind Inbound Firewall (Quarantine Scanner)
 * ทำหน้าที่สแกน คัดกรองความสมเหตุสมผล และอนุมัติบทเรียนใหม่จากภายนอกเข้าสู่สมองหลัก
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const QUARANTINE_DIR = path.join(ROOT, 'wiki', 'quarantine');
const LESSONS_FILE = path.join(ROOT, 'wiki', 'ai-team', 'shared-lessons.md');

// สร้างโฟลเดอร์กักกันโรคหากยังไม่มี
if (!fs.existsSync(QUARANTINE_DIR)) {
  fs.mkdirSync(QUARANTINE_DIR, { recursive: true });
}

// เรียกใช้ Gemini ผ่านสคริปต์ ask-gemini.js เพื่อประเมินบทเรียน
function evaluateLessonWithGemini(lessonContent) {
  console.log('🔮 ส่งบทเรียนไปให้ Gemini ตรวจสอบความถูกต้องและปลอดภัย...');
  
  const prompt = [
    `คุณคือ AI System Architect หน้าที่ของคุณคือการประเมินวิเคราะห์บทเรียนการพัฒนาโปรเจกต์ต่อไปนี้`,
    `ตรวจสอบว่าข้อมูลต่อไปนี้ถูกต้อง ปราศจากข้อมูลความลับ และไม่ขัดแย้งกับสไตล์ไกด์หลักของเรา`,
    `---`,
    lessonContent,
    `---`,
    `ช่วยส่งคำตอบกลับเป็น JSON รูปแบบนี้เท่านั้น ห้ามมีคำอธิบายเพิ่ม:`,
    `{`,
    `  "score": 0.85, // (คะแนน 0.0 - 1.0)`,
    `  "safe": true,  // (true/false ปราศจากคีย์ลับ/รหัสผ่าน)`,
    `  "reason": "สรุปสั้นๆ เป็นภาษาไทยอธิบายผลประเมิน"`,
    `}`
  ].join('\n');

  try {
    // รัน Gemini ผ่าน ask-gemini.js และเซฟผลลัพธ์ลงไฟล์ชั่วคราว
    const tempFile = path.join(ROOT, 'scratch', 'quarantine-eval-prompt.txt');
    fs.mkdirSync(path.dirname(tempFile), { recursive: true });
    fs.writeFileSync(tempFile, prompt, 'utf8');
    
    // เรียกใช้ ask-gemini.js (รันเพื่อรับคำตอบเป็นข้อความดิบ)
    const resultText = execSync(`node scripts/ask-gemini.js --file "${tempFile}"`, { cwd: ROOT, encoding: 'utf8' });
    
    // ลองดึงเฉพาะ JSON ออกจากผลลัพธ์
    const match = resultText.match(/\{[\s\S]*?\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    return { score: 0, safe: false, reason: 'ไม่สามารถแยกวิเคราะห์คำตอบจาก Gemini' };
  } catch (err) {
    console.error(`❌ ประเมินผลลัพธ์ด้วย Gemini ล้มเหลว: ${err.message}`);
    return { score: 0, safe: false, reason: 'เกิดข้อผิดพลาดในการรันโมเดลคลาวด์' };
  }
}

function appendToSharedLessons(lessonTitle, author, content) {
  const now = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok' }).slice(0, 16) + ' ICT';
  const entry = [
    `\n## [บทเรียนที่ได้รับการอนุมัติ] ${lessonTitle} — (${author})`,
    `**วันที่ตรวจสอบ:** ${now}`,
    `### สาระสำคัญ:`,
    content,
    `\n---\n`
  ].join('\n');

  fs.appendFileSync(LESSONS_FILE, entry, 'utf8');
  console.log(`✅ บันทึกความรู้ใหม่เข้าสู่ shared-lessons.md เรียบร้อยแล้วค่ะ`);
}

function processQuarantine() {
  console.log('🛡️ [Inbound Firewall] กำลังตรวจค้นโฟลเดอร์กักกันวิกิ...');
  
  const files = fs.readdirSync(QUARANTINE_DIR).filter(f => f.endsWith('.json') || f.endsWith('.md'));
  if (files.length === 0) {
    console.log('📭 ไม่พบความรู้ใหม่รอการคัดกรองในขณะนี้ค่ะ');
    return;
  }

  console.log(`📦 ตรวจพบความรู้ใหม่ทั้งหมด ${files.length} รายการ`);

  for (const file of files) {
    const fullPath = path.join(QUARANTINE_DIR, file);
    const rawContent = fs.readFileSync(fullPath, 'utf8');
    let title = file;
    let author = 'unknown-agent';
    let dataToEval = rawContent;

    if (file.endsWith('.json')) {
      try {
        const json = JSON.parse(rawContent);
        title = json.title || title;
        author = json.author || author;
        dataToEval = json.content || dataToEval;
      } catch (e) {
        console.log(`❌ ไฟล์ JSON เสียหายหรือไม่ถูกต้อง: ${file}`);
        fs.unlinkSync(fullPath);
        continue;
      }
    }

    const evaluation = evaluateLessonWithGemini(dataToEval);
    console.log(`📊 ผลประเมิน [${file}]: คะแนน ${evaluation.score * 100}% | ปลอดภัย: ${evaluation.safe} | เหตุผล: ${evaluation.reason}`);

    if (evaluation.safe && evaluation.score >= 0.8) {
      // ผ่านการอนุมัติไฟร์วอลล์
      appendToSharedLessons(title, author, dataToEval);
    } else {
      console.log(`❌ บทเรียน ${file} ถูกปฏิเสธเนื่องจากคะแนนไม่ถึงเกณฑ์ หรือมีความเสี่ยงข้อมูลรั่วไหล`);
    }

    // ลบไฟล์ในโฟลเดอร์กักกันโรคออกหลังจากประเมินเสร็จ
    fs.unlinkSync(fullPath);
  }
}

processQuarantine();
