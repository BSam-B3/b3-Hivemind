#!/usr/bin/env node
/**
 * ask-gemini.js — B3 Team Gemini Wrapper
 * Auto-injects: system prompt + กฏ + project context + mini-project handoff
 *
 * Usage:
 *   node scripts/ask-gemini.js "ออกแบบ network map feature"
 *   node scripts/ask-gemini.js "รับงานต่อ MP-20260602-001" --handoff
 *   node scripts/ask-gemini.js --task "GEMINI-INSTRUCTIONS.md"  ← อ่าน task จากไฟล์
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// ── Config ──────────────────────────────────────────────────────
const BASE = path.join(__dirname, '..');

// Auto-load .env
const envPath = path.join(BASE, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && v.length) process.env[k.trim()] = v.join('=').trim();
  });
}

const API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';


// ── Load Context ─────────────────────────────────────────────────
function readFileSafe(filePath, limit = 3000) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.length > limit ? content.slice(0, limit) + '\n...[truncated]' : content;
  } catch { return ''; }
}

function buildSystemPrompt() {
  const rules = readFileSafe(path.join(BASE, 'wiki', 'bridge', 'GEMINI-STARTER-PROMPT.md'), 2000);
  let basePrompt = rules.replace(/```[\s\S]*?```/g, m => m.replace(/^```\n?|\n?```$/g, '')) || `
คุณคือ เจม (GEM) — AI System Architect ในทีม B3
ตอบสั้น กระชับ ตรงประเด็น ลงท้าย "ค่ะ"
บอก token ท้าย task: "Gemini: Xk / 1M limit"
  `.trim();

  // กำหนดกฎการสรุปภาษาไทยคู่ภาษาอังกฤษเชิงเทคนิค
  basePrompt += `\n\n[BILINGUAL & DOCUMENTATION RULE]
- สำหรับข้อมูลเชิงเทคนิคหรือการสื่อสารกับ AI ด้วยกัน ให้ใช้ภาษาอังกฤษเชิงพัฒนาซอฟต์แวร์ (Technical English) เพื่อความประหยัดและแม่นยำ
- แต่เมื่อทำการเขียนสรุป บันทึกเอกสาร (wiki) หรือแจ้งผลการทำงานให้คุณบีสาม (Human) อ่าน "ต้องมีภาษาไทยอธิบายเสมอและกำกับคำศัพท์ภาษาอังกฤษควบคู่ไปด้วย" เพื่อช่วยให้คุณบีสามเข้าใจได้ง่ายและได้ฝึกฝนภาษาอังกฤษไปด้วยในตัวค่ะ
- ตัวอย่าง: "ตารางนี้ใช้เก็บข้อมูลสถานะการชำระเงิน (Payment Status) โดยมีคอลัมน์ status คอยตรวจสอบความถูกต้อง..."`;

  return basePrompt;
}

function buildUserMessage(task, isHandoff, taskFile) {
  let message = '';

  // ถ้าอ่าน task จากไฟล์ (GEMINI-INSTRUCTIONS.md)
  if (taskFile) {
    const instrFile = path.join(BASE, 'wiki', 'to-b3', taskFile.includes('/') ? taskFile : taskFile);
    const instructions = readFileSafe(instrFile, 4000);
    if (instructions) message += `## Task จาก GEMINI-INSTRUCTIONS.md\n${instructions}\n\n`;
  }

  // ถ้าเป็น handoff → แนบ mini-project
  if (isHandoff) {
    const mpDir = path.join(BASE, 'wiki', 'mini-projects');
    const files = fs.readdirSync(mpDir).filter(f => f.endsWith('.md') && f !== 'README.md' && !f.startsWith('_'));
    for (const file of files) {
      const content = fs.readFileSync(path.join(mpDir, file), 'utf8');
      if (content.includes('🔁 Handoff') || content.includes('🔄 In Progress')) {
        message += `## Mini-Project ที่ต้องรับงานต่อ: ${file}\n${readFileSafe(path.join(mpDir, file), 2000)}\n\n`;
        break;
      }
    }
  }

  // คำสั่งจาก B3
  if (task) message += `## คำสั่งจาก B3\n${task}`;

  return message || 'สรุปสถานะโปรเจคปัจจุบันให้หน่อยค่ะ';
}

function readTaskFileFromRoot(relativeFile) {
  if (!relativeFile) return '';
  const normalized = relativeFile.replace(/\\/g, '/').replace(/^\/+/, '');
  const fullPath = path.resolve(BASE, normalized);
  if (!fullPath.startsWith(path.resolve(BASE))) {
    throw new Error(`Unsafe --file path: ${relativeFile}`);
  }
  return readFileSafe(fullPath, 20000);
}

// ── Gemini API Call ──────────────────────────────────────────────
async function askGemini(systemPrompt, userMessage) {
  if (!API_KEY) throw new Error('ไม่มี GEMINI_API_KEY');
  const body = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: userMessage }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: { temperature: 0.7, maxOutputTokens: 8192 }
  });

  return new Promise((resolve, reject) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${API_KEY}`;
    const req = https.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) {
            reject(new Error(`Gemini API Error: ${json.error.message}`));
            return;
          }
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) {
            reject(new Error(`No content. Raw: ${JSON.stringify(json).slice(0, 300)}`));
            return;
          }
          const tokens = json.usageMetadata?.totalTokenCount || 0;
          resolve({ text, tokens });
        } catch (e) { reject(new Error(`Parse error: ${data.slice(0, 200)}`)); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Groq Fallback (ใช้เมื่อ Gemini/Local API มีปัญหา) ──────────────
async function askGroq(systemPrompt, userMessage) {
  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) throw new Error('ไม่มี GROQ_API_KEY');

  const body = JSON.stringify({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    max_tokens: 8192,
    temperature: 0.7
  });

  return new Promise((resolve, reject) => {
    const req = https.request('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const text = json.choices?.[0]?.message?.content;
          if (!text) reject(new Error(`Groq no content: ${data.slice(0, 200)}`));
          else resolve({ text, tokens: json.usage?.total_tokens || 0, provider: 'Groq' });
        } catch (e) { reject(new Error(`Groq parse error: ${data.slice(0, 200)}`)); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Save Return File ─────────────────────────────────────────────
function saveReturn(task, content, tokens) {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' ICT';
  const taskSlug = task.slice(0, 40).replace(/[^a-zA-Zก-๙0-9]/g, '-').replace(/-+/g, '-');
  const filename = `GEMINI-RETURN-${taskSlug}.md`;
  const filePath = path.join(BASE, 'wiki', 'to-b3', filename);

  fs.writeFileSync(filePath, `# Gemini Return: ${task}\n**วันที่:** ${timestamp}\n**Tokens:** ${tokens}\n\n---\n\n${content}\n`);
  return filename;
}

// ── Main ─────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const isHandoff = args.includes('--handoff');
  const taskFileIdx = args.indexOf('--task');
  const taskFile = taskFileIdx >= 0 ? args[taskFileIdx + 1] : null;
  const fileIdx = args.indexOf('--file');
  const directFile = fileIdx >= 0 ? args[fileIdx + 1] : null;

  const useLocal = args.includes('--local') || args.includes('--prefer-local') || args.includes('--local-model');
  if (useLocal) {
    console.error('[ask-gemini] --local moved to scripts/ask-local.js and is fail-closed.');
    console.error('[ask-gemini] Use: node scripts/ask-local.js "prompt" [--model qwen2.5:3b]');
    process.exit(1);
  }

  const task = args.filter(a => !a.startsWith('--') && a !== taskFile && a !== directFile).join(' ');

  console.log(`\n[ask-gemini] 🚀 ส่งงานให้เจม...`);
  if (task) console.log(`[ask-gemini] Task: "${task}"`);

  const systemPrompt = buildSystemPrompt();
  let userMessage = buildUserMessage(task, isHandoff, taskFile);
  if (directFile) {
    userMessage = `## Task file: ${directFile}\n${readTaskFileFromRoot(directFile)}\n\n${task ? `## Extra instruction\n${task}` : ''}`.trim();
  }

  try {
    let result;
    try {
      result = await askGemini(systemPrompt, userMessage);
      result.provider = 'Gemini (Cloud)';
    } catch (geminiErr) {
      if (geminiErr.message.includes('quota') || geminiErr.message.includes('Quota')) {
        console.log('[ask-gemini] ⚠️ Gemini quota หมด → fallback ไป Groq...');
        result = await askGroq(systemPrompt, userMessage);
      } else {
        throw geminiErr;
      }
    }

    const { text, tokens, provider } = result;

    console.log('\n' + '═'.repeat(50));
    console.log(`📬 ผลลัพธ์จาก ${provider}:`);
    console.log('═'.repeat(50));
    console.log(text);
    console.log('═'.repeat(50));
    console.log(`\n[Token] ${provider}: ${tokens.toLocaleString()} tokens used`);

    // บันทึก return file อัตโนมัติ
    const returnFile = saveReturn(task || 'gemini-task', text, tokens);
    console.log(`\n[ask-gemini] ✅ บันทึกผลลัพธ์ → wiki/to-b3/${returnFile}`);
    console.log('[ask-gemini] Claude จะ auto-detect และ implement ใน session ถัดไป');

  } catch (err) {
    console.error(`\n❌ Error: ${err.message}`);
    process.exit(1);
  }
}

main();
