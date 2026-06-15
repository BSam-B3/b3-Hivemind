# 🔌 AI-to-AI BRIDGE PROTOCOL v1.0

**Director:** บีสาม | **Channels:** file-based on local disk

---

## 📡 BRIDGE FILE MAP

| File | Owner | Reader | Purpose |
|---|---|---|---|
| `bridge/inbox-claude.md` | Gemini/Openclaw write | Claude read+clear | Commands TO Claude |
| `bridge/inbox-gemini.md` | Claude/Openclaw write | Gemini read+clear | Commands TO Gemini |
| `bridge/inbox-openclaw.md` | Claude/Gemini write | Openclaw read+clear | File/shell ops |
| `bridge/status.json` | All write | All read | Current task state |
| `wiki/project-status-auto.md` | Claude/Openclaw write | All read | Session handoff |
| `wiki/knowledge-base.md` | All append | All read | Tagged solutions |

---

## 🏷️ COMPACT TAGS (Mandatory)

```
[CMD]   directive to execute        → "[CMD] deploy vercel prod"
[ASK]   question, need answer       → "[ASK] which agent owns ticket route?"
[STATUS] progress update            → "[STATUS] Task#3 DONE"
[BUG]   problem found               → "[BUG] cron 500 in /api/workers/X"
[FIX]   solution applied            → "[FIX] cit-imap typing + spread order"
[LEARN] knowledge to persist        → "[LEARN] Vercel Hobby = 2 cron/day max"
[ALERT] urgent, B3 attention        → "[ALERT] Token 95%, save+restart"
[DIFF]  code change (git format)    → "[DIFF] @@ -10,3 +10,4 @@ ..."
[DONE]  task complete + cleanup     → "[DONE] #task-id, files cleaned"
```

## 🚦 MESSAGE FORMAT

```
[TAG] @receiver from:@sender ts:YYYY-MM-DD-HH:MM
<one-line body, ≤120 chars>
ref: file/path:line (optional)
---
```

## 🧹 CLEANUP RULES

1. After [DONE], sender deletes own message from inbox
2. ask-X.md / temp files → delete after consume
3. knowledge-base.md uses table format only (1 row = 1 solution)
4. project-status-auto.md → overwrite, never append

## ⚠️ NEVER

- ❌ Send full file content between AIs (use [DIFF] or ref:path)
- ❌ Explain in Thai/English prose to other AIs (compact only)
- ❌ Duplicate knowledge — grep before write
- ❌ Auto-run [CMD] with `rm`/`del`/`drop` — needs B3 Y/N

---

*See §5,§6 of `Gemini Project2.md` for full rules*
