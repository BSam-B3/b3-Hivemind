#!/usr/bin/env node
/**
 * scripts/local-agent-loop.js — Level 2 Hybrid Agent Loop
 * รันกระบวนการสามขั้นตอน: วิเคราะห์ความยาก -> ร่างด้วยโมเดลเครื่อง -> ส่งคลาวด์เกลาตัวจบ (ลดการรันโมเดลใหญ่)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const { chat, pickModel, ROOT } = require('./local-ai-client');

function usage() {
  console.log('Usage: node scripts/local-agent-loop.js "คำสั่งพัฒนาระบบ/แก้ไขโค้ด" [--task-id TASK_ID]');
}

async function classifyComplexity(prompt) {
  console.log('🧠 [Step 1/3] Ailocal กำลังวิเคราะห์ระดับความซับซ้อนของงาน...');
  const systemPrompt = `Analyze the given task. Reply with exactly '[SIMPLE]' if it is a single-file task, minor code utility, formatting, or explanation. Reply with '[COMPLEX]' if it involves database migrations, security audits, multiple file edits, or external API integrations. Do not add any explanation.`;
  
  try {
    const res = await chat({
      model: 'qwen2.5:3b',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
      maxTokens: 16
    });
    
    const ans = res.text.trim();
    if (ans.includes('[SIMPLE]')) return 'simple';
    return 'complex';
  } catch (err) {
    console.log(`⚠️ ไม่สามารถวิเคราะห์ได้เนื่องจาก: ${err.message}. กำหนดให้เป็น COMPLEX เพื่อความปลอดภัย`);
    return 'complex';
  }
}

async function generateLocalDraft(prompt) {
  console.log('📝 [Step 2/3] Ailocal กำลังเขียนแบบร่างโครงสร้างความรู้และโค้ดในรูปแบบ JSON...');
  const model = pickModel(prompt);
  
  const systemPrompt = `You are a professional software engineer. You must respond with a JSON object ONLY. Do not write markdown wrappers outside the JSON, do not write conversational text.
Your JSON response must follow this schema:
{
  "task_type": "string (e.g., utility_function, bug_fix, explainer)",
  "confidence": 0.95, // float between 0.0 and 1.0 (how confident you are in your draft)
  "draft": "string containing your generated code or explanation",
  "needs_review": ["list of potential edge cases or warnings"],
  "route_next": "string (e.g. 'done' if confident, or 'claude-review' if you think a senior dev should review)"
}`;

  const res = await chat({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ],
    temperature: 0.2
  });
  
  // พยายามแกะ JSON ด้วย Auto-Recovery Parser
  let parsedJson = null;
  const rawText = res.text.trim();
  try {
    // 1. ลอง parse ตรงๆ
    parsedJson = JSON.parse(rawText);
  } catch (e) {
    // 2. ลองกวาดเอาเฉพาะบล็อก { ... }
    const match = rawText.match(/\{[\s\S]*?\}/);
    if (match) {
      try {
        parsedJson = JSON.parse(match[0]);
      } catch (innerErr) {
        console.log('⚠️ ตัวสแกนโครงสร้างไม่สามารถแปลง JSON ย่อยได้');
      }
    }
  }

  if (!parsedJson) {
    console.log('⚠️ ผลลัพธ์จากโมเดลเครื่องไม่ได้มาตรฐาน JSON ทำการตั้งค่า fallback ดีฟอลต์');
    parsedJson = {
      task_type: 'unknown',
      confidence: 0.5,
      draft: rawText,
      needs_review: ['Failed to output standard JSON format'],
      route_next: 'claude-review'
    };
  }

  return { result: parsedJson, modelUsed: model };
}

async function main() {
  const args = process.argv.slice(2);
  const taskIdIdx = args.indexOf('--task-id');
  let taskId = null;
  if (taskIdIdx >= 0) {
    taskId = args[taskIdIdx + 1];
  }

  const prompt = args
    .filter(arg => !arg.startsWith('--'))
    .filter((arg, idx, arr) => {
      if (idx > 0 && arr[idx - 1] === '--task-id') return false;
      if (arg === '--task-id') return false;
      return true;
    })
    .join(' ')
    .trim();

  if (!prompt) {
    usage();
    process.exit(1);
  }

  const complexity = await classifyComplexity(prompt);
  console.log(`📊 ผลลัพธ์การจัดประเภท: งานมีความซับซ้อนระดับ [${complexity.toUpperCase()}]`);

  if (complexity === 'simple') {
    const { result, modelUsed } = await generateLocalDraft(prompt);
    
    console.log('\n==================================================');
    console.log(`📊 STRUCTURAL ANALYSIS (Ailocal: ${modelUsed})`);
    console.log('==================================================');
    console.log(`📁 Task Type: ${result.task_type}`);
    console.log(`🎯 Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log(`🚦 Route Next: ${result.route_next}`);
    if (result.needs_review && result.needs_review.length > 0) {
      console.log(`⚠️ จุดที่ต้องระวัง: \n  - ${result.needs_review.join('\n  - ')}`);
    }
    console.log('\n==================================================');
    console.log('📝 DRAFT OUTPUT:');
    console.log('==================================================\n');
    console.log(result.draft);
    console.log('\n==================================================');

    // ตรวจสอบระดับความมั่นใจ (Confidence Gate)
    if (result.confidence < 0.7 || result.route_next === 'claude-review') {
      console.log('\n🚦 [Confidence Guard Check]: ความมั่นใจต่ำกว่าเกณฑ์ หรือต้องการ Review ส่งต่อให้ Claude ทันที...');
      if (!taskId) taskId = `CONFIDENCE-FALLBACK-${Date.now()}`;
      try {
        execSync(`node scripts/trigger-ai.js --from local --to claude --task "${taskId}" --instruction "ช่วยตรวจทานแบบร่างนี้ที่เขียนโดยโมเดลเครื่อง: ${result.draft}"`, {
          cwd: ROOT,
          stdio: 'inherit'
        });
        console.log(`✅ ส่งร่างให้ Claude ตรวจสอบเรียบร้อย (Task ID: ${taskId})`);
      } catch (err) {
        console.error(`❌ ส่งต่อร่างล้มเหลว: ${err.message}`);
      }
      return;
    }
    
    if (taskId) {
      const outputDir = path.join(ROOT, 'wiki', 'ai-war-room', 'sessions', taskId);
      fs.mkdirSync(outputDir, { recursive: true });
      fs.writeFileSync(path.join(outputDir, 'local-draft.json'), JSON.stringify(result, null, 2), 'utf8');
      console.log(`✅ บันทึกร่างโครงสร้างวิเคราะห์เสร็จสิ้นที่: wiki/ai-war-room/sessions/${taskId}/local-draft.json`);
    }
  } else {
    // หากซับซ้อนมาก ให้ส่งสเปกให้โมเดลใหญ่ (Claude) รีดพลังเต็มที่
    console.log('🚀 [Step 3/3] งานมีความซับซ้อนสูงเกินไปสำหรับโมเดลเครื่อง ยื่นส่งให้ Claude จัดการ...');
    if (!taskId) {
      taskId = `HYBRID-RUN-${Date.now()}`;
    }

    try {
      execSync(`node scripts/trigger-ai.js --from local --to claude --task "${taskId}" --instruction "วิเคราะห์สถาปัตยกรรมและเขียนโค้ดสำหรับงานต่อไปนี้: ${prompt}"`, {
        cwd: ROOT,
        stdio: 'inherit'
      });
      console.log(`✅ ส่งงานเข้าคิวและแจ้งเตือน Claude สำเร็จ (Task ID: ${taskId})`);
    } catch (err) {
      console.error(`❌ ไม่สามารถยิง trigger หา Claude ได้: ${err.message}`);
    }
  }
}

main().catch(err => console.error(err));
