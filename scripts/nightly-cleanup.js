#!/usr/bin/env node
/**
 * scripts/nightly-cleanup.js
 * Run nightly to keep the war room tidy.
 * Usage: node scripts/nightly-cleanup.js
 *
 * Add to Windows Task Scheduler or run manually:
 *   schtasks /create /tn "B3NightlyCleanup" /tr "node C:\Users\PC\Desktop\B3-Second-Brain\scripts\nightly-cleanup.js" /sc daily /st 02:00
 */

const { execSync } = require('child_process')
const path = require('path')

const SCRIPTS = path.join(__dirname)

function run(cmd, label) {
  try {
    const out = execSync(cmd, { cwd: path.join(__dirname, '..'), encoding: 'utf8' })
    console.log(`✅ ${label}`)
    if (out.trim()) console.log('   ' + out.trim().split('\n').join('\n   '))
  } catch (err) {
    console.error(`⚠️  ${label}: ${err.message.split('\n')[0]}`)
  }
}

console.log(`\n🌙 Nightly Cleanup — ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })} ICT\n`)

run(`node "${path.join(SCRIPTS, 'war-room.js')}" doctor --fix --agent system`, 'Doctor + release expired locks')
run(`node "${path.join(SCRIPTS, 'archive-sessions.js')}" --days 30`, 'Archive sessions older than 30 days')

console.log('\nDone.\n')
