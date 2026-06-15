const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const DEFAULT_ENDPOINT = 'http://127.0.0.1:3000/v1';
const DEFAULT_TIMEOUT_MS = Number(process.env.LOCAL_AI_TIMEOUT_MS || 30000);

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

function config() {
  loadEnv();
  const allowedStr = process.env.LOCAL_AI_ALLOWED_MODELS || '';
  const allowedModels = allowedStr ? allowedStr.split(',').map(m => m.trim()).filter(Boolean) : [];
  return {
    root: ROOT,
    apiKey: process.env.ONE_API_KEY || '',
    endpoint: (process.env.ONE_API_ENDPOINT || DEFAULT_ENDPOINT).replace(/\/+$/, ''),
    timeoutMs: Number(process.env.LOCAL_AI_TIMEOUT_MS || DEFAULT_TIMEOUT_MS),
    allowedModels,
  };
}

function endpointUrl(pathname) {
  const cfg = config();
  return new URL(`${cfg.endpoint}${pathname}`);
}

function requestJson(method, pathname, body, options = {}) {
  const cfg = config();
  const url = endpointUrl(pathname);
  const isHttps = url.protocol === 'https:';
  const client = isHttps ? https : http;
  const payload = body ? JSON.stringify(body) : null;

  return new Promise((resolve, reject) => {
    const req = client.request({
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: `${url.pathname}${url.search}`,
      method,
      headers: {
        ...(payload ? {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        } : {}),
        ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}),
      },
    }, res => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = data ? JSON.parse(data) : {};
        } catch (err) {
          reject(new Error(`Local AI returned non-JSON HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
          return;
        }

        if (res.statusCode >= 400) {
          const message = json.error?.message || json.message || data.slice(0, 200) || `HTTP ${res.statusCode}`;
          reject(new Error(`Local AI HTTP ${res.statusCode}: ${message}`));
          return;
        }

        if (json.error) {
          reject(new Error(json.error.message || JSON.stringify(json.error)));
          return;
        }

        resolve(json);
      });
    });

    req.setTimeout(options.timeoutMs || cfg.timeoutMs, () => {
      req.destroy(new Error(`Local AI request timed out after ${options.timeoutMs || cfg.timeoutMs}ms`));
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function listModels() {
  const json = await requestJson('GET', '/models');
  const rawModels = Array.isArray(json.data) ? json.data.map(model => model.id).filter(Boolean) : [];
  const cfg = config();
  if (cfg.allowedModels.length > 0) {
    return rawModels.filter(m => cfg.allowedModels.includes(m));
  }
  return rawModels;
}

async function chat({ model, messages, temperature = 0.3, maxTokens = 2048, timeoutMs }) {
  const cfg = config();
  if (cfg.allowedModels.length > 0 && !cfg.allowedModels.includes(model)) {
    throw new Error(`Model '${model}' is not in the LOCAL_AI_ALLOWED_MODELS allowlist.`);
  }

  const start = Date.now();
  const json = await requestJson('POST', '/chat/completions', {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  }, { timeoutMs });

  const text = json.choices?.[0]?.message?.content;
  if (!text) throw new Error(`Local AI returned no content: ${JSON.stringify(json).slice(0, 300)}`);

  return {
    text,
    model,
    provider: 'LocalLLM',
    tokens: json.usage?.total_tokens || 0,
    durationMs: Date.now() - start,
  };
}

function appendAudit(entry) {
  const file = path.join(ROOT, 'wiki', 'monitoring', 'local-ai-runs.jsonl');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify({
    timestamp: new Date().toISOString(),
    ...entry,
  })}\n`, 'utf8');
}

const CODING_RE = /เขียน|โค้ด|code|function|create|implement|add|route|api|style|tsx|typescript|javascript|sql|fix|แก้/i;
// Fast tasks: short utility, rename, format — use 1.5b for speed
const FAST_RE   = /format|rename|slugify|camelcase|snake_case|convert|แปลง|trim|parse|regex/i;

function pickModel(prompt) {
  if (FAST_RE.test(prompt || ''))   return 'qwen2.5-coder:1.5b';
  if (CODING_RE.test(prompt || '')) return 'qwen2.5-coder:3b';
  return 'qwen2.5:3b';
}

// Detect task complexity so agent-loop can decide local vs escalate.
function estimateComplexity(prompt) {
  const lower = (prompt || '').toLowerCase();
  const simpleSignals = ['format', 'rename', 'slugify', 'camelcase', 'snake_case', 'convert',
    'draft comment', 'docstring', 'summarize', 'อธิบาย', 'สรุป', 'แปลง', 'log analysis', 'วิเคราะห์'];
  const isSimple = simpleSignals.some(s => lower.includes(s));
  return isSimple ? 'simple' : 'complex';
}

const TEAM_CONTEXT = `
You are the Local AI assistant for B3 AI Team. Key facts about this team:
- AI agents: claude (backend/logic), codex (UI/frontend), gemini (browse/research), local (you — small tasks, free)
- Correct trigger command format:
    node scripts/trigger-ai.js --from local --to claude --task "TASK-ID" --instruction "..."
    node scripts/trigger-ai.js --from local --to codex  --task "TASK-ID" --instruction "..."
    node scripts/trigger-ai.js --from local --to gemini --task "TASK-ID" --instruction "..."
- NEVER use slash commands like /local /codex /claude /gemini — they do not exist in this system
- NEVER invent file paths or config keys that were not mentioned in the user's message
- If the instruction is in Thai, reply in Thai. If in English, reply in English.
- For code tasks: always wrap code in markdown code blocks (\`\`\`language ... \`\`\`)
`.trim();

function promptTemplate(kind, input) {
  const templates = {
    summarize: 'Summarize clearly in Thai with key technical English terms in parentheses. Keep it concise.',
    'code-review': 'Review for bugs, risks, regressions, and missing tests. Findings first. Always use markdown code blocks for any code.',
    standup: 'Create a Daily Standup Summary in Thai with technical English terms in parentheses. Sections: Yesterday, Risks, Next Actions.',
    'thai-explain': 'Explain clearly. Match the language of the input (Thai→Thai, English→English). For code output, always use markdown code blocks.',
    'bug-hunt': 'Find likely bugs and operational risks. Be specific and practical.',
    // Structured JSON output — used by local-agent-loop for machine-readable results
    'structured-draft': [
      'You MUST respond with a single valid JSON object only — no extra text, no markdown, no explanation outside the JSON.',
      'Schema:',
      '{',
      '  "task_type": "<utility_function|sql|format|summarize|explain|type_definition|other>",',
      '  "confidence": <0.0-1.0>,',
      '  "draft": "<your output as a string, code in escaped string>",',
      '  "needs_review": ["<issue 1>", "<issue 2>"],',
      '  "route_next": "<approve|claude-review|escalate>"',
      '}',
      'Rules:',
      '- confidence ≥ 0.8 → route_next = "approve"',
      '- confidence 0.5-0.79 → route_next = "claude-review"',
      '- confidence < 0.5 → route_next = "escalate"',
      '- needs_review: list edge cases or unknowns; empty array [] if none.',
    ].join('\n'),
  };
  const system = templates[kind] || templates['thai-explain'];
  return {
    system: `${TEAM_CONTEXT}\n\n${system}`,
    user: input,
  };
}

module.exports = {
  ROOT,
  config,
  chat,
  listModels,
  appendAudit,
  pickModel,
  promptTemplate,
  estimateComplexity,
};
