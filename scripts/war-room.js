#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const childProcess = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const WAR_ROOM = path.join(ROOT, 'wiki', 'ai-war-room');
const SESSIONS = path.join(WAR_ROOM, 'sessions');
const REPORTS = path.join(WAR_ROOM, 'reports');
const BOARD = path.join(WAR_ROOM, 'board.json');
const LOCKS = path.join(WAR_ROOM, 'locks.json');
const STORE_LOCK = path.join(WAR_ROOM, '.war-room-store.lock');
const ACTIVITY = path.join(WAR_ROOM, 'activity.md');
const WORKSPACES = path.join(WAR_ROOM, 'workspaces.json');
const PROTECTED_FILES = path.join(WAR_ROOM, 'protected-files.json');
const DASHBOARD = path.join(WAR_ROOM, 'dashboard.html');
const PERSONAS = path.join(WAR_ROOM, 'personas.json');
const RISKS = path.join(WAR_ROOM, 'risks.json');
const DEPENDENCIES = path.join(WAR_ROOM, 'dependencies.json');
const LESSONS = path.join(WAR_ROOM, 'lessons.md');
const DECISIONS = path.join(WAR_ROOM, 'decisions.md');
const APPROVALS      = path.join(WAR_ROOM, 'approvals.json');
const ROUTING_RULES  = path.join(WAR_ROOM, 'routing-rules.json');

const DEFAULT_LOCK_TTL_MINUTES = 45;
const LOCK_WARN_MINUTES = 10;
const WORK_ITEM_STATUSES = new Set(['pending', 'claimed', 'in_progress', 'review', 'done', 'blocked', 'handoff']);
const SECRET_PATTERNS = [
  { name: 'OpenAI key', regex: /sk-[A-Za-z0-9_-]{32,}/g },
  { name: 'Anthropic key', regex: /sk-ant-[A-Za-z0-9_-]{32,}/g },
  { name: 'Groq key', regex: /gsk_[A-Za-z0-9_-]{32,}/g },
  { name: 'Google API key', regex: /AIza[0-9A-Za-z_-]{35}/g },
  { name: 'JWT-like token', regex: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/g },
  { name: 'Private key block', regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g }
];

// ─── Groq Direct API ─────────────────────────────────────────────────────────
function getGroqKey() {
  if (process.env.GROQ_API_KEY) return process.env.GROQ_API_KEY;
  try {
    const envPath = path.join(ROOT, 'b3-agents', '.env');
    if (!fs.existsSync(envPath)) return null;
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const m = line.match(/^GROQ_API_KEY=(.+)/);
      if (m) return m[1].trim();
    }
  } catch { /* skip */ }
  return null;
}

