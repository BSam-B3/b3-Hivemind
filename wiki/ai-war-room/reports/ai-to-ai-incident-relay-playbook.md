# AI-to-AI Incident Relay Playbook

Created: 2026-06-05

## Use Case

Use this whenever Claude, Codex, Gemini, or a persona gets stuck and the team needs model-to-model discussion through OpenClaw.

## Step 1: Create Incident Room

```powershell
$task = "YYYY-MM-DD-short-incident-relay"
New-Item -ItemType Directory -Force -Path "wiki/ai-war-room/sessions/$task"
```

Create:

- `brief.md`
- `incident-relay.md`
- `evidence.md` (mandatory)
- `synthesis.md`

Use template:

`wiki/ai-war-room/sessions/_TEMPLATE/incident-relay.md`

## Step 2: Trigger The Blocked Model

Set severity first:

- `P0 deploy blocker`: deploy/legal/security/core-flow risk.
- `P1 workflow stuck`: model/tool/workspace/format blocker.
- `P2 quality issue`: non-blocking polish or ambiguity.

Use the relay only for real blockers or cross-model decisions. For simple single-agent fixes, do the fix directly.

Claude manual relay:

```powershell
node scripts/trigger-ai.js --from codex --to claude --task TASK_ID --instruction "Read wiki/ai-war-room/sessions/TASK_ID/incident-relay.md and evidence.md. Reply only with FINAL or [TRIGGER:codex]/[TRIGGER:gemini]." --priority urgent --max-hops 3
```

Gemini automatic relay:

```powershell
node scripts/trigger-ai.js --from codex --to gemini --task TASK_ID --instruction "Do not read outside B3-Second-Brain. Read wiki/ai-war-room/sessions/TASK_ID/incident-relay.md and evidence.md. Reply only with FINAL or [TRIGGER:codex]/[TRIGGER:claude]." --priority urgent --max-hops 3
```

Codex relay:

```powershell
node scripts/trigger-ai.js --from claude --to codex --task TASK_ID --instruction "Read wiki/ai-war-room/sessions/TASK_ID/incident-relay.md and evidence.md. Continue the incident. Reply only with FINAL or [TRIGGER:claude]/[TRIGGER:gemini]." --priority urgent --max-hops 3
```

## Step 3: Evidence For Restricted Models

If a model cannot read a repo or URL, create one of these inside the incident room:

- `patch-summary.md`
- `source-excerpt.md`
- `error-log.md`
- `scorecard.md`
- `screenshot-notes.md`

Then trigger using only files inside `B3-Second-Brain`.

## Step 4: Close The Incident

Close only after one of these happens:

- a model replies `FINAL: ...`
- B3 decides,
- the owning model records a real blocker and exact next human action.

Then update:

- `synthesis.md`
- parent task `session-status.json`
- `wiki/ai-war-room/lessons.md`

Close gate checklist:

- severity recorded
- root cause recorded
- evidence recorded
- decision recorded
- fix/workaround recorded
- residual risk recorded
- prevention rule recorded
- next owner/action recorded

Escalate to B3 if no `FINAL:` after 3 hops or no useful P0/P1 response after 30 minutes.
