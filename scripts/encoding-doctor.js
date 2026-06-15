#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'wiki', 'context', 'encoding-health-latest.md');
const TARGET_DIRS = [
  path.join(ROOT, 'wiki', 'to-b3'),
  path.join(ROOT, 'wiki', 'context'),
];
const BAD_PATTERNS = ['เธ', 'เน€', 'โ€”', 'โ', '๐'];

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith('.md') || entry.name.endsWith('.html')) files.push(full);
  }
  return files;
}

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

function main() {
  const rows = [];
  for (const dir of TARGET_DIRS) {
    for (const file of walk(dir)) {
      const text = fs.readFileSync(file, 'utf8');
      const hits = BAD_PATTERNS.reduce((sum, pattern) => sum + (text.split(pattern).length - 1), 0);
      if (hits > 0) rows.push({ file: rel(file), hits });
    }
  }

  rows.sort((a, b) => b.hits - a.hits);
  const body = [
    '---',
    'type: project-status',
    'project: b3-second-brain',
    'status: active',
    'owner: Codex',
    'source: encoding-doctor',
    `created: ${new Date().toISOString().slice(0, 10)}`,
    `last_reviewed: ${new Date().toISOString().slice(0, 10)}`,
    'confidence: medium',
    '---',
    '',
    '# Encoding Doctor',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    `Files with suspicious mojibake markers: ${rows.length}`,
    '',
    '| File | Hits |',
    '|---|---:|',
    ...(rows.length ? rows.map((row) => `| ${row.file} | ${row.hits} |`) : ['| - | 0 |']),
    '',
  ].join('\n');

  fs.writeFileSync(REPORT, body, 'utf8');
  console.log(`Encoding report written: ${rel(REPORT)}`);
  console.log(`Suspicious files: ${rows.length}`);
}

main();
