---
type: project-status
project: b3-second-brain
status: active
owner: Codex
source: implementation-report
created: 2026-06-04
last_reviewed: 2026-06-04
confidence: high
---

# OpenClaw Trigger Guardrails

## Implemented

- Replaced `scripts/openclaw-trigger-watcher.js` with v3 guardrail version.
- Split Gemini and Codex command builders.
- Gemini uses Gemini CLI prompt mode.
- Codex uses `codex exec <prompt>`.
- Added trigger schema validation.
- Added safe `taskId` validation.
- Added instruction size limit.
- Added `hopCount` and `maxHops` loop control.
- Added task-specific inbox files to reduce overwrite risk.
- Kept latest inbox pointer file for convenience.
- Updated `scripts/trigger-ai.js` to emit validated payloads with `hopCount/maxHops`.
- Updated `brain:doctor` to flag stale trigger prompt files.
- Added `runId` for each trigger run.
- Added `session-status.json` watchdog output per task.
- Added automatic `handoff.md` on timeout, no output, nonzero exit, token/context limit, or quota/rate limit.
- Added `scripts/trigger-recover.js` and `npm run trigger:recover`.
- Added quota-aware routing guide at `wiki/context/quota-aware-routing.md`.
- Allowed `system` as a trigger sender for manual recovery while keeping targets limited to Claude/Gemini/Codex.
- Hardened recovery status parsing for Windows/PowerShell UTF-8 BOM files.

## Verified

Commands:

```bash
node --check scripts/openclaw-trigger-watcher.js
node --check scripts/trigger-ai.js
node --check scripts/brain-doctor.js
node scripts/trigger-ai.js --from claude --to gemini --task BAD/TASK --instruction test
node scripts/trigger-ai.js --from codex --to gemini --task TEST-VALID-TRIGGER --instruction "Health check payload only" --priority low --max-hops 1
node scripts/trigger-recover.js TEST-RECOVER
npm run brain:doctor:report
```

Results:

- Syntax checks passed.
- Invalid task id was rejected.
- Valid trigger payload included `hopCount: 0` and `maxHops: 1`.
- Recovery trigger payload used `from: system`, `to: claude`, and `maxHops: 0`.
- Test trigger file was removed after inspection.
- Brain health report was written to `wiki/context/brain-health-latest.md`.

## Failure Handoff Behavior

If Gemini/Codex returns a nonzero exit, times out, has no output, or reports token/context/quota/rate limits, the watcher now writes:

```text
wiki/ai-war-room/sessions/[taskId]/handoff.md
wiki/ai-war-room/sessions/[taskId]/session-status.json
```

The recovery route is manual by default:

```bash
npm run trigger:recover -- TASK_ID
```

Recovery triggers use `maxHops: 0` so they cannot create a new loop.

## Remaining Gate

Do not run full unattended multi-agent loops until one controlled Gemini trigger has been tested with B3 present.

## Runtime Note

At review time, a watcher process was already running:

```text
PID 204: node scripts/openclaw-trigger-watcher.js
```

Because Node loads the script at process start, the v3 guardrails will apply after the watcher is restarted.
Do not stop the active watcher blindly if Claude/OpenClaw is using it.

Recommended restart window:

```bash
npm run openclaw:start
```

Use this after confirming no active trigger is mid-flight.

Recommended first live trigger:

```bash
node scripts/trigger-ai.js --from codex --to gemini --task LINK-EXTRACT-001 --instruction "Open https://www.facebook.com/reel/4185269761689739 and return CMD 12 format. Facts only, no guessing." --priority normal --max-hops 0
```