function groqAsk(args) {
  const { flags, rest } = parseFlags(args);
  const question = rest.join(' ').trim();
  const agent = flags.agent || 'system';
  if (!question) throw new Error('Usage: node scripts/war-room.js groq-ask "your question" --agent claude');

  const key = getGroqKey();
  if (!key) throw new Error('GROQ_API_KEY not found in env or b3-agents/.env');

  const model = flags.model || 'llama-3.3-70b-versatile';
  const systemPrompt = flags.system || 'You are a helpful AI assistant for the B3 team. Answer concisely in the same language as the question.';

  console.error(`[groq-ask] Asking ${model}...`);

  const body = JSON.stringify({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question },
    ],
    max_tokens: flags['max-tokens'] ? Number(flags['max-tokens']) : 1024,
    temperature: 0.3,
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.groq.com',
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => {
        try {
          const json = JSON.parse(raw);
          if (json.error) { reject(new Error(json.error.message || 'Groq error')); return; }
          const answer = json.choices?.[0]?.message?.content ?? '';
          const usage = json.usage ?? {};
          console.log(answer);
          console.error(`\n[groq-ask] tokens: prompt=${usage.prompt_tokens ?? 0} completion=${usage.completion_tokens ?? 0} total=${usage.total_tokens ?? 0} | model: ${model}`);
          activity('STATUS', agent, `groq-ask: "${question.slice(0, 60)}" → ${(answer).slice(0, 80)}`);
          resolve();
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── Telegram Notify ──────────────────────────────────────────────────────────
function getTelegramEnv() {
  // 1. direct env vars
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    return { token: process.env.TELEGRAM_BOT_TOKEN, chatId: process.env.TELEGRAM_CHAT_ID };
  }
  // 2. read from b3-team-avenger/.env.local
  try {
    const ws = readJson(WORKSPACES, { workspaces: [] });
    const avenger = (ws.workspaces || []).find((w) => w.name === 'b3-team-avenger');
    const envPath = avenger
      ? path.join(avenger.root, '.env.local')
      : path.join(ROOT, '..', 'b3-team-avenger', '.env.local');
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
      const map = {};
      for (const line of lines) {
        const m = line.match(/^([A-Z_]+)=(.+)/);
        if (m) map[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '');
      }
      if (map.TELEGRAM_BOT_TOKEN && map.TELEGRAM_CHAT_ID) {
        return { token: map.TELEGRAM_BOT_TOKEN, chatId: map.TELEGRAM_CHAT_ID };
      }
    }
  } catch { /* skip */ }
  return null;
}

function sendWarRoomTelegram(text) {
  const cfg = getTelegramEnv();
  if (!cfg) return;
  const body = JSON.stringify({ chat_id: cfg.chatId, text, parse_mode: 'HTML' });
  const req = https.request({
    hostname: 'api.telegram.org',
    path: `/bot${cfg.token}/sendMessage`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
  });
  req.on('error', () => { /* silent */ });
  req.write(body);
  req.end();
}

const agentEmoji = { claude: '🤖', codex: '⚙️', gemini: '✨' };
const agentDefaultModel = { claude: 'claude-sonnet-4-6', codex: 'claude-opus-4-8', gemini: 'gemini-2.0-flash' };

// ─── Routing Suggestion ──────────────────────────────────────────────────────
function suggestRouting(title) {
  if (!fs.existsSync(ROUTING_RULES)) return null;
  try {
    const rules = JSON.parse(fs.readFileSync(ROUTING_RULES, 'utf8'));
    const lower = title.toLowerCase();
    for (const rule of (rules.rules || [])) {
      const keywords = rule.keywords || [];
      if (keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
        return rule;
      }
    }
  } catch { /* skip */ }
  return null;
}

// ─── Auto-log cost to Avenger API ─────────────────────────────────────────────
function logCostToAvenger(agent, tokens, taskId, model) {
  const cfg = getTelegramEnv(); // reuse env loading
  // read APP_URL from avenger .env.local
  try {
    const ws = readJson(WORKSPACES, { workspaces: [] });
    const avenger = (ws.workspaces || []).find((w) => w.name === 'b3-team-avenger');
    const envPath = avenger
      ? path.join(avenger.root, '.env.local')
      : path.join(ROOT, '..', 'b3-team-avenger', '.env.local');
    if (!fs.existsSync(envPath)) return;
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    const map = {};
    for (const line of lines) {
      const m = line.match(/^([A-Z_]+)=(.+)/);
      if (m) map[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '');
    }
    const appUrl = map['NEXT_PUBLIC_APP_URL'] || 'https://b3-team-avenger.vercel.app';
    const body = JSON.stringify({
      agent: agent ? agent.charAt(0).toUpperCase() + agent.slice(1) : 'Unknown',
      model: model || agentDefaultModel[agent] || 'claude-sonnet-4-6',
      tokens: Number(tokens) || 0,
      task_id: taskId || null,
    });
    const req = https.request({
      hostname: new URL(appUrl).hostname,
      path: '/api/cost',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    });
    req.on('error', () => { /* silent */ });
    req.write(body);
    req.end();
  } catch { /* silent */ }
}
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────

function defaultProtectedFiles() {
  return {
    version: '1.0',
    rules: [
      { pattern: '.env*', reason: 'environment secrets and runtime config' },
      { pattern: '**/.env*', reason: 'environment secrets and runtime config' },
      { pattern: 'wiki/credentials/**', reason: 'credentials vault' },
      { pattern: 'wiki/api-keys.txt', reason: 'API key inventory' },
      { pattern: '**/*credentials*.md', reason: 'credential documentation' },
      { pattern: '**/*secret*.md', reason: 'secret documentation' },
      { pattern: '**/*migration*.sql', reason: 'database migration' },
      { pattern: '**/schema*.sql', reason: 'database schema' },
      { pattern: '**/supabase/**', reason: 'Supabase project config' }
    ]
  };
}

function defaultPersonas() {
  return {
    version: '1.0',
    personas: [
      { id: 'claude', strengths: ['planning', 'coordination', 'review', 'product reasoning'], default_roles: ['coordinator', 'reviewer'] },
      { id: 'codex', strengths: ['code implementation', 'tooling', 'automation', 'system safety'], default_roles: ['implementer', 'systems owner'] },
      { id: 'gemini', strengths: ['research', 'summarization', 'cross-checking', 'content rewrite'], default_roles: ['researcher', 'reviewer'] },
      { id: 'qara', strengths: ['QA', 'test cases', 'regression checks'], default_roles: ['tester'] },
      { id: 'enjoy', strengths: ['UI implementation', 'frontend polish'], default_roles: ['owner'] }
    ]
  };
}

function defaultRisks() {
  return {
    version: '1.0',
    risks: [
      { id: 'R-001', area: 'coordination', severity: 'medium', status: 'open', owner: 'team', description: 'Active tasks missing reviewer or final approver can stall finalize.' },
      { id: 'R-002', area: 'security', severity: 'high', status: 'open', owner: 'team', description: 'Sensitive files require protected-file approval before edits.' }
    ]
  };
}

function defaultDependencies() {
  return {
    version: '1.0',
    projects: [
      { id: 'second-brain', depends_on: [], notes: 'War Room, knowledge base, team coordination.' },
      { id: 'b3-team-avenger', depends_on: ['second-brain'], notes: 'Product app tasks use War Room for coordination.' },
      { id: 'jong-jaroen', depends_on: ['second-brain'], notes: 'Community service app and business workflows.' },
      { id: 'cit-service', depends_on: ['second-brain'], notes: 'CIT operational knowledge and support tooling.' }
    ]
  };
}

function defaultApprovals() {
  return { version: '1.0', approvals: [] };
}

function nowIso() {
  return new Date().toISOString();
}

function nowTag() {
  return nowIso().replace('T', '-').slice(0, 16);
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function defaultWorkspaces() {
  const desktopRoot = path.resolve(ROOT, '..');
  return {
    version: '1.0',
    roots: [
      { id: 'second-brain', path: ROOT, prefix: '' },
      { id: 'b3-team-avenger', path: path.join(desktopRoot, 'b3-team-avenger'), prefix: 'b3-team-avenger' },
      { id: 'jong-jaroen', path: path.join(desktopRoot, 'jong-jaroen'), prefix: 'jong-jaroen' },
      { id: 'cit-service', path: path.join(desktopRoot, 'cit-service'), prefix: 'cit-service' }
    ]
  };
}

function loadWorkspaces() {
  try {
    const data = fs.existsSync(WORKSPACES) ? JSON.parse(fs.readFileSync(WORKSPACES, 'utf8')) : defaultWorkspaces();
    return {
      version: data.version || '1.0',
      roots: (data.roots || []).map((root) => ({
        id: root.id,
        path: path.resolve(root.path),
        prefix: root.prefix === undefined ? root.id : root.prefix
      })).filter((root) => root.id && root.path)
    };
  } catch {
    return defaultWorkspaces();
  }
}

function matchWorkspace(absolutePath) {
  const abs = path.resolve(absolutePath);
  return loadWorkspaces().roots
    .filter((root) => abs === root.path || abs.startsWith(root.path + path.sep))
    .sort((a, b) => b.path.length - a.path.length)[0] || null;
}

function loadProtectedFiles() {
  try {
    const data = fs.existsSync(PROTECTED_FILES) ? JSON.parse(fs.readFileSync(PROTECTED_FILES, 'utf8')) : defaultProtectedFiles();
    return {
      version: data.version || '1.0',
      rules: (data.rules || []).filter((rule) => rule.pattern).map((rule) => ({
        pattern: String(rule.pattern),
        reason: rule.reason || 'protected file'
      }))
    };
  } catch {
    return defaultProtectedFiles();
  }
}

function loadJsonWithDefault(file, fallback) {
  try {
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback();
  } catch {
    return fallback();
  }
}

function writeRegistry(file, fallback) {
  const current = loadJsonWithDefault(file, fallback);
  writeJson(file, current);
  return current;
}

function taskMapContent(taskId) {
  const { task } = getBoardTask(taskId);
  const file = path.join(sessionDirForTask(taskId, task), 'task-map.md');
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function decisionRequired(taskId) {
  const content = taskMapContent(taskId);
  return /Decision Required\s*\r?\n\s*(yes|true|required)/i.test(content)
    || /Requires Decision Log\s*\r?\n\s*(yes|true|required)/i.test(content);
}

function decisionLogged(taskId) {
  if (!fs.existsSync(DECISIONS)) return false;
  return fs.readFileSync(DECISIONS, 'utf8').includes(`Task: ${taskId}`);
}

function ensureLessonsFile() {
  if (!fs.existsSync(LESSONS)) {
    fs.writeFileSync(LESSONS, '# War Room Lessons Learned\n\n');
  }
}

function loadApprovals() {
  const data = loadJsonWithDefault(APPROVALS, defaultApprovals);
  data.approvals = data.approvals || [];
  return data;
}

function nextApprovalId(data) {
  return `A-${String((data.approvals || []).length + 1).padStart(4, '0')}`;
}

function approvalMatches(approval, type, taskId) {
  if (!approval || approval.status !== 'approved') return false;
  if (type && approval.type !== type) return false;
  if (taskId && approval.task_id && approval.task_id !== taskId) return false;
  return true;
}

function approvalSummary(approval) {
  const what = approval.what || approval.reason || 'Review the requested action.';
  const risk = approval.risk || `Risk level: ${approval.risk_level || 'medium'}.`;
  const ifNot = approval.if_not || 'If not approved, the agent will leave this work pending.';
  return [
    `What: ${what}`,
    `Risk: ${risk}`,
    `If not approved: ${ifNot}`
  ].join('\n');
}

function findDuplicatePendingApproval(data, type, taskId, reason) {
  return (data.approvals || []).find((item) =>
    item.status === 'pending' &&
    item.type === type &&
    (item.task_id || null) === (taskId || null) &&
    String(item.reason || '').trim() === String(reason || '').trim()
  );
}

function requireApproval(flags, type, taskId, reason) {
  if (flags.force && flags['no-approval']) return null;
  const id = flags.approval || flags['approval-id'];
  if (!id) throw new Error(`${reason}. Request approval first: node scripts/war-room.js approval request --type ${type} --task ${taskId || 'TASK_ID'} "reason" --agent AGENT`);
  const data = loadApprovals();
  const approval = data.approvals.find((item) => item.id === id);
  if (!approvalMatches(approval, type, taskId)) {
    throw new Error(`Approval ${id} is not approved for ${type}${taskId ? `/${taskId}` : ''}`);
  }
  approval.status = 'used';
  approval.used_at = nowIso();
  approval.used_for = `${type}${taskId ? `:${taskId}` : ''}`;
  writeJson(APPROVALS, data);
  return approval;
}

function continuityConfig() {
  return loadJsonWithDefault(PERSONAS, defaultPersonas).continuity || {
    default_fallback_order: ['codex', 'gemini', 'claude', 'qara'],
    role_fallbacks: {}
  };
}

function chooseNextAgent(current, role) {
  const config = continuityConfig();
  const order = (role && config.role_fallbacks?.[role]) || config.default_fallback_order || ['codex', 'gemini', 'claude', 'qara'];
  return order.find((agent) => agent && agent !== current) || order[0] || 'codex';
}

function globToRegex(pattern) {
  const normalized = pattern.replace(/\\/g, '/');
  let output = '^';
  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i];
    if (char === '*') {
      if (normalized[i + 1] === '*') {
        output += '.*';
        i += 1;
      } else {
        output += '[^/]*';
      }
    } else if (char === '?') {
      output += '[^/]';
    } else {
      output += char.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`${output}$`, 'i');
}

function protectedMatch(file) {
  const normalized = cleanPath(file);
  return loadProtectedFiles().rules.find((rule) => globToRegex(rule.pattern).test(normalized)) || null;
}

function ensureProtectedAllowed(file, agent, flags) {
  const match = protectedMatch(file);
  if (!match) return;
  if (flags.approval || flags['approval-id']) {
    requireApproval(flags, 'protected-file', flags.task || null, `Protected file: ${file}`);
    activity('PROTECTED', agent || 'system', `${file}: approved via ${flags.approval || flags['approval-id']}`);
    return;
  }
  if (flags['protected-ok'] || flags.override) {
    activity('PROTECTED', agent || 'system', `${file}: ${match.reason}`);
    return;
  }
  throw new Error(`Protected file: ${file} (${match.reason}). Add --protected-ok and a clear --reason after approval.`);
}

function cleanPath(file) {
  if (!file) return file;
  const normalized = file.replace(/\\/g, '/').replace(/^\.\//, '');
  const rootName = path.basename(ROOT);

  function stripRootPrefixes(value) {
    const parts = value.split('/').filter(Boolean);
    while (parts[0] === rootName) parts.shift();
    return parts.join('/');
  }

  if (!path.isAbsolute(file) && !normalized.startsWith('../')) {
    return stripRootPrefixes(normalized);
  }

  const absolute = path.resolve(process.cwd(), file);
  const workspace = matchWorkspace(absolute);
  if (workspace) {
    const rel = path.relative(workspace.path, absolute).replace(/\\/g, '/');
    return [workspace.prefix, rel].filter(Boolean).join('/');
  }

  const desktopRoot = path.resolve(ROOT, '..');
  let relative = path.relative(desktopRoot, absolute);
  relative = relative.replace(/\\/g, '/');
  return stripRootPrefixes(relative);
}

function withStoreMutex(fn) {
  const deadline = Date.now() + 10000;
  let fd = null;

  while (Date.now() < deadline) {
    try {
      fd = fs.openSync(STORE_LOCK, 'wx');
      fs.writeFileSync(fd, `${process.pid}\n${nowIso()}\n`);
      break;
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
      try {
        const stat = fs.statSync(STORE_LOCK);
        if (Date.now() - stat.mtimeMs > 30000) fs.unlinkSync(STORE_LOCK);
      } catch (cleanupErr) {
        if (cleanupErr.code !== 'ENOENT') throw cleanupErr;
      }
      sleep(100);
    }
  }

  if (fd === null) throw new Error('Timed out waiting for war-room store lock');

  try {
    return fn();
  } finally {
    fs.closeSync(fd);
    try {
      fs.unlinkSync(STORE_LOCK);
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  }
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function normalizeLock(lock) {
  const taskId = lock.task_id || lock.task || null;
  const owner = lock.owner || lock.agent || null;
  const lockedAt = lock.locked_at || lock.claimed_at || null;
  return {
    file: cleanPath(lock.file),
    owner,
    task_id: taskId,
    locked_at: lockedAt,
    heartbeat_at: lock.heartbeat_at || lockedAt,
    expires_at: lock.expires_at || null,
    reason: lock.reason || 'claimed for edit'
  };
}

function normalizeLocks(data) {
  data.locks = (data.locks || []).map(normalizeLock);
  return data;
}

function writeJson(file, data) {
  data.updated_at = nowIso();
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

function append(file, text) {
  fs.appendFileSync(file, text.endsWith('\n') ? text : text + '\n');
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000).toISOString();
}

function lockExpiry(flags) {
  if (flags['no-expire']) return null;
  if (flags.expires) return String(flags.expires);
  const ttl = Number(flags.ttl || DEFAULT_LOCK_TTL_MINUTES);
  return addMinutes(new Date(), Number.isFinite(ttl) && ttl > 0 ? ttl : DEFAULT_LOCK_TTL_MINUTES);
}

function lockExpired(lock) {
  return !!lock.expires_at && Date.parse(lock.expires_at) <= Date.now();
}

function lockExpiringSoon(lock) {
  if (!lock.expires_at || lockExpired(lock)) return false;
  return Date.parse(lock.expires_at) - Date.now() <= LOCK_WARN_MINUTES * 60 * 1000;
}

function slugify(input) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9ก-๙]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function activity(tag, agent, body) {
  append(ACTIVITY, `- [${tag}] @team from:@${agent} ts:${nowTag()} ${body}`);
}

function parseFlags(args) {
  const flags = {};
  const rest = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (!next || next.startsWith('--')) {
        flags[key] = true;
      } else {
        flags[key] = next;
        i += 1;
      }
    } else {
      rest.push(arg);
    }
  }
  return { flags, rest };
}

function getActiveTask(taskId) {
  const board = readJson(BOARD, { version: '1.0', active_tasks: [], pending_tasks: [], done_tasks: [] });
  const task = (board.active_tasks || []).find((item) => item.id === taskId);
  return { board, task };
}

function getBoardTask(taskId) {
  const board = readJson(BOARD, { version: '1.0', active_tasks: [], pending_tasks: [], done_tasks: [] });
  for (const section of ['active_tasks', 'pending_tasks', 'done_tasks']) {
    const task = (board[section] || []).find((item) => item.id === taskId);
    if (task) return { board, task, section };
  }
  return { board, task: null, section: null };
}

function sessionDir(taskId) {
  return path.join(SESSIONS, taskId);
}

function sessionDirForTask(taskId, task) {
  return task?.session ? path.resolve(ROOT, task.session) : sessionDir(taskId);
}

function taskMapPath(taskId) {
  return path.join(sessionDir(taskId), 'task-map.md');
}

function stripMarkdown(value) {
  return value
    .trim()
    .replace(/^#+\s*/, '')
    .replace(/^\*\*(.+)\*\*$/, '$1')
    .replace(/^`(.+)`$/, '$1')
    .trim();
}

function extractCurrentPhase(content) {
  const headingMatch = content.match(/## Current Phase\s*\r?\n([\s\S]*?)(?:\r?\n## |\s*$)/i);
  if (headingMatch) {
    const line = headingMatch[1]
      .split(/\r?\n/)
      .map((item) => stripMarkdown(item))
      .find((item) => item && !item.startsWith('|'));
    if (line) return line;
  }

  const inlineMatch = content.match(/Current Phase\s*[:：]\s*(.+)/i);
  if (inlineMatch) return stripMarkdown(inlineMatch[1]);
  return null;
}

function extractSection(content, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = content.match(new RegExp(`## ${escaped}\\s*\\r?\\n([\\s\\S]*?)(?:\\r?\\n## |$)`, 'i'));
  return match ? match[1] : '';
}

function extractSingleLineSection(content, heading) {
  return extractSection(content, heading)
    .split(/\r?\n/)
    .map((item) => stripMarkdown(item))
    .find((item) => item && !item.startsWith('|') && !item.startsWith('-')) || '';
}

function taskDiscipline(taskId, task) {
  const dir = sessionDirForTask(taskId, task);
  const mapPath = path.join(dir, 'task-map.md');
  const discipline = {
    owner: task?.owner || '',
    coordinator: task?.coordinator || '',
    reviewer: task?.reviewer || '',
    final_approver: task?.final_approver || '',
    next_action: task?.next_action || task?.summary || '',
    warnings: []
  };
  if (fs.existsSync(mapPath)) {
    const content = fs.readFileSync(mapPath, 'utf8');
    discipline.owner = extractSingleLineSection(content, 'Owner') || discipline.owner;
    discipline.coordinator = extractSingleLineSection(content, 'Coordinator') || discipline.coordinator;
    discipline.reviewer = extractSingleLineSection(content, 'Reviewer') || discipline.reviewer;
    discipline.final_approver = extractSingleLineSection(content, 'Final Approver') || discipline.final_approver;
    discipline.next_action = extractSingleLineSection(content, 'Next Action') || discipline.next_action;
  }
  if (!discipline.owner || ['undecided', 'unknown'].includes(String(discipline.owner).toLowerCase())) discipline.warnings.push('owner missing');
  if (!discipline.coordinator) discipline.warnings.push('coordinator missing');
  if (!discipline.reviewer) discipline.warnings.push('reviewer missing');
  if (!discipline.final_approver) discipline.warnings.push('final approver missing');
  if (!discipline.next_action || /check task-map\.md and chat\.md/i.test(discipline.next_action)) discipline.warnings.push('next action missing');
  return discipline;
}

function patternMatches(pattern, file) {
  const cleanPattern = cleanPath(stripMarkdown(pattern));
  const cleanFile = cleanPath(file);
  if (!cleanPattern) return false;
  if (!cleanPattern.includes('*')) return cleanPattern === cleanFile;
  const escaped = cleanPattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`).test(cleanFile);
}

function fileOwnerFromTaskMap(taskId, file) {
  const mapPath = taskMapPath(taskId);
  if (!fs.existsSync(mapPath)) return null;
  const content = fs.readFileSync(mapPath, 'utf8');
  for (const heading of ['File Locks Needed', 'Lock Assignments']) {
    const section = extractSection(content, heading);
    for (const line of section.split(/\r?\n/)) {
      if (!line.trim().startsWith('|')) continue;
      const cells = line.split('|').slice(1, -1).map((cell) => stripMarkdown(cell));
      if (cells.length < 2 || cells[0].toLowerCase() === 'file' || /^-+$/.test(cells[0])) continue;
      const owner = cells[1].toLowerCase();
      if (!owner || ['owner', 'agent', 'dynamic', 'undecided'].includes(owner)) continue;
      if (patternMatches(cells[0], file)) return owner;
    }
  }
  return null;
}

function tableRows(section) {
  return section.split(/\r?\n/)
    .filter((line) => line.trim().startsWith('|'))
    .map((line) => line.split('|').slice(1, -1).map((cell) => stripMarkdown(cell)));
}

function workItemsFromTaskMap(taskId) {
  const mapPath = taskMapPath(taskId);
  if (!fs.existsSync(mapPath)) return [];
  const rows = tableRows(extractSection(fs.readFileSync(mapPath, 'utf8'), 'Work Items'));
  const header = rows.find((cells) => cells.some((cell) => cell.toLowerCase() === 'id'));
  if (!header) return [];
  const idIdx = header.findIndex((cell) => cell.toLowerCase() === 'id');
  const statusIdx = header.findIndex((cell) => cell.toLowerCase() === 'status');
  if (idIdx === -1 || statusIdx === -1) return [];
  return rows
    .filter((cells) => cells[idIdx] && !/^[-:]+$/.test(cells[idIdx]) && cells[idIdx].toLowerCase() !== 'id')
    .map((cells) => ({ id: cells[idIdx], status: (cells[statusIdx] || '').toLowerCase(), raw: cells }));
}

function validTransition(from, to) {
  if (!from || from === to) return true;
  const transitions = {
    pending: ['claimed', 'in_progress', 'blocked'],
    claimed: ['in_progress', 'blocked', 'handoff'],
    in_progress: ['review', 'done', 'blocked', 'handoff'],
    review: ['done', 'in_progress', 'blocked'],
    blocked: ['handoff', 'claimed', 'in_progress'],
    handoff: ['claimed', 'in_progress', 'blocked'],
    done: []
  };
  return (transitions[from] || []).includes(to);
}

function updateWorkItemStatus(taskId, itemId, nextStatus, force) {
  if (!WORK_ITEM_STATUSES.has(nextStatus)) throw new Error(`Invalid status: ${nextStatus}`);
  const mapPath = taskMapPath(taskId);
  if (!fs.existsSync(mapPath)) throw new Error(`task-map.md not found for ${taskId}`);
  const lines = fs.readFileSync(mapPath, 'utf8').split(/\r?\n/);
  let inWorkItems = false;
  let header = null;
  let statusIdx = -1;
  let idIdx = -1;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^##\s+Work Items/i.test(line)) {
      inWorkItems = true;
      continue;
    }
    if (inWorkItems && /^##\s+/.test(line)) break;
    if (!inWorkItems || !line.trim().startsWith('|')) continue;

    const cells = line.split('|').slice(1, -1).map((cell) => stripMarkdown(cell));
    if (!header && cells.some((cell) => cell.toLowerCase() === 'id')) {
      header = cells;
      idIdx = header.findIndex((cell) => cell.toLowerCase() === 'id');
      statusIdx = header.findIndex((cell) => cell.toLowerCase() === 'status');
      continue;
    }
    if (!header || idIdx === -1 || statusIdx === -1) continue;
    if (!cells[idIdx] || /^[-:]+$/.test(cells[idIdx])) continue;
    if (cells[idIdx] !== itemId) continue;

    const current = (cells[statusIdx] || '').toLowerCase();
    if (!force && !validTransition(current, nextStatus)) {
      throw new Error(`Invalid transition ${current || '(empty)'} -> ${nextStatus}; use --force to override`);
    }
    cells[statusIdx] = nextStatus;
    lines[i] = `| ${cells.join(' | ')} |`;
    fs.writeFileSync(mapPath, lines.join('\n'));
    return { itemId, from: current, to: nextStatus };
  }
  throw new Error(`Work item not found: ${itemId}`);
}

function ensureClaimAllowed(taskId, file, agent, flags) {
  const { task } = getActiveTask(taskId);
  if (!task && !flags.allowInactive) throw new Error(`Active task not found: ${taskId}`);

  const assignedOwner = fileOwnerFromTaskMap(taskId, file);
  if (!assignedOwner || assignedOwner === agent) return;
  if (task && (task.owner === agent || task.coordinator === agent)) return;

  const handoffFrom = typeof flags['handoff-from'] === 'string' ? flags['handoff-from'].toLowerCase() : null;
  if (handoffFrom === assignedOwner || flags.override) return;

  throw new Error(`File assigned to ${assignedOwner}: ${file}. Use --handoff-from ${assignedOwner} after a real handoff.`);
}


function templateFiles(taskId, title, owner) {
  return {
    'brief.md': `# Task Brief

Task ID: ${taskId}
Created: ${nowIso()}
Requested by: B3
Owner: ${owner || 'undecided'}
Helpers: dynamic
Status: active

## Goal

${title}

## Scope

## Out of Scope

## Acceptance Criteria

## References
`,
    'task-map.md': `# Task Map

## Current Phase
**Phase 0 - team negotiation**

## Owner

${owner || 'undecided'}

## Coordinator

${owner || 'undecided'}

## Reviewer

undecided

## Final Approver

B3

## Next Action

Assign owner/coordinator/reviewer, then claim the first file before editing.

## Selection Reason

Pending team negotiation.

## Helpers

Dynamic. Each AI should propose [CLAIM] or [PLAN] in chat.md.

## Work Items

| ID | Owner | Task | Status |
|---|---|---|---|

## File Locks Needed

| File | Owner | Reason |
|---|---|---|

## Ownership Policy

- Files listed above can only be claimed by their owner unless the claimer passes \`--handoff-from OWNER\` after a real handoff.
- Run \`node scripts/war-room.js preflight ${taskId} FILE --agent AGENT\` before editing.
`,
    'chat.md': `# AI-to-AI Chat

[PLAN] @team from:@system ts:${nowTag()}
Session created. Each AI should read brief.md and propose a contribution before editing files.
---
`,
    'handoff.md': `# Handoff

## Current State

Session created.

## Next Action

Read brief.md and propose [CLAIM] or [PLAN] in chat.md.

## Blockers

None known.

## Release Notes
`,
    'review.md': '# Review\n\n## Findings\n\n## Checklist\n\n## Approval\n',
    'synthesis.md': `# Synthesis

## Agreed Facts

## Conflicts / Disagreements

## Low-Confidence Claims

## Decisions

## Knowledge To Keep

## Sources / References

## Recommended Final Location
`,
    'final.md': '# Final Report\n\n## Done\n\n## Verified\n\n## Remaining\n\n## Needs B3\n\n## Agent/File Summary\n\nRun `node scripts/war-room.js summary TASK_ID --agent AGENT --write` to generate this section.\n'
  };
}

function startTask(args) {
  const { flags, rest } = parseFlags(args);
  const title = rest.join(' ').trim();
  if (!title) throw new Error('Usage: node scripts/war-room.js start "task title" --agent codex [--owner codex]');
  const taskId = `${new Date().toISOString().slice(0, 10)}-${slugify(title)}`;
  const dir = sessionDir(taskId);
  if (fs.existsSync(dir)) throw new Error(`Session already exists: ${taskId}`);

  ensureDir(dir);
  ensureDir(path.join(dir, 'research'));
  for (const [name, content] of Object.entries(templateFiles(taskId, title, flags.owner))) {
    fs.writeFileSync(path.join(dir, name), content);
  }
  fs.writeFileSync(path.join(dir, 'research', 'README.md'), `# Research Drafts

Each AI writes its own draft here before anything becomes permanent shared knowledge.

Required sections:

- Claims
- Evidence / References
- Confidence
- Risks / Unknowns
- Recommended Knowledge To Keep
`);

  const board = readJson(BOARD, { version: '1.0', active_tasks: [], pending_tasks: [], done_tasks: [] });
  board.active_tasks = board.active_tasks || [];
  board.active_tasks.push({
    id: taskId,
    title,
    owner: flags.owner || 'undecided',
    coordinator: flags.coordinator || flags.owner || 'undecided',
    reviewer: flags.reviewer || 'undecided',
    final_approver: flags['final-approver'] || 'B3',
    next_action: 'Assign owner/coordinator/reviewer, then claim the first file before editing.',
    status: 'active',
    session: `wiki/ai-war-room/sessions/${taskId}`,
    created_at: nowIso()
  });
  writeJson(BOARD, board);
  activity('STATUS', flags.agent || 'system', `started task ${taskId}`);
  console.log(taskId);

  // Auto routing suggestion
  const suggestion = suggestRouting(title);
  if (suggestion && !flags.owner) {
    const icon = agentEmoji[suggestion.owner] ?? '🤖';
    console.error(`\n💡 Routing suggestion for "${title.slice(0, 50)}":
   Type  : ${suggestion.label}
   Owner : ${icon} ${suggestion.owner}${suggestion.helpers?.length ? ` (+ ${suggestion.helpers.join(', ')})` : ''}
   Review: ${suggestion.reviewer}
   Note  : ${suggestion.note}
   → Re-run with --owner ${suggestion.owner} to assign automatically\n`);
  }
}

function claim(args) {
  const { flags, rest } = parseFlags(args);
  let [taskId, file] = rest;
  const agent = flags.agent ? String(flags.agent).toLowerCase() : null;
  if (!taskId || !file || !agent) throw new Error('Usage: node scripts/war-room.js claim TASK_ID FILE --agent codex [--reason "..."]');
  file = cleanPath(file);
  ensureClaimAllowed(taskId, file, agent, flags);
  ensureProtectedAllowed(file, agent, flags);

  const locks = normalizeLocks(readJson(LOCKS, { version: '1.0', locks: [] }));
  locks.locks = locks.locks || [];
  locks.locks = locks.locks.filter((lock) => !(lock.file === file && lockExpired(lock)));
  const existing = locks.locks.find((lock) => lock.file === file);
  if (existing && existing.owner !== agent) {
    throw new Error(`File locked by ${existing.owner}: ${file}`);
  }
  const expiresAt = lockExpiry(flags);
  if (!existing) {
    locks.locks.push({
      file,
      owner: agent,
      task_id: taskId,
      locked_at: nowIso(),
      heartbeat_at: nowIso(),
      expires_at: expiresAt,
      reason: flags.reason || (flags['handoff-from'] ? `handoff from ${flags['handoff-from']}` : 'claimed for edit')
    });
  } else {
    existing.task_id = taskId;
    existing.locked_at = nowIso();
    existing.heartbeat_at = nowIso();
    existing.expires_at = expiresAt || existing.expires_at || null;
    existing.reason = flags.reason || (flags['handoff-from'] ? `handoff from ${flags['handoff-from']}` : existing.reason);
  }
  writeJson(LOCKS, locks);
  activity('CLAIM', agent, `${file} for ${taskId}`);
  console.log(`claimed ${file}`);
}

function release(args) {
  const { flags, rest } = parseFlags(args);
  let [taskId, file] = rest;
  const agent = flags.agent ? String(flags.agent).toLowerCase() : null;
  if (!taskId || !file || !agent) throw new Error('Usage: node scripts/war-room.js release TASK_ID FILE --agent codex');
  file = cleanPath(file);

  const locks = normalizeLocks(readJson(LOCKS, { version: '1.0', locks: [] }));
  const before = (locks.locks || []).length;
  locks.locks = (locks.locks || []).filter((lock) => !(lock.file === file && lock.task_id === taskId && lock.owner === agent));
  if (locks.locks.length === before) throw new Error(`No matching lock for ${agent}: ${file}`);
  writeJson(LOCKS, locks);
  activity('RELEASE', agent, `${file} for ${taskId}`);
  console.log(`released ${file}`);
}

function preflight(args) {
  const { flags, rest } = parseFlags(args);
  let [taskId, file] = rest;
  const agent = flags.agent ? String(flags.agent).toLowerCase() : null;
  if (!taskId || !file || !agent) throw new Error('Usage: node scripts/war-room.js preflight TASK_ID FILE --agent codex [--claim]');
  file = cleanPath(file);

  ensureClaimAllowed(taskId, file, agent, flags);
  ensureProtectedAllowed(file, agent, flags);
  if (flags.claim) claim([taskId, file, '--agent', agent, '--reason', flags.reason || 'preflight auto-claim']);

  const locks = normalizeLocks(readJson(LOCKS, { version: '1.0', locks: [] }));
  const existing = (locks.locks || []).find((lock) => lock.file === file && lock.task_id === taskId);
  if (!existing) {
    throw new Error(`No lock for ${file}. Run: node scripts/war-room.js claim ${taskId} ${file} --agent ${agent}`);
  }
  if (lockExpired(existing)) throw new Error(`Lock expired for ${file}. Re-claim before editing.`);
  if (existing.owner !== agent) throw new Error(`File locked by ${existing.owner}: ${file}`);

  console.log(`preflight ok: ${agent} may edit ${file}`);
}

function touch(args) {
  const { flags, rest } = parseFlags(args);
  let [taskId, file] = rest;
  const agent = flags.agent ? String(flags.agent).toLowerCase() : null;
  if (!taskId || !file || !agent) throw new Error('Usage: node scripts/war-room.js touch TASK_ID FILE --agent codex [--ttl 45]');
  file = cleanPath(file);

  const locks = normalizeLocks(readJson(LOCKS, { version: '1.0', locks: [] }));
  const existing = (locks.locks || []).find((lock) => lock.file === file && lock.task_id === taskId);
  if (!existing) throw new Error(`No matching lock: ${file}`);
  if (existing.owner !== agent) throw new Error(`File locked by ${existing.owner}: ${file}`);

  existing.heartbeat_at = nowIso();
  existing.expires_at = lockExpiry(flags);
  writeJson(LOCKS, locks);
  activity('STATUS', agent, `${taskId}: heartbeat ${file} until ${existing.expires_at || 'no-expire'}`);
  console.log(`touched ${file}: ${existing.expires_at || 'no-expire'}`);
}

function message(args) {
  const { flags, rest } = parseFlags(args);
  const [taskId, tag, receiver, ...bodyParts] = rest;
  const agent = flags.agent;
  const body = bodyParts.join(' ').trim();
  if (!taskId || !tag || !receiver || !body || !agent) {
    throw new Error('Usage: node scripts/war-room.js msg TASK_ID TAG @receiver "body" --agent codex');
  }
  const file = path.join(sessionDir(taskId), 'chat.md');
  append(file, `\n[${tag}] ${receiver} from:@${agent} ts:${nowTag()}\n${body}\n---\n`);
  activity(tag, agent, `${taskId}: ${body}`);
  console.log('message added');
}

function report(args) {
  const { flags, rest } = parseFlags(args);
  const agent = flags.agent;
  const [kind, ...bodyParts] = rest;
  const body = bodyParts.join(' ').trim();
  if (!agent || !kind || !body) throw new Error('Usage: node scripts/war-room.js report issue "body" --agent codex [--task TASK_ID]');
  ensureDir(REPORTS);
  const file = path.join(REPORTS, `${new Date().toISOString().slice(0, 10)}-${agent}.md`);
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, `# ${agent} Improvement Report - ${new Date().toISOString().slice(0, 10)}\n\n`);
  }
  append(file, `## ${nowIso()}\n\n[${kind.toUpperCase()}] task:${flags.task || 'n/a'}\n${body}\n`);
  activity(kind.toUpperCase(), agent, body);
  console.log(`reported ${kind}`);
}

function research(args) {
  const { flags, rest } = parseFlags(args);
  const [taskId, ...bodyParts] = rest;
  const agent = flags.agent;
  const body = bodyParts.join(' ').trim();
  if (!taskId || !agent || !body) {
    throw new Error('Usage: node scripts/war-room.js research TASK_ID "summary" --agent codex [--confidence High]');
  }

  const dir = path.join(sessionDir(taskId), 'research');
  ensureDir(dir);
  const file = path.join(dir, `${agent}.md`);
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, `# Research Draft - ${agent}\n\n`);
  }
  append(file, `## ${nowIso()}\n\n## Claims\n\n${body}\n\n## Evidence / References\n\n${flags.refs || 'n/a'}\n\n## Confidence\n\n${flags.confidence || 'Medium'}\n\n## Risks / Unknowns\n\n${flags.risks || 'n/a'}\n\n## Recommended Knowledge To Keep\n\n${flags.keep || body}\n`);
  activity('RESEARCH', agent, `${taskId}: ${body}`);
  console.log(`research draft updated ${path.relative(ROOT, file)}`);
}

