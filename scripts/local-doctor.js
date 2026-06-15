#!/usr/bin/env node

const { config, listModels, chat, appendAudit } = require('./local-ai-client');

const REQUIRED_MODELS = ['qwen2.5:3b', 'qwen2.5-coder:3b'];

async function main() {
  const cfg = config();
  const checks = [];

  checks.push({
    name: 'ONE_API_KEY',
    ok: !!cfg.apiKey,
    detail: cfg.apiKey ? 'present' : 'missing',
  });
  checks.push({
    name: 'ONE_API_ENDPOINT',
    ok: /^https?:\/\//.test(cfg.endpoint),
    detail: cfg.endpoint,
  });

  let models = [];
  let latencyMs = null;

  if (cfg.apiKey) {
    const start = Date.now();
    try {
      models = await listModels();
      latencyMs = Date.now() - start;
      checks.push({ name: '/v1/models', ok: true, detail: `${models.length} model(s), ${latencyMs}ms` });
    } catch (err) {
      checks.push({ name: '/v1/models', ok: false, detail: err.message });
    }

    for (const model of REQUIRED_MODELS) {
      checks.push({
        name: `model:${model}`,
        ok: models.includes(model),
        detail: models.includes(model) ? 'available' : 'not listed',
      });
    }

    if (models.length) {
      const model = models.includes('qwen2.5:3b') ? 'qwen2.5:3b' : models[0];
      try {
        const probe = await chat({
          model,
          messages: [
            { role: 'system', content: 'Reply with exactly: LOCAL_OK' },
            { role: 'user', content: 'health check' },
          ],
          maxTokens: 32,
          timeoutMs: 15000,
        });
        checks.push({ name: 'chat probe', ok: /LOCAL_OK/i.test(probe.text), detail: `${probe.durationMs}ms via ${model}` });
      } catch (err) {
        checks.push({ name: 'chat probe', ok: false, detail: err.message });
      }
    }
  }

  const jsonMode = process.argv.includes('--json');
  const ok = checks.every(check => check.ok);

  if (jsonMode) {
    console.log(JSON.stringify({ ok, checks, models, latencyMs }));
  } else {
    for (const check of checks) {
      console.log(`${check.ok ? '[ok]' : '[fail]'} ${check.name}: ${check.detail}`);
    }
  }

  appendAudit({
    command: 'local-doctor',
    provider: 'LocalLLM',
    endpoint: cfg.endpoint,
    fallbackUsed: false,
    status: ok ? 'ok' : 'error',
    purpose_type: 'test',
    models,
    latencyMs,
    checks,
  });

  if (!ok) process.exit(1);
}

main().catch(err => {
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ ok: false, error: err.message }));
  } else {
    console.error(`[local-doctor] Error: ${err.message}`);
  }
  process.exit(1);
});
