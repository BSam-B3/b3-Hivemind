#!/usr/bin/env node
/**
 * test-multihop.js — ทดสอบ real-world multi-hop loop
 * Claude → Codex → Gemini → Claude (3 hops)
 * รัน: node scripts/test-multihop.js
 */

const { execSync } = require('child_process');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const taskId = `MULTIHOP-TEST-${Date.now()}`;

console.log(`[TEST] Starting multi-hop test: ${taskId}`);
console.log(`[TEST] Flow: Claude → Codex → Gemini → Claude`);

execSync(
  `node "${path.join(__dirname, 'trigger-ai.js')}" ` +
  `--from claude --to codex --task "${taskId}" --max-hops 3 --priority normal ` +
  `--instruction "Multi-hop test hop 1/3. Reply with: [HOP1:codex] received. Then: [TRIGGER:gemini] Multi-hop test hop 2/3. Reply with [HOP2:gemini] received. Then: [TRIGGER:claude] MULTIHOP-COMPLETE: all 3 hops succeeded"`,
  { cwd: ROOT, stdio: 'inherit' }
);

console.log(`[TEST] Trigger sent — watch watcher.log for HOP1 → HOP2 → HOP3`);
console.log(`[TEST] Expected: Codex responds → Gemini responds → Claude notified`);
