#!/usr/bin/env node
/**
 * B3 Local AI runner.
 *
 * Local only. This script never falls back to cloud providers.
 */

const fs = require('fs');
const path = require('path');
const {
  ROOT,
  chat,
  config,
  appendAudit,
  pickModel,
  promptTemplate,
} = require('./local-ai-client');

function argValue(args, name) {
  const idx = args.indexOf(name);
  if (idx >= 0) return args[idx + 1];
  const prefixed = args.find(arg => arg.startsWith(`${name}=`));
  return prefixed ? prefixed.slice(name.length + 1) : null;
}

function usage() {
  console.error('Usage: node scripts/ask-local.js "prompt" [--model qwen2.5:3b] [--template code-review|standup|summarize|thai-explain|bug-hunt] [--task-file file.json]');
}

async function runPrompt({ prompt, model, template, taskId }) {
  const selectedModel = model || pickModel(prompt);
  const tpl = promptTemplate(template || 'thai-explain', prompt);
  const result = await chat({
    model: selectedModel,
    messages: [
      { role: 'system', content: `${tpl.system}\nDo not claim cloud verification. If uncertain, say what to verify next.` },
      { role: 'user', content: tpl.user },
    ],
    maxTokens: 2048,
  });

  appendAudit({
    command: 'ask-local',
    provider: result.provider,
    model: selectedModel,
    endpoint: config().endpoint,
    durationMs: result.durationMs,
    tokens: result.tokens,
    fallbackUsed: false,
    taskId: taskId || null,
    status: 'ok',
  });

  return { ...result, selectedModel };
}

async function main() {
  const cfg = config();
  if (!cfg.apiKey) {
    console.error('[ask-local] Missing ONE_API_KEY in .env. Local mode is fail-closed.');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const model = argValue(args, '--model') || argValue(args, '--local-model');
  const template = argValue(args, '--template');

  // Check routing-rules for cloud-override templates (high fail-rate)
  if (template) {
    try {
      const rulesPath = path.join(ROOT, 'wiki', 'ai-war-room', 'routing-rules.json');
      const rules = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
      const overrides = rules.local_override_to_cloud || [];
      if (overrides.includes(template)) {
        console.error(`[ask-local] Template "${template}" has high fail-rate → routing to cloud (exit 1 for fallback)`);
        process.exit(1);
      }
    } catch {}
  }
  const taskFile = argValue(args, '--task-file');

  let prompt = args
    .filter(arg => !arg.startsWith('--'))
    .filter(arg => arg !== model && arg !== template && arg !== taskFile)
    .join(' ')
    .trim();
  let taskId = null;

  if (taskFile) {
    const fullPath = path.resolve(ROOT, taskFile);
    if (!fullPath.startsWith(path.resolve(ROOT))) {
      console.error(`[ask-local] Unsafe task file path: ${taskFile}`);
      process.exit(1);
    }
    const trigger = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    taskId = trigger.taskId || trigger.task_id || null;
    prompt = trigger.instruction || prompt;
  }

  if (!prompt) {
    if (args.includes('--json')) {
      console.log(JSON.stringify({ ok: false, error: 'Prompt is required' }));
    } else {
      usage();
    }
    process.exit(1);
  }

  const jsonMode = args.includes('--json');
  if (!jsonMode) {
    console.log(`[ask-local] Local only. Endpoint: ${cfg.endpoint}`);
  }

  try {
    const result = await runPrompt({ prompt, model, template, taskId });
    if (jsonMode) {
      console.log(JSON.stringify({ ok: true, model: result.selectedModel, text: result.text, durationMs: result.durationMs, tokens: result.tokens }));
    } else {
      console.log(`[ask-local] Model: ${result.selectedModel}`);
      console.log(`[ask-local] Duration: ${result.durationMs}ms, tokens: ${result.tokens}`);
      console.log('\n' + '='.repeat(50));
      console.log(`Local Draft from ${result.selectedModel}`);
      console.log('='.repeat(50));
      console.log(result.text);
      console.log('='.repeat(50));
    }

    if (taskId) {
      const sessionDir = path.join(ROOT, 'wiki', 'ai-war-room', 'sessions', taskId);
      fs.mkdirSync(sessionDir, { recursive: true });
      fs.writeFileSync(path.join(sessionDir, 'local-output.md'),
        `# Local AI Output - ${taskId}\n\n**Model:** ${result.selectedModel}\n**Time:** ${new Date().toISOString()}\n**Note:** Local Draft, verify before production decisions.\n\n${result.text}\n`,
        'utf8');
    }
  } catch (err) {
    appendAudit({
      command: 'ask-local',
      provider: 'LocalLLM',
      model: model || null,
      endpoint: cfg.endpoint,
      fallbackUsed: false,
      taskId,
      status: 'error',
      error: err.message,
    });
    if (jsonMode) {
      console.log(JSON.stringify({ ok: false, error: err.message }));
    } else {
      console.error(`[ask-local] Error: ${err.message}`);
    }
    process.exit(1);
  }
}

main();