function done(args) {
  const { flags, rest } = parseFlags(args);
  const [taskId, ...summaryParts] = rest;
  const agent = flags.agent;
  const summary = summaryParts.join(' ').trim() || 'done';
  if (!taskId || !agent) throw new Error('Usage: node scripts/war-room.js done TASK_ID "summary" --agent codex');

  const board = readJson(BOARD, { version: '1.0', active_tasks: [], pending_tasks: [], done_tasks: [] });
  board.active_tasks = board.active_tasks || [];
  board.pending_tasks = board.pending_tasks || [];
  board.done_tasks = board.done_tasks || [];

  const idx = board.active_tasks.findIndex((task) => task.id === taskId);
  if (idx === -1) throw new Error(`Active task not found: ${taskId}`);

  // Verification gate: ห้าม mark done ถ้า session ยังไม่ครบ (ใช้ --force ข้ามได้)
  if (!flags.force) {
    const { errors } = collectValidation(taskId);
    if (errors.length) {
      throw new Error(`cannot mark done — validation failed: ${errors.join('; ')}. Fix or run with --force`);
    }
  }

  const [task] = board.active_tasks.splice(idx, 1);
  task.status = 'done';
  task.completed_at = nowIso();
  task.completed_by = agent;
  task.summary = summary;
  board.done_tasks.push(task);
  writeJson(BOARD, board);

  const locks = normalizeLocks(readJson(LOCKS, { version: '1.0', locks: [] }));
  locks.locks = (locks.locks || []).filter((lock) => lock.task_id !== taskId || lock.owner !== agent);
  writeJson(LOCKS, locks);

  activity('DONE', agent, `${taskId}: ${summary}`);
  console.log(`done ${taskId}`);
}

