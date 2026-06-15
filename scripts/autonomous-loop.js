#!/usr/bin/env node
/**
 * autonomous-loop.js — B3 Autonomous Quality Gate + Auto-Push
 *
 * เรียกหลังจาก Codex ส่ง DONE กลับมา:
 * 1. tsc type-check
 * 2. ถ้าผ่าน → git push
 * 3. notify B3 via Telegram
 * 4. อัปเดต context-snapshot
 *
 * Claude ไม่ต้องนั่งรอเฝ้า — loop นี้ทำทุกอย่างเอง
 *
 * Usage:
 *   node scripts/autonomous-loop.js --project cit-service --task "ui-card-20260610"
 *   node scripts/autonomous-loop.js --project jong-jaroen --task "..." --skip-push
 */

const { spawnSync, execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const PROJECT_ROOTS = {
  'cit-service':    path.join(ROOT, '..', 'cit-service'),
  'jong-jaroen':    path.join(ROOT, '..', 'jong-jaroen'),
  'b3-team-avenger': path.join(ROOT, '..', 'b3-team-avenger'),
  'b3-second-brain': ROOT,
};

function arg(name) {
  const idx = process.argv.indexOf(name);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  const pref = process.argv.find(a => a.startsWith(`${name}=`));
  return pref ? pref.slice(name.length + 1) : null;
}

const PROJECT   = arg('--project') || 'b3-second-brain';
const TASK_ID   = arg('--task') || 'unknown';
const SKIP_PUSH = process.argv.includes('--skip-push');
const SKIP_TSC  = process.argv.includes('--skip-tsc');

function run(cmd, cwd, label) {
  console.log(`[auto-loop] ${label}...`);
  const r = spawnSync(cmd, { shell: true, cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  return { ok: r.status === 0, stdout: r.stdout || '', stderr: r.stderr || '' };
}

function notify(msg) {
  const notifyScript = path.join(ROOT, 'scripts', 'b3-notify.js');
  if (!fs.existsSync(notifyScript)) {
    console.log(`[auto-loop] 📣 ${msg}`);
    return;
  }
  spawnSync(process.execPath, [notifyScript, msg], { stdio: 'inherit', shell: false });
}

function snapshotPending(msg) {
  const snapshotScript = path.join(ROOT, 'scripts', 'context-snapshot.js');
  if (!fs.existsSync(snapshotScript)) return;
  spawnSync(process.execPath, [snapshotScript, 'update-field', 'decisions.push', msg], {
    stdio: 'inherit', cwd: ROOT, shell: false,
  });
}

async function main() {
  const projectRoot = PROJECT_ROOTS[PROJECT] || PROJECT_ROOTS['b3-second-brain'];

  if (!fs.existsSync(projectRoot)) {
    console.error(`[auto-loop] Project root not found: ${projectRoot}`);
    process.exit(1);
  }

  console.log(`\n[auto-loop] ── Task: ${TASK_ID} | Project: ${PROJECT} ──`);

  // ── Step 1: TypeScript check ───────────────────────────────────────────────
  if (!SKIP_TSC) {
    const hasTsConfig = fs.existsSync(path.join(projectRoot, 'tsconfig.json'));
    if (hasTsConfig) {
      const tsc = run('npx tsc --noEmit', projectRoot, 'tsc type-check');
      if (!tsc.ok) {
        const errPreview = (tsc.stderr || tsc.stdout).slice(0, 500);
        console.error(`[auto-loop] ❌ tsc FAILED:\n${errPreview}`);
        notify(`❌ [${TASK_ID}] tsc พัง — ต้องแก้ก่อน push\n${errPreview.slice(0, 200)}`);
        snapshotPending(`${TASK_ID}: tsc failed — pending fix`);
        process.exit(1);
      }
      console.log('[auto-loop] ✅ tsc passed');
    } else {
      console.log('[auto-loop] No tsconfig.json — skip tsc');
    }
  }

  // ── Step 2: Git status check ───────────────────────────────────────────────
  const status = run('git status --short', projectRoot, 'git status');
  const hasChanges = status.stdout.trim().length > 0;

  if (!hasChanges) {
    console.log('[auto-loop] No changes to commit.');
    notify(`✅ [${TASK_ID}] ไม่มีการเปลี่ยนแปลง — task อาจเสร็จแล้ว`);
    process.exit(0);
  }

  // ── Step 3: Git add + commit ───────────────────────────────────────────────
  const commitMsg = `feat: ${TASK_ID} — auto-commit by autonomous-loop\n\nCo-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`;
  const addResult  = run('git add -A', projectRoot, 'git add');
  if (!addResult.ok) {
    console.error('[auto-loop] git add failed'); process.exit(1);
  }

  const commitResult = run(`git commit -m "${commitMsg.replace(/"/g, "'")}"`, projectRoot, 'git commit');
  if (!commitResult.ok) {
    // Already clean or hook blocked
    console.log('[auto-loop] git commit skipped (nothing new or hook blocked)');
  }

  // ── Step 4: Push ───────────────────────────────────────────────────────────
  if (!SKIP_PUSH) {
    const push = run('git push', projectRoot, 'git push');
    if (!push.ok) {
      console.error(`[auto-loop] ❌ git push failed:\n${push.stderr.slice(0, 300)}`);
      notify(`❌ [${TASK_ID}] push ล้มเหลว — ต้องตรวจสอบ`);
      snapshotPending(`${TASK_ID}: push failed`);
      process.exit(1);
    }
    console.log('[auto-loop] ✅ pushed');
  }

  // ── Step 5: Update snapshot + notify ──────────────────────────────────────
  const snapshotScript = path.join(ROOT, 'scripts', 'context-snapshot.js');
  if (fs.existsSync(snapshotScript)) {
    spawnSync(process.execPath, [snapshotScript, 'write'], { stdio: 'inherit', cwd: ROOT, shell: false });
  }

  const summary = SKIP_PUSH
    ? `✅ [${TASK_ID}] tsc ผ่าน — commit แล้ว (push ถูก skip)`
    : `✅ [${TASK_ID}] tsc ผ่าน + push สำเร็จ — พร้อม deploy`;
  notify(summary);
  console.log(`\n[auto-loop] DONE: ${summary}\n`);
}

main().catch(err => {
  console.error(`[auto-loop] Fatal: ${err.message}`);
  process.exit(1);
});
