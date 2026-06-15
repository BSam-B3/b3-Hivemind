---
type: review
project: b3-second-brain
status: active
owner: Codex
source: local-code-review
created: 2026-06-04
last_reviewed: 2026-06-04
confidence: high
---

# OpenClaw Trigger Review

Reviewed files:

- `scripts/openclaw-trigger-watcher.js`
- `scripts/trigger-ai.js`
- `package.json`
- `wiki/to-b3/STATUS-SUMMARY.md`

## Summary

The trigger system is useful and close to production-ready for controlled AI handoff.
It should stay behind explicit B3/War Room use until the guardrails below are fixed.

## Findings

### High: Codex execution likely uses Gemini CLI arguments

`runCodex()` calls `runWithStdin()`, but `runWithStdin()` always builds args as:

```text
-m gemini-2.5-flash -p <prompt>
```

That is probably valid for Gemini CLI, not Codex CLI. Result: Codex trigger may fail, hang, or behave unexpectedly.

Recommended fix:

- Split `runGemini()` and `runCodex()` command builders.
- Add a dry-run mode that prints executable + args without launching.
- Add one local test trigger for Gemini and one for Codex.

### Medium: Auto-retrigger can create long loops

The watcher parses `[TRIGGER:target]` from model output and immediately creates another trigger.
There is no max depth, allowlist per task, or approval gate.

Recommended fix:

- Add `hopCount` and `maxHops` to trigger payload.
- Default `maxHops` to 1 or 2.
- Require B3 approval for `priority: urgent` retriggers or production tasks.

### Medium: Trigger payload lacks schema validation

The processor trusts `from`, `to`, `taskId`, `instruction`, and `priority` after JSON parse.
Bad values could create odd filenames or unexpected session paths.

Recommended fix:

- Reuse the `VALID_AIS` list in watcher.
- Validate `taskId` with a safe filename regex.
- Reject empty/oversized instructions.

### Medium: INBOX overwrite risk

`writeInbox()` writes `INBOX-GEMINI.md`, `INBOX-CODEX.md`, or `INBOX-CLAUDE.md` directly.
Concurrent triggers to the same AI can overwrite the previous inbox.

Recommended fix:

- Use append mode, or include task id in inbox filename.
- Keep a compact index file for latest inbox state.

### Low: Prompt temp file cleanup is best-effort only

Prompt files are deleted after CLI execution, but if the process is killed mid-run, `_prompt-*.txt` can remain.

Recommended fix:

- Have `brain:doctor` or `war:doctor` flag stale `_prompt-*.txt` files.
- Archive prompt files for failed runs only when debugging is enabled.

## Recommended War Room Gate

Before using this for multi-agent Phase 2:

```bash
npm run war:standup
npm run war:doctor
npm run brain:doctor:report
```

Then create one task:

```bash
node scripts/trigger-ai.js --from codex --to gemini --task LINK-EXTRACT-TEST --instruction "Open the Facebook Reel URL from CMD 11 and return facts only." --priority normal
```

Use Gemini first. Add Codex auto-run only after the Codex CLI args are corrected.