function lockWarnings(board, locks) {
  const doneIds = new Set((board.done_tasks || []).map((task) => task.id));
  const warnings = [];
  for (const lock of locks.locks || []) {
    if (doneIds.has(lock.task_id)) warnings.push(`stale lock from done task: ${lock.file} (${lock.task_id})`);
    if (lockExpired(lock)) warnings.push(`expired lock: ${lock.file} (${lock.owner})`);
    else if (lockExpiringSoon(lock)) warnings.push(`lock expiring soon: ${lock.file} (${lock.owner})`);
    if (/([^/]+\/)\1{2,}/.test(lock.file) || lock.file.includes('B3-Second-Brain/B3-Second-Brain')) {
      warnings.push(`suspicious normalized path: ${lock.file}`);
    }
  }
  return warnings;
}

function status() {
  const board = readJson(BOARD, { active_tasks: [], done_tasks: [] });
  const locks = normalizeLocks(readJson(LOCKS, { locks: [] }));
  console.log(JSON.stringify({
    active_tasks: board.active_tasks || [],
    pending_tasks: board.pending_tasks || [],
    lock_count: (locks.locks || []).length,
    locks: locks.locks || [],
    warnings: lockWarnings(board, locks)
  }, null, 2));
}

function gcLocks(args) {
  const { flags } = parseFlags(args);
  const agent = flags.agent || 'system';
  const board = readJson(BOARD, { active_tasks: [], done_tasks: [] });
  const activeIds = new Set((board.active_tasks || []).map((task) => task.id));
  const doneIds = new Set((board.done_tasks || []).map((task) => task.id));
  const locks = normalizeLocks(readJson(LOCKS, { version: '1.0', locks: [] }));
  const before = locks.locks.length;

  locks.locks = locks.locks.filter((lock) => {
    if (!lock.task_id || !lock.owner || !lock.file) return false;
    if (doneIds.has(lock.task_id)) return false;
    if (flags.expired && lockExpired(lock)) return false;
    if (!activeIds.has(lock.task_id) && flags.inactive) return false;
    return true;
  });

  writeJson(LOCKS, locks);
  const removed = before - locks.locks.length;
  activity('IMPROVE', agent, `garbage-collected ${removed} stale lock(s)`);
  console.log(`removed ${removed} stale lock(s)`);
}

function syncTask(args) {
  const { flags, rest } = parseFlags(args);
  const [taskId] = rest;
  const agent = flags.agent;
  if (!taskId || !agent) throw new Error('Usage: node scripts/war-room.js sync TASK_ID --agent codex');

  const { board, task } = getActiveTask(taskId);
  if (!task) throw new Error(`Active task not found: ${taskId}`);

  const taskMap = taskMapPath(taskId);
  if (!fs.existsSync(taskMap)) throw new Error(`task-map.md not found for ${taskId}`);
  const content = fs.readFileSync(taskMap, 'utf8');
  const phase = extractCurrentPhase(content);
  if (!phase) throw new Error(`Current Phase not found in ${taskMap}`);

  task.phase = phase;
  task.updated_at = nowIso();
  writeJson(BOARD, board);
  activity('STATUS', agent, `synced ${taskId} phase: ${task.phase}`);
  console.log(`synced ${taskId}: ${task.phase}`);
}

// คืน errors/warnings ของ session — ใช้ร่วมกันระหว่าง validate และ done gate
function collectValidation(taskId) {
  const errors = [];
  const warnings = [];
  const { task, section } = getBoardTask(taskId);
  if (!task) errors.push(`Task not found: ${taskId}`);

  const dir = sessionDirForTask(taskId, task);
  const sessionName = path.basename(dir);
  if (task && sessionName && sessionName !== taskId && !task.shared_session_ok) warnings.push(`Task id/session folder mismatch (${sessionName})`);
  const required = ['brief.md', 'task-map.md', 'chat.md', 'handoff.md', 'review.md', 'final.md'];
  for (const name of required) {
    if (!fs.existsSync(path.join(dir, name))) errors.push(`Missing ${name}`);
  }

  const mapPath = path.join(dir, 'task-map.md');
  if (fs.existsSync(mapPath)) {
    const content = fs.readFileSync(mapPath, 'utf8');
    if (!extractCurrentPhase(content)) warnings.push('Current Phase is missing or unreadable');
  }
  if (section === 'done_tasks') {
    const locks = normalizeLocks(readJson(LOCKS, { version: '1.0', locks: [] }));
    const staleLocks = (locks.locks || []).filter((lock) => lock.task_id === taskId);
    if (staleLocks.length) warnings.push(`Done task still has ${staleLocks.length} lock(s)`);
  }

  for (const item of workItemsFromTaskMap(taskId)) {
    if (item.status && !WORK_ITEM_STATUSES.has(item.status)) {
      warnings.push(`Work item ${item.id} has non-standard status: ${item.status}`);
    }
  }

  const locks = normalizeLocks(readJson(LOCKS, { version: '1.0', locks: [] }));
  for (const lock of locks.locks || []) {
    if (lock.task_id !== taskId) continue;
    const assignedOwner = fileOwnerFromTaskMap(taskId, lock.file);
    if (assignedOwner && assignedOwner !== lock.owner && !String(lock.reason || '').includes(`handoff from ${assignedOwner}`)) {
      warnings.push(`${lock.file} is assigned to ${assignedOwner} but locked by ${lock.owner}`);
    }
  }
  return { errors, warnings };
}

function validateTask(args) {
  const { flags, rest } = parseFlags(args);
  const [taskId] = rest;
  if (!taskId) throw new Error('Usage: node scripts/war-room.js validate TASK_ID --agent codex');

  const { errors, warnings } = collectValidation(taskId);
  const result = { ok: errors.length === 0, task_id: taskId, errors, warnings };
  console.log(JSON.stringify(result, null, 2));
  if (errors.length) throw new Error(`validation failed: ${errors.join('; ')}`);
  if (flags.agent) activity('REVIEW', String(flags.agent).toLowerCase(), `${taskId}: validation ${warnings.length ? `with ${warnings.length} warning(s)` : 'ok'}`);
}

// handoff first-class — เขียน handoff.md + โอน owner + ปล่อย lock ของผู้ส่ง ในคำสั่งเดียว
// กันเคส "หยุดเงียบทิ้งงานค้าง": ถ้าจะวางงาน ให้ handoff ไม่ใช่แค่ release เฉยๆ
function stateTask(args) {
  const { flags, rest } = parseFlags(args);
  const [taskId, itemId, nextStatus] = rest;
  const agent = flags.agent ? String(flags.agent).toLowerCase() : null;
  if (!taskId || !itemId || !nextStatus || !agent) {
    throw new Error('Usage: node scripts/war-room.js state TASK_ID ITEM_ID STATUS --agent codex [--force]');
  }
  const result = updateWorkItemStatus(taskId, itemId, nextStatus.toLowerCase(), !!flags.force);
  activity('STATUS', agent, `${taskId}: work item ${itemId} ${result.from || '(empty)'} -> ${result.to}`);
  console.log(`state ${taskId} ${itemId}: ${result.from || '(empty)'} -> ${result.to}`);
}

function handoffTask(args) {
  const { flags, rest } = parseFlags(args);
  const [taskId] = rest;
  const from = flags.agent ? String(flags.agent).toLowerCase() : null;
  const to = flags.to ? String(flags.to).toLowerCase() : null;
  const note = flags.note ? String(flags.note) : '';
  const nextAction = flags['next-action'] ? String(flags['next-action']) : '';
  const blockers   = flags.blockers       ? String(flags.blockers)       : 'None';
  if (!taskId || !from || !to) {
    throw new Error('Usage: node scripts/war-room.js handoff TASK_ID --agent FROM --to TO --note "current state" [--next-action "..."] [--blockers "..."]');
  }

  // Validate: --note must not be empty (block silent handoffs)
  if (!note && !flags.force) {
    throw new Error(
      `handoff blocked: --note is required.\n` +
      `  Simple task? Write one line: --note "ทำ X เสร็จแล้ว"\n` +
      `  Or use --force to skip (not recommended).`
    );
  }

  const { board, task } = getActiveTask(taskId);
  if (!task) throw new Error(`Active task not found: ${taskId}`);

  // 1) เขียน handoff.md แบบ structured 3-section
  const hoFile = path.join(sessionDir(taskId), 'handoff.md');
  const remainingLocks = normalizeLocks(readJson(LOCKS, { version: '1.0', locks: [] }))
    .locks.filter((l) => l.task_id === taskId && l.owner === from).map((l) => l.file);

  const hoBlock = [
    `\n## HANDOFF ${nowIso()}`,
    `From: ${from} → To: ${to}`,
    ``,
    `### Current State`,
    note || 'N/A',
    ``,
    `### Next Action`,
    nextAction || `รับงานต่อ: อ่าน task-map.md แล้ว claim ไฟล์แรก`,
    ``,
    `### Blockers`,
    blockers,
    ``,
    `Locks released: ${remainingLocks.length ? remainingLocks.join(', ') : '(none)'}`,
    `Next owner ใช้: claim ... --handoff-from ${from}`,
  ].join('\n');

  append(hoFile, hoBlock + '\n');

  // 2) โอน owner ใน board + เก็บประวัติ
  task.owner = to;
  task.handoff_from = from;
  task.handoff_at = nowIso();
  task.updated_at = nowIso();
  writeJson(BOARD, board);

  // 3) ปล่อย lock ของผู้ส่งสำหรับ task นี้ (ให้ owner ใหม่ claim ต่อได้)
  const locks = normalizeLocks(readJson(LOCKS, { version: '1.0', locks: [] }));
  const before = locks.locks.length;
  locks.locks = locks.locks.filter((l) => !(l.task_id === taskId && l.owner === from));
  writeJson(LOCKS, locks);

  // 4) แจ้งใน chat + activity
  append(path.join(sessionDir(taskId), 'chat.md'), `\n[HANDOFF] @${to} from:@${from} ts:${nowTag()}\n${note || 'handoff'} (released ${before - locks.locks.length} lock)\n---\n`);
  activity('HANDOFF', from, `${taskId}: ${from} -> ${to} (${before - locks.locks.length} lock released)`);
  console.log(`handoff ${taskId}: ${from} -> ${to}, released ${before - locks.locks.length} lock(s). Next owner: claim --handoff-from ${from}`);
}

function repairTask(args) {
  const { flags, rest } = parseFlags(args);
  const [taskId] = rest;
  const agent = flags.agent ? String(flags.agent).toLowerCase() : 'system';
  if (!taskId) throw new Error('Usage: node scripts/war-room.js repair TASK_ID --agent codex');

  const board = readJson(BOARD, { version: '1.0', active_tasks: [], pending_tasks: [], done_tasks: [] });
  const task = [...(board.active_tasks || []), ...(board.pending_tasks || []), ...(board.done_tasks || [])]
    .find((item) => item.id === taskId) || {};
  const title = task.title || taskId;
  const owner = task.owner || 'undecided';
  const dir = sessionDir(taskId);
  ensureDir(dir);
  ensureDir(path.join(dir, 'research'));

  const repaired = [];
  for (const [name, content] of Object.entries(templateFiles(taskId, title, owner))) {
    const file = path.join(dir, name);
    if (fs.existsSync(file)) continue;
    fs.writeFileSync(file, content);
    repaired.push(name);
  }

  const researchReadme = path.join(dir, 'research', 'README.md');
  if (!fs.existsSync(researchReadme)) {
    fs.writeFileSync(researchReadme, `# Research Drafts\n\nEach AI writes its own draft here before anything becomes permanent shared knowledge.\n`);
    repaired.push('research/README.md');
  }

  activity('IMPROVE', agent, `${taskId}: repaired missing session files: ${repaired.join(', ') || 'none'}`);
  console.log(JSON.stringify({ task_id: taskId, repaired }, null, 2));
}

function escapeTable(value) {
  return String(value || '')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, '<br>');
}

function ensureAgent(summary, agent) {
  const key = agent || 'unknown';
  if (!summary[key]) summary[key] = { claimed: new Set(), released: new Set(), active: new Set(), done: [] };
  return summary[key];
}

function composeSummary(taskId) {
  const summary = {};
  const activityLines = fs.existsSync(ACTIVITY) ? fs.readFileSync(ACTIVITY, 'utf8').split(/\r?\n/) : [];

  for (const line of activityLines) {
    if (!line.includes(taskId)) continue;
    const match = line.match(/^- \[(\w+)\].*from:@([\w-]+)\s+ts:[^\s]+\s+(.+)$/);
    if (!match) continue;
    const [, tag, agent, body] = match;
    const bucket = ensureAgent(summary, agent);
    const suffix = ` for ${taskId}`;
    if ((tag === 'CLAIM' || tag === 'RELEASE') && body.endsWith(suffix)) {
      const file = cleanPath(body.slice(0, -suffix.length));
      if (tag === 'CLAIM') bucket.claimed.add(file);
      if (tag === 'RELEASE') bucket.released.add(file);
    }
    if (tag === 'DONE' && body.startsWith(`${taskId}:`)) {
      bucket.done.push(body.slice(taskId.length + 1).trim());
    }
  }

  const locks = normalizeLocks(readJson(LOCKS, { version: '1.0', locks: [] }));
  for (const lock of locks.locks || []) {
    if (lock.task_id !== taskId) continue;
    ensureAgent(summary, lock.owner).active.add(lock.file);
  }

  const rows = Object.entries(summary)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([agent, data]) => {
      const claimed = [...data.claimed].sort().join('<br>') || '-';
      const released = [...data.released].sort().join('<br>') || '-';
      const active = [...data.active].sort().join('<br>') || '-';
      const done = data.done.join('<br>') || '-';
      return `| ${escapeTable(agent)} | ${escapeTable(claimed)} | ${escapeTable(released)} | ${escapeTable(active)} | ${escapeTable(done)} |`;
    });

  return [
    '<!-- WAR_ROOM_SUMMARY_START -->',
    '## Agent/File Summary',
    '',
    `Generated: ${nowIso()}`,
    '',
    '| Agent | Files Claimed | Files Released | Active Locks | Done Evidence |',
    '|---|---|---|---|---|',
    ...(rows.length ? rows : ['| - | - | - | - | - |']),
    '<!-- WAR_ROOM_SUMMARY_END -->',
    ''
  ].join('\n');
}

