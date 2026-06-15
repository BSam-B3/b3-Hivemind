#!/usr/bin/env node
/**
 * scripts/archive-sessions.js
 * Archive war room sessions older than N days into recycle/
 * Usage: node scripts/archive-sessions.js [--days 30] [--dry-run]
 */

const fs   = require('fs')
const path = require('path')

const ROOT     = path.resolve(__dirname, '..')
const SESSIONS = path.join(ROOT, 'wiki', 'ai-war-room', 'sessions')
const RECYCLE  = path.join(ROOT, 'recycle')
const BOARD    = path.join(ROOT, 'wiki', 'ai-war-room', 'board.json')

function parseFlags(argv) {
  const flags = { days: 30, dryRun: false }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--days' && argv[i + 1]) flags.days = parseInt(argv[i + 1])
    if (argv[i] === '--dry-run') flags.dryRun = true
  }
  return flags
}

function readBoard() {
  try { return JSON.parse(fs.readFileSync(BOARD, 'utf8')) } catch { return {} }
}

function getActiveTaskIds(board) {
  return new Set((board.active_tasks || []).map(t => t.id))
}

function nowIct() {
  return new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })
}

function main() {
  const { days, dryRun } = parseFlags(process.argv.slice(2))
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000

  const board = readBoard()
  const activeIds = getActiveTaskIds(board)

  const entries = fs.readdirSync(SESSIONS).filter(n => n !== '_TEMPLATE')
  let archived = 0
  let skipped  = 0

  const dateStr = new Date().toISOString().slice(0, 10)
  const dest    = path.join(RECYCLE, dateStr)

  for (const name of entries) {
    if (activeIds.has(name)) { skipped++; continue }

    const sessionPath = path.join(SESSIONS, name)
    const stat = fs.statSync(sessionPath)
    if (!stat.isDirectory()) continue

    const mtime = stat.mtimeMs
    if (mtime > cutoff) { skipped++; continue }

    if (dryRun) {
      console.log(`[dry-run] would archive: ${name}`)
      archived++
      continue
    }

    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true })
    fs.renameSync(sessionPath, path.join(dest, name))
    console.log(`archived: ${name}`)
    archived++
  }

  console.log(`\n${nowIct()} | archived: ${archived} | skipped (active/recent): ${skipped} | cutoff: ${days} days${dryRun ? ' [DRY RUN]' : ''}`)
}

main()
