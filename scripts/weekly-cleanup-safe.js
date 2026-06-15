#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ARCHIVE = path.join(ROOT, 'wiki', 'recycle', new Date().toISOString().slice(0, 10), 'weekly-cleanup');
const TARGETS = [
  path.join(ROOT, 'wiki', 'ai-war-room', 'triggers'),
];
const MAX_AGE_MINUTES = 60;

function ensure(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

function archiveFile(file) {
  ensure(ARCHIVE);
  const dest = path.join(ARCHIVE, `${Date.now()}-${path.basename(file)}`);
  fs.renameSync(file, dest);
  return dest;
}

function main() {
  const moved = [];
  for (const dir of TARGETS) {
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      if (!entry.name.startsWith('_prompt-')) continue;
      const file = path.join(dir, entry.name);
      const ageMinutes = (Date.now() - fs.statSync(file).mtimeMs) / 60000;
      if (ageMinutes < MAX_AGE_MINUTES) continue;
      moved.push({ from: rel(file), to: rel(archiveFile(file)) });
    }
  }

  const report = [
    '---',
    'type: project-status',
    'project: b3-second-brain',
    'status: active',
    'owner: Codex',
    'source: weekly-cleanup-safe',
    `created: ${new Date().toISOString().slice(0, 10)}`,
    `last_reviewed: ${new Date().toISOString().slice(0, 10)}`,
    'confidence: high',
    '---',
    '',
    '# Weekly Cleanup Safe Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    `Archived files: ${moved.length}`,
    '',
    ...(moved.length ? moved.map((item) => `- ${item.from} -> ${item.to}`) : ['- ไม่มีไฟล์ที่ต้อง archive']),
    '',
  ].join('\n');
  ensure(ARCHIVE);
  fs.writeFileSync(path.join(ARCHIVE, 'report.md'), report, 'utf8');
  console.log(`Weekly cleanup archived: ${moved.length}`);
  console.log(`Report: ${rel(path.join(ARCHIVE, 'report.md'))}`);
}

main();