function writeManagedSection(file, section) {
  const start = '<!-- WAR_ROOM_SUMMARY_START -->';
  const end = '<!-- WAR_ROOM_SUMMARY_END -->';
  const existing = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '# Final Report\n\n';
  const startIdx = existing.indexOf(start);
  const endIdx = existing.indexOf(end);
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const next = existing.slice(0, startIdx).trimEnd() + '\n\n' + section + existing.slice(endIdx + end.length);
    fs.writeFileSync(file, next.trimEnd() + '\n');
    return;
  }
  fs.writeFileSync(file, existing.trimEnd() + '\n\n' + section);
}

function summaryTask(args) {
  const { flags, rest } = parseFlags(args);
  const [taskId] = rest;
  const agent = flags.agent ? String(flags.agent).toLowerCase() : 'system';
  if (!taskId) throw new Error('Usage: node scripts/war-room.js summary TASK_ID --agent codex [--write]');

  const section = composeSummary(taskId);
  if (flags.write) {
    const finalFile = path.join(sessionDir(taskId), 'final.md');
    writeManagedSection(finalFile, section);
    activity('REVIEW', agent, `${taskId}: wrote agent/file summary to final.md`);
    console.log(`summary written ${path.relative(ROOT, finalFile)}`);
    return;
  }
  console.log(section);
}

function scanSecretsInText(text, source) {
  const findings = [];
  for (const pattern of SECRET_PATTERNS) {
    let match;
    pattern.regex.lastIndex = 0;
    while ((match = pattern.regex.exec(text)) !== null) {
      const before = text.slice(0, match.index);
      const line = before.split(/\r?\n/).length;
      findings.push({ source, line, type: pattern.name });
    }
  }
  return findings;
}

function listFilesRecursive(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) listFilesRecursive(full, acc);
    else acc.push(full);
  }
  return acc;
}

function scanSecrets(args) {
  const { flags, rest } = parseFlags(args);
  const [taskId] = rest;
  const targetDir = taskId ? sessionDir(taskId) : WAR_ROOM;
  const findings = [];
  for (const file of listFilesRecursive(targetDir)) {
    if (!/\.(md|json|txt)$/i.test(file)) continue;
    findings.push(...scanSecretsInText(fs.readFileSync(file, 'utf8'), path.relative(ROOT, file).replace(/\\/g, '/')));
  }
  const result = { ok: findings.length === 0, target: taskId || 'war-room', findings };
  console.log(JSON.stringify(result, null, 2));
  if (findings.length) throw new Error(`secret scan found ${findings.length} possible secret(s)`);
  if (flags.agent) activity('REVIEW', String(flags.agent).toLowerCase(), `${taskId || 'war-room'}: secret scan ok`);
}

function doctor(args) {
  const { flags } = parseFlags(args);
  const board = readJson(BOARD, { version: '1.0', active_tasks: [], pending_tasks: [], done_tasks: [] });
  const locks = normalizeLocks(readJson(LOCKS, { version: '1.0', locks: [] }));
  const errors = [];
  const warnings = lockWarnings(board, locks);

  if (!fs.existsSync(WORKSPACES)) warnings.push('workspaces.json missing; run repair/workspace setup');
  for (const root of loadWorkspaces().roots) {
    if (!fs.existsSync(root.path)) warnings.push(`workspace missing on disk: ${root.id} -> ${root.path}`);
  }

  const allTasks = [...(board.active_tasks || []), ...(board.pending_tasks || []), ...(board.done_tasks || [])];
  for (const task of allTasks) {
    const dir = sessionDirForTask(task.id, task);
    const sessionName = path.basename(dir);
    if (sessionName && sessionName !== task.id && !task.shared_session_ok) {
      warnings.push(`${task.id}: task id/session folder mismatch (${sessionName})`);
    }
    if (!fs.existsSync(dir)) {
      const message = `session folder missing: ${task.id} -> ${path.relative(ROOT, dir).replace(/\\/g, '/')}`;
      if ((task.status || 'active') === 'active') errors.push(message);
      else warnings.push(message);
      continue;
    }
    if ((task.status || 'active') === 'active') {
      const validation = collectValidation(task.id);
      errors.push(...validation.errors.map((msg) => `${task.id}: ${msg}`));
      warnings.push(...validation.warnings.map((msg) => `${task.id}: ${msg}`));
      const discipline = taskDiscipline(task.id, task);
      warnings.push(...discipline.warnings.map((msg) => `${task.id}: discipline ${msg}`));
      if (decisionRequired(task.id) && !decisionLogged(task.id)) warnings.push(`${task.id}: decision log required but missing`);
    }
    const taskMap = path.join(dir, 'task-map.md');
    if (fs.existsSync(taskMap)) {
      const phase = extractCurrentPhase(fs.readFileSync(taskMap, 'utf8'));
      if (phase && task.phase && phase !== task.phase) warnings.push(`${task.id}: board phase drift (${task.phase} != ${phase})`);
    }
  }

  if (flags.secrets) {
    try {
      const targetDir = WAR_ROOM;
      for (const file of listFilesRecursive(targetDir)) {
        if (!/\.(md|json|txt)$/i.test(file)) continue;
        const hits = scanSecretsInText(fs.readFileSync(file, 'utf8'), path.relative(ROOT, file).replace(/\\/g, '/'));
        warnings.push(...hits.map((hit) => `possible secret: ${hit.type} at ${hit.source}:${hit.line}`));
      }
    } catch (err) {
      warnings.push(`secret scan skipped: ${err.message}`);
    }
  }

  // Auto-fix: release expired locks when --fix passed
  let fixedLocks = 0;
  if (flags.fix) {
    const locksBefore = (locks.locks || []).length;
    gcLocks(['--expired', '--inactive', '--agent', flags.agent || 'system']);
    const locksAfter = normalizeLocks(readJson(LOCKS, { version: '1.0', locks: [] })).locks.length;
    fixedLocks = locksBefore - locksAfter;
    if (fixedLocks > 0) console.error(`[doctor --fix] released ${fixedLocks} expired lock(s)`);
  }

  const result = { ok: errors.length === 0, errors, warnings, active_tasks: (board.active_tasks || []).length, locks: (locks.locks || []).length, fixed_locks: fixedLocks };
  console.log(JSON.stringify(result, null, 2));
  if (flags.agent) activity('REVIEW', String(flags.agent).toLowerCase(), `doctor ${result.ok ? 'ok' : 'failed'} (${errors.length} error, ${warnings.length} warning${fixedLocks > 0 ? `, ${fixedLocks} locks released` : ''})`);
  if (errors.length) throw new Error(`doctor failed: ${errors.join('; ')}`);
}

function reviewStatus(taskId) {
  const { task } = getBoardTask(taskId);
  const file = path.join(sessionDirForTask(taskId, task), 'review.md');
  if (!fs.existsSync(file)) return { ok: false, result: null, reviewer: null, file };
  const content = fs.readFileSync(file, 'utf8');
  const reviewer = content.match(/Reviewed by:\s*(.+)/i)?.[1]?.trim() || null;
  const result = content.match(/Result:\s*(pass-with-notes|pass|blocked)/i)?.[1]?.toLowerCase() || null;
  return { ok: result === 'pass' || result === 'pass-with-notes', result, reviewer, file };
}

function reviewTask(args) {
  const { flags, rest } = parseFlags(args);
  const [taskId, ...noteParts] = rest;
  const agent = flags.agent ? String(flags.agent).toLowerCase() : null;
  const result = flags.result ? String(flags.result).toLowerCase() : 'pass';
  const note = noteParts.join(' ').trim() || flags.note || 'review recorded';
  if (!taskId || !agent) throw new Error('Usage: node scripts/war-room.js review TASK_ID "note" --agent reviewer [--result pass|pass-with-notes|blocked]');
  if (!['pass', 'pass-with-notes', 'blocked'].includes(result)) throw new Error(`Invalid review result: ${result}`);

  const { task } = getBoardTask(taskId);
  if (!task) throw new Error(`Task not found: ${taskId}`);
  const file = path.join(sessionDirForTask(taskId, task), 'review.md');
  append(file, `\n## REVIEW ${nowIso()}\nReviewed by: ${agent}\nResult: ${result}\nNotes: ${note}\n`);
  activity('REVIEW', agent, `${taskId}: review ${result}`);
  console.log(`review ${taskId}: ${result}`);
}

function finalizeTask(args) {
  const { flags, rest } = parseFlags(args);
  const [taskId, ...summaryParts] = rest;
  const agent = flags.agent ? String(flags.agent).toLowerCase() : null;
  const summary = summaryParts.join(' ').trim() || 'finalized';
  if (!taskId || !agent) throw new Error('Usage: node scripts/war-room.js finalize TASK_ID "summary" --agent codex [--force]');
  if (flags.force) {
    requireApproval(flags, 'force-finalize', taskId, `Force finalize ${taskId} requires B3 approval`);
  }

  repairTask([taskId, '--agent', agent]);
  const validation = collectValidation(taskId);
  if (validation.errors.length && !flags.force) throw new Error(`finalize blocked by validation: ${validation.errors.join('; ')}`);

  const review = reviewStatus(taskId);
  if (!review.ok && !flags.force) {
    throw new Error(`finalize blocked by review gate: review.md result is ${review.result || 'missing'}. Run review TASK_ID --agent REVIEWER --result pass`);
  }
  if (decisionRequired(taskId) && !decisionLogged(taskId) && !flags.force) {
    throw new Error(`finalize blocked by decision gate: log a decision with decision ${taskId} "decision" --agent ${agent}`);
  }

  const locks = normalizeLocks(readJson(LOCKS, { version: '1.0', locks: [] }));
  const activeLocks = (locks.locks || []).filter((lock) => lock.task_id === taskId);
  if (activeLocks.length && !flags.force) {
    throw new Error(`finalize blocked by active lock(s): ${activeLocks.map((lock) => `${lock.file} by ${lock.owner}`).join(', ')}`);
  }

  try {
    scanSecrets([taskId, '--agent', agent]);
  } catch (err) {
    if (!flags.force) throw err;
  }
  summaryTask([taskId, '--agent', agent, '--write']);
  try { syncTask([taskId, '--agent', agent]); } catch { /* done tasks or phase-less sessions can still finalize with --force */ }
  done([taskId, summary, '--agent', agent, ...(flags.force ? ['--force'] : [])]);
  lessonTask([taskId, summary, '--agent', agent, '--auto']);
  console.log(`finalized ${taskId}`);

  // Telegram notify B3
  const taskTitle = readBriefTitle(taskId);
  const icon = agentEmoji[agent] ?? '🤖';
  const agentName = agent ? agent.charAt(0).toUpperCase() + agent.slice(1) : 'AI Agent';
  const model = flags.model ? String(flags.model) : (agentDefaultModel[agent] ?? '');
  const tokens = flags.tokens ? Number(flags.tokens) : null;
  const tokenStr = tokens ? ` · ~${tokens >= 1000 ? (tokens / 1000).toFixed(0) + 'k' : tokens} tokens` : '';
  const modelStr = model ? ` · ${model}` : '';
  const agentLabel = `${icon} ${agentName}${modelStr}${tokenStr}`;
  const appUrl = 'https://b3-team-avenger.vercel.app';
  sendWarRoomTelegram(
    `✅ งาน <b>${taskTitle}</b> ในส่วนที่รับผิดชอบเสร็จสิ้น\n(จาก ${agentLabel})\n\n` +
    `${summary}\n\n` +
    `👉 <a href="${appUrl}/approvals">${appUrl}/approvals</a>`
  );

  // Auto-log cost (silent, best-effort)
  if (tokens) logCostToAvenger(agent, tokens, taskId, flags.model);
}

