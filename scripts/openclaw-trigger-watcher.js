#!/usr/bin/env node
// -*- coding: utf-8 -*-

/**
 * OpenClaw Trigger Watcher v4
 * File-based AI handoff loop: Claude <-> Gemini <-> Codex
 *
 * Trigger file format: {from}-to-{to}-{taskId}.json
 * {
 *   "from": "claude",
 *   "to": "gemini",
 *   "taskId": "TASK001",
 *   "instruction": "...",
 *   "context": "",
 *   "priority": "normal",
 *   "runId": "run-...",
 *   "hopCount": 0,
 *   "maxHops": 2
 * }
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const TRIGGERS_DIR = path.join(ROOT, 'wiki', 'ai-war-room', 'triggers');
const DONE_DIR = path.join(TRIGGERS_DIR, 'done');
const LOG_FILE = path.join(TRIGGERS_DIR, 'watcher.log');
const PID_FILE = path.join(TRIGGERS_DIR, 'watcher.pid');
const NPM_MODS = path.join(process.env.APPDATA || '', 'npm', 'node_modules');

function loadEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) return;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) process.env[key] = value;
  });
}
loadEnv();

// ─── Supabase sync ────────────────────────────────────────────────────────────
const SUPA_URL  = 'https://uidkyvqjwigzidxpwort.supabase.co';
const SUPA_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpZGt5dnFqd2lnemlkeHB3b3J0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjI5NTA1MywiZXhwIjoyMDg3ODcxMDUzfQ.g3ESkTPQx-ZXzS8u3cO9pf2mry3oCcvC9PGtyzVMpvA';

// ─── Telegram notify B3 (Thai) ───────────────────────────────────────────────
let _tgCache = null;
function getTelegramConfig(cb) {
  if (_tgCache) return cb(_tgCache);
  const q = `?select=setting_key,setting_value&setting_key=in.(b3_telegram_token,b3_telegram_chat_id)`;
  const req = https.request({
    hostname: 'uidkyvqjwigzidxpwort.supabase.co',
    path: `/rest/v1/app_settings${q}`,
    method: 'GET',
    headers: { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}` },
  }, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      try {
        const rows = JSON.parse(d);
        const map = {};
        for (const r of rows) map[r.setting_key] = String(r.setting_value || '').replace(/^"|"$/g, '');
        if (map.b3_telegram_token && map.b3_telegram_chat_id) {
          _tgCache = { token: map.b3_telegram_token, chatId: map.b3_telegram_chat_id };
          cb(_tgCache);
        }
      } catch {}
    });
  });
  req.on('error', () => {});
  req.end();
}

function notifyB3Thai(text) {
  getTelegramConfig(({ token, chatId }) => {
    const body = JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' });
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${token}/sendMessage`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, () => {});
    req.on('error', () => {});
    req.write(body);
    req.end();
  });
}

function supaPost(table, body, method = 'POST', extra = '') {
  try {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: 'uidkyvqjwigzidxpwort.supabase.co',
      path: `/rest/v1/${table}${extra}`,
      method,
      headers: {
        'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': method === 'POST' ? 'resolution=merge-duplicates' : 'return=minimal',
      },
    }, () => {});
    req.on('error', () => {});
    req.write(data);
    req.end();
  } catch {}
}

function syncTask(taskId, patch) {
  supaPost('war_room_tasks', {
    id: taskId, ...patch, updated_at: new Date().toISOString(),
  }, 'POST', '?on_conflict=id');
}

function syncLog(taskId, agent, event, message) {
  supaPost('war_room_logs', {
    task_id: taskId,
    agent: agent || 'system',
    event,
    message: String(message).slice(0, 500),
  });
}

const VALID_AIS = ['claude', 'gemini', 'codex', 'local', 'gemini-flash', 'gemini-pro'];
const VALID_SENDERS = ['system', ...VALID_AIS];
const MAX_INSTRUCTION_CHARS = 12000;
const DEFAULT_MAX_HOPS = 2;
const SAFE_TASK_ID = /^[\w\-.]{1,80}$/;

const AI_CMD = {
  gemini: process.platform === 'win32'
    ? path.join(NPM_MODS, '@google', 'gemini-cli', 'bundle', 'gemini.js')
    : 'gemini',
  'gemini-flash': process.platform === 'win32'
    ? path.join(NPM_MODS, '@google', 'gemini-cli', 'bundle', 'gemini.js')
    : 'gemini',
  'gemini-pro': process.platform === 'win32'
    ? path.join(NPM_MODS, '@google', 'gemini-cli', 'bundle', 'gemini.js')
    : 'gemini',
  codex: process.platform === 'win32'
    ? path.join(NPM_MODS, '@openai', 'codex', 'bin', 'codex.js')
    : 'codex',
  claude: 'claude',
};

const AI_ENV = {
  gemini: { ...process.env, GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.5-pro', GEMINI_CLI_TRUST_WORKSPACE: 'true', GEMINI_CLI_NO_RELAUNCH: '1' },
  'gemini-flash': { ...process.env, GEMINI_MODEL: 'gemini-2.5-flash', GEMINI_CLI_TRUST_WORKSPACE: 'true', GEMINI_CLI_NO_RELAUNCH: '1' },
  'gemini-pro': { ...process.env, GEMINI_MODEL: 'gemini-2.5-pro', GEMINI_CLI_TRUST_WORKSPACE: 'true', GEMINI_CLI_NO_RELAUNCH: '1' },
  codex: { ...process.env },
};

const processing = new Set();

// Rate limit cooldown — prevent hammering API after quota failure
const rateLimitCooldown = {};  // { aiName: timestamp }
const RATE_LIMIT_BACKOFF_MS = 60000;  // 60s cooldown after rate limit

function isRateLimited(aiName) {
  const until = rateLimitCooldown[aiName];
  if (!until) return false;
  if (Date.now() < until) return true;
  delete rateLimitCooldown[aiName];
  return false;
}

function setRateLimitCooldown(aiName) {
  rateLimitCooldown[aiName] = Date.now() + RATE_LIMIT_BACKOFF_MS;
  log(`[COOLDOWN] ${aiName} rate limited — pausing triggers for 60s`);
}

function log(message) {
  const ts = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok' }).replace('T', ' ');
  const line = `[${ts} ICT] ${message}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n', 'utf8'); } catch {}
}

if (process.stdout && typeof process.stdout.setEncoding === 'function') process.stdout.setEncoding('utf8');
if (process.stderr && typeof process.stderr.setEncoding === 'function') process.stderr.setEncoding('utf8');

function ensureDirs() {
  for (const dir of [TRIGGERS_DIR, DONE_DIR]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}

function sessionDir(taskId) {
  const dir = path.join(ROOT, 'wiki', 'ai-war-room', 'sessions', taskId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function makeRunId() {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  return `run-${stamp}-${Math.random().toString(36).slice(2, 8)}`;
}

function statusFile(taskId) {
  return path.join(sessionDir(taskId), 'session-status.json');
}

function compactFile(taskId) {
  return path.join(sessionDir(taskId), 'compact-summary.md');
}

function writeSessionStatus(trigger, update) {
  const file = statusFile(trigger.taskId);
  let current = {};
  try {
    if (fs.existsSync(file)) current = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {}

  const next = {
    taskId: trigger.taskId,
    runId: trigger.runId,
    status: 'in_progress',
    lastAgent: trigger.to,
    priority: trigger.priority,
    hopCount: trigger.hopCount,
    maxHops: trigger.maxHops,
    updatedAt: new Date().toISOString(),
    ...current,
    ...update,
  };
  fs.writeFileSync(file, JSON.stringify(next, null, 2), 'utf8');
  return next;
}

function writeCompactSummary(trigger, summary) {
  const file = compactFile(trigger.taskId);
  const body = [
    `# Compact Summary - ${trigger.taskId}`,
    '',
    `**Run:** ${trigger.runId}`,
    `**Status:** ${summary.status}`,
    `**Last agent:** ${summary.lastAgent}`,
    `**Reason:** ${summary.reason || 'none'}`,
    `**Updated:** ${new Date().toISOString()}`,
    '',
    '## Objective',
    trigger.instruction,
    trigger.context ? `\n## Context\n${trigger.context}` : '',
    '',
    '## Result',
    summary.result || '(pending)',
    '',
    '## Next Action',
    summary.nextAction || 'review_output',
    '',
    '## Files',
    ...(summary.files || []).map((item) => `- ${item}`),
    '',
  ].filter(Boolean).join('\n');
  fs.writeFileSync(file, body, 'utf8');
  return file;
}

function archive(filePath, fileName) {
  try {
    ensureDirs();
    if (fs.existsSync(filePath)) {
      fs.renameSync(filePath, path.join(DONE_DIR, `${Date.now()}-${fileName}`));
      log(`[ARCHIVE] ${fileName} -> done/`);
    }
  } catch (error) {
    log(`[WARN] archive failed: ${error.message}`);
  }
}

function normalizeTrigger(trigger) {
  return {
    ...trigger,
    from: String(trigger.from || '').toLowerCase(),
    to: String(trigger.to || '').toLowerCase(),
    taskId: String(trigger.taskId || ''),
    instruction: String(trigger.instruction || ''),
    context: String(trigger.context || ''),
    priority: String(trigger.priority || 'normal'),
    runId: String(trigger.runId || makeRunId()),
    hopCount: Number(trigger.hopCount || 0),
    maxHops: Number(trigger.maxHops ?? DEFAULT_MAX_HOPS),
  };
}

function validateTrigger(trigger) {
  const errors = [];
  if (!trigger || typeof trigger !== 'object') errors.push('payload must be an object');
  if (!VALID_SENDERS.includes(trigger.from)) errors.push('invalid from');
  if (!VALID_AIS.includes(trigger.to)) errors.push('invalid to');
  if (!SAFE_TASK_ID.test(trigger.taskId)) errors.push('invalid taskId');
  if (!trigger.instruction.trim()) errors.push('instruction is required');
  if (trigger.instruction.length > MAX_INSTRUCTION_CHARS) errors.push('instruction too large');
  if (!['normal', 'urgent', 'low'].includes(trigger.priority)) errors.push('invalid priority');
  if (!Number.isInteger(trigger.hopCount) || trigger.hopCount < 0) errors.push('invalid hopCount');
  if (!Number.isInteger(trigger.maxHops) || trigger.maxHops < 0 || trigger.maxHops > 5) errors.push('invalid maxHops');
  if (trigger.hopCount > trigger.maxHops) errors.push('hopCount exceeds maxHops');
  return errors;
}

function buildPrompt(trigger) {
  const geminiNote = trigger.to === 'gemini' ? [
    '',
    '## IMPORTANT — Gemini Automation Mode',
    'You CANNOT write files or run shell commands in this mode.',
    'Output your FULL answer as plain text only — the watcher saves it automatically.',
    'Do NOT attempt write_file, run_shell_command, or any tool that modifies files.',
  ].join('\n') : '';

  return [
    `[AUTO-TRIGGER] from=${trigger.from} to=${trigger.to} taskId=${trigger.taskId}`,
    `[RUN] ${trigger.runId}`,
    `[HOPS] ${trigger.hopCount}/${trigger.maxHops}`,
    '',
    '## Your Task',
    trigger.instruction,
    trigger.context ? `\n## Context\n${trigger.context}` : '',
    geminiNote,
    '',
    '## Reply Protocol',
    'Answer the task above.',
    'If you need to hand off work to another AI after you finish, add ONE line at the END of your reply:',
    '  [TRIGGER:claude] <instruction for claude>',
    '  [TRIGGER:gemini] <instruction for gemini>',
    '  [TRIGGER:codex]  <instruction for codex>',
    '',
    'Only trigger another AI when it is truly needed. The watcher enforces maxHops.',
  ].filter(Boolean).join('\n');
}

function writeInbox(to, trigger) {
  const body = [
    `# INBOX - ${to.toUpperCase()}`,
    `**From:** ${trigger.from} | **Task:** ${trigger.taskId} | **Priority:** ${trigger.priority}`,
    `**Run:** ${trigger.runId}`,
    `**Hops:** ${trigger.hopCount}/${trigger.maxHops}`,
    `**Time:** ${new Date().toISOString()}`,
    '',
    '## Instruction',
    trigger.instruction,
    trigger.context ? `\n## Context\n${trigger.context}` : '',
    '',
    '---',
    `Write output to wiki/ai-war-room/sessions/${trigger.taskId}/`,
  ].filter(Boolean).join('\n');

  const taskInbox = path.join(TRIGGERS_DIR, `INBOX-${to.toUpperCase()}-${trigger.taskId}.md`);
  const latestInbox = path.join(TRIGGERS_DIR, `INBOX-${to.toUpperCase()}.md`);

  fs.writeFileSync(taskInbox, body + '\n', 'utf8');
  fs.writeFileSync(latestInbox, [
    `# Latest INBOX - ${to.toUpperCase()}`,
    '',
    `Latest task file: ${path.basename(taskInbox)}`,
    '',
    body,
    '',
  ].join('\n'), 'utf8');

  log(`[INBOX] ${path.basename(taskInbox)} written`);
}

function commandFor(aiName, cmdName, promptFile, env) {
  const promptPath = promptFile.replace(/\\/g, '/');
  const prompt = `Read the file at ${promptPath} and execute the instruction inside it. Reply in the language of the instruction.`;

  if (aiName === 'gemini') {
    const useBundle = cmdName.endsWith('.js') && fs.existsSync(cmdName);
    const model = env?.GEMINI_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    return {
      executable: useBundle ? process.execPath : cmdName,
      args: useBundle
        ? [cmdName, '--skip-trust', '-m', model, '-p', prompt]
        : ['--skip-trust', '-m', model, '-p', prompt],
    };
  }

  if (aiName === 'codex') {
    const useBundle = cmdName.endsWith('.js') && fs.existsSync(cmdName);
    const codexFlags = [
      'exec',
      '--skip-git-repo-check',
      '--dangerously-bypass-approvals-and-sandbox',
      '-s', 'danger-full-access',
      '-C', ROOT,
      prompt,
    ];
    return {
      executable: useBundle ? process.execPath : cmdName,
      args: useBundle ? [cmdName, ...codexFlags] : codexFlags,
    };
  }

  if (aiName === 'claude') {
    return {
      executable: cmdName,
      args: ['-p', prompt, '--dangerously-skip-permissions'],
    };
  }

  throw new Error(`No command builder for ${aiName}`);
}

function parseAndFireRetriggers(fromAI, trigger, output) {
  if (trigger.hopCount >= trigger.maxHops) {
    log(`[RETRIGGER] skipped: maxHops reached (${trigger.hopCount}/${trigger.maxHops})`);
    return;
  }

  let fired = 0;
  for (const line of output.split('\n')) {
    const match = line.match(/\[TRIGGER:(\w+)\]\s*(.+)/i);
    if (!match) continue;

    const to = match[1].toLowerCase();
    const instruction = match[2].trim();
    if (!VALID_AIS.includes(to)) continue;

    const newTaskId = `${trigger.taskId}-${to.toUpperCase()}-${Date.now()}`.slice(0, 80);
    const payload = normalizeTrigger({
      from: fromAI,
      to,
      taskId: newTaskId,
      runId: makeRunId(),
      instruction,
      priority: 'normal',
      hopCount: trigger.hopCount + 1,
      maxHops: trigger.maxHops,
      createdAt: new Date().toISOString(),
    });

    const errors = validateTrigger(payload);
    if (errors.length) {
      log(`[RETRIGGER] rejected ${newTaskId}: ${errors.join(', ')}`);
      continue;
    }

    const triggerFile = path.join(TRIGGERS_DIR, `${fromAI}-to-${to}-${newTaskId}.json`);
    fs.writeFileSync(triggerFile, JSON.stringify(payload, null, 2), 'utf8');
    log(`[RETRIGGER] ${fromAI} -> ${to} | ${newTaskId}`);
    fired++;
  }

  if (fired) log(`[RETRIGGER] ${fired} new trigger(s) fired from ${fromAI} output`);
}

function classifyFailure(result, cleanOut, cleanErr) {
  const text = `${cleanOut}\n${cleanErr}\n${result.error?.message || ''}`.toLowerCase();
  if (result.error?.code === 'ETIMEDOUT' || text.includes('timed out')) return 'timeout';
  if (result.error?.code === 'ENOBUFS') return 'token_or_context_limit';  // stdout buffer overflow
  if (text.match(/token.*(limit|exceeded|maximum|too many|length)|context.*(length|limit|maximum)/)) return 'token_or_context_limit';
  if (text.match(/quota|rate limit|rate-limit|429|usage limit|limit exceeded/)) return 'quota_or_rate_limit';
  if (!cleanOut && !cleanErr) return 'no_output';
  if ((result.status ?? 0) !== 0) return 'nonzero_exit';
  return null;
}

// ─── Routing decision logger ──────────────────────────────────────────────────
const ROUTE_LOG_FILE = path.join(ROOT, 'wiki', 'ai-war-room', 'routing-decisions.log');

function logRoutingDecision(from, to, taskId, reason, costTier) {
  const ts  = new Date().toISOString();
  const tier = costTier || (to === 'local' || to === 'groq' ? 'FREE' : 'PAID');
  const entry = `[${ts}] ${from} → ${to} | ${taskId} | ${tier} | reason: ${reason}\n`;
  try { fs.appendFileSync(ROUTE_LOG_FILE, entry, 'utf8'); } catch (e) {}
  log(`[ROUTE] ${from}→${to} (${tier}) — ${reason}`);
}

function routeForFailure(reason, trigger) {
  if (reason === 'token_or_context_limit') return 'claude';
  if (reason === 'quota_or_rate_limit') return 'claude';
  if (reason === 'timeout') return 'claude';
  if (trigger.to === 'gemini' && trigger.instruction.toLowerCase().match(/facebook|reel|url|link|social/)) return 'claude';
  return 'claude';
}

function writeFailureHandoff(trigger, aiName, outFile, result, cleanOut, cleanErr, reason) {
  const dir = sessionDir(trigger.taskId);
  const handoff = path.join(dir, 'handoff.md');
  const nextAgent = routeForFailure(reason, trigger);
  logRoutingDecision(aiName, nextAgent, trigger.taskId, `fallback — ${aiName} failed: ${reason}`, 'PAID');
  const body = [
    `# Failure Handoff - ${trigger.taskId}`,
    '',
    `**Run:** ${trigger.runId}`,
    `**Failed agent:** ${aiName}`,
    `**Reason:** ${reason}`,
    `**Exit code:** ${result.status ?? 'unknown'}`,
    `**Time:** ${new Date().toISOString()}`,
    `**Recommended next agent:** ${nextAgent}`,
    '',
    '## Original Instruction',
    trigger.instruction,
    trigger.context ? `\n## Context\n${trigger.context}` : '',
    '',
    '## Output File',
    outFile,
    '',
    '## Partial Output',
    cleanOut || '(none)',
    '',
    '## Error',
    cleanErr || result.error?.message || '(none)',
    '',
    '## Next Action',
    'Use manual recovery. Do not auto-loop this task without B3 approval.',
    '',
  ].filter(Boolean).join('\n');
  fs.writeFileSync(handoff, body, 'utf8');
  const compact = writeCompactSummary(trigger, {
    status: 'handoff_required',
    lastAgent: aiName,
    reason,
    result: `Failure handoff created for ${reason}.`,
    nextAction: 'manual_recovery',
    files: [handoff.replace(/\\/g, '/'), outFile.replace(/\\/g, '/')],
  });
  writeSessionStatus(trigger, {
    status: 'handoff_required',
    lastAgent: aiName,
    exitCode: result.status ?? null,
    reason,
    nextAction: 'manual_recovery',
    recommendedNextAgent: nextAgent,
    handoffFile: handoff.replace(/\\/g, '/'),
    compactSummaryFile: compact.replace(/\\/g, '/'),
    outputFile: outFile.replace(/\\/g, '/'),
  });
  log(`[HANDOFF] ${reason} -> ${handoff}`);
  if (reason === 'quota_or_rate_limit') setRateLimitCooldown(aiName);
}

// Fallback: run ask-gemini.js (has Groq fallback inside) when Gemini CLI fails/quota
function runGeminiFallback(trigger, outFile) {
  log(`[GEMINI-FALLBACK] Gemini CLI failed → trying ask-gemini.js (Groq fallback)`);
  const askGemini = path.join(ROOT, 'scripts', 'ask-gemini.js');
  if (!fs.existsSync(askGemini)) return null;

  const prompt = buildPrompt(trigger);
  const result = spawnSync(process.execPath, [askGemini, prompt], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env },
    shell: false,
    timeout: 120000,
    maxBuffer: 10 * 1024 * 1024,
  });

  const out = (result.stdout || '').trim();
  const err = (result.stderr || '').trim();
  if (out) {
    log(`[GEMINI-FALLBACK] ✅ ask-gemini.js succeeded (Groq or Gemini API)`);
    fs.writeFileSync(outFile, [
      `# gemini Output - ${trigger.taskId}`,
      `**Time:** ${new Date().toISOString()}`,
      `**Via:** ask-gemini.js fallback (Groq or Gemini API)`,
      `**Exit code:** ${result.status ?? 0}`,
      '',
      out,
    ].join('\n'), 'utf8');
    return out;
  }
  log(`[GEMINI-FALLBACK] ❌ ask-gemini.js also failed: ${err.slice(0, 200)}`);
  return null;
}

function runCliAI(aiName, cmdName, env, trigger, outFile) {
  log(`[RUN] ${aiName} <- task ${trigger.taskId}`);
  writeSessionStatus(trigger, { status: 'in_progress', lastAgent: aiName, startedAt: new Date().toISOString() });

  const promptFile = path.join(TRIGGERS_DIR, `_prompt-${trigger.taskId}.txt`);
  fs.writeFileSync(promptFile, buildPrompt(trigger), 'utf8');

  const { executable, args } = commandFor(aiName, cmdName, promptFile, env);
  const timeout = aiName === 'codex' ? 600000 : 300000;
  const result = spawnSync(executable, args, {
    cwd: ROOT,
    encoding: 'utf8',
    env,
    shell: false,
    timeout,
    maxBuffer: 50 * 1024 * 1024,
  });

  try { if (fs.existsSync(promptFile)) fs.unlinkSync(promptFile); } catch {}

  let cleanOut = (result.stdout || '').trim();
  const cleanErr = (result.stderr || '')
    .split('\n')
    .filter((line) => !line.match(/Warning|Ripgrep|color|true color/i))
    .join('\n')
    .trim();

  // Gemini CLI quota/no-output → fallback to ask-gemini.js (Groq inside)
  const isGemini = ['gemini', 'gemini-flash', 'gemini-pro'].includes(aiName);
  if (isGemini && !cleanOut) {
    const fallbackOut = runGeminiFallback(trigger, outFile);
    if (fallbackOut) {
      cleanOut = fallbackOut;
      log(`[GEMINI-FALLBACK] output recovered — continuing normally`);
    }
  }

  if (!isGemini || !cleanOut) {
    fs.writeFileSync(outFile, [
      `# ${aiName} Output - ${trigger.taskId}`,
      `**Time:** ${new Date().toISOString()}`,
      `**Exit code:** ${result.status ?? 'unknown'}`,
      '',
      cleanOut || '(no output)',
      cleanErr ? `\n---\n**stderr:**\n${cleanErr}` : '',
    ].join('\n'), 'utf8');
  }

  log(cleanOut ? `[DONE] ${aiName} responded -> ${outFile}` : `[WARN] ${aiName} no output on ${trigger.taskId}`);
  if (result.error) log(`[ERROR] ${aiName} process error: ${result.error.message}`);

  // Sync to Supabase
  if (cleanOut) {
    syncTask(trigger.taskId, { status: 'done', last_action: `${aiName} finished`, current_agent: aiName });
    syncLog(trigger.taskId, aiName, 'DONE', cleanOut.slice(0, 300));
  } else {
    const errMsg = result.error?.message ?? 'no output';
    syncTask(trigger.taskId, { status: 'failed', last_action: `${aiName} failed: ${errMsg.slice(0, 80)}`, current_agent: aiName });
    syncLog(trigger.taskId, aiName, 'ERROR', errMsg.slice(0, 300));
  }
  const failureReason = classifyFailure(result, cleanOut, cleanErr);
  if (failureReason) {
    writeFailureHandoff(trigger, aiName, outFile, result, cleanOut, cleanErr, failureReason);
  } else {
    const compact = writeCompactSummary(trigger, {
      status: 'done',
      lastAgent: aiName,
      result: cleanOut.slice(0, 1200) || 'Completed with no text output.',
      nextAction: 'review_output',
      files: [outFile.replace(/\\/g, '/')],
    });
    writeSessionStatus(trigger, {
      status: 'done',
      lastAgent: aiName,
      exitCode: result.status ?? 0,
      reason: null,
      nextAction: 'review_output',
      outputFile: outFile.replace(/\\/g, '/'),
      compactSummaryFile: compact.replace(/\\/g, '/'),
      finishedAt: new Date().toISOString(),
    });
    if (cleanOut) parseAndFireRetriggers(aiName, trigger, cleanOut);

    // Auto quality-gate: หลัง Codex เสร็จ → รัน autonomous-loop (tsc + push + notify)
    if (aiName === 'codex' && cleanOut) {
      const autoLoopScript = path.join(ROOT, 'scripts', 'autonomous-loop.js');
      if (fs.existsSync(autoLoopScript)) {
        // ดึงชื่อโปรเจคจาก taskId (pattern: [project]-[task])
        const projectMap = { 'cit': 'cit-service', 'jong': 'jong-jaroen', 'b3': 'b3-team-avenger', 'avenger': 'b3-team-avenger' };
        const detectedProject = Object.entries(projectMap).find(([k]) => trigger.taskId.toLowerCase().includes(k))?.[1] || 'b3-second-brain';
        log(`[AUTO-LOOP] Codex done → running autonomous-loop for ${detectedProject}`);
        const loopResult = spawnSync(process.execPath, [autoLoopScript, '--project', detectedProject, '--task', trigger.taskId, '--skip-push'], {
          cwd: ROOT, encoding: 'utf8', timeout: 120000, stdio: ['pipe', 'pipe', 'pipe'],
        });
        const loopOut = (loopResult.stdout || '').trim();
        const loopErr = (loopResult.stderr || '').trim();
        if (loopResult.status === 0) {
          log(`[AUTO-LOOP] ✅ tsc passed — ${detectedProject}`);
        } else if (loopResult.status === 1) {
          log(`[AUTO-LOOP] ❌ tsc FAILED — check errors\n${loopErr.slice(0, 300)}`);
        }
        if (loopOut) log(`[AUTO-LOOP] ${loopOut.slice(0, 200)}`);
      }
    }
  }

  const taskInbox = path.join(TRIGGERS_DIR, `INBOX-${aiName.toUpperCase()}-${trigger.taskId}.md`);
  try { if (fs.existsSync(taskInbox)) fs.unlinkSync(taskInbox); } catch {}
}

// ─── Fix 2: Parse structured tags from AI output ──────────────────────────────
// AI output สามารถใส่ [THOUGHT:name] หรือ [OPINION:name] เพื่อให้ runner parse
function parseStructuredTag(output, tagName, agentName) {
  // รูปแบบ: [THOUGHT:gemini] content... หรือ [OPINION:gemini] content...
  const re = new RegExp(`\\[${tagName}:${agentName}\\]\\s*([\\s\\S]*?)(?=\\[${tagName}:|\\[TRIGGER:|FINAL:|$)`, 'i');
  const m = output.match(re);
  if (m && m[1].trim()) return m[1].trim().slice(0, 500);
  // fallback: ใช้ output ทั้งหมด ลบ metadata
  return output
    .replace(/^#.*\n|\*\*Time:\*\*.*\n|\*\*Exit code:\*\*.*\n/gm, '')
    .replace(/\[TRIGGER:\w+\].*/g, '')
    .replace(/FINAL:.*/g, '')
    .trim().slice(0, 400);
}

