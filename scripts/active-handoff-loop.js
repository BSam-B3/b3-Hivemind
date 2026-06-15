#!/usr/bin/env node

/**
 * 🌉 Bi-Directional Active Handoff Watcher
 * Monitors BRIDGE_COORDINATION.txt and orchestrates Claude ↔ Gemini coordination
 *
 * Usage: node active-handoff-loop.js [--daemon]
 */

const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const readline = require('readline');

const BRIDGE_FILE = path.join(__dirname, '../BRIDGE_COORDINATION.txt');
const PROXY_SCRIPT = path.join(__dirname, '../proxy-messenger.js');
const LOG_FILE = path.join(__dirname, '../.handoff-log.txt');

// ==================== UTILS ====================
function log(level, msg) {
  const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const prefix = `[${ts}] [${level}]`;
  const logMsg = `${prefix} ${msg}`;

  console.log(logMsg);
  fs.appendFileSync(LOG_FILE, logMsg + '\n');
}

function parseCoordination(content) {
  const lines = content.split('\n');
  const data = {};

  lines.forEach(line => {
    const match = line.match(/^\[(.+?)\]\s+(.*)$/);
    if (match) {
      const [, key, value] = match;
      data[key] = value.trim();
    }
  });

  return data;
}

function getTimestamp() {
  const now = new Date();
  const offsetHours = 7; // ICT = UTC+7
  const localTime = new Date(now.getTime() + offsetHours * 60 * 60 * 1000);
  return localTime.toISOString().replace('T', ' ').slice(0, 16) + ' ICT';
}

function updateCoordination(updates) {
  const content = fs.readFileSync(BRIDGE_FILE, 'utf-8');
  const data = parseCoordination(content);

  // Merge updates
  Object.assign(data, updates);

  // Reconstruct file
  const newContent = Object.entries(data)
    .map(([k, v]) => `[${k}] ${v}`)
    .join('\n') + '\n';

  fs.writeFileSync(BRIDGE_FILE, newContent);
  log('INFO', `Updated BRIDGE_COORDINATION: ${Object.keys(updates).join(', ')}`);
}

// ==================== HANDLERS ====================

async function handleClaudeHandoff(task) {
  log('INFO', '🔵 CLAUDE activation detected. Preparing task...');

  updateCoordination({
    'ACTIVE_AGENT': 'CLAUDE',
    'STATUS': 'PROCESSING'
  });

  try {
    // Write task to stdin-ready file
    const taskFile = path.join(__dirname, '../.claude-task.txt');
    fs.writeFileSync(taskFile, task);

    log('INFO', `📝 Task written to ${taskFile}`);
    log('INFO', '⏳ Waiting for Claude to process...');

    // Note: Actual Claude invocation would happen via CLI or API
    // For now, we signal readiness
    updateCoordination({
      'STATUS': 'WAITING_CLAUDE_RESPONSE'
    });

  } catch (err) {
    log('ERROR', `Claude handoff failed: ${err.message}`);
    updateCoordination({
      'STATUS': `ERROR: ${err.message}`,
      'ACTIVE_AGENT': 'SYSTEM'
    });
  }
}

async function handleGeminiHandoff(task) {
  log('INFO', '🟢 GEMINI activation detected. Preparing handoff...');

  updateCoordination({
    'ACTIVE_AGENT': 'GEM',
    'STATUS': 'PROCESSING'
  });

  try {
    // Check if proxy-messenger exists
    if (!fs.existsSync(PROXY_SCRIPT)) {
      log('WARN', `proxy-messenger.js not found at ${PROXY_SCRIPT}. Creating stub...`);
      createProxyStub();
    }

    // Call proxy messenger
    const result = await callProxyMessenger(task);

    log('INFO', `✅ Gemini handoff complete. Result: ${result}`);
    updateCoordination({
      'STATUS': 'GEMINI_PROCESSING',
      'LAST_HANDOFF': getTimestamp()
    });

  } catch (err) {
    log('ERROR', `Gemini handoff failed: ${err.message}`);
    updateCoordination({
      'STATUS': `ERROR: ${err.message}`,
      'ACTIVE_AGENT': 'SYSTEM'
    });
  }
}

function callProxyMessenger(task) {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', [PROXY_SCRIPT], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let error = '';

    proc.stdin.write(JSON.stringify({ task, timestamp: getTimestamp() }));
    proc.stdin.end();

    proc.stdout.on('data', (data) => {
      output += data.toString();
    });

    proc.stderr.on('data', (data) => {
      error += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(error || `Process exited with code ${code}`));
      }
    });
  });
}

function createProxyStub() {
  const stub = `
#!/usr/bin/env node
// Stub proxy-messenger.js - user must implement Gemini API call
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let input = '';
rl.on('line', (line) => {
  input += line;
});

rl.on('close', () => {
  try {
    const data = JSON.parse(input);
    console.log(JSON.stringify({ status: 'ready', task: data.task }));
  } catch (err) {
    console.error('Invalid JSON input');
    process.exit(1);
  }
});
  `.trim();

  fs.mkdirSync(path.dirname(PROXY_SCRIPT), { recursive: true });
  fs.writeFileSync(PROXY_SCRIPT, stub);
  log('INFO', 'Created proxy-messenger.js stub');
}

// ==================== MAIN WATCHER ====================

function startWatcher() {
  log('INFO', '🚀 Bi-Directional Active Handoff Watcher starting...');
  log('INFO', `📍 Monitoring: ${BRIDGE_FILE}`);

  let lastContent = '';

  const watcher = fs.watch(BRIDGE_FILE, async (eventType, filename) => {
    if (eventType !== 'change') return;

    try {
      const content = fs.readFileSync(BRIDGE_FILE, 'utf-8');

      // Avoid re-processing same content
      if (content === lastContent) return;
      lastContent = content;

      const data = parseCoordination(content);
      const agent = data.ACTIVE_AGENT;
      const task = data.HANDOVER_TASK;

      if (!agent || !task) return;

      log('DEBUG', `Detected: AGENT=${agent}, TASK=${task.substring(0, 50)}...`);

      if (agent === 'CLAUDE') {
        await handleClaudeHandoff(task);
      } else if (agent === 'GEM') {
        await handleGeminiHandoff(task);
      } else if (agent !== 'SYSTEM_READY') {
        log('WARN', `Unknown agent: ${agent}`);
      }

    } catch (err) {
      log('ERROR', `Watcher error: ${err.message}`);
    }
  });

  log('INFO', '✅ Watcher active. Waiting for handoff signals...');

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    log('INFO', '🛑 Shutting down watcher...');
    watcher.close();
    process.exit(0);
  });
}

// ==================== CLI ====================

const isDaemon = process.argv.includes('--daemon');

if (isDaemon) {
  // Run in background
  const { spawn } = require('child_process');
  const child = spawn('node', [__filename], {
    detached: true,
    stdio: 'ignore'
  });
  child.unref();
  console.log(`🌉 Watcher spawned as background process (PID: ${child.pid})`);
} else {
  // Run in foreground
  startWatcher();
}

module.exports = { parseCoordination, updateCoordination, getTimestamp };