function readBriefTitle(taskId) {
  const file = path.join(sessionDir(taskId), 'brief.md');
  if (!fs.existsSync(file)) return taskId;
  const content = fs.readFileSync(file, 'utf8');
  const goal = content.match(/## Goal\s*\r?\n([\s\S]*?)(?:\r?\n## |$)/i);
  const line = goal?.[1]?.split(/\r?\n/).map((item) => item.trim()).find(Boolean);
  return line || taskId;
}

function rebuildBoard(args) {
  const { flags } = parseFlags(args);
  const current = readJson(BOARD, { version: '1.0', active_tasks: [], pending_tasks: [], done_tasks: [] });
  const doneByTask = new Map();
  const phases = new Map();
  const activityLines = fs.existsSync(ACTIVITY) ? fs.readFileSync(ACTIVITY, 'utf8').split(/\r?\n/) : [];
  for (const line of activityLines) {
    let match = line.match(/\[DONE\].*?(\d{4}-\d{2}-\d{2}-[^\s:]+):\s*(.+)$/);
    if (match) doneByTask.set(match[1], match[2]);
    match = line.match(/synced\s+(\d{4}-\d{2}-\d{2}-[^\s]+)\s+phase:\s+(.+)$/);
    if (match) phases.set(match[1], match[2]);
  }

  const draft = { version: '1.0', active_tasks: [], pending_tasks: [], done_tasks: [] };
  const seenIds = new Set();
  const seenSessions = new Set();
  const categories = [
    ['active_tasks', 'active'],
    ['pending_tasks', 'pending'],
    ['done_tasks', 'done']
  ];

  for (const [key, status] of categories) {
    for (const task of current[key] || []) {
      const copy = { ...task, status: task.status || status };
      if (!copy.session) copy.session = `wiki/ai-war-room/sessions/${copy.id}`;
      if (!copy.phase && phases.has(copy.id)) copy.phase = phases.get(copy.id);
      if (!copy.summary && doneByTask.has(copy.id)) copy.summary = doneByTask.get(copy.id);
      draft[key].push(copy);
      seenIds.add(copy.id);
      seenSessions.add(path.normalize(copy.session).toLowerCase());
    }
  }

  for (const entry of fs.readdirSync(SESSIONS, { withFileTypes: true }).filter((item) => item.isDirectory())) {
    const id = entry.name;
    if (id === '_TEMPLATE') continue;
    const session = `wiki/ai-war-room/sessions/${id}`;
    const sessionKey = path.normalize(session).toLowerCase();
    if (seenIds.has(id) || seenSessions.has(sessionKey)) continue;
    const task = {
      id,
      title: readBriefTitle(id),
      owner: 'unknown',
      status: doneByTask.has(id) ? 'done' : 'active',
      phase: phases.get(id) || undefined,
      session,
      summary: doneByTask.get(id) || undefined
    };
    if (task.status === 'done') draft.done_tasks.push(task);
    else draft.active_tasks.push(task);
  }
  draft.updated_at = nowIso();

  if (flags.write) {
    const backup = `${BOARD}.${nowIso().replace(/[:.]/g, '-')}.bak`;
    fs.copyFileSync(BOARD, backup);
    writeJson(BOARD, draft);
    console.log(`board rebuilt; backup ${path.relative(ROOT, backup)}`);
    return;
  }
  console.log(JSON.stringify(draft, null, 2));
}

function workspacesTask(args) {
  const { flags } = parseFlags(args);
  const current = loadWorkspaces();
  if (flags.write || !fs.existsSync(WORKSPACES)) {
    writeJson(WORKSPACES, current);
    console.log(`workspaces written ${path.relative(ROOT, WORKSPACES)}`);
    return;
  }
  console.log(JSON.stringify(current, null, 2));
}

function standup(args) {
  const { flags } = parseFlags(args);
  const agent = flags.agent ? String(flags.agent).toLowerCase() : 'system';
  const board = readJson(BOARD, { version: '1.0', active_tasks: [], pending_tasks: [], done_tasks: [] });
  const locks = normalizeLocks(readJson(LOCKS, { version: '1.0', locks: [] }));
  const warnings = lockWarnings(board, locks);
  const active = board.active_tasks || [];
  const activeIds = new Set(active.map((task) => task.id));
  const openLocks = (locks.locks || []).filter((lock) => activeIds.has(lock.task_id));
  const latestActivity = fs.existsSync(ACTIVITY)
    ? fs.readFileSync(ACTIVITY, 'utf8').split(/\r?\n/).filter(Boolean).slice(-8)
    : [];
  const tasks = active.map((task) => {
    const discipline = taskDiscipline(task.id, task);
    return {
      id: task.id,
      owner: discipline.owner || 'unknown',
      coordinator: discipline.coordinator || null,
      reviewer: discipline.reviewer || null,
      final_approver: discipline.final_approver || null,
      phase: task.phase || null,
      locks: openLocks.filter((lock) => lock.task_id === task.id).map((lock) => ({
        file: lock.file,
        owner: lock.owner,
        expires_at: lock.expires_at || null
      })),
      review: reviewStatus(task.id).result || null,
      next_action: discipline.next_action || 'check task-map.md and chat.md',
      discipline_warnings: discipline.warnings
    };
  });
  warnings.push(...tasks.flatMap((task) => task.discipline_warnings.map((msg) => `${task.id}: discipline ${msg}`)));
  const result = {
    date: nowIso(),
    agent,
    active_count: active.length,
    lock_count: openLocks.length,
    warnings,
    tasks,
    latest_activity: latestActivity
  };
  console.log(JSON.stringify(result, null, 2));
  activity('STATUS', agent, `standup active=${active.length} locks=${openLocks.length} warnings=${warnings.length}`);
}

function ritual(args) {
  const { flags, rest } = parseFlags(args);
  const [taskId] = rest;
  const agent = flags.agent ? String(flags.agent).toLowerCase() : null;
  if (!taskId || !agent) throw new Error('Usage: node scripts/war-room.js ritual TASK_ID --agent AGENT');
  const { task } = getActiveTask(taskId);
  if (!task) throw new Error(`Active task not found: ${taskId}`);

  const board = readJson(BOARD, { version: '1.0', active_tasks: [], pending_tasks: [], done_tasks: [] });
  const locks = normalizeLocks(readJson(LOCKS, { version: '1.0', locks: [] }));
  const active = board.active_tasks || [];
  const warnings = lockWarnings(board, locks);
  const lines = [
    `Active tasks: ${active.map((item) => item.id).join(', ') || 'none'}`,
    `Open locks: ${(locks.locks || []).length}`,
    `Warnings: ${warnings.length ? warnings.join('; ') : 'none'}`
  ];
  for (const item of active) {
    const discipline = taskDiscipline(item.id, item);
    lines.push(`- ${item.id}: owner=${discipline.owner || 'n/a'}, reviewer=${discipline.reviewer || 'n/a'}, next=${discipline.next_action || 'n/a'}`);
  }
  const body = lines.join('\n');
  append(path.join(sessionDirForTask(taskId, task), 'chat.md'), `\n[STANDUP] @team from:@${agent} ts:${nowTag()}\n${body}\n---\n`);
  activity('STATUS', agent, `${taskId}: daily ritual posted`);
  console.log(`ritual posted to ${taskId}`);
}

function nextAgentTask(args) {
  const { flags, rest } = parseFlags(args);
  const [current] = rest;
  const role = flags.role || 'coordinator';
  const next = chooseNextAgent(current ? String(current).toLowerCase() : null, role);
  console.log(JSON.stringify({ current: current || null, role, next }, null, 2));
}

function continuityTask(args) {
  const { flags, rest } = parseFlags(args);
  const [taskId] = rest;
  const agent = flags.agent ? String(flags.agent).toLowerCase() : 'system';
  if (!taskId) throw new Error('Usage: node scripts/war-room.js continuity TASK_ID --agent AGENT');
  const { task } = getBoardTask(taskId);
  if (!task) throw new Error(`Task not found: ${taskId}`);
  const locks = normalizeLocks(readJson(LOCKS, { version: '1.0', locks: [] }));
  const discipline = taskDiscipline(taskId, task);
  const result = {
    task_id: taskId,
    owner: discipline.owner || task.owner || null,
    coordinator: discipline.coordinator || task.coordinator || null,
    reviewer: discipline.reviewer || task.reviewer || null,
    final_approver: discipline.final_approver || task.final_approver || null,
    next_action: discipline.next_action || null,
    suggested_next_coordinator: chooseNextAgent(discipline.coordinator || task.coordinator || null, 'coordinator'),
    suggested_next_reviewer: chooseNextAgent(discipline.reviewer || task.reviewer || null, 'reviewer'),
    open_locks: (locks.locks || []).filter((lock) => lock.task_id === taskId),
    warnings: discipline.warnings
  };
  console.log(JSON.stringify(result, null, 2));
  activity('STATUS', agent, `${taskId}: continuity checked`);
}

function takeoverTask(args) {
  const { flags, rest } = parseFlags(args);
  const [taskId] = rest;
  const from = flags.from ? String(flags.from).toLowerCase() : null;
  const to = flags.to ? String(flags.to).toLowerCase() : chooseNextAgent(from, flags.role || 'coordinator');
  const agent = flags.agent ? String(flags.agent).toLowerCase() : to;
  const reason = flags.reason || 'continuity takeover';
  if (!taskId || !from || !to) throw new Error('Usage: node scripts/war-room.js takeover TASK_ID --from AGENT [--to AGENT] --agent AGENT [--reason "..."]');
  if (flags.approval || flags['require-approval']) {
    requireApproval(flags, 'takeover', taskId, `Takeover ${taskId} from ${from} to ${to} requires B3 approval`);
  }

  const { board, task } = getActiveTask(taskId);
  if (!task) throw new Error(`Active task not found: ${taskId}`);

  const locks = normalizeLocks(readJson(LOCKS, { version: '1.0', locks: [] }));
  const released = (locks.locks || []).filter((lock) => lock.task_id === taskId && lock.owner === from).map((lock) => lock.file);
  locks.locks = (locks.locks || []).filter((lock) => !(lock.task_id === taskId && lock.owner === from));
  writeJson(LOCKS, locks);

  task.coordinator = to;
  task.owner = task.owner || to;
  task.continuity_from = from;
  task.continuity_to = to;
  task.continuity_reason = reason;
  task.updated_at = nowIso();
  writeJson(BOARD, board);

  const dir = sessionDirForTask(taskId, task);
  append(path.join(dir, 'handoff.md'), `\n## CONTINUITY TAKEOVER ${nowIso()}\nFrom: ${from}\nTo: ${to}\nReason: ${reason}\nLocks released: ${released.length ? released.join(', ') : '(none)'}\nNext action: ${taskDiscipline(taskId, task).next_action || 'Read task-map.md and chat.md, then claim the next file.'}\n`);
  append(path.join(dir, 'chat.md'), `\n[TAKEOVER] @team from:@${agent} ts:${nowTag()}\n${to} takes coordinator continuity from ${from}. Reason: ${reason}. Released locks: ${released.length ? released.join(', ') : 'none'}.\n---\n`);
  activity('HANDOFF', agent, `${taskId}: continuity ${from} -> ${to} (${released.length} lock released)`);
  console.log(JSON.stringify({ task_id: taskId, from, to, released_locks: released }, null, 2));
}

function dashboardHtml(snapshot) {
  const data = JSON.stringify(snapshot).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>B3 War Room Dashboard</title>
  <style>
    :root { color-scheme: light; --ink:#172026; --muted:#66727d; --line:#d7dde2; --bg:#f6f7f8; --panel:#fff; --accent:#0f766e; --warn:#b45309; }
    * { box-sizing: border-box; }
    body { margin:0; font-family: "Segoe UI", Arial, sans-serif; background:var(--bg); color:var(--ink); }
    header { padding:18px 24px; border-bottom:1px solid var(--line); background:var(--panel); display:flex; justify-content:space-between; gap:16px; align-items:center; }
    h1 { margin:0; font-size:22px; font-weight:650; }
    main { max-width:1180px; margin:0 auto; padding:20px; display:grid; gap:16px; }
    .stats { display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); gap:12px; }
    .stat, section { background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:14px; }
    .stat b { display:block; font-size:26px; }
    .stat span, .muted { color:var(--muted); font-size:13px; }
    table { width:100%; border-collapse:collapse; font-size:14px; }
    th, td { padding:10px 8px; border-bottom:1px solid var(--line); text-align:left; vertical-align:top; }
    th { font-size:12px; color:var(--muted); text-transform:uppercase; letter-spacing:.04em; }
    code { background:#eef2f3; padding:2px 5px; border-radius:4px; }
    .warn { color:var(--warn); }
    .ok { color:var(--accent); }
    @media (max-width: 760px) { header { align-items:flex-start; flex-direction:column; } .stats { grid-template-columns:1fr 1fr; } table { font-size:13px; } }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>B3 War Room Dashboard</h1>
      <div class="muted">Snapshot generated <span id="generated"></span></div>
    </div>
    <div class="muted">Approval Panel: <code>npm run war:approval-panel</code></div>
  </header>
  <main>
    <div class="stats">
      <div class="stat"><b id="active">0</b><span>Active tasks</span></div>
      <div class="stat"><b id="locks">0</b><span>Locks</span></div>
      <div class="stat"><b id="warnings">0</b><span>Warnings</span></div>
      <div class="stat"><b id="done">0</b><span>Done tasks</span></div>
    </div>
    <section>
      <h2>Active Tasks</h2>
      <table><thead><tr><th>Task</th><th>Roles</th><th>Phase</th><th>Next Action</th><th>Locks</th><th>Review</th></tr></thead><tbody id="taskRows"></tbody></table>
    </section>
    <section>
      <h2>Warnings</h2>
      <div id="warningRows" class="muted"></div>
    </section>
    <section>
      <h2>Team Intelligence</h2>
      <div id="intelligenceRows" class="muted"></div>
    </section>
    <section>
      <h2>B3 Approvals</h2>
      <div id="approvalRows" class="muted"></div>
    </section>
    <section>
      <h2>Latest Activity</h2>
      <div id="activityRows" class="muted"></div>
    </section>
  </main>
  <script>
    const snapshot = ${data};
    const text = (value) => String(value ?? '');
    document.getElementById('generated').textContent = snapshot.generated_at;
    document.getElementById('active').textContent = snapshot.active_tasks.length;
    document.getElementById('locks').textContent = snapshot.locks.length;
    document.getElementById('warnings').textContent = snapshot.warnings.length;
    document.getElementById('done').textContent = snapshot.done_tasks.length;
    document.getElementById('taskRows').innerHTML = snapshot.active_tasks.map((task) => {
      const locks = snapshot.locks.filter((lock) => lock.task_id === task.id).map((lock) => '<code>' + text(lock.file) + '</code>').join('<br>') || '<span class="muted">none</span>';
      const roles = 'Owner: ' + text(task.owner) + '<br>Coordinator: ' + text(task.coordinator || 'n/a') + '<br>Reviewer: ' + text(task.reviewer || 'n/a') + '<br>Approver: ' + text(task.final_approver || 'n/a');
      const taskWarnings = (task.discipline_warnings || []).map((warning) => '<div class="warn">' + text(warning) + '</div>').join('');
      return '<tr><td><code>' + text(task.id) + '</code><br>' + text(task.title) + taskWarnings + '</td><td>' + roles + '</td><td>' + text(task.phase || 'n/a') + '</td><td>' + text(task.next_action || 'n/a') + '</td><td>' + locks + '</td><td>' + text(task.review || 'n/a') + '</td></tr>';
    }).join('');
    document.getElementById('warningRows').innerHTML = snapshot.warnings.length ? snapshot.warnings.map((warning) => '<div class="warn">' + text(warning) + '</div>').join('') : '<span class="ok">No warnings</span>';
    document.getElementById('intelligenceRows').innerHTML = [
      'Open risks: ' + text((snapshot.risks || []).filter((risk) => risk.status !== 'closed').length),
      'Personas: ' + text((snapshot.personas || []).length),
      'Projects in dependency map: ' + text((snapshot.dependencies || []).length)
    ].map((line) => '<div>' + line + '</div>').join('');
    document.getElementById('approvalRows').innerHTML = (snapshot.approvals || []).length ? snapshot.approvals.map((approval) => '<div><code>' + text(approval.id) + '</code> ' + text(approval.status) + ' / ' + text(approval.type) + ' / ' + text(approval.reason) + '</div>').join('') : '<span class="ok">No pending approvals</span>';
    document.getElementById('activityRows').innerHTML = snapshot.latest_activity.map((line) => '<div><code>' + text(line) + '</code></div>').join('');
  </script>
</body>
</html>
`;
}

function dashboardTask(args) {
  const { flags } = parseFlags(args);
  const board = readJson(BOARD, { version: '1.0', active_tasks: [], pending_tasks: [], done_tasks: [] });
  const locks = normalizeLocks(readJson(LOCKS, { version: '1.0', locks: [] }));
  const activeTasks = (board.active_tasks || []).map((task) => {
    const discipline = taskDiscipline(task.id, task);
    return {
      ...task,
      owner: discipline.owner || task.owner,
      coordinator: discipline.coordinator || task.coordinator || null,
      reviewer: discipline.reviewer || task.reviewer || null,
      final_approver: discipline.final_approver || task.final_approver || null,
      next_action: discipline.next_action || task.next_action || null,
      discipline_warnings: discipline.warnings,
      review: reviewStatus(task.id).result || null
    };
  });
  const latestActivity = fs.existsSync(ACTIVITY)
    ? fs.readFileSync(ACTIVITY, 'utf8').split(/\r?\n/).filter(Boolean).slice(-12)
    : [];
  const snapshot = {
    generated_at: nowIso(),
    active_tasks: activeTasks,
    pending_tasks: board.pending_tasks || [],
    done_tasks: board.done_tasks || [],
    locks: locks.locks || [],
    risks: loadJsonWithDefault(RISKS, defaultRisks).risks || [],
    personas: loadJsonWithDefault(PERSONAS, defaultPersonas).personas || [],
    dependencies: loadJsonWithDefault(DEPENDENCIES, defaultDependencies).projects || [],
    approvals: (loadApprovals().approvals || []).filter((approval) => approval.status === 'pending'),
    warnings: [
      ...lockWarnings(board, locks),
      ...activeTasks.flatMap((task) => (task.discipline_warnings || []).map((msg) => `${task.id}: discipline ${msg}`))
    ],
    latest_activity: latestActivity
  };
  if (flags.write || !fs.existsSync(DASHBOARD)) {
    fs.writeFileSync(DASHBOARD, dashboardHtml(snapshot));
    console.log(`dashboard written ${path.relative(ROOT, DASHBOARD)}`);
    return;
  }
  console.log(JSON.stringify(snapshot, null, 2));
}

function protectedFilesTask(args) {
  const { flags } = parseFlags(args);
  const current = loadProtectedFiles();
  if (flags.write || !fs.existsSync(PROTECTED_FILES)) {
    writeJson(PROTECTED_FILES, current);
    console.log(`protected files written ${path.relative(ROOT, PROTECTED_FILES)}`);
    return;
  }
  console.log(JSON.stringify(current, null, 2));
}

function personasTask(args) {
  const { flags } = parseFlags(args);
  const current = flags.write || !fs.existsSync(PERSONAS)
    ? writeRegistry(PERSONAS, defaultPersonas)
    : loadJsonWithDefault(PERSONAS, defaultPersonas);
  if (flags.write || !fs.existsSync(PERSONAS)) console.log(`personas written ${path.relative(ROOT, PERSONAS)}`);
  else console.log(JSON.stringify(current, null, 2));
}

function dependenciesTask(args) {
  const { flags } = parseFlags(args);
  const current = flags.write || !fs.existsSync(DEPENDENCIES)
    ? writeRegistry(DEPENDENCIES, defaultDependencies)
    : loadJsonWithDefault(DEPENDENCIES, defaultDependencies);
  if (flags.write || !fs.existsSync(DEPENDENCIES)) console.log(`dependencies written ${path.relative(ROOT, DEPENDENCIES)}`);
  else console.log(JSON.stringify(current, null, 2));
}

function risksTask(args) {
  const { flags, rest } = parseFlags(args);
  const agent = flags.agent ? String(flags.agent).toLowerCase() : 'system';
  const [action, ...parts] = rest;
  const current = loadJsonWithDefault(RISKS, defaultRisks);
  current.risks = current.risks || [];
  if (!action || action === 'list') {
    console.log(JSON.stringify(current, null, 2));
    return;
  }
  if (action === 'add') {
    const description = parts.join(' ').trim();
    if (!description) throw new Error('Usage: node scripts/war-room.js risk add "description" --agent AGENT [--area security] [--severity high]');
    const id = `R-${String(current.risks.length + 1).padStart(3, '0')}`;
    current.risks.push({
      id,
      area: flags.area || 'general',
      severity: flags.severity || 'medium',
      status: flags.status || 'open',
      owner: flags.owner || agent,
      description,
      created_at: nowIso()
    });
    writeJson(RISKS, current);
    activity('RISK', agent, `${id}: ${description}`);
    console.log(`risk added ${id}`);
    return;
  }
  if (action === 'close') {
    const [id, ...noteParts] = parts;
    const risk = current.risks.find((item) => item.id === id);
    if (!risk) throw new Error(`Risk not found: ${id}`);
    risk.status = 'closed';
    risk.closed_at = nowIso();
    risk.closed_by = agent;
    risk.close_note = noteParts.join(' ').trim() || flags.note || 'closed';
    writeJson(RISKS, current);
    activity('RISK', agent, `${id}: closed`);
    console.log(`risk closed ${id}`);
    return;
  }
  throw new Error('Usage: risk list|add|close');
}

function decisionTask(args) {
  const { flags, rest } = parseFlags(args);
  const [taskId, ...decisionParts] = rest;
  const agent = flags.agent ? String(flags.agent).toLowerCase() : null;
  const decision = decisionParts.join(' ').trim();
  if (!taskId || !decision || !agent) throw new Error('Usage: node scripts/war-room.js decision TASK_ID "decision" --agent AGENT [--why "..."]');
  if (!fs.existsSync(DECISIONS)) fs.writeFileSync(DECISIONS, '# War Room Decisions\n\n');
  append(DECISIONS, `\n## ${nowIso()}\nTask: ${taskId}\nAgent: ${agent}\nDecision: ${decision}\nWhy: ${flags.why || 'n/a'}\nImpact: ${flags.impact || 'n/a'}\n`);
  activity('DECISION', agent, `${taskId}: ${decision}`);
  console.log(`decision logged for ${taskId}`);
}

function lessonTask(args) {
  const { flags, rest } = parseFlags(args);
  const [taskId, ...lessonParts] = rest;
  const agent = flags.agent ? String(flags.agent).toLowerCase() : 'system';
  const lesson = lessonParts.join(' ').trim() || 'Task completed; review final.md for details.';
  if (!taskId) throw new Error('Usage: node scripts/war-room.js lesson TASK_ID "lesson" --agent AGENT');
  ensureLessonsFile();
  append(LESSONS, `\n## ${nowIso()}\nTask: ${taskId}\nAgent: ${agent}\nLesson: ${lesson}\nType: ${flags.auto ? 'auto-finalize' : (flags.type || 'manual')}\n`);
  activity('LESSON', agent, `${taskId}: ${lesson}`);
  console.log(`lesson logged for ${taskId}`);
}

function costTask(args) {
  const { flags, rest } = parseFlags(args);
  const [taskId] = rest;
  const agent = flags.agent ? String(flags.agent).toLowerCase() : null;
  if (!taskId || !agent) throw new Error('Usage: node scripts/war-room.js cost TASK_ID --agent AGENT [--tokens 1234] [--minutes 30] [--note "..."]');
  const { task } = getBoardTask(taskId);
  if (!task) throw new Error(`Task not found: ${taskId}`);
  const file = path.join(sessionDirForTask(taskId, task), 'cost.md');
  if (!fs.existsSync(file)) fs.writeFileSync(file, '# Cost / Token Log\n\n');
  append(file, `## ${nowIso()}\nAgent: ${agent}\nTokens: ${flags.tokens || 'n/a'}\nMinutes: ${flags.minutes || 'n/a'}\nNote: ${flags.note || 'n/a'}\n`);
  activity('COST', agent, `${taskId}: tokens=${flags.tokens || 'n/a'} minutes=${flags.minutes || 'n/a'}`);
  console.log(`cost logged for ${taskId}`);
}

function approvalTask(args) {
  const { flags, rest } = parseFlags(args);
  const [action, ...parts] = rest;
  const agent = flags.agent ? String(flags.agent).toLowerCase() : 'system';
  const data = loadApprovals();
  if (!action || action === 'list') {
    const status = flags.status || null;
    const approvals = status ? data.approvals.filter((item) => item.status === status) : data.approvals;
    console.log(JSON.stringify({ version: data.version || '1.0', approvals }, null, 2));
    return;
  }
  if (action === 'request') {
    const reason = parts.join(' ').trim() || flags.reason || '';
    const type = flags.type || 'general';
    if (!reason) throw new Error('Usage: approval request "reason" --agent AGENT --type takeover [--task TASK_ID]');
    const duplicate = findDuplicatePendingApproval(data, type, flags.task || null, reason);
    if (duplicate) {
      activity('APPROVAL', agent, `${duplicate.id} duplicate pending ${type}: ${reason}`);
      console.log(JSON.stringify({ ...duplicate, duplicate: true }, null, 2));
      return;
    }
    const id = nextApprovalId(data);
    const approval = {
      id,
      type,
      task_id: flags.task || null,
      status: 'pending',
      requested_by: agent,
      reason,
      what: flags.what || reason,
      risk: flags.risk || flags.risk_note || `Needs B3 approval before ${type} continues.`,
      if_not: flags['if-not'] || flags.if_not || 'Keep this work pending until B3 approves or rejects it.',
      risk_level: flags['risk-level'] || flags.risk_level || (type === 'protected-file' || type === 'force-finalize' ? 'high' : 'medium'),
      created_at: nowIso()
    };
    data.approvals.push(approval);
    writeJson(APPROVALS, data);
    activity('APPROVAL', agent, `${id} requested ${type}: ${reason}`);
    console.log(JSON.stringify({ id, status: 'pending', type, task_id: flags.task || null, reason, summary: approvalSummary(approval) }, null, 2));
    return;
  }
  if (['approve', 'reject', 'pending'].includes(action)) {
    const [id, ...noteParts] = parts;
    const approval = data.approvals.find((item) => item.id === id);
    if (!approval) throw new Error(`Approval not found: ${id}`);
    approval.status = action === 'approve' ? 'approved' : (action === 'reject' ? 'rejected' : 'pending');
    approval.reviewed_by = agent;
    approval.reviewed_at = nowIso();
    approval.note = noteParts.join(' ').trim() || flags.note || '';
    writeJson(APPROVALS, data);
    activity('APPROVAL', agent, `${id} ${approval.status}`);
    console.log(JSON.stringify(approval, null, 2));
    return;
  }
  throw new Error('Usage: approval list|request|approve|reject|pending');
}

async function approvalSyncTask(args) {
  const { flags } = parseFlags(args);
  const agent = flags.agent ? String(flags.agent).toLowerCase() : 'system';
  const url = flags.url || process.env.AVENGER_APPROVAL_URL || 'https://b3-team-avenger.vercel.app/api/approvals';
  const approvals = (loadApprovals().approvals || []).filter((item) =>
    item.status === 'pending' && (flags.force || !item.avenger_synced_at || item.avenger_url !== url)
  );
  const results = [];
  for (const approval of approvals) {
    const body = {
      action_type: `war-room:${approval.type}`,
      action_detail: approvalSummary(approval),
      risk_level: approval.risk_level || (approval.type === 'protected-file' || approval.type === 'force-finalize' ? 'high' : 'medium'),
      nam_summary: `War Room approval ${approval.id} for ${approval.task_id || 'n/a'}\n${approvalSummary(approval)}`,
      task_id: approval.task_id || approval.id,
      requested_by: approval.requested_by || 'War Room',
      war_room_approval_id: approval.id
    };
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({}));
      results.push({ id: approval.id, ok: res.ok, response: data });
      if (res.ok) {
        const store = loadApprovals();
        const current = store.approvals.find((item) => item.id === approval.id);
        if (current) {
          current.avenger_synced_at = nowIso();
          current.avenger_url = url;
          current.avenger_response = data.approval?.id || data.id || null;
          writeJson(APPROVALS, store);
        }
      }
    } catch (err) {
      results.push({ id: approval.id, ok: false, error: err.message });
    }
  }
  activity('APPROVAL', agent, `approval-sync ${results.filter((item) => item.ok).length}/${results.length}`);
  console.log(JSON.stringify({ ok: results.every((item) => item.ok), url, results }, null, 2));
}

