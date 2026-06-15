#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const express = require('express');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const WAR_ROOM = path.join(ROOT, 'wiki', 'ai-war-room');
const APPROVALS = path.join(WAR_ROOM, 'approvals.json');
const PANEL = path.join(WAR_ROOM, 'approval-panel.html');
const PORT = Number(process.env.WAR_APPROVAL_PORT || 8787);

function readApprovals() {
  try {
    const data = JSON.parse(fs.readFileSync(APPROVALS, 'utf8'));
    return { version: data.version || '1.0', approvals: data.approvals || [] };
  } catch {
    return { version: '1.0', approvals: [] };
  }
}

function runWarRoom(args) {
  const result = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'war-room.js'), ...args], {
    cwd: ROOT,
    encoding: 'utf8'
  });
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || 'war-room command failed').trim());
  }
  return result.stdout.trim();
}

const app = express();
app.use(express.json());

app.get('/', (_req, res) => {
  res.sendFile(PANEL);
});

app.get('/api/approvals', (_req, res) => {
  res.json(readApprovals());
});

app.post('/api/approvals', (req, res) => {
  try {
    const reason = req.body?.action_detail || req.body?.nam_summary || 'approval requested';
    const type = String(req.body?.action_type || 'general').replace(/^war-room:/, '');
    const task = req.body?.task_id || null;
    const output = runWarRoom([
      'approval',
      'request',
      String(reason),
      '--agent',
      'approval-panel',
      '--type',
      type,
      ...(task ? ['--task', String(task)] : [])
    ]);
    res.json({ ok: true, approval: JSON.parse(output) });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/approvals/:id/:action', (req, res) => {
  const { id, action } = req.params;
  if (!['approve', 'reject', 'pending'].includes(action)) {
    res.status(400).json({ ok: false, error: 'invalid action' });
    return;
  }
  try {
    const note = req.body?.note ? String(req.body.note) : '';
    const args = ['approval', action, id, '--agent', 'B3'];
    if (note) args.push('--note', note);
    const output = runWarRoom(args);
    res.json({ ok: true, output });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/watch', (_req, res) => {
  try {
    const output = runWarRoom(['watch', '--agent', 'approval-panel']);
    res.type('json').send(output);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`B3 approval panel: http://localhost:${PORT}`);
});
