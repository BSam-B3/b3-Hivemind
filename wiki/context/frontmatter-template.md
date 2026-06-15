---
type: template
project: b3-second-brain
status: active
owner: B3
source: b3-context-layer
last_reviewed: 2026-06-04
---

# Frontmatter Template

Use this for new high-value wiki notes.

```yaml
---
type: decision | runbook | project-status | reference | incident | context-index | operating-rule
project: b3-second-brain | cit-service | b3-team-avenger | jong-jaroen | bridge
status: draft | active | archived | blocked
owner: B3 | Claude | Gemini | Codex | OpenClaw | team
source: manual | ticket | backup | ai-analysis | external-research
created: YYYY-MM-DD
last_reviewed: YYYY-MM-DD
review_after: YYYY-MM-DD
confidence: low | medium | high
---
```

## Field Notes

- `type` tells agents how to use the note.
- `project` keeps retrieval scoped.
- `status` prevents stale notes from looking current.
- `owner` clarifies who should update it.
- `source` separates observed facts from AI analysis.
- `review_after` turns old knowledge into a visible maintenance item.
- `confidence` helps agents avoid treating rough notes as policy.

