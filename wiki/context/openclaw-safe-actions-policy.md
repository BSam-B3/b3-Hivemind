---
type: operating-rule
project: b3-second-brain
status: active
owner: B3
source: openclaw-safety-policy
created: 2026-06-04
last_reviewed: 2026-06-04
confidence: high
---

# OpenClaw Safe Actions Policy

OpenClaw can touch the local machine, so actions are grouped by risk.

## Read

Allowed without approval:

- Read files.
- List directories.
- Run doctor/status commands.
- Inspect running processes.
- Read logs.
- Generate reports.

## Write

Allowed when tied to a task id or report:

- Write `session-status.json`.
- Write `compact-summary.md`.
- Write `handoff.md`.
- Write health reports under `wiki/context/`.
- Create trigger files under `wiki/ai-war-room/triggers/`.
- Append lessons and scorecards.

## Danger

Requires B3 approval:

- Delete or move non-temp files.
- Kill/restart long-running processes.
- Deploy.
- Run SQL or change Supabase.
- Change credentials, auth, RLS, payment, legal, or production data.
- Modify core instructions or bridge protocol.

## Default Rule

When unsure, create an approval request instead of taking the action.