async function approvalPullTask(args) {
  const { flags } = parseFlags(args);
  const agent = flags.agent ? String(flags.agent).toLowerCase() : 'system';
  const url = flags.url || process.env.AVENGER_APPROVAL_URL || 'https://b3-team-avenger.vercel.app/api/approvals';
  const pullUrl = url.includes('?') ? `${url}&includeResolved=1` : `${url}?includeResolved=1`;
  
  let remote = [];
  try {
    const res = await fetch(pullUrl);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.warn(`[WARN] approval pull HTTP ${res.status} from ${pullUrl}. Falling back to Local Mode.`);
    } else {
      remote = data.approvals || [];
    }
  } catch (err) {
    console.warn(`[OFFLINE] Cannot pull approvals from Vercel: ${err.message}. Falling back to Local Offline Mode.`);
    activity('APPROVAL', agent, `approval-pull offline fallback: ${err.message}`);
    console.log(JSON.stringify({ ok: true, offline: true, url: pullUrl, updates: [] }, null, 2));
    return;
  }

  const store = loadApprovals();
  const updates = [];
  for (const approval of store.approvals || []) {
    const remoteMatch = remote.find((item) =>
      item.id === approval.avenger_response ||
      String(item.nam_summary || '').includes(`War Room ${approval.id}`)
    );
    if (!remoteMatch) continue;
    const status = remoteMatch.status === 'approved' ? 'approved'
      : (remoteMatch.status === 'rejected' ? 'rejected' : 'pending');
    if (approval.status !== status) {
      approval.status = status;
      approval.reviewed_by = 'B3-Vercel';
      approval.reviewed_at = nowIso();
      approval.note = remoteMatch.nam_summary || approval.note || '';
      updates.push({ id: approval.id, status });
    }
  }
  writeJson(APPROVALS, store);
  activity('APPROVAL', agent, `approval-pull ${updates.length} update(s)`);
  console.log(JSON.stringify({ ok: true, url: pullUrl, updates }, null, 2));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function approvalLoopTask(args) {
  const { flags } = parseFlags(args);
  const agent = flags.agent ? String(flags.agent).toLowerCase() : 'approval-loop';
  const intervalSeconds = Math.max(15, Number(flags.interval || flags.seconds || 60));
  const once = Boolean(flags.once);
  const url = flags.url || process.env.AVENGER_APPROVAL_URL || 'https://b3-team-avenger.vercel.app/api/approvals';
  let cycles = 0;

  async function cycle() {
    cycles += 1;
    await approvalSyncTask(['--agent', agent, '--url', url]);
    await approvalPullTask(['--agent', agent, '--url', url]);
    const pending = (loadApprovals().approvals || []).filter((item) => item.status === 'pending').length;
    activity('APPROVAL', agent, `approval-loop cycle=${cycles} pending=${pending}`);
    console.log(JSON.stringify({ ok: true, cycle: cycles, pending, next_in_seconds: once ? null : intervalSeconds }, null, 2));
  }

  await cycle();
  while (!once) {
    await sleep(intervalSeconds * 1000);
    await cycle();
  }
}

