/**
 * KB Deduplication Scanner
 * 
 * A zero-dependency Node.js script that recursively scans all Markdown (.md) files,
 * extracts titles and content previews, tracks modification hashes and check timestamps,
 * and calls the Gemini API (using a robust multi-model fallback chain)
 * to detect duplication and recommend consolidation.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ─── Configurations ───────────────────────────────────────────────────────────
const WIKI_DIR = path.resolve(__dirname, '../wiki');
const SCRIPTS_DIR = __dirname;
const MANIFEST_PATH = path.join(SCRIPTS_DIR, 'scan-metadata.json');
const REPORT_PATH = path.join(WIKI_DIR, 'projects/kb-dedup-report.md');
const ENV_PATH = path.resolve(__dirname, '../../b3-team-avenger/.env.local');

// We focus ONLY on actual knowledge directories and skip system logs/recycle to save tokens and fit rate limits perfectly!
const ALLOWED_SUBDIRS = ['', 'projects', 'cit', 'it-infrastructure', 'jong-jaroen', 'to-b3'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calculateHash(content) {
  return crypto.createHash('md5').update(content, 'utf8').digest('hex');
}

function discoverGeminiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  try {
    if (fs.existsSync(ENV_PATH)) {
      const envContent = fs.readFileSync(ENV_PATH, 'utf8');
      const match = envContent.match(/^GEMINI_API_KEY\s*=\s*(.+)$/m);
      if (match) {
        return match[1].trim();
      }
    }
  } catch (e) {
    console.error('Failed to read .env.local for API key:', e.message);
  }
  return null;
}

function loadManifest() {
  if (fs.existsSync(MANIFEST_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    } catch (e) {
      console.warn('Corrupted manifest. Creating a new one.');
    }
  }
  return {};
}

function saveManifest(manifest) {
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`Saved check manifest to: ${MANIFEST_PATH}`);
}

function scanFiles(dir, fileList = []) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Exclude system/recycle directories
      if (['.git', '.obsidian', 'node_modules', 'recycle', 'b3-avenger', 'bridge', 'monitoring'].includes(item)) continue;
      scanFiles(fullPath, fileList);
    } else if (stat.isFile() && item.endsWith('.md')) {
      // Skip the report itself
      if (item === 'kb-dedup-report.md') continue;
      
      // Filter by allowed knowledge subdirectories
      const relPath = path.relative(WIKI_DIR, fullPath).replace(/\\/g, '/');
      const parts = relPath.split('/');
      const subDir = parts.length > 1 ? parts[0] : '';
      
      if (ALLOWED_SUBDIRS.includes(subDir)) {
        fileList.push(fullPath);
      }
    }
  }
  return fileList;
}

// ─── Main Scanner Logic ───────────────────────────────────────────────────────
async function run() {
  console.log('=== Starting Second Brain KB Deduplication Scanner ===');
  
  const apiKey = discoverGeminiKey();
  if (!apiKey) {
    console.error('Error: GEMINI_API_KEY not found in process.env or .env.local!');
    process.exit(1);
  }
  console.log('Found Gemini API Key.');

  const manifest = loadManifest();
  const mdFiles = scanFiles(WIKI_DIR);
  console.log(`Found ${mdFiles.length} high-value markdown files in wiki/ (filtered knowledge subdirs)`);

  const fileDataList = [];
  let changeCount = 0;
  const now = new Date().toISOString();

  for (const filePath of mdFiles) {
    const relPath = path.relative(WIKI_DIR, filePath).replace(/\\/g, '/');
    const content = fs.readFileSync(filePath, 'utf8');
    const contentHash = calculateHash(content);
    
    // Extract title (first line starting with '#')
    let title = path.basename(filePath, '.md');
    const titleMatch = content.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }

    // Check if changed
    const record = manifest[relPath];
    let hasChanged = true;
    let lastChecked = 'Never';

    if (record) {
      lastChecked = record.lastChecked;
      if (record.hash === contentHash) {
        hasChanged = false;
      }
    }

    if (hasChanged) {
      changeCount++;
      manifest[relPath] = {
        title,
        hash: contentHash,
        lastChecked: now
      };
    }

    // Compact Excerpt (first 400 characters, single-spaced) to protect context window and avoid 429 rate limit
    const excerpt = content.slice(0, 400).replace(/\s+/g, ' ').trim();

    fileDataList.push({
      path: relPath,
      title,
      lastChecked: manifest[relPath].lastChecked,
      hasChanged,
      excerpt
    });
  }

  console.log(`Scanned ${mdFiles.length} files. ${changeCount} files are new or modified since last check.`);
  saveManifest(manifest);

  const prompt = `You are a high-level Knowledge Base Architect and Second Brain expert.
Analyze this list of Markdown files in a personal/enterprise Wiki. Identify directories, projects, or documents that overlap significantly, contain duplicate information, or should be consolidated to preserve the "One Master KB" philosophy.

Here is the list of markdown files, their paths, titles, scan times, and compact excerpts of their contents:
${JSON.stringify(fileDataList, null, 2)}

Please write a comprehensive, professional, and visually beautiful Markdown Report in Thai. Keep the tone polite and strategic ("ค่ะ", "คุณบีสาม").
Structure the report exactly like this:

# 🧹 รายงานการวิเคราะห์และลดความซ้อนของข้อมูล (Second Brain KB Deduplication)
**วันที่สแกนล่าสุด:** ${new Date().toLocaleDateString('th-TH')} ณ เวลา ${new Date().toLocaleTimeString('th-TH')}
**จำนวนไฟล์ทั้งหมดในคลัง:** ${mdFiles.length} ไฟล์
**จำนวนไฟล์ที่มีการแก้ไขล่าสุด:** ${changeCount} ไฟล์

---

## 📊 บทสรุปภาพรวม (Executive Summary)
สรุปภาพรวมความซ้ำซ้อนของข้อมูลใน Second Brain (เช่น โซนไหนมีไฟล์ขยะหรือบรีฟซ้ำซ้อนเยอะ, สภาพความสะอาดโดยรวมกี่ % และทิศทางการยกระดับความรู้เป็น Master KB)

---

## 🔍 จุดที่พบข้อมูลทับซ้อนหรือซ้ำซ้อน (Detected Overlaps & Duplicates)
ระบุรายการไฟล์ที่ทับซ้อนกัน โดยแบ่งระดับความรุนแรง (ความเหมือน) เช่น:

### 🔴 ระดับความทับซ้อนสูง (High Overlap - แนะนำให้ควบรวมทันที)
สำหรับแต่ละคู่/กลุ่ม ให้ระบุ:
- **ไฟล์หลักที่ควรเก็บ (Target File):** [basename](file_path)
- **ไฟล์รองที่ควรยุบ/ย้าย (Duplicate File):** [basename](file_path)
- **เหตุผลการทับซ้อน:** อธิบายรายละเอียดทางเทคนิค
- **แนวทางปฏิบัติ (Action Plan):** ขั้นตอนการควบรวมหรือย้ายไปถังขยะ (recycle)

### 🟡 ระดับความทับซ้อนปานกลาง (Medium Overlap - แนะนำให้ทำ Cross-link หรือปรับปรุงหัวข้อ)
สำหรับแต่ละกลุ่มระบุความสัมพันธ์ และวิธีการจัดการ

---

## 🧠 ไอเดียเชิงสถาปัตยกรรมและโอกาสใหม่ (New Architectural Insights & Opportunities)
จากข้อมูลทั้งหมดที่คุณสแกนอ่านมาทั้งหมด:
1. **คุณพบบริบทหรือหัวข้อความรู้อะไรใหม่ ๆ ใน Second Brain ของคุณบีสามบ้าง?**
2. **มีไอเดียในการสร้างระบบ Automation หรือนวัตกรรมอะไรที่จะมาเสริมโปรเจกต์ของบริษัท เช่น Jong-Jaroen หรือ IT Support ได้บ้าง?** (เสนอแนวคิดเจ๋ง ๆ 2-3 ข้อ ที่คุณบีสามอ่านแล้วต้องว้าว)

---

## 📅 แผนการทำความสะอาด (Action Steps Checklist)
ทำ Checklist สวยงามให้คุณบีสามสามารถกดติ๊กตามเมื่อทำเสร็จ

---
**หมายเหตุ:** รายงานนี้สร้างขึ้นโดย AI อัตโนมัติและสแกนประวัติผ่านไฟล์ scan-metadata.json เสมอค่ะ`;

  const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
  let succeeded = false;
  let reportText = '';

  for (const modelName of models) {
    if (succeeded) break;
    console.log(`Sending metadata to ${modelName} for semantic overlap analysis...`);
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (res.ok) {
        const json = await res.json();
        reportText = json.candidates[0].content.parts[0].text;
        succeeded = true;
        console.log(`SUCCESS! Semantic analysis completed using model: ${modelName}`);
      } else {
        const errText = await res.text();
        console.warn(`Model ${modelName} returned status ${res.status}. Error: ${errText.substring(0, 100)}... trying next model.`);
      }
    } catch (e) {
      console.warn(`Exception during API call to ${modelName}:`, e.message, 'trying next model.');
    }
  }

  if (succeeded && reportText) {
    // Ensure projects folder exists inside wiki
    const projectsDir = path.dirname(REPORT_PATH);
    if (!fs.existsSync(projectsDir)) {
      fs.mkdirSync(projectsDir, { recursive: true });
    }

    fs.writeFileSync(REPORT_PATH, reportText, 'utf8');
    console.log(`SUCCESS! Beautiful deduplication report written to: ${REPORT_PATH}`);
  } else {
    console.error('CRITICAL: All Gemini models in the fallback chain failed due to rate limits or invalid quota.');
    process.exit(1);
  }
}

run();
