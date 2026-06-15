---
type: context-index
project: b3-second-brain
status: active
owner: B3
source: claude-code-prompt-caching-lessons
last_reviewed: 2026-06-04
---

# B3 Context Layer

This folder is the cache-friendly context layer for B3 Second Brain.

Use it to keep stable operating rules separate from volatile session state.
The goal is healthier multi-agent work: less context drift, less duplicated memory,
and fewer accidental cache breaks.

## Files

- `static-context-rules.md` - rules for stable vs dynamic context.
- `frontmatter-template.md` - metadata template for new wiki notes.
- `phase-1-health-report.md` - summary of the first additive rollout.

## Operating Principle

Keep stable context stable. Put changing facts in status files or messages.

Recommended order for agent context:

1. Core identity and safety rules.
2. Stable tool and agent definitions.
3. Stable project index and runbooks.
4. Current session state.
5. Latest user request.

