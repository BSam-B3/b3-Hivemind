#!/usr/bin/env node
/**
 * Explicit AI router.
 *
 * --local        local only, no cloud fallback
 * --prefer-local local first, cloud fallback allowed
 * --cloud        Gemini/Groq cloud path only
 * --auto         auto-classify prompt using routing-rules.json then route (default when no flag given)
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// ── Routing-rules classifier ──────────────────────────────────────────────────
// Reads routing-rules.json and returns the best agent for a given prompt.
// Returns: 'local' | 'codex' | 'gemini' | 'claude' | 'groq'
// Local-eligible keywords are loaded dynamically from routing-rules.json
// (field: local_eligible_keywords) — no hardcoding here.
function classifyPrompt(prompt) {
  const rulesPath = path.join(ROOT, 'wiki', 'ai-war-room', 'routing-rules.json');
  if (!fs.existsSync(rulesPath)) return null;

  let rules;
  try {
    rules = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
  } catch {
    return null;
  }

  const lowerPrompt = prompt.toLowerCase();

  // Check local keywords from agent capabilities (single source of truth)
  const localKeywords = rules.agent_capabilities?.local?.keywords || [];
  if (localKeywords.some(kw => lowerPrompt.includes(kw.toLowerCase()))) return 'local';

  // Match agent rules by keyword
  for (const rule of (rules.rules || [])) {
    const hit = (rule.keywords || []).some(kw => lowerPrompt.includes(kw.toLowerCase()));
    if (hit) return rule.owner;
  }

  return null; // cannot classify → caller decides
}

function run(script, args) {
  const result = spawnSync(process.execPath, [script, ...args], {
    stdio: 'inherit',
    shell: false,
  });
  return result.status || 0;
}

const PRIVACY_RE = /(?:key|secret|token|password|auth|passwd|api_key|sb-|\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b)/i;

function privacyCheck(prompt) {
  if (PRIVACY_RE.test(prompt)) {
    console.error('🛡️ [ask-ai] SECURITY WARNING: Blocked cloud query because the prompt potentially contains secrets or PII (API Keys, emails, etc.).');
    process.exit(1);
  }
}

function main() {
  const args = process.argv.slice(2);
  const localOnly = args.includes('--local');
  const preferLocal = args.includes('--prefer-local');
  const autoMode = args.includes('--auto');
  const cloudOnly = args.includes('--cloud') || (!localOnly && !preferLocal && !autoMode);
  const cleaned = args.filter(arg => !['--local', '--prefer-local', '--cloud', '--auto'].includes(arg));

  if (localOnly) {
    process.exit(run('scripts/ask-local.js', cleaned));
  }

  if (preferLocal) {
    const localStatus = run('scripts/ask-local.js', cleaned);
    if (localStatus === 0) process.exit(0);
    console.error('[ask-ai] Local failed and --prefer-local allows cloud fallback.');
    privacyCheck(cleaned.join(' '));
    process.exit(run('scripts/ask-gemini.js', cleaned));
  }

  // --auto: classify prompt then route intelligently
  if (autoMode) {
    const prompt = cleaned.join(' ');
    const agent = classifyPrompt(prompt);
    if (agent === 'local') {
      console.error('[ask-ai] --auto → classified as LOCAL task');
      const localStatus = run('scripts/ask-local.js', cleaned);
      if (localStatus === 0) process.exit(0);
      console.error('[ask-ai] Local failed, falling back to cloud.');
      privacyCheck(prompt);
      process.exit(run('scripts/ask-gemini.js', cleaned));
    }
    if (agent === 'gemini' || agent === 'groq') {
      console.error(`[ask-ai] --auto → classified as ${agent.toUpperCase()} task`);
      privacyCheck(prompt);
      process.exit(run('scripts/ask-gemini.js', cleaned));
    }
    // claude / codex / unknown → treat as cloud
    console.error(`[ask-ai] --auto → classified as ${(agent || 'CLOUD').toUpperCase()} task`);
    privacyCheck(prompt);
    process.exit(run('scripts/ask-gemini.js', cleaned));
  }

  if (cloudOnly) {
    privacyCheck(cleaned.join(' '));
    process.exit(run('scripts/ask-gemini.js', cleaned));
  }
}

main();
