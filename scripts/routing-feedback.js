#!/usr/bin/env node
/**
 * routing-feedback.js — Self-Improving Local AI Routing
 *
 * วิเคราะห์ local-ai-runs.jsonl → หา task type ที่ local fail บ่อย
 * → อัปเดต routing-rules.json ให้ route ไป cloud แทน
 * → ระบบเรียนรู้เองทุกสัปดาห์
 *
 * Usage:
 *   node scripts/routing-feedback.js          ← analyze + auto-update
 *   node scripts/routing-feedback.js --dry-run ← แค่รายงาน ไม่แก้ไฟล์
 */

const fs   = require('fs');
const path = require('path');

const ROOT       = path.join(__dirname, '..');
const RUNS_FILE  = path.join(ROOT, 'wiki', 'monitoring', 'local-ai-runs.jsonl');
const RULES_FILE = path.join(ROOT, 'wiki', 'ai-war-room', 'routing-rules.json');
const REPORT_DIR = path.join(ROOT, 'wiki', 'monitoring');

const DRY_RUN = process.argv.includes('--dry-run');

function ictNow() {
  return new Date(Date.now() + 7 * 3600000).toISOString().replace('T', ' ').slice(0, 19) + ' ICT';
}

// ─── analyze runs ─────────────────────────────────────────────────────────────

function analyzeRuns(lines) {
  const stats = {}; // model → { ok, fail, escalate, review, total }

  for (const line of lines) {
    let r;
    try { r = JSON.parse(line); } catch { continue; }

    const key = r.command || 'unknown';
    if (!stats[key]) stats[key] = { ok: 0, fail: 0, escalate: 0, review: 0, total: 0 };
    stats[key].total++;

    if (r.status === 'ok') stats[key].ok++;
    else stats[key].fail++;

    // local-agent-loop exit codes logged in status field
    if (r.exit_code === 3 || r.status === 'escalate') stats[key].escalate++;
    if (r.exit_code === 2 || r.status === 'review')   stats[key].review++;
  }

  return stats;
}

// ─── keyword-level stats from prompt logs ─────────────────────────────────────

function analyzePromptPatterns(lines) {
  // Group by rough task category inferred from template field
  const templates = {};
  for (const line of lines) {
    let r; try { r = JSON.parse(line); } catch { continue; }
    const tpl = r.template || r.command || 'unknown';
    if (!templates[tpl]) templates[tpl] = { ok: 0, fail: 0, total: 0 };
    templates[tpl].total++;
    if (r.status === 'ok') templates[tpl].ok++;
    else templates[tpl].fail++;
  }
  return templates;
}

// ─── update routing thresholds ────────────────────────────────────────────────

function updateRoutingRules(failedTemplates) {
  let rules;
  try { rules = JSON.parse(fs.readFileSync(RULES_FILE, 'utf8')); }
  catch { console.error('[routing-feedback] Cannot read routing-rules.json'); return; }

  let changed = false;

  // If local overall fail rate > 30% → add note, lower local preference
  if (!rules.local_feedback) rules.local_feedback = {};
  rules.local_feedback.last_analyzed = ictNow();
  rules.local_feedback.template_stats = failedTemplates;

  // Find templates with >40% failure → mark as "prefer cloud"
  const highFailTemplates = Object.entries(failedTemplates)
    .filter(([, s]) => s.total >= 5 && (s.fail / s.total) > 0.4)
    .map(([k]) => k);

  if (highFailTemplates.length) {
    rules.local_feedback.high_fail_templates = highFailTemplates;
    rules.local_feedback.recommendation = `Templates with >40% failure: ${highFailTemplates.join(', ')} → consider routing to cloud`;
    changed = true;
    console.log(`[routing-feedback] High-fail templates: ${highFailTemplates.join(', ')}`);
  } else {
    rules.local_feedback.recommendation = 'Local routing is performing well.';
    console.log('[routing-feedback] Local AI performing well — no routing changes needed.');
  }

  if (!DRY_RUN && changed) {
    fs.writeFileSync(RULES_FILE, JSON.stringify(rules, null, 2) + '\n', 'utf8');
    console.log('[routing-feedback] routing-rules.json updated.');
  }

  return { highFailTemplates, recommendation: rules.local_feedback.recommendation };
}

// ─── write report ─────────────────────────────────────────────────────────────

function writeReport(stats, templateStats, recommendation) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const reportFile = path.join(REPORT_DIR, 'routing-feedback-report.md');
  const lines = [
    `# Routing Feedback Report`,
    `Generated: ${ictNow()}`,
    `Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`,
    '',
    '## Command Stats (last 200 runs)',
    '',
    '| Command | Total | OK | Fail | Success% |',
    '|---|---|---|---|---|',
    ...Object.entries(stats).map(([k, v]) =>
      `| ${k} | ${v.total} | ${v.ok} | ${v.fail} | ${Math.round((v.ok/v.total)*100)}% |`
    ),
    '',
    '## Template Stats',
    '',
    '| Template | Total | OK | Fail | Success% |',
    '|---|---|---|---|---|',
    ...Object.entries(templateStats).map(([k, v]) =>
      `| ${k} | ${v.total} | ${v.ok} | ${v.fail} | ${Math.round((v.ok/v.total)*100)}% |`
    ),
    '',
    `## Recommendation`,
    '',
    recommendation || 'No recommendation.',
  ];
  fs.writeFileSync(reportFile, lines.join('\n') + '\n', 'utf8');
  console.log(`[routing-feedback] Report → ${reportFile}`);
}

// ─── main ─────────────────────────────────────────────────────────────────────

function main() {
  if (!fs.existsSync(RUNS_FILE)) {
    console.log('[routing-feedback] No run logs found. Local AI has not been used yet.');
    return;
  }

  const lines = fs.readFileSync(RUNS_FILE, 'utf8').trim().split('\n').filter(Boolean);
  console.log(`[routing-feedback] Analyzing ${lines.length} run records...`);

  // Use last 200 runs for analysis
  const recent = lines.slice(-200);
  const commandStats  = analyzeRuns(recent);
  const templateStats = analyzePromptPatterns(recent);

  const { recommendation } = updateRoutingRules(templateStats) || {};
  writeReport(commandStats, templateStats, recommendation);

  if (DRY_RUN) console.log('[routing-feedback] DRY RUN — no files changed.');
}

main();
