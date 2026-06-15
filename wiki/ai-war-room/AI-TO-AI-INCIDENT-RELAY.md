# AI-to-AI Incident Relay Protocol

Created: 2026-06-05
Owner: B3 AI War Room

## Purpose

When Claude, Codex, Gemini, or any AI persona hits a blocker, the War Room must open an AI-to-AI incident room instead of leaving the problem as a silent failure.

The goal is simple:

- identify what failed,
- trigger the relevant model through OpenClaw,
- force replies to continue the relay or produce a final decision,
- record the fix and lesson.

## When To Open An Incident Relay

Open an incident relay when any of these happen:

- A model cannot access a file, URL, tool, workspace, or repo it needs.
- A model returns no output, truncated output, invalid format, or refuses due to missing context.
- A trigger reaches an inbox-only agent such as Claude and needs manual pickup.
- Two models disagree on P0/P1 severity.
- A model finds a P0 issue that blocks deploy.
- An automation process times out, hits quota/rate limit, or reports context/token limit.
- The team is unsure whether to deploy, revert, or escalate to B3.

Do not open an incident relay for small, single-agent issues that can be fixed and verified directly in the same turn. Use the relay for deadlocks, cross-model disagreement, blocked tools/workspaces, or release-risk decisions.

## Severity

Set one severity on every incident:

| Severity | Meaning | Required response |
|---|---|---|
| P0 deploy blocker | Blocks deploy, legal/trust risk, data corruption, broken core flow, or security/privacy issue | Trigger at least two models and require `FINAL:` or B3 decision before deploy |
| P1 workflow stuck | Work cannot continue because a model/tool/workspace is blocked, output is invalid, or models disagree | Trigger the blocked model plus one reviewer |
| P2 quality issue | Non-blocking improvement, polish, formatting, or documentation ambiguity | Relay optional; prefer normal review unless disagreement persists |

If unsure, start as P1. Upgrade to P0 only when there is release/user/security/legal risk.

## Required Files

Create a session folder:

`wiki/ai-war-room/sessions/YYYY-MM-DD-<task>-incident-relay/`

Add these files:

- `brief.md`: what happened and why it matters.
- `incident-relay.md`: use `sessions/_TEMPLATE/incident-relay.md`.
- `evidence.md`: mandatory logs, outputs, file paths, relevant diffs, screenshots, or source excerpts.
- `synthesis.md`: final shared conclusion.
- `lessons.md` or a lesson entry in `wiki/ai-war-room/lessons.md`.

An incident cannot be closed without `evidence.md`.

## Required Reply Protocol

Every model reply must end with exactly one of:

```text
[TRIGGER:codex] <specific next action>
[TRIGGER:claude] <specific next action>
[TRIGGER:gemini] <specific next action>
FINAL: <decision and next action>
```

No vague endings. No silent handoff.

## Timeout And Escalation

Escalate to B3 when any of these happen:

- No `FINAL:` after 3 OpenClaw hops.
- No useful response after 30 minutes for P0 or P1.
- The same blocker repeats twice after a retry.
- The required model is inbox-only and no manual pickup occurs.
- The team cannot agree whether the risk is acceptable.

Escalation format:

```markdown
# B3 Escalation

Incident:
Severity:
Blocked on:
Evidence:
Options:
Recommended decision:
```

## OpenClaw Trigger Command Pattern

Use `max-hops` greater than 1 when the discussion may need back-and-forth:

```powershell
node scripts/trigger-ai.js --from codex --to claude --task TASK_ID --instruction "Read wiki/ai-war-room/sessions/TASK_ID/incident-relay.md and evidence.md. Reply only with FINAL or [TRIGGER:*]." --priority urgent --max-hops 3
```

For Gemini, keep the instruction short and put context in files inside `B3-Second-Brain`:

```powershell
node scripts/trigger-ai.js --from codex --to gemini --task TASK_ID --instruction "Do not read outside B3-Second-Brain. Read wiki/ai-war-room/sessions/TASK_ID/incident-relay.md and evidence.md. Reply with FINAL or [TRIGGER:*]." --priority urgent --max-hops 3
```

## Evidence Rules

If a model cannot access an external repo or path, Codex or the current owner must create an evidence file inside the War Room:

- `patch-summary.md`
- `source-excerpt.md`
- `error-log.md`
- `scorecard.md`

Do not ask restricted models to read files they cannot access. Bring the evidence into the War Room.

## Resolution Rules

An incident is resolved only when:

- at least one model states `FINAL: ...`, or
- B3 gives a decision, or
- the owning model records why the incident is blocked and what external input is needed.

After resolution:

- update `synthesis.md`,
- update the parent task status,
- write a lesson to `wiki/ai-war-room/lessons.md`,
- leave the next action explicit.

## Close Gate

Before closing, `synthesis.md` must include:

- severity,
- root cause,
- evidence used,
- decision,
- fix or workaround,
- residual risk,
- prevention rule,
- next owner/action.

If any item is missing, status remains `open` or `blocked`, not `resolved`.

## Minimum Lesson Format

```markdown
# Lesson: <short title>

Date:
Incident:
Problem:
Root cause:
Fix:
Prevention rule:
```
