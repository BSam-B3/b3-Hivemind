#!/usr/bin/env node
/**
 * team-inbox-poller.js
 * รันผ่าน Windows Task Scheduler ทุก 10 นาที
 * ตรวจ INBOX ของทุก AI — ถ้างาน atomic → spawn CLI รับงานทันที
 * ถ้างานซับซ้อน → skip (รอ B3 หรือ AI นั้นๆ เปิด session)
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const TRIGGERS = path.join(ROOT, 'wiki', 'ai-war-room', 'triggers');
const NPM_MODS = path.join(process.env.APPDATA || '', 'npm', 'node_modules');
const LOG = path.join(TRIGGERS, 'poller.log');

// ── ทีม AI และ CLI ───────────────────────────────────────────────────────────
const AI_RUNNERS = {
  claude: {
    executable: 'claude',
    buildArgs: (prompt) => ['-p', prompt, '--dangerously-skip-permissions'],
    timeout: 300000,
  },
  gemini: {
    executable: (() => {
      const bundle = path.join(NPM_MODS, '@google', 'gemini-cli', 'bundle', 'gemini.js');
      return fs.existsSync(bundle) ? process.execPath : 'gemini';
    })(),
    buildArgs: (prompt, exe) => {
      const bundle = path.join(NPM_MODS, '@google', 'gemini-cli', 'bundle', 'gemini.js');
      return fs.existsSync(bundle)
        ? [bundle, '-m', 'gemini-2.5-flash', '-p', prompt]
        : ['-m', 'gemini-2.5-flash', '-p', prompt];
    },
    timeout: 120000,
  },
  codex: {
    executable: (() => {
      const bundle = path.join(NPM_MODS, '@openai', 'codex', 'bin', 'codex.js');
      return fs.existsSync(bundle) ? process.execPath : 'codex';
    })(),
    buildArgs: (prompt, exe) => {
      const bundle = path.join(NPM_MODS, '@openai', 'codex', 'bin', 'codex.js');
      const flags = ['exec', '--skip-git-repo-check', '--dangerously-bypass-approvals-and-sandbox', '-s', 'danger-full-access', '-C', ROOT, prompt];
      return fs.existsSync(bundle) ? [bundle, ...flags] : flags;
    },
    timeout: 600000,
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function log(msg) {
  const ts = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok' }).replace('T', ' ');
  const line = `[${ts} ICT] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG, line + '\n', 'utf8'); } catch {}
}

function getInboxFiles(aiName) {
  if (!fs.existsSync(TRIGGERS)) return [];
  return fs.readdirSync(TRIGGERS)
    .filter(f => f.startsWith(`INBOX-${aiName.toUpperCase()}-`) && f.endsWith('.md'))
    .map(f => path.join(TRIGGERS, f));
}

function readInstruction(file) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const m = content.match(/## Instruction\n([\s\S]*?)(?:\n---|$)/);
    return m ? m[1].trim() : null;
  } catch { return null; }
}

function isComplex(instruction) {
  if (!instruction) return false;
  if (instruction.length > 500) return true;
  return [
    /\band\b.*\band\b/i,
    /แล้ว.*แล้ว/,
    /(implement|design|build|create|setup).*(implement|design|build|create|setup)/i,
    /(frontend|backend|database|api|ui|migration).*(frontend|backend|database|api|ui|migration)/i,
    /ทั้ง.*(และ|กับ|พร้อม)/,
  ].some(p => p.test(instruction));
}

function runAI(aiName, instruction, inboxFile) {
  const runner = AI_RUNNERS[aiName];
  if (!runner) return false;

  const prompt = `[POLLER] inbox: ${path.basename(inboxFile)}\n\n${instruction}\n\nเมื่อเสร็จ จบด้วย FINAL: หรือ [TRIGGER:*]`;
  const args = runner.buildArgs(prompt, runner.executable);

  const result = spawnSync(runner.executable, args, {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: runner.timeout,
    env: { ...process.env, GEMINI_MODEL: 'gemini-2.5-flash' },
  });

  const ok = result.status === 0 && result.stdout?.trim().length > 50;
  if (ok) {
    // บันทึก output ลง session
    const taskMatch = path.basename(inboxFile).match(/INBOX-[A-Z]+-(.+)\.md/);
    if (taskMatch) {
      const sessionDir = path.join(ROOT, 'wiki', 'ai-war-room', 'sessions', taskMatch[1]);
      fs.mkdirSync(sessionDir, { recursive: true });
      fs.writeFileSync(
        path.join(sessionDir, `${aiName}-output.md`),
        `# ${aiName} Output (poller)\n**Time:** ${new Date().toISOString()}\n\n${result.stdout.trim()}`,
        'utf8'
      );
    }
    try { fs.unlinkSync(inboxFile); } catch {}
  }
  return ok;
}

// ── Watchdog: restart watcher if dead ────────────────────────────────────────
function watchdogCheck() {
  const PID_FILE = path.join(TRIGGERS, 'watcher.pid');
  try {
    if (!fs.existsSync(PID_FILE)) {
      log('[WATCHDOG] watcher.pid ไม่มี — watcher ไม่ได้รัน → restart');
      restartWatcher();
      return;
    }
    const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim(), 10);
    try {
      process.kill(pid, 0); // ตรวจว่า process ยังอยู่
    } catch {
      log(`[WATCHDOG] PID ${pid} ตายแล้ว → restart watcher`);
      restartWatcher();
    }
  } catch (e) {
    log(`[WATCHDOG] error: ${e.message}`);
  }
}

function restartWatcher() {
  const { spawn } = require('child_process');
  const watcher = spawn('node', [path.join(ROOT, 'scripts', 'openclaw-trigger-watcher.js')], {
    cwd: ROOT,
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });
  watcher.unref();
  log(`[WATCHDOG] watcher restarted (PID ${watcher.pid})`);
}

// ── Main ─────────────────────────────────────────────────────────────────────
log('[POLLER] team-inbox-poller เริ่มทำงาน');
watchdogCheck();

// item 6: ตรวจ Think Tank deadline
try {
  const TT_DIR = path.join(ROOT, 'wiki', 'ai-war-room', 'think-tank');
  if (fs.existsSync(TT_DIR)) {
    fs.readdirSync(TT_DIR).filter(f => f.endsWith('-deadline.json')).forEach(f => {
      try {
        const d = JSON.parse(fs.readFileSync(path.join(TT_DIR, f), 'utf8'));
        if (!d.notified && new Date(d.deadline) < new Date()) {
          const ttContent = fs.existsSync(path.join(TT_DIR, `${d.id}.md`))
            ? fs.readFileSync(path.join(TT_DIR, `${d.id}.md`), 'utf8') : '';
          const missing = ['claude','gemini','codex'].filter(a => !ttContent.includes(`[THOUGHT:${a}]`));
          if (missing.length > 0) {
            const { spawnSync: sp } = require('child_process');
            sp('node', [path.join(ROOT, 'scripts', 'b3-notify.js'), '--message',
              `⏰ Think Tank หมดเวลาแล้ว\nหัวข้อ: ${d.id}\nยังไม่ตอบ: ${missing.join(', ')}`
            ], { cwd: ROOT });
            d.notified = true;
            fs.writeFileSync(path.join(TT_DIR, f), JSON.stringify(d, null, 2), 'utf8');
            log(`[TT-DEADLINE] notified B3 — ${d.id} missing: ${missing.join(',')}`);
          }
        }
      } catch {}
    });
  }
} catch {}

let totalProcessed = 0;

for (const aiName of ['claude', 'gemini', 'codex']) {
  const files = getInboxFiles(aiName);
  if (files.length === 0) continue;

  log(`[${aiName.toUpperCase()}] พบ ${files.length} INBOX`);

  for (const file of files) {
    const instruction = readInstruction(file);
    if (!instruction) { log(`[SKIP] ${path.basename(file)} — อ่าน instruction ไม่ได้`); continue; }

    if (isComplex(instruction)) {
      log(`[SKIP] ${path.basename(file)} — งานซับซ้อน รอ B3 session`);
      continue;
    }

    log(`[RUN] ${aiName} ← ${path.basename(file)}`);
    const ok = runAI(aiName, instruction, file);

    if (ok) {
      log(`[DONE] ${aiName} ตอบแล้ว — ลบ ${path.basename(file)}`);
      totalProcessed++;
    } else {
      log(`[FAIL] ${aiName} ไม่ตอบ หรือ timeout`);
    }
  }
}

log(`[POLLER] เสร็จ — ${totalProcessed} งานที่รับไปทำ`);
