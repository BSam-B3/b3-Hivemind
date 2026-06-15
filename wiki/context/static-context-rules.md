---
type: operating-rule
project: b3-second-brain
status: active
owner: B3
source: claude-code-prompt-caching-lessons
last_reviewed: 2026-06-04
---

# Static And Dynamic Context Rules

These rules adapt Claude Code prompt-caching lessons to the B3 multi-agent workspace.

## Rule 1: Static First, Dynamic Last

Arrange context in this order:

1. Stable core rules.
2. Stable tool and agent definitions.
3. Stable project memory and indexes.
4. Dynamic session state.
5. Latest request and tool results.

This improves cache reuse and reduces agent confusion.

## Rule 2: Do Not Put Session State In Core Files

Avoid adding volatile facts to `CLAUDE.md`, `GEMINI.md`, `CODEX.md`, `P3.md`, or master bridge rules.

Examples of volatile facts:

- Today or yesterday.
- Current task.
- Temporary blockers.
- Latest deployment state.
- Pending approval list.
- One-off notes to a specific agent.

Use `STATUS.md`, `wiki/to-b3/STATUS-SUMMARY.md`, `wiki/project-status-auto.md`, or bridge inbox messages instead.

## Rule 3: Do Not Change Agent Tool Lists Mid-Workflow

Keep the available tool list stable during a session. Model state changes as messages or modes, not by changing tool definitions.

Examples:

- Use `Plan`, `Execute`, `Review` as states.
- Keep read/write tools available but constrain behavior with instructions.
- Use deferred discovery for optional capabilities where possible.

## Rule 4: Do Not Switch Models Mid-Session Without Handoff

If a task needs another model or agent, create a short handoff first.

Handoff should include:

- Objective.
- Current state.
- Files touched or relevant paths.
- Decisions already made.
- Risks and required approvals.

## Rule 5: Compact With The Same Parent Context

When summarizing a long session, keep the same core context and add the compaction request at the end.

Good output targets:

- `STATUS.md`
- `wiki/project-status-auto.md`
- `wiki/to-b3/STATUS-SUMMARY.md`
- `wiki/ai-war-room/sessions/...`

## Rule 6: Measure Context Health

Run:

```bash
npm run brain:doctor
```

Use the report to spot:

- Oversized core instruction files.
- Dynamic content inside static files.
- Stale status files.
- Wiki notes missing frontmatter.

The command is read-only.

