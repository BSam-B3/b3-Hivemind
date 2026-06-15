# 🧠 B3 KNOWLEDGE BASE (Machine-Readable)

> ⚠️ RULES — see `wiki/BRIDGE-PROTOCOL.md` + `Gemini Project2.md §5,§6`
> 1. **GREP BEFORE WRITE** — no duplicates
> 2. **OVERWRITE WHEN BETTER** — upgrade old rows
> 3. **TABLE FORMAT ONLY** — one row = one solution, ≤120 chars body
> 4. **TAG FORMAT** — `[Category]` → `[Issue]` → `[Solution]`

---

## Table

| ID | Category | Issue | Solution | Ref | Date |
|---|---|---|---|---|---|
| K001 | Vercel | Hobby plan only 2 cron/day | Remove hourly/5min crons from vercel.json | vercel.json | 2026-05-28 |
| K002 | CIT-IMAP | imapflow MessageAddressObject typed wrong | Use `.address` not `.mailbox`/`.host` | lib/email/cit-imap.ts:60 | 2026-05-28 |
| K003 | NextJS | regex /s flag = ES2018+ error | Use `[\s\S]` instead of `.` + /s | process-task/route.ts:224 | 2026-05-28 |
| K004 | Supabase | `.delete().select('*',{count})` fails type | Use `.delete().select('id')` then `.length` | weekly-condense/route.ts:100 | 2026-05-28 |
| K005 | OAuth-Google | redirect_uri_mismatch 400 | Add URI in console.cloud.google.com → Credentials before connect | - | 2026-05-28 |
| K006 | Calendar-API | 403 on createEvent | Enable "Google Calendar API" in cloud console Library | - | 2026-05-28 |
| K007 | Vercel-CLI | localhost in NEXT_PUBLIC_APP_URL | `vercel env rm` + `vercel env add` with prod URL | - | 2026-05-28 |
| K008 | Context | 200K+ tokens → 1M billing trigger | /compact early OR PreCompact hook auto-save to wiki/project-status-auto.md | ~/.claude/settings.json | 2026-05-28 |

---

## Search Pattern (for AIs)

```
grep -i "<Category>" wiki/knowledge-base.md
grep -i "<keyword>" wiki/knowledge-base.md
```

*Append new row: scan first → if not exist → add to bottom with next K-ID*
