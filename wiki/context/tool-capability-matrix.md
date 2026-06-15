---
type: reference
project: b3-second-brain
status: active
owner: B3
source: team-health-protocol
created: 2026-06-04
last_reviewed: 2026-06-04
confidence: high
---

# Tool Capability Matrix

| Member | Best At | Avoid |
|---|---|---|
| OpenClaw | local runtime, files, processes, trigger delivery, status reports | autonomous dangerous actions without approval |
| Gemini | web/social link access, research, broad architecture, long-context analysis | writing durable repo truth without synthesis |
| Codex | code guardrails, scripts, review, tests, repo-safe changes | claiming external content was accessed when it was not |
| Claude | orchestration, implementation planning, docs, synthesis, handoff | running risky system actions without a gate |
| B3 | priorities, approvals, business judgment, final decisions | manual repetitive checks that doctors can automate |

## Routing Shortcuts

- Browser/social link -> Gemini.
- Runtime/process health -> OpenClaw.
- Script/code correctness -> Codex.
- Cross-agent synthesis -> Claude or Codex.
- Production/security/database -> War Room + B3 approval.