// ─── Think Tank: auto-collect ─────────────────────────────────────────────────
function tryCollectThinkTank(trigger, aiName, cleanOut) {
  // รับ trigger โดยตรงจาก AI ที่ assign งาน TT ให้ หรือจาก TT-done retrigger
  const ttId = (() => {
    const m1 = trigger.instruction.match(/TT-done:\s*(TT-[\w-]+)/);
    if (m1) return m1[1];
    const m2 = trigger.taskId.match(/^(TT-[\w-]+)/);
    if (m2) return m2[1];
    return null;
  })();
  if (!ttId) return;

  const TT_DIR = path.join(ROOT, 'wiki', 'ai-war-room', 'think-tank');
  const ttFile = path.join(TT_DIR, `${ttId}.md`);
  if (!fs.existsSync(ttFile)) return;

  const content = fs.readFileSync(ttFile, 'utf8');
  const contributor = trigger.from || aiName;

  // Fix 1: Idempotent — ตรวจก่อนเขียน
  if (content.includes(`[THOUGHT:${contributor}]`)) {
    log(`[THINK-TANK] ${contributor} thought already exists in ${ttId} — skip`);
  } else {
    // Fix 2: Runner เขียนเอง — parse structured tag จาก output
    const thought = parseStructuredTag(cleanOut, 'THOUGHT', contributor);
    if (thought) {
      try {
        const ts = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok' }).replace('T', ' ').slice(0, 16) + ' ICT';
        const entry = `\n### [THOUGHT:${contributor}] ${ts}\n${thought}\n`;
        const updated = content.replace(
          '<!-- AI แต่ละตัว append [THOUGHT:name] ต่อท้าย -->',
          `<!-- AI แต่ละตัว append [THOUGHT:name] ต่อท้าย -->${entry}`
        );
        fs.writeFileSync(ttFile, updated, 'utf8');
        log(`[THINK-TANK] ${contributor} thought appended to ${ttId}`);
      } catch (e) { log(`[THINK-TANK] append failed: ${e.message}`); }
    }
  }

  // Fix 3: ใช้ originator จาก frontmatter ไม่ใช่ aiName
  try {
    const fresh = fs.readFileSync(ttFile, 'utf8');
    const originator = (fresh.match(/^author:\s*(\w+)/m) || [])[1] || 'claude';
    const allDone = ['claude', 'gemini', 'codex']
      .filter(a => a !== originator)
      .every(a => fresh.includes(`[THOUGHT:${a}]`));

    if (allDone && fresh.includes(`[THOUGHT:${originator}]`)) {
      // ครบทุกคน → notify B3
      const topic = (fresh.match(/^topic: (.+)/m) || [])[1] || ttId;
      const thoughts = [...fresh.matchAll(/### \[THOUGHT:(\w+)\][^\n]*\n([\s\S]*?)(?=\n###|---)/g)]
        .map(m => `• ${m[1]}: ${m[2].replace(/\n/g, ' ').trim().slice(0, 80)}`).join('\n');
      notifyB3Thai(`🧠 <b>Think Tank สรุป</b>\nหัวข้อ: ${topic}\n\n${thoughts}`);
      log(`[THINK-TANK] B3 notified — all thoughts collected for ${ttId}`);
    }
  } catch (e) { log(`[THINK-TANK] collect check failed: ${e.message}`); }
}

// ─── RFC Opinion Auto-Append ──────────────────────────────────────────────────
function tryAppendRFCOpinion(trigger, aiName, cleanOut) {
  if (!cleanOut) return;
  const rfcMatch = trigger.instruction.match(/RFC-[\w-]+/);
  if (!rfcMatch) return;
  const rfcId = rfcMatch[0];
  const RFC_DIR = path.join(ROOT, 'wiki', 'ai-war-room', 'RFC');
  const rfcFile = path.join(RFC_DIR, `${rfcId}.md`);
  if (!fs.existsSync(rfcFile)) return;

  // Fix 1: Idempotent — ตรวจก่อนเขียน
  const existing = fs.readFileSync(rfcFile, 'utf8');
  if (existing.includes(`[OPINION:${aiName}]`)) {
    log(`[RFC] ${aiName} opinion already exists in ${rfcId} — skip`);
    return;
  }

  try {
    const { spawnSync: sp } = require('child_process');
    // Fix 2: Runner parse structured tag
    const opinion = parseStructuredTag(cleanOut, 'OPINION', aiName);
    sp('node', [path.join(ROOT, 'scripts', 'board-post.js'), '--type', 'opinion', '--rfc', rfcId, '--body', opinion, '--agent', aiName], { cwd: ROOT });
    log(`[RFC] ${aiName} opinion appended to ${rfcId}`);
  } catch (e) { log(`[RFC] append failed: ${e.message}`); }
}

// ─── Fix 2: Gemini → Claude synthesis pipeline ────────────────────────────────

function runGemini(trigger) {
  const outFile = path.join(sessionDir(trigger.taskId), 'gemini-output.md');
  runCliAI('gemini', AI_CMD.gemini, AI_ENV.gemini, trigger, outFile);

  // RFC + Think Tank auto-handle
  if (fs.existsSync(outFile)) {
    const out = fs.readFileSync(outFile, 'utf8');
    tryAppendRFCOpinion(trigger, 'gemini', out);
    tryCollectThinkTank(trigger, 'gemini', out);
  }

  // After Gemini finishes, auto-notify Claude to synthesize the output
  if (fs.existsSync(outFile) && fs.statSync(outFile).size > 100) {
    const synthInstruction = [
      `Gemini เสร็จงาน task: ${trigger.taskId}`,
      `อ่าน output: ${outFile.replace(/\\/g, '/')}`,
      `แล้วสรุป/synthesize เขียนเป็น: wiki/ai-war-room/sessions/${trigger.taskId}/synthesis.md`,
      `ห้ามแก้ gemini-output.md — สร้าง synthesis.md ใหม่เท่านั้น`,
    ].join('\n');

    const syntheInbox = path.join(TRIGGERS_DIR, 'INBOX-CLAUDE.md');
    fs.writeFileSync(syntheInbox, [
      '# INBOX — CLAUDE',
      `**From:** gemini | **Task:** ${trigger.taskId} | **Priority:** normal`,
      `**Time:** ${new Date().toISOString()}`,
      '',
      '## Instruction',
      synthInstruction,
      '',
      '---',
      '*ลบไฟล์นี้หลังรับงาน*',
    ].join('\n'), 'utf8');
    log(`[SYNTHESIS] Claude inbox written for ${trigger.taskId}`);
    syncLog(trigger.taskId, 'gemini', 'SYNTHESIS', `Gemini เสร็จ → Claude synthesize`);
  }
}

// ─── Fix 3: Codex quality gate → Claude reviews before commit ─────────────────

function runCodex(trigger) {
  const outFile = path.join(sessionDir(trigger.taskId), 'codex-output.md');
  runCliAI('codex', AI_CMD.codex, AI_ENV.codex, trigger, outFile);

  // RFC + Think Tank auto-handle
  if (fs.existsSync(outFile)) {
    const out = fs.readFileSync(outFile, 'utf8');
    tryAppendRFCOpinion(trigger, 'codex', out);
    tryCollectThinkTank(trigger, 'codex', out);
  }

  // Quality gate: after Codex finishes, Claude reviews output before any commit
  if (fs.existsSync(outFile) && fs.statSync(outFile).size > 100) {
    const reviewInstruction = [
      `Codex เสร็จงาน task: ${trigger.taskId}`,
      `อ่าน output: ${outFile.replace(/\\/g, '/')}`,
      `ตรวจสอบ:`,
      `1. อ่านไฟล์ที่ Codex แก้/สร้าง ทุกไฟล์`,
      `2. รัน: cd C:/Users/PC/Desktop/b3-team-avenger && npx tsc --noEmit 2>&1 | grep -v __tests__`,
      `3. ถ้า tsc clean → git add เฉพาะไฟล์ที่เกี่ยวข้อง → commit → push`,
      `4. ถ้า tsc มี error → แก้ error เองแล้ว commit`,
      `5. ห้าม git add -A หรือ git add . (เพราะ Codex อาจแก้ไฟล์อื่นที่ไม่เกี่ยวข้อง)`,
    ].join('\n');

    const reviewInbox = path.join(TRIGGERS_DIR, 'INBOX-CLAUDE.md');
    fs.writeFileSync(reviewInbox, [
      '# INBOX — CLAUDE',
      `**From:** codex | **Task:** ${trigger.taskId} | **Priority:** high`,
      `**Time:** ${new Date().toISOString()}`,
      '',
      '## Instruction',
      reviewInstruction,
      '',
      '---',
      '*ลบไฟล์นี้หลังรับงาน*',
    ].join('\n'), 'utf8');
    log(`[QUALITY-GATE] Claude review inbox written for ${trigger.taskId}`);
    syncLog(trigger.taskId, 'codex', 'QUALITY_GATE', `Codex เสร็จ → Claude review`);
    syncTask(trigger.taskId, { status: 'in_progress', last_action: 'Codex done → Claude reviewing', current_agent: 'claude' });
  }
}

function notifyClaude(trigger) {
  const compact = writeCompactSummary(trigger, {
    status: 'handoff_required',
    lastAgent: 'claude',
    reason: 'manual_claude_inbox',
    result: 'Claude inbox created for next manual session.',
    nextAction: 'claude_pickup_next_session',
    files: [path.join(TRIGGERS_DIR, `INBOX-CLAUDE-${trigger.taskId}.md`).replace(/\\/g, '/')],
  });
  writeSessionStatus(trigger, {
    status: 'handoff_required',
    lastAgent: 'claude',
    reason: 'manual_claude_inbox',
    nextAction: 'claude_pickup_next_session',
    compactSummaryFile: compact.replace(/\\/g, '/'),
  });
  log(`[INBOX] Claude will pick up ${trigger.taskId} on next session start`);
}

function runClaude(trigger) {
  const outFile = path.join(sessionDir(trigger.taskId), 'claude-output.md');
  runCliAI('claude', AI_CMD.claude, process.env, trigger, outFile);

  const content = fs.existsSync(outFile) ? fs.readFileSync(outFile, 'utf8') : '';
  const hasOutput = content && !content.includes('(no output)') && content.length > 150;

  if (hasOutput) {
    // Think Tank collection check
    tryCollectThinkTank(trigger, 'claude', content);
    // ✅ สำเร็จ → แจ้ง B3 เป็นภาษาไทยสั้นๆ
    const summary = content.replace(/^#.*\n|\*\*.*\*\*\n/gm, '').replace(/\n+/g, ' ').trim().slice(0, 150);
    notifyB3Thai(
      `🤖 <b>Claude ทำงานอัตโนมัติ</b>\n` +
      `งาน: <code>${trigger.taskId}</code>\n` +
      `จาก: ${trigger.from}\n` +
      `ผล: ${summary}`
    );
  } else {
    // ❌ ล้มเหลว — ตรวจว่าเป็น token limit หรือเปล่า
    const statusFile_ = path.join(sessionDir(trigger.taskId), 'session-status.json');
    let reason = 'no_output';
    try { reason = JSON.parse(fs.readFileSync(statusFile_, 'utf8')).reason || 'no_output'; } catch {}

    if (reason === 'token_or_context_limit') {
      // ♻️ Fallback → Codex รับงานแทน
      log(`[FALLBACK] Claude context limit → handing off to Codex`);
      const fbTrigger = normalizeTrigger({
        from: 'claude', to: 'codex',
        taskId: `${trigger.taskId}-codex-fb`.slice(0, 80),
        runId: makeRunId(),
        instruction: trigger.instruction,
        context: trigger.context,
        priority: trigger.priority,
        hopCount: trigger.hopCount + 1,
        maxHops: trigger.maxHops,
      });
      const fbFile = path.join(TRIGGERS_DIR, `claude-to-codex-${fbTrigger.taskId}.json`);
      fs.writeFileSync(fbFile, JSON.stringify(fbTrigger, null, 2), 'utf8');
      notifyB3Thai(`⚠️ <b>Claude context limit</b> — ส่งงานต่อให้ Codex\nงาน: <code>${trigger.taskId}</code>`);
    } else {
      // ♻️ Fallback → INBOX
      log(`[CLAUDE] CLI returned no output — falling back to INBOX`);
      writeInbox('claude', trigger);
      notifyClaude(trigger);
    }
  }
}

// ─── Local AI (One API + Ollama) ─────────────────────────────────────────────

// Quality check: output is considered good if it has enough content and,
// for coding tasks, contains at least one code block.
function isGoodLocalOutput(out, instruction) {
  if (!out || out.includes('(no response)') || out.length < 100) return false;
  const isCodingTask = /function|implement|เขียน|สร้าง|code|def |class |const |let |var |select |insert /i.test(instruction);
  if (isCodingTask && !out.includes('```')) return false;
  return true;
}

function runLocal(trigger) {
  const sessionDir_ = sessionDir(trigger.taskId);
  if (!fs.existsSync(sessionDir_)) fs.mkdirSync(sessionDir_, { recursive: true });

  const triggerFile = path.join(sessionDir_, 'local-trigger.json');
  fs.writeFileSync(triggerFile, JSON.stringify(trigger, null, 2), 'utf8');

  const askLocalScript = path.join(ROOT, 'scripts', 'ask-local.js');
  const outFile = path.join(sessionDir_, 'local-output.md');

  function attemptLocal() {
    return spawnSync('node', [askLocalScript, `--task-file=${triggerFile}`], {
      cwd: ROOT,
      env: { ...process.env, LOCAL_AI_TIMEOUT_MS: '90000' },
      timeout: 120000, maxBuffer: 4 * 1024 * 1024, encoding: 'utf8',
    });
  }

  log(`[LOCAL] Running ask-local.js for task: ${trigger.taskId}`);
  let result = attemptLocal();
  let cleanOut = (result.stdout || '').trim();
  let cleanErr = (result.stderr || '').trim();

  // Quality gate: retry once if output is too short or coding task has no code block
  if (result.status === 0 && !isGoodLocalOutput(cleanOut, trigger.instruction)) {
    log(`[LOCAL] ⚠️ Output quality low (${cleanOut.length} chars, no code block?) — retrying once...`);
    result = attemptLocal();
    cleanOut = (result.stdout || '').trim();
    cleanErr = (result.stderr || '').trim();
  }

  // After retry: if still poor quality → fallback to Claude directly (skip INBOX, use inbox write)
  if (result.status === 0 && !isGoodLocalOutput(cleanOut, trigger.instruction)) {
    log(`[LOCAL] ❌ Output still poor after retry — falling back to Claude`);
    writeInbox('claude', { ...trigger, instruction: `[LOCAL-QUALITY-FALLBACK] งาน local ผลไม่ดี 2 รอบ → รับงานต่อ: ${trigger.instruction}` });
    syncLog(trigger.taskId, 'local', 'QUALITY_FALLBACK', `Output too short or no code block after retry — Claude fallback`);
    return;
  }

  if (cleanOut && result.status === 0) {
    log(`[LOCAL] ✅ Done — ${trigger.taskId}`);
    // Write INBOX-CLAUDE for pickup
    const inboxContent = [
      `# INBOX - CLAUDE`,
      `**From:** local | **Task:** ${trigger.taskId}-LOCAL-${Date.now()} | **Priority:** normal`,
      `**Time:** ${new Date().toISOString()}`,
      `## Instruction`,
      `local AI DONE for ${trigger.taskId}. Output at: ${outFile.replace(/\\/g, '/')}`,
      `---`,
      `Write output to wiki/ai-war-room/sessions/${trigger.taskId}/`,
    ].join('\n');
    const inboxFile = path.join(TRIGGERS_DIR, `INBOX-CLAUDE-${trigger.taskId}-LOCAL-${Date.now()}.md`);
    fs.writeFileSync(inboxFile, inboxContent, 'utf8');
    notifyB3Thai(
      `🖥️ <b>Local AI สำเร็จ</b> (ฟรี 0 token)\n` +
      `งาน: <code>${trigger.taskId}</code>\n` +
      `ผล: ${cleanOut.slice(0, 200)}`
    );
    syncLog(trigger.taskId, 'local', 'DONE', `Local AI finished → Claude review`);
  } else {
    log(`[LOCAL] ❌ Failed (exit ${result.status}): ${cleanErr.slice(0, 200)}`);
    writeInbox('claude', { ...trigger, instruction: `[LOCAL FAILED] ${trigger.instruction}` });
    notifyB3Thai(`⚠️ <b>Local AI ล้มเหลว</b> — ส่ง Claude แทน\nงาน: <code>${trigger.taskId}</code>`);
  }
}

function processTrigger(filePath) {
  const fileName = path.basename(filePath);
  if (processing.has(fileName)) return;
  processing.add(fileName);

  let trigger;
  try {
    if (!fs.existsSync(filePath)) {
      processing.delete(fileName);
      return;
    }
    trigger = normalizeTrigger(JSON.parse(fs.readFileSync(filePath, 'utf8')));
  } catch (error) {
    log(`[ERROR] Cannot parse ${fileName}: ${error.message}`);
    processing.delete(fileName);
    return;
  }

  const errors = validateTrigger(trigger);
  if (errors.length) {
    log(`[ERROR] Invalid trigger ${fileName}: ${errors.join(', ')}`);
    archive(filePath, `invalid-${fileName}`);
    processing.delete(fileName);
    return;
  }

  log(`[TRIGGER] ${trigger.from} -> ${trigger.to} | ${trigger.taskId} | ${trigger.priority}`);
  writeInbox(trigger.to, trigger);
  archive(filePath, fileName);

  // Sync to Supabase
  syncTask(trigger.taskId, {
    title: trigger.instruction.slice(0, 120),
    status: 'in_progress',
    owner: trigger.to,
    current_agent: trigger.to,
    last_action: `${trigger.from} → ${trigger.to}`,
  });
  syncLog(trigger.taskId, trigger.from, 'TRIGGER', `${trigger.from} → ${trigger.to}: ${trigger.instruction.slice(0, 200)}`);

  // Rate limit guard: defer trigger if AI is cooling down
  if (isRateLimited(trigger.to)) {
    log(`[COOLDOWN] ${trigger.to} still cooling down — requeueing ${trigger.taskId} in 60s`);
    setTimeout(() => {
      const requeueFile = path.join(TRIGGERS_DIR, `${trigger.from}-to-${trigger.to}-${trigger.taskId}.json`);
      fs.writeFileSync(requeueFile, JSON.stringify({ ...trigger, _requeued: true }, null, 2), 'utf8');
    }, RATE_LIMIT_BACKOFF_MS);
    processing.delete(fileName);
    return;
  }

  // Log routing decision with reason
  const routeReasons = {
    gemini: 'browse/research/visual-audit — needs web access',
    'gemini-flash': 'fast analysis/visual-audit — low cost flash model',
    'gemini-pro': 'complex research/synthesis — high cost pro model',
    codex:  'UI/frontend/code-generation — file write needed',
    claude: 'backend/API/complex-logic — quality gate',
    local:  'small task — free CPU model (0 token cost)',
  };
  logRoutingDecision(trigger.from, trigger.to, trigger.taskId,
    routeReasons[trigger.to] || 'direct assignment',
    ['local', 'groq'].includes(trigger.to) ? 'FREE' : 'PAID');

  if (trigger.to === 'gemini' || trigger.to === 'gemini-flash' || trigger.to === 'gemini-pro') {
    // Select correct cmd and env from AI_CMD/AI_ENV dynamically
    const cmd = AI_CMD[trigger.to];
    const env = AI_ENV[trigger.to];
    const outFile = path.join(sessionDir(trigger.taskId), `${trigger.to}-output.md`);
    runCliAI(trigger.to, cmd, env, trigger, outFile);

    if (fs.existsSync(outFile)) {
      const out = fs.readFileSync(outFile, 'utf8');
      tryAppendRFCOpinion(trigger, trigger.to, out);
      tryCollectThinkTank(trigger, trigger.to, out);
    }
  }
  else if (trigger.to === 'codex') runCodex(trigger);
  else if (trigger.to === 'claude') runClaude(trigger);
  else if (trigger.to === 'local') runLocal(trigger);

  processing.delete(fileName);
}

// ─── Fix 1: Kill any running watcher before starting ─────────────────────────

function acquirePidLock() {
  if (fs.existsSync(PID_FILE)) {
    const oldPid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim(), 10);
    if (oldPid && !isNaN(oldPid)) {
      try {
        process.kill(oldPid, 0); // check if alive
        process.kill(oldPid, 'SIGTERM');
        log(`[PID] Killed previous watcher (PID ${oldPid})`);
      } catch {
        // process already dead — fine
      }
    }
  }
  fs.writeFileSync(PID_FILE, String(process.pid), 'utf8');
  process.on('exit', () => { try { fs.unlinkSync(PID_FILE); } catch {} });
  process.on('SIGINT',  () => process.exit(0));
  process.on('SIGTERM', () => process.exit(0));
}

function startWatcher() {
  ensureDirs();
  acquirePidLock();
  log('[START] OpenClaw Trigger Watcher v4');
  log(`[WATCH] ${TRIGGERS_DIR}`);

  const pending = fs.readdirSync(TRIGGERS_DIR).filter((file) =>
    file.endsWith('.json') && !file.startsWith('_')
  );
  if (pending.length) {
    log(`[SCAN] ${pending.length} pending trigger(s) on startup`);
    pending.forEach((file) => processTrigger(path.join(TRIGGERS_DIR, file)));
  }

  fs.watch(TRIGGERS_DIR, (eventType, filename) => {
    if (!filename?.endsWith('.json') || filename.startsWith('_')) return;
    setTimeout(() => {
      const filePath = path.join(TRIGGERS_DIR, filename);
      if (fs.existsSync(filePath)) processTrigger(filePath);
    }, 300);
  });

  log('[READY] Watching for triggers');

  // keepalive — ป้องกัน Node event loop drain
  setInterval(() => {
    const pid = fs.existsSync(PID_FILE) ? fs.readFileSync(PID_FILE, 'utf8').trim() : null;
    if (pid !== String(process.pid)) {
      log('[WARN] PID mismatch — another watcher may have started. Exiting.');
      process.exit(0);
    }
  }, 60_000);
}

// ─── Crash protection ─────────────────────────────────────────────────────────
process.on('uncaughtException', (err) => {
  try {
    const logLine = `[${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}] [CRASH] uncaughtException: ${err.message}\n`;
    fs.appendFileSync(LOG_FILE, logLine, 'utf8');
  } catch {}
  // ไม่ exit — ให้ watcher ทำงานต่อ
});

process.on('unhandledRejection', (reason) => {
  try {
    const msg = reason instanceof Error ? reason.message : String(reason);
    const logLine = `[${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}] [CRASH] unhandledRejection: ${msg}\n`;
    fs.appendFileSync(LOG_FILE, logLine, 'utf8');
  } catch {}
  // ไม่ exit — ให้ watcher ทำงานต่อ
});

startWatcher();
