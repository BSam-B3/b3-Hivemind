#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const LEARNING_LOG = path.join(ROOT, 'wiki', 'ai-team', 'learning-log.md');
const LESSONS = path.join(ROOT, 'wiki', 'ai-war-room', 'lessons.md');
const FEATURES_LIB = path.join(ROOT, 'wiki', 'features-library.md');
const APPDATA = process.env.APPDATA || '';
const GEMINI_BUNDLE = path.join(APPDATA, 'npm', 'node_modules', '@google', 'gemini-cli', 'bundle', 'gemini.js');

// Auto-load .env
const envPath = path.join(ROOT, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && v.length) process.env[k.trim()] = v.join('=').trim();
  });
}

function parseArgs(args) {
  const flags = {};
  const rest = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      flags[arg.slice(2)] = true;
    } else {
      rest.push(arg);
    }
  }
  return { flags, rest };
}

async function askGroqDirect(promptContent) {
  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) throw new Error('No GROQ_API_KEY found in .env');

  const body = JSON.stringify({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: 'You are the B3 AI Team Knowledge Refiner.' },
      { role: 'user', content: promptContent }
    ],
    max_tokens: 8192,
    temperature: 0.7
  });

  return new Promise((resolve, reject) => {
    const req = https.request('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_KEY}`
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const text = json.choices?.[0]?.message?.content;
          if (!text) reject(new Error(`Groq API returned empty response: ${data.slice(0, 300)}`));
          else resolve(text);
        } catch (e) { reject(new Error(`Groq parse error: ${data.slice(0, 200)}`)); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function run() {
  const { flags } = parseArgs(process.argv.slice(2));
  const dryRun = !!flags['dry-run'];

  console.log("=== B3 Gemini Refiner - Starting Log Synthesis ===");

  if (!fs.existsSync(LEARNING_LOG)) {
    console.error(`Error: ${LEARNING_LOG} not found.`);
    process.exit(1);
  }
  if (!fs.existsSync(LESSONS)) {
    console.error(`Error: ${LESSONS} not found.`);
    process.exit(1);
  }
  if (!fs.existsSync(FEATURES_LIB)) {
    console.error(`Error: ${FEATURES_LIB} not found.`);
    process.exit(1);
  }

  const logsContent = fs.readFileSync(LEARNING_LOG, 'utf8');
  const lessonsContent = fs.readFileSync(LESSONS, 'utf8');
  const libContent = fs.readFileSync(FEATURES_LIB, 'utf8');

  const prompt = [
    "You are the B3 AI Team Knowledge Refiner.",
    "Your task is to synthesize the recent learning logs and lessons from the AI team, identify new reusable code patterns, and consolidate them into the existing features library.",
    "",
    "--- START OF RECENT LEARNING LOG ---",
    logsContent,
    "--- END OF RECENT LEARNING LOG ---",
    "",
    "--- START OF RECENT LESSONS ---",
    lessonsContent,
    "--- END OF RECENT LESSONS ---",
    "",
    "--- CURRENT FEATURES LIBRARY (features-library.md) ---",
    libContent,
    "--- END OF CURRENT FEATURES LIBRARY ---",
    "",
    "INSTRUCTIONS:",
    "1. Analyze the learning logs and lessons for new coding patterns, style fixes, utility functions, or best practices.",
    "2. Consolidate these new findings into the CURRENT FEATURES LIBRARY under the relevant existing categories (or create new categories if necessary).",
    "3. Do not duplicate patterns that are already in the library. Refine/extend existing ones if they relate to the same problem.",
    "4. Return the ENTIRE updated content of features-library.md in markdown format. Do not add any conversational text, explanations, or quotes before or after the markdown content. Start directly with the markdown structure.",
  ].join('\n');

  if (dryRun) {
    console.log("\n[DRY RUN] Generated Prompt:");
    console.log(prompt.slice(0, 1000) + "\n... [TRUNCATED] ...");
    console.log("Dry run completed successfully.");
    process.exit(0);
  }

  // Write prompt to a temp file to avoid command line limit issues
  const tempPromptFile = path.join(ROOT, 'wiki', 'ai-war-room', 'triggers', `_refiner-prompt-${Date.now()}.txt`);
  fs.writeFileSync(tempPromptFile, prompt, 'utf8');

  console.log("Invoking Gemini CLI to refine features-library.md...");

  const useBundle = fs.existsSync(GEMINI_BUNDLE);
  const executable = useBundle ? process.execPath : 'gemini';
  const args = useBundle
    ? [GEMINI_BUNDLE, '-m', 'gemini-2.5-flash', '-p', `Read instruction and content from ${tempPromptFile.replace(/\\/g, '/')} and return the updated features-library.md`]
    : ['-m', 'gemini-2.5-flash', '-p', `Read instruction and content from ${tempPromptFile.replace(/\\/g, '/')} and return the updated features-library.md`];

  const result = spawnSync(executable, args, {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, GEMINI_MODEL: 'gemini-2.5-flash', GEMINI_CLI_TRUST_WORKSPACE: 'true' },
    shell: false,
    timeout: 300000 // 5 minutes
  });

  // Cleanup temp prompt file
  try { if (fs.existsSync(tempPromptFile)) fs.unlinkSync(tempPromptFile); } catch {}

  let output = '';
  let providerUsed = 'Gemini CLI';

  if (result.status !== 0) {
    console.warn("\n⚠️  Gemini CLI failed. Attempting Direct API Fallback via Groq...");
    try {
      output = await askGroqDirect(prompt);
      providerUsed = 'Groq API Fallback';
      console.log("✅ Fallback to Groq API succeeded!");
    } catch (err) {
      console.error("❌ Fallback to Groq API failed: " + err.message);
      process.exit(1);
    }
  } else {
    output = (result.stdout || '').trim();
  }

  if (!output || output.length < 50) {
    console.error("Error: Output is empty or too short.");
    process.exit(1);
  }

  // Filter out any markdown block wraps if model accidentally added them
  let refinedContent = output;
  if (refinedContent.startsWith('```markdown')) {
    refinedContent = refinedContent.slice(11);
  } else if (refinedContent.startsWith('```')) {
    refinedContent = refinedContent.slice(3);
  }
  if (refinedContent.endsWith('```')) {
    refinedContent = refinedContent.slice(0, -3);
  }
  refinedContent = refinedContent.trim();

  fs.writeFileSync(FEATURES_LIB, refinedContent, 'utf8');
  console.log(`Success! Solidified new coding patterns and updated features-library.md (${FEATURES_LIB})`);

  // Write activity log
  try {
    const ts = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok' }).slice(0, 16) + ' ICT';
    fs.appendFileSync(path.join(ROOT, 'wiki', 'ai-war-room', 'activity.md'), `\n- [REFINER] @team ts:${ts} ${providerUsed} successfully refined lessons and updated features-library.md\n`);
  } catch {}
}

run().catch(err => {
  console.error("Critical Refiner Error:", err);
  process.exit(1);
});
