#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const INVENTORY = path.join(ROOT, 'wiki', 'context', 'secret-inventory.md');
const MASKED = path.join(ROOT, 'wiki', 'context', 'secret-masked-report.md');
const SECRET_PATTERNS = [
  /^\.env$/,
  /^\.env\./,
  /client_secret.*\.json$/i,
  /api-keys/i,
  /credentials/i,
];
const IGNORE_DIRS = new Set(['node_modules', '.tmp.drivedownload', '.tmp.driveupload']);

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && IGNORE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

function isSecretCandidate(file) {
  const name = path.basename(file);
  const relative = rel(file);
  return SECRET_PATTERNS.some((pattern) => pattern.test(name)) || relative.includes('/credentials/');
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 16);
}

function classify(file) {
  const name = path.basename(file).toLowerCase();
  const relative = rel(file).toLowerCase();
  if (name === '.env' || name.startsWith('.env.')) return 'env';
  if (name.includes('client_secret')) return 'oauth-client-secret';
  if (relative.includes('supabase') || relative.includes('credentials')) return 'credential-document';
  if (relative.includes('api-key')) return 'api-key-document';
  return 'possible-secret';
}

function maskLine(line) {
  if (!line.trim() || line.trim().startsWith('#')) return line;
  const eq = line.indexOf('=');
  if (eq > 0 && eq < 80) {
    const key = line.slice(0, eq);
    const value = line.slice(eq + 1);
    if (!value) return line;
    return `${key}=***MASKED:${value.length}chars***`;
  }
  return line
    .replace(/(sk-[A-Za-z0-9_-]{12,})/g, '***MASKED_OPENAI_KEY***')
    .replace(/(sk-ant-[A-Za-z0-9_-]{12,})/g, '***MASKED_ANTHROPIC_KEY***')
    .replace(/(gsk_[A-Za-z0-9_-]{12,})/g, '***MASKED_GROQ_KEY***')
    .replace(/(AIza[0-9A-Za-z_-]{20,})/g, '***MASKED_GOOGLE_KEY***')
    .replace(/("private_key"\s*:\s*")[^"]+(")/g, '$1***MASKED_PRIVATE_KEY***$2')
    .replace(/("client_secret"\s*:\s*")[^"]+(")/g, '$1***MASKED_CLIENT_SECRET***$2');
}

function maskedPreview(file) {
  try {
    return fs.readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .slice(0, 80)
      .map(maskLine)
      .join('\n');
  } catch {
    return '(binary or unreadable)';
  }
}

function main() {
  const files = walk(ROOT).filter(isSecretCandidate);
  const rows = files.map((file) => ({
    file: rel(file),
    type: classify(file),
    bytes: fs.statSync(file).size,
    hash: sha256(file),
  }));

  const inventory = [
    '---',
    'type: project-status',
    'project: b3-second-brain',
    'status: active',
    'owner: B3',
    'source: secret-inventory',
    `created: ${new Date().toISOString().slice(0, 10)}`,
    `last_reviewed: ${new Date().toISOString().slice(0, 10)}`,
    'confidence: high',
    '---',
    '',
    '# Secret Inventory',
    '',
    'รายงานนี้ไม่ย้าย ไม่ลบ และไม่แสดงค่า secret เต็ม',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    `Secret candidates: ${rows.length}`,
    '',
    '| File | Type | Bytes | Fingerprint |',
    '|---|---|---:|---|',
    ...(rows.length ? rows.map((row) => `| ${row.file} | ${row.type} | ${row.bytes} | ${row.hash} |`) : ['| - | - | 0 | - |']),
    '',
    '## คำแนะนำ',
    '',
    '- ห้ามลบหรือย้ายไฟล์เหล่านี้โดยไม่ตรวจ dependency ก่อน',
    '- Google Drive sync ช่วยกันหาย แต่ถ้าบัญชีหลุด ไฟล์เหล่านี้เสี่ยง',
    '- ใช้ masked report เมื่อต้องให้ AI ตรวจค่า config',
    '',
  ].join('\n');

  const masked = [
    '---',
    'type: project-status',
    'project: b3-second-brain',
    'status: active',
    'owner: B3',
    'source: secret-masker',
    `created: ${new Date().toISOString().slice(0, 10)}`,
    `last_reviewed: ${new Date().toISOString().slice(0, 10)}`,
    'confidence: high',
    '---',
    '',
    '# Secret Masked Report',
    '',
    'รายงานนี้ซ่อนค่า secret แล้ว ใช้ให้ AI ตรวจ config ได้ปลอดภัยกว่าไฟล์จริง',
    '',
    ...files.flatMap((file) => [
      `## ${rel(file)}`,
      '',
      '```text',
      maskedPreview(file),
      '```',
      '',
    ]),
  ].join('\n');

  fs.writeFileSync(INVENTORY, inventory, 'utf8');
  fs.writeFileSync(MASKED, masked, 'utf8');
  console.log(`Secret inventory written: ${rel(INVENTORY)}`);
  console.log(`Masked report written: ${rel(MASKED)}`);
  console.log(`Secret candidates: ${rows.length}`);
}

main();
