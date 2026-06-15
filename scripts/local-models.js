#!/usr/bin/env node

const { config, listModels } = require('./local-ai-client');

async function main() {
  const cfg = config();
  if (!cfg.apiKey) {
    console.error('[local-models] Missing ONE_API_KEY in .env.');
    process.exit(1);
  }

  try {
    const models = await listModels();
    if (!models.length) {
      console.log('[local-models] No models returned by One API.');
      return;
    }
    models.forEach(model => console.log(`- ${model}`));
  } catch (err) {
    console.error(`[local-models] Error: ${err.message}`);
    process.exit(1);
  }
}

main();