function taskMapFiles(task) {
  const dir = sessionDirForTask(task.id, task);
  const file = path.join(dir, 'task-map.md');
  if (!fs.existsSync(file)) return [];
  const text = fs.readFileSync(file, 'utf8');
  const files = [];
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/);
    if (!m) continue;
    const candidate = m[1].trim();
    if (!candidate || candidate === 'File' || candidate.includes('---')) continue;
    if (candidate.includes('/') || candidate.includes('\\') || candidate.includes('.')) files.push(candidate);
  }
  return files;
}

function conflictRadarTask(args) {
  const { flags } = parseFlags(args);
  const agent = flags.agent ? String(flags.agent).toLowerCase() : 'system';
  const board = readJson(BOARD, { active_tasks: [] });
  const locks = normalizeLocks(readJson(LOCKS, { locks: [] }));
  const approvals = loadApprovals().approvals || [];
  const active = (board.active_tasks || []).filter((task) => (task.status || 'active') === 'active');
  const warnings = [];
  const fileOwners = new Map();

  for (const task of active) {
    if (!task.reviewer || task.reviewer === 'undecided') warnings.push(`${task.id}: reviewer is not assigned`);
    for (const file of taskMapFiles(task)) {
      const arr = fileOwners.get(file) || [];
      arr.push(task.id);
      fileOwners.set(file, arr);
    }
  }

  for (const [file, tasks] of fileOwners.entries()) {
    const unique = [...new Set(tasks)];
    if (unique.length > 1) warnings.push(`${file}: planned by multiple active tasks (${unique.join(', ')})`);
  }

  const lockWarningsList = lockWarnings(board, locks);
  warnings.push(...lockWarningsList);

  const pendingApprovals = approvals.filter((item) => item.status === 'pending');
  if (pendingApprovals.length > 0) warnings.push(`pending approvals: ${pendingApprovals.map((item) => item.id).join(', ')}`);

  let dirtyFiles = [];
  try {
    dirtyFiles = childProcess.execFileSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      .split(/\r?\n/)
      .filter(Boolean)
      .slice(0, 25);
  } catch {
    dirtyFiles = [];
  }

  const result = {
    ok: warnings.length === 0,
    active_tasks: active.length,
    locks: (locks.locks || []).length,
    pending_approvals: pendingApprovals.length,
    warnings,
    dirty_files_sample: dirtyFiles
  };
  activity('REVIEW', agent, `conflict-radar ${result.ok ? 'ok' : 'warning'} (${warnings.length})`);
  if (flags.telegram && warnings.length) {
    sendWarRoomTelegram(`⚠️ <b>War Room Conflict Radar</b>\nFrom: <b>${agent}</b>\n\n${warnings.slice(0, 8).join('\n')}`);
  }
  console.log(JSON.stringify(result, null, 2));
}

function teamDigestTask(args) {
  const { flags } = parseFlags(args);
  const agent = flags.agent ? String(flags.agent).toLowerCase() : 'system';
  const board = readJson(BOARD, { active_tasks: [], pending_tasks: [], done_tasks: [] });
  const locks = normalizeLocks(readJson(LOCKS, { locks: [] }));
  const approvals = loadApprovals().approvals || [];
  const active = board.active_tasks || [];
  const pendingApprovals = approvals.filter((item) => item.status === 'pending');
  const text = [
    `📌 <b>War Room Team Digest</b>`,
    `From: <b>${agent}</b>`,
    ``,
    `Active tasks: <b>${active.length}</b>`,
    `Locks: <b>${(locks.locks || []).length}</b>`,
    `Pending approvals: <b>${pendingApprovals.length}</b>`,
    ``,
    ...active.slice(0, 5).map((task) => `• ${task.id}: ${task.phase || task.status || 'active'}`),
    pendingApprovals.length ? `\nApprovals: ${pendingApprovals.map((item) => item.id).join(', ')}` : '',
    `\nOps: https://b3-team-avenger.vercel.app/ops`
  ].filter(Boolean).join('\n');

  const shouldSend = flags.telegram || !flags['no-telegram'];
  if (shouldSend) sendWarRoomTelegram(text);
  activity('STATUS', agent, `team-digest active=${active.length} locks=${(locks.locks || []).length} approvals=${pendingApprovals.length}`);
  console.log(JSON.stringify({ ok: true, sent_telegram: shouldSend, active_tasks: active.length, locks: (locks.locks || []).length, pending_approvals: pendingApprovals.length }, null, 2));
}

function approvalLoopServiceTask(args) {
  const { flags, rest } = parseFlags(args);
  const action = rest[0] || 'start';
  const agent = flags.agent ? String(flags.agent).toLowerCase() : 'approval-loop-service';
  const interval = String(Math.max(15, Number(flags.interval || 60)));
  const pidFile = path.join(WAR_ROOM, 'approval-loop.pid');

  if (action === 'status') {
    const pid = fs.existsSync(pidFile) ? fs.readFileSync(pidFile, 'utf8').trim() : null;
    console.log(JSON.stringify({ ok: true, running_pid: pid || null, pid_file: pidFile }, null, 2));
    return;
  }

  if (action === 'stop') {
    const pid = fs.existsSync(pidFile) ? Number(fs.readFileSync(pidFile, 'utf8').trim()) : 0;
    if (pid) {
      try { process.kill(pid); } catch { /* already stopped */ }
      fs.rmSync(pidFile, { force: true });
    }
    activity('APPROVAL', agent, `approval-loop-service stopped pid=${pid || 'n/a'}`);
    console.log(JSON.stringify({ ok: true, stopped_pid: pid || null }, null, 2));
    return;
  }

  if (fs.existsSync(pidFile)) {
    console.log(JSON.stringify({ ok: true, already_running_pid: fs.readFileSync(pidFile, 'utf8').trim() }, null, 2));
    return;
  }

  const child = childProcess.spawn(process.execPath, [__filename, 'approval-loop', '--agent', agent, '--interval', interval], {
    cwd: ROOT,
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  });
  child.unref();
  fs.writeFileSync(pidFile, String(child.pid));
  activity('APPROVAL', agent, `approval-loop-service started pid=${child.pid} interval=${interval}s`);
  console.log(JSON.stringify({ ok: true, started_pid: child.pid, interval_seconds: Number(interval) }, null, 2));
}

function watchTask(args) {
  const { flags } = parseFlags(args);
  const agent = flags.agent ? String(flags.agent).toLowerCase() : 'system';
  const board = readJson(BOARD, { version: '1.0', active_tasks: [], pending_tasks: [], done_tasks: [] });
  const locks = normalizeLocks(readJson(LOCKS, { version: '1.0', locks: [] }));
  const approvals = loadApprovals().approvals || [];
  const warnings = [
    ...lockWarnings(board, locks),
    ...((board.active_tasks || []).flatMap((task) => taskDiscipline(task.id, task).warnings.map((msg) => `${task.id}: discipline ${msg}`)))
  ];
  const result = {
    ok: warnings.length === 0,
    active_tasks: (board.active_tasks || []).length,
    locks: (locks.locks || []).length,
    pending_approvals: approvals.filter((item) => item.status === 'pending'),
    warnings
  };
  console.log(JSON.stringify(result, null, 2));
  activity('STATUS', agent, `watch pending_approvals=${result.pending_approvals.length} warnings=${warnings.length}`);
}

function testTask(args) {
  const { flags } = parseFlags(args);
  const agent = flags.agent ? String(flags.agent).toLowerCase() : 'system';
  const checks = [];
  function check(name, fn) {
    try {
      fn();
      checks.push({ name, ok: true });
    } catch (err) {
      checks.push({ name, ok: false, error: err.message });
    }
  }
  check('syntax helpers loaded', () => { if (!WORK_ITEM_STATUSES.has('done')) throw new Error('status set missing done'); });
  check('workspaces load', () => { if (!loadWorkspaces().roots.length) throw new Error('no workspaces'); });
  check('protected registry load', () => { if (!loadProtectedFiles().rules.length) throw new Error('no protected rules'); });
  check('approvals load', () => { const data = loadApprovals(); if (!Array.isArray(data.approvals)) throw new Error('approvals invalid'); });
  check('personas continuity', () => { if (!chooseNextAgent('codex', 'coordinator')) throw new Error('no fallback'); });
  const result = { ok: checks.every((item) => item.ok), checks };
  console.log(JSON.stringify(result, null, 2));
  activity('REVIEW', agent, `self-test ${result.ok ? 'ok' : 'failed'}`);
  if (!result.ok) throw new Error('self-test failed');
}

function help() {
  console.log(`B3 AI War Room

Commands:
  start "task title" --agent codex [--owner codex]
  claim TASK_ID FILE --agent codex [--reason "..."]
  preflight TASK_ID FILE --agent codex [--claim]
  touch TASK_ID FILE --agent codex [--ttl 45]
  release TASK_ID FILE --agent codex
  msg TASK_ID TAG @receiver "body" --agent codex
  research TASK_ID "summary" --agent codex [--confidence High] [--refs "..."]
  report issue "body" --agent codex [--task TASK_ID]
  handoff TASK_ID --agent FROM --to TO [--note "..."]
  state TASK_ID ITEM_ID STATUS --agent codex [--force]
  review TASK_ID "note" --agent reviewer [--result pass|pass-with-notes|blocked]
  done TASK_ID "summary" --agent codex [--force]
  finalize TASK_ID "summary" --agent codex [--force]
  sync TASK_ID --agent codex
  validate TASK_ID --agent codex
  repair TASK_ID --agent codex
  summary TASK_ID --agent codex [--write]
  scan-secrets [TASK_ID] --agent codex
  doctor --agent codex [--secrets]
  standup --agent codex
  ritual TASK_ID --agent codex
  continuity TASK_ID --agent codex
  takeover TASK_ID --from AGENT [--to AGENT] --agent codex [--reason "..."]
  next-agent CURRENT_AGENT --role coordinator
  approval list|request|approve|reject|pending --agent B3
  approval-sync --agent codex [--url https://.../api/approvals]
  approval-pull --agent codex [--url https://.../api/approvals]
  approval-loop --agent codex [--interval 60] [--once]
  approval-loop-service start|stop|status --agent codex [--interval 60]
  conflict-radar --agent codex [--telegram]
  team-digest --agent codex [--telegram]
  watch --agent codex
  test --agent codex
  decision TASK_ID "decision" --agent codex [--why "..."]
  lesson TASK_ID "lesson" --agent codex
  risk list|add|close --agent codex
  cost TASK_ID --agent codex [--tokens 1234] [--minutes 30]
  personas [--write]
  dependencies [--write]
  dashboard --agent codex [--write]
  rebuild-board --agent codex [--write]
  workspaces [--write]
  protected-files [--write]
  gc-locks --agent codex [--inactive] [--expired]
  status
`);
}

async function main() {
  ensureDir(WAR_ROOM);
  ensureDir(SESSIONS);
  ensureDir(REPORTS);
  const [cmd, ...args] = process.argv.slice(2);
  try {
    if (cmd === 'start') return withStoreMutex(() => startTask(args));
    if (cmd === 'claim') return withStoreMutex(() => claim(args));
    if (cmd === 'preflight') return withStoreMutex(() => preflight(args));
    if (cmd === 'touch') return withStoreMutex(() => touch(args));
    if (cmd === 'release') return withStoreMutex(() => release(args));
    if (cmd === 'msg') return withStoreMutex(() => message(args));
    if (cmd === 'research') return withStoreMutex(() => research(args));
    if (cmd === 'report') return withStoreMutex(() => report(args));
    if (cmd === 'handoff') return withStoreMutex(() => handoffTask(args));
    if (cmd === 'state') return withStoreMutex(() => stateTask(args));
    if (cmd === 'review') return withStoreMutex(() => reviewTask(args));
    if (cmd === 'done') return withStoreMutex(() => done(args));
    if (cmd === 'finalize') return withStoreMutex(() => finalizeTask(args));
    if (cmd === 'sync') return withStoreMutex(() => syncTask(args));
    if (cmd === 'validate') return withStoreMutex(() => validateTask(args));
    if (cmd === 'repair') return withStoreMutex(() => repairTask(args));
    if (cmd === 'summary') return withStoreMutex(() => summaryTask(args));
    if (cmd === 'scan-secrets') return withStoreMutex(() => scanSecrets(args));
    if (cmd === 'doctor') return withStoreMutex(() => doctor(args));
    if (cmd === 'standup') return withStoreMutex(() => standup(args));
    if (cmd === 'ritual') return withStoreMutex(() => ritual(args));
    if (cmd === 'continuity') return withStoreMutex(() => continuityTask(args));
    if (cmd === 'takeover') return withStoreMutex(() => takeoverTask(args));
    if (cmd === 'next-agent') return withStoreMutex(() => nextAgentTask(args));
    if (cmd === 'approval') return withStoreMutex(() => approvalTask(args));
    if (cmd === 'approval-sync') return await withStoreMutex(() => approvalSyncTask(args));
    if (cmd === 'approval-pull') return await withStoreMutex(() => approvalPullTask(args));
    if (cmd === 'approval-loop') return await approvalLoopTask(args);
    if (cmd === 'approval-loop-service') return approvalLoopServiceTask(args);
    if (cmd === 'conflict-radar') return withStoreMutex(() => conflictRadarTask(args));
    if (cmd === 'groq-ask') return groqAsk(args);
    if (cmd === 'team-digest') return withStoreMutex(() => teamDigestTask(args));
    if (cmd === 'watch') return withStoreMutex(() => watchTask(args));
    if (cmd === 'test') return withStoreMutex(() => testTask(args));
    if (cmd === 'decision') return withStoreMutex(() => decisionTask(args));
    if (cmd === 'lesson') return withStoreMutex(() => lessonTask(args));
    if (cmd === 'risk') return withStoreMutex(() => risksTask(args));
    if (cmd === 'cost') return withStoreMutex(() => costTask(args));
    if (cmd === 'personas') return withStoreMutex(() => personasTask(args));
    if (cmd === 'dependencies') return withStoreMutex(() => dependenciesTask(args));
    if (cmd === 'dashboard') return withStoreMutex(() => dashboardTask(args));
    if (cmd === 'rebuild-board') return withStoreMutex(() => rebuildBoard(args));
    if (cmd === 'workspaces') return withStoreMutex(() => workspacesTask(args));
    if (cmd === 'protected-files') return withStoreMutex(() => protectedFilesTask(args));
    if (cmd === 'gc-locks') return withStoreMutex(() => gcLocks(args));
    if (cmd === 'status') return status();
    return help();
  } catch (err) {
    console.error(`[war-room] ${err.message}`);
    process.exit(1);
  }
}

if (require.main === module) main();
