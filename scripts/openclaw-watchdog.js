#!/usr/bin/env node
// OpenClaw Watchdog — ตรวจทุก 2 นาที ถ้า watcher ตาย → restart อัตโนมัติ

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PID_FILE = path.join(ROOT, 'wiki', 'ai-war-room', 'triggers', 'watcher.pid');
const LOG_FILE = path.join(ROOT, 'wiki', 'ai-war-room', 'triggers', 'watchdog.log');
const CHECK_INTERVAL_MS = 30 * 1000; // 30 วินาที — restart เร็วขึ้น 4x

function log(msg) {
  const ts = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
  const line = `[${ts}] ${msg}\n`;
  fs.appendFileSync(LOG_FILE, line, 'utf8');
  process.stdout.write(line);
}

function isWatcherAlive() {
  if (!fs.existsSync(PID_FILE)) return false;
  const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim(), 10);
  if (!pid || isNaN(pid)) return false;
  try {
    process.kill(pid, 0); // ถ้า process ยังอยู่ จะไม่ throw
    return true;
  } catch {
    return false;
  }
}

// Crash backoff — ถ้า watcher restart บ่อยเกินไปใน 5 นาที หยุด restart แล้วแจ้ง B3
const restartHistory = [];
const MAX_RESTARTS_PER_5MIN = 5;

function isThrashing() {
  const fiveMinAgo = Date.now() - 5 * 60 * 1000;
  const recent = restartHistory.filter(t => t > fiveMinAgo);
  return recent.length >= MAX_RESTARTS_PER_5MIN;
}

function startWatcher() {
  if (isThrashing()) {
    log('[WATCHDOG] ⛔ Crash loop detected (5+ restarts in 5min) — pausing restart. ตรวจสอบ watcher log ด้วยตัวเอง');
    return;
  }
  restartHistory.push(Date.now());
  log('[WATCHDOG] Starting OpenClaw Watcher...');
  const child = spawn('node', [path.join(__dirname, 'openclaw-trigger-watcher.js')], {
    detached: true,
    stdio: 'ignore',
    cwd: ROOT,
  });
  child.unref();
  log(`[WATCHDOG] Watcher started (PID: ${child.pid})`);
}

function check() {
  if (!isWatcherAlive()) {
    log('[WATCHDOG] Watcher NOT running — restarting...');
    startWatcher();
  }
}

log('[WATCHDOG] Started — checking every 30s');

check();
setInterval(check, CHECK_INTERVAL_MS);

// keepalive
process.on('uncaughtException', (err) => log(`[WATCHDOG] Error: ${err.message}`));
process.on('unhandledRejection', (r) => log(`[WATCHDOG] Rejection: ${r}`));
