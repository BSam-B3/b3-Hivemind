#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LIMITS = {
  coreWarnBytes: 30 * 1024,
  statusStaleDays: 7,
  topWikiWithoutFrontmatter: 20,
  stalePromptMinutes: 30,
};

const CORE_FILES = [
  'กฏ.md',
  'CLAUDE.md',
  'GEMINI.md',
  'CODEX.md',
  'P3.md',
  'wiki/B3-MASTER-BLUEPRINT.md',
  'wiki/BRIDGE-PROTOCOL.md',
];

const STATUS_FILES = [
  'STATUS.md',
  'wiki/project-status-auto.md',
  'wiki/to-b3/STATUS-SUMMARY.md',
  'wiki/bridge/status.json',
];

const TRIGGERS_DIR = path.join(ROOT, 'wiki', 'ai-war-room', 'triggers');

const DYNAMIC_MARKERS = [
  'latest',
  'today',
  'yesterday',
  'tomorrow',
  'current session',
  'next session',
  'last updated',
  'pending',
  'todo',
  'blocked',
  'in progress',
  '2026-',
];

const args = new Set(process.argv.slice(2));
const SHOULD_WRITE_REPORT = args.has('--write-report');
const REPORT_FILE = path.join(ROOT, 'wiki', 'context', 'brain-health-latest.md');

const output = [];

function line(text = '') {
  output.push(text);
  console.log(text);
}

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

function exists(relPath) {
  return fs.existsSync(path.join(ROOT, relPath));
}

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function stat(relPath) {
  return fs.statSync(path.join(ROOT, relPath));
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.obsidian' || entry.name === 'recycle') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

function ageDays(date) {
  return (Date.now() - date.getTime()) / (24 * 60 * 60 * 1000);
}

function hasFrontmatter(text) {
  return text.startsWith('---\n') || text.startsWith('---\r\n');
}

function printSection(title) {
  line(`\n## ${title}`);
}

function main() {
  const issues = [];
  const warnings = [];
  const suggestions = [];

  line(`# B3 Brain Doctor`);
  line(`Generated: ${new Date().toISOString()}`);
  line(`Mode: ${SHOULD_WRITE_REPORT ? 'read-only scan + report write' : 'read-only'}`);

  printSection('Core Context');
  for (const file of CORE_FILES) {
    if (!exists(file)) {
      warnings.push(`Missing expected core file: ${file}`);
      line(`WARN missing ${file}`);
      continue;
    }

    const size = stat(file).size;
    const text = read(file).toLowerCase();
    const dynamicHits = DYNAMIC_MARKERS.filter((marker) => text.includes(marker));
    const label = `${file} (${Math.round(size / 1024)} KB)`;

    if (size > LIMITS.coreWarnBytes) {
      warnings.push(`Core file may be too large for stable caching: ${label}`);
      line(`WARN large ${label}`);
    } else {
      line(`OK ${label}`);
    }

    if (dynamicHits.length >= 4) {
      suggestions.push(`Review dynamic content in static core: ${file} (${dynamicHits.slice(0, 6).join(', ')})`);
    }
  }

  printSection('Dynamic Status');
  for (const file of STATUS_FILES) {
    if (!exists(file)) {
      warnings.push(`Missing status file: ${file}`);
      line(`WARN missing ${file}`);
      continue;
    }

    const days = ageDays(stat(file).mtime);
    if (days > LIMITS.statusStaleDays) {
      warnings.push(`Status file may be stale: ${file} (${days.toFixed(1)} days old)`);
      line(`WARN stale ${file} (${days.toFixed(1)} days old)`);
    } else {
      line(`OK ${file} (${days.toFixed(1)} days old)`);
    }
  }

  printSection('Wiki Frontmatter Sample');
  const wikiFiles = walk(path.join(ROOT, 'wiki'))
    .filter((file) => file.endsWith('.md'))
    .filter((file) => !rel(file).startsWith('wiki/recycle/'));

  const withoutFrontmatter = wikiFiles
    .filter((file) => !hasFrontmatter(fs.readFileSync(file, 'utf8')))
    .map(rel);

  line(`Markdown files scanned: ${wikiFiles.length}`);
  line(`Without frontmatter: ${withoutFrontmatter.length}`);
  for (const file of withoutFrontmatter.slice(0, LIMITS.topWikiWithoutFrontmatter)) {
    line(`INFO no-frontmatter ${file}`);
  }

  if (withoutFrontmatter.length > 0) {
    suggestions.push(`Add frontmatter gradually to high-value wiki notes (${withoutFrontmatter.length} files found).`);
  }

  printSection('Trigger Hygiene');
  if (fs.existsSync(TRIGGERS_DIR)) {
    const promptFiles = fs.readdirSync(TRIGGERS_DIR)
      .filter((file) => file.startsWith('_prompt-') && file.endsWith('.txt'))
      .map((file) => path.join(TRIGGERS_DIR, file))
      .filter((file) => ageDays(fs.statSync(file).mtime) * 24 * 60 > LIMITS.stalePromptMinutes);
    if (promptFiles.length === 0) {
      line('OK no stale trigger prompt files');
    } else {
      warnings.push(`Stale trigger prompt files found: ${promptFiles.length}`);
      for (const file of promptFiles.slice(0, 10)) {
        const minutes = ageDays(fs.statSync(file).mtime) * 24 * 60;
        line(`WARN stale-prompt ${rel(file)} (${minutes.toFixed(0)} minutes old)`);
      }
    }
  } else {
    line('INFO trigger directory not found');
  }

  printSection('Summary');
  line(`Issues: ${issues.length}`);
  line(`Warnings: ${warnings.length}`);
  line(`Suggestions: ${suggestions.length}`);

  if (warnings.length) {
    line('\nWarnings:');
    for (const item of warnings) line(`- ${item}`);
  }

  if (suggestions.length) {
    line('\nSuggestions:');
    for (const item of suggestions) line(`- ${item}`);
  }

  if (SHOULD_WRITE_REPORT) {
    const report = [
      '---',
      'type: project-status',
      'project: b3-second-brain',
      'status: active',
      'owner: Codex',
      'source: brain-doctor',
      `created: ${new Date().toISOString().slice(0, 10)}`,
      `last_reviewed: ${new Date().toISOString().slice(0, 10)}`,
      'confidence: high',
      '---',
      '',
      ...output,
      '',
    ].join('\n');
    fs.mkdirSync(path.dirname(REPORT_FILE), { recursive: true });
    fs.writeFileSync(REPORT_FILE, report, 'utf8');
    line(`\nReport written: ${rel(REPORT_FILE)}`);
  } else {
    line('\nNo files were changed by this command.');
  }
}

main();
