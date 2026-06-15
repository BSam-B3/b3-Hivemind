#!/usr/bin/env node
/**
 * B3 HiveMind Onboarding Setup Wizard
 * สคริปต์ตั้งค่าเริ่มต้นแบบถาม-ตอบและคำสั่งด่วนสำหรับคนติดตั้งใหม่
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT, '.env');
const RULES_PATH = path.join(ROOT, 'wiki', 'ai-war-room', 'routing-rules.json');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

function loadEnv() {
  const env = {};
  if (fs.existsSync(ENV_PATH)) {
    fs.readFileSync(ENV_PATH, 'utf8').split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
      }
    });
  }
  return env;
}

function saveEnv(env) {
  const lines = Object.entries(env).map(([k, v]) => `${k}="${v}"`);
  fs.writeFileSync(ENV_PATH, lines.join('\n') + '\n', 'utf8');
}

async function handleCommand(cmd) {
  const env = loadEnv();
  const parts = cmd.trim().split(/\s+/);
  const action = parts[0].toLowerCase();

  switch (action) {
    case '/addai': {
      console.log('\n--- ➕ เพิ่มคีย์ AI ในทีม ---');
      const provider = await question('ระบุชื่อโมเดลคลาวด์ที่ต้องการเพิ่ม (claude / gemini / openai / deepseek): ');
      const key = await question('ระบุค่า API Key ของคุณ: ');
      
      const cleanProv = provider.trim().toLowerCase();
      if (cleanProv === 'claude') env.ANTHROPIC_API_KEY = key.trim();
      else if (cleanProv === 'gemini') env.GEMINI_API_KEY = key.trim();
      else if (cleanProv === 'openai') env.OPENAI_API_KEY = key.trim();
      else if (cleanProv === 'deepseek') env.DEEPSEEK_API_KEY = key.trim();
      else {
        console.log('❌ ไม่รู้จักค่ายที่ระบุ กรุณาเลือกตามค่ายที่กำหนด');
        break;
      }
      
      saveEnv(env);
      console.log(`✅ เพิ่มคีย์สำหรับ ${cleanProv} ใน .env เรียบร้อยค่ะ`);
      break;
    }
    case '/status': {
      console.log('\n🔮 กำลังรันการตรวจสอบระบบเบื้องหลัง...');
      try {
        const { execSync } = require('child_process');
        execSync('node scripts/local-doctor.js', { stdio: 'inherit' });
      } catch {
        console.log('❌ ตรวจสอบระบบล้มเหลว กรุณาเช็ก Ollama/One API ในเครื่อง');
      }
      break;
    }
    case '/help':
    default:
      console.log('\n📖 รายการคำสั่งด่วน:');
      console.log('  /addAi      - เพิ่มคีย์ API ของโมเดลคลาวด์เข้าสู่ระบบ (.env)');
      console.log('  /status     - รันตัวตรวจสอบสภาพความพร้อมระบบ (Local Doctor)');
      console.log('  /help       - แสดงหน้าความช่วยเหลือนี้');
      console.log('  /exit       - ออกจากเมนูตั้งค่า');
      break;
  }
}

async function main() {
  console.log('==================================================');
  console.log('🐝 ยินดีต้อนรับเข้าสู่ระบบตั้งค่าเริ่มต้น B3 HiveMind');
  console.log('==================================================\n');

  // 1. ถามข้อมูลโมเดลที่มี
  console.log('[ขั้นตอนที่ 1/2: การสำรวจโมเดลเอเจนต์]');
  console.log('ระบุโมเดลคลาวด์ที่คุณต้องการเชื่อมต่อใช้งาน (ใส่คอมมาคั่น เช่น claude,gemini,deepseek)');
  const aiAnswer = await question('คุณมี AI Token ค่ายใดบ้าง: ');
  const selectedModels = aiAnswer.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

  const env = loadEnv();
  console.log(`\n🤖 จัดเตรียมสภาพแวดล้อมสำหรับ: ${selectedModels.join(', ')}...`);
  
  // สร้างตัวแปรดัมมี่รอไว้ให้กรอกคีย์
  selectedModels.forEach(m => {
    if (m === 'claude' && !env.ANTHROPIC_API_KEY) env.ANTHROPIC_API_KEY = 'YOUR_CLAUDE_KEY_HERE';
    if (m === 'gemini' && !env.GEMINI_API_KEY) env.GEMINI_API_KEY = 'YOUR_GEMINI_KEY_HERE';
    if (m === 'openai' && !env.OPENAI_API_KEY) env.OPENAI_API_KEY = 'YOUR_OPENAI_KEY_HERE';
    if (m === 'deepseek' && !env.DEEPSEEK_API_KEY) env.DEEPSEEK_API_KEY = 'YOUR_DEEPSEEK_KEY_HERE';
  });
  saveEnv(env);
  console.log('✅ บันทึกโครงสร้างตัวแปรใน .env เรียบร้อยแล้วค่ะ');

  // 2. ถามชื่อโปรเจกต์
  console.log('\n[ขั้นตอนที่ 2/2: การตั้งค่ากลุ่มเป้าหมายโครงการ]');
  const hasProject = await question('คุณมีโปรเจกต์หลักที่ต้องการเริ่มสร้างไหมคะ (ระบุชื่อโปรเจกต์ หรือกด Enter เพื่อข้าม): ');
  
  if (hasProject.trim()) {
    const projName = hasProject.trim();
    const projSlug = projName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const projFile = path.join(ROOT, 'wiki', 'projects', `${projSlug}.md`);
    
    // สร้างโครงร่างโปรเจกต์อัตโนมัติ
    fs.mkdirSync(path.dirname(projFile), { recursive: true });
    fs.writeFileSync(projFile, [
      `# โครงการ: ${projName}`,
      `**หมวดหมู่:** ตั้งค่าโดยระบบตอบรับเริ่มต้นของ B3 HiveMind`,
      `**วันที่สร้าง:** ${new Date().toLocaleDateString('th-TH')}`,
      `---`,
      `## สิ่งที่ต้องการให้เอเจนต์ช่วยทำ`,
      `- (ระบุความต้องการของคุณตรงนี้ เพื่อให้ AI หยิบข้อมูลไปใช้)`,
    ].join('\n'), 'utf8');
    
    console.log(`✅ สร้างพิมพ์เขียวโปรเจกต์สำเร็จที่: wiki/projects/${projSlug}.md`);
    console.log(`🤖 AI ทุกตัวในทีมจะเริ่มดึงข้อมูลของโปรเจกต์นี้มาช่วยประมวลผลทันทีค่ะ`);
  }

  // 3. เข้าสู่เมนูการพิมพ์คำสั่งด่วน
  console.log('\n==================================================');
  console.log('🎉 ตั้งค่าเบื้องต้นเสร็จสิ้น! คุณสามารถพิมพ์คำสั่งด่วนเพื่อดำเนินการต่อได้');
  console.log('==================================================');
  await handleCommand('/help');

  while (true) {
    const input = await question('\nHiveMind COMMAND > ');
    if (input.trim().toLowerCase() === '/exit') {
      console.log('👋 บันทึกข้อมูลและปิดระบบตั้งค่า ขอบคุณค่ะ!');
      break;
    }
    await handleCommand(input);
  }

  rl.close();
}

main().catch(err => {
  console.error(err);
  rl.close();
});
