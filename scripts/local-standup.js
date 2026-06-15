#!/usr/bin/env node
/**
 * Local daily standup generator.
 *
 * Uses local One API/Ollama only. No cloud fallback.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const {
  ROOT,
  chat,
  config,
  appendAudit,
} = require('./local-ai-client');

function localDateString() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: process.env.TZ || 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

function getGitSummary() {
  try {
    const log = execSync('git log --since="24 hours ago" --oneline', {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    const lines = log.split(/\r?\n/).filter(Boolean);
    return lines.length
      ? lines.slice(0, 8).join('\n') + (lines.length > 8 ? `\n...and ${lines.length - 8} more commit(s).` : '')
      : 'No commits in the last 24 hours.';
  } catch {
    return 'Could not read git log.';
  }
}

function getWorktreeSummary() {
  try {
    const status = execSync('git status --short', {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (!status) return 'Worktree clean.';
    const lines = status.split(/\r?\n/).filter(Boolean);
    return [
      `${lines.length} changed file(s). Showing first 15:`,
      ...lines.slice(0, 15),
      ...(lines.length > 15 ? [`...and ${lines.length - 15} more changed file(s).`] : []),
    ].join('\n');
  } catch {
    return 'Could not read git status.';
  }
}

async function main() {
  const cfg = config();
  if (!cfg.apiKey) {
    console.error('[local-standup] Missing ONE_API_KEY in .env. Local standup is fail-closed.');
    process.exit(1);
  }

  const model = process.argv.includes('--model')
    ? process.argv[process.argv.indexOf('--model') + 1]
    : 'qwen2.5-coder:1.5b';
  const dateStr = localDateString();
  const input = [
    `Date: ${dateStr}`,
    '',
    'Git commits in last 24 hours:',
    getGitSummary(),
    '',
    'Current worktree:',
    getWorktreeSummary(),
  ].join('\n');
  const tpl = {
    system: 'Write a very short Local Draft standup in Thai. Use 3 sections only: Yesterday, Risks, Next Actions. Max 8 bullets total. Include key English terms in parentheses.',
    user: input,
  };

  console.log(`[local-standup] Local only. Model: ${model}`);

  try {
    const result = await chat({
      model,
      messages: [
        { role: 'system', content: tpl.system },
        { role: 'user', content: tpl.user },
      ],
      maxTokens: 512,
      timeoutMs: 45000,
    });

    const reportPath = path.join(ROOT, 'wiki', 'monitoring', `standup-${dateStr}.md`);
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, `# Daily Standup: ${dateStr}\n\n> Local Draft. Verify important claims before acting.\n\n${result.text}\n`, 'utf8');

    appendAudit({
      command: 'local-standup',
      provider: result.provider,
      model,
      endpoint: cfg.endpoint,
      durationMs: result.durationMs,
      tokens: result.tokens,
      fallbackUsed: false,
      status: 'ok',
      output: path.relative(ROOT, reportPath).replace(/\\/g, '/'),
    });

    console.log('\n' + '='.repeat(50));
    console.log('B3 Team Local Standup Report');
    console.log('='.repeat(50));
    console.log(result.text);
    console.log('='.repeat(50));
    console.log(`[local-standup] Saved -> ${path.relative(ROOT, reportPath)}`);
  } catch (err) {
    appendAudit({
      command: 'local-standup',
      provider: 'LocalLLM',
      model,
      endpoint: cfg.endpoint,
      fallbackUsed: false,
      status: 'error',
      error: err.message,
    });
    console.error(`[local-standup] Error: ${err.message}`);
    process.exit(1);
  }
}

main();
