---
type: operating-rule
project: b3-second-brain
status: active
owner: B3
source: openclaw-trigger-guardrails
created: 2026-06-04
last_reviewed: 2026-06-04
confidence: high
---

# Quota-Aware Routing

Use this when an AI handoff fails or a task needs a better-suited agent.

## Routing Table

| Signal | Route | Reason |
|---|---|---|
| token/context limit | Claude manual handoff | Needs compaction and judgment before continuing |
| quota/rate/usage limit | Claude manual handoff | Avoid spending more tokens in an automatic loop |
| timeout/no output | Claude manual handoff | Needs inspection of partial outputs |
| social link / Facebook Reel / browser-only URL | Gemini | Best available link access |
| source facts vs opinion synthesis | Claude or Codex | Needs repo-context synthesis before durable wiki write |
| syntax bug / refactor / small code fix | Codex | Fast code pass |
| production/security/database/bridge/core rules | War Room + B3 approval | High blast radius |

## Recovery Rule

Automatic retries are not allowed after limit/quota/timeouts.

Use:

```bash
npm run trigger:recover -- TASK_ID
```

This creates a manual recovery trigger with `maxHops: 0`.

## Watchdog Files

Each task should have:

- `wiki/ai-war-room/sessions/[taskId]/session-status.json`
- `wiki/ai-war-room/sessions/[taskId]/handoff.md` when recovery is required

Status values:

- `in_progress`
- `done`
- `handoff_required`
- `failed`

