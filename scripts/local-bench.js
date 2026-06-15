#!/usr/bin/env node
/**
 * local-bench.js - B3 Local AI Benchmark tool.
 * Runs latency, success, token throughput checks, and recommends the default models.
 */

const { chat, listModels, config, appendAudit } = require('./local-ai-client');

const TEST_PROMPTS = [
  {
    purpose: 'code-review',
    model: 'qwen2.5-coder:3b',
    messages: [
      { role: 'system', content: 'You are a senior code reviewer. Review the following code briefly.' },
      { role: 'user', content: 'function add(a, b) { return a + b; }' }
    ]
  },
  {
    purpose: 'general-query',
    model: 'qwen2.5:3b',
    messages: [
      { role: 'system', content: 'Explain in Thai briefly.' },
      { role: 'user', content: 'ตลาดชุมชนคืออะไร?' }
    ]
  }
];

async function runBenchmark() {
  const jsonMode = process.argv.includes('--json');
  const cfg = config();
  
  if (!jsonMode) {
    console.log(`⏱️ Starting Local AI Benchmark on endpoint: ${cfg.endpoint}`);
  }

  let models = [];
  try {
    models = await listModels();
    if (!jsonMode) {
      console.log(`🤖 Discovered Local Models: ${models.join(', ')}`);
    }
  } catch (err) {
    if (jsonMode) {
      console.log(JSON.stringify({ ok: false, error: err.message }));
    } else {
      console.error(`❌ Could not fetch models list: ${err.message}`);
    }
    process.exit(1);
  }

  const results = [];

  for (const t of TEST_PROMPTS) {
    // If the model is not listed, skip it
    if (models.length > 0 && !models.includes(t.model)) {
      if (!jsonMode) {
        console.log(`⚠️ Model ${t.model} is not available in One API list. Skipping benchmark.`);
      }
      continue;
    }

    if (!jsonMode) {
      console.log(`🏃 Benchmarking model: ${t.model} for purpose: ${t.purpose}...`);
    }
    const start = Date.now();
    try {
      const response = await chat({
        model: t.model,
        messages: t.messages,
        temperature: 0.1,
        maxTokens: 100,
        timeoutMs: 15000 // 15s timeout for bench
      });

      const duration = Date.now() - start;
      const tokensPerSec = response.tokens > 0 ? (response.tokens / (duration / 1000)).toFixed(2) : 'N/A';

      results.push({
        model: t.model,
        purpose: t.purpose,
        status: 'success',
        latencyMs: duration,
        tokens: response.tokens,
        tokensPerSec,
      });

      appendAudit({
        command: 'local-bench',
        model: t.model,
        purpose: t.purpose,
        durationMs: duration,
        tokens: response.tokens,
        status: 'success',
        purpose_type: 'test'
      });
      
      if (!jsonMode) {
        console.log(`✅ Success! Latency: ${duration}ms, Tokens: ${response.tokens} (${tokensPerSec} t/s)`);
      }
    } catch (err) {
      const duration = Date.now() - start;
      results.push({
        model: t.model,
        purpose: t.purpose,
        status: 'failed',
        latencyMs: duration,
        error: err.message
      });

      appendAudit({
        command: 'local-bench',
        model: t.model,
        purpose: t.purpose,
        durationMs: duration,
        status: 'failed',
        error: err.message,
        purpose_type: 'test'
      });

      if (!jsonMode) {
        console.error(`❌ Failed! Latency: ${duration}ms, Error: ${err.message}`);
      }
    }
  }

  if (jsonMode) {
    console.log(JSON.stringify({ ok: true, results }));
  } else {
    console.log('\n=========================================');
    console.log('📊 BENCHMARK SUMMARY');
    console.log('=========================================');
    console.table(results);
    console.log('=========================================\n');
  }
}

runBenchmark();
