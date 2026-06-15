# B3 AI War Room

Created: 2026-06-03

พื้นที่กลางสำหรับ Claude CLI, Codex CLI, Gemini CLI ทำงานร่วมกันแบบประหยัด โดยใช้ไฟล์ใน repo เป็น shared memory ไม่ต้องมี Orchestrator API เพิ่ม

## Startup Protocol

ทุก AI ที่เริ่ม session ใหม่และจะทำงานร่วมกับทีม ต้องอ่านไฟล์เหล่านี้ก่อน:

1. `wiki/ai-war-room/README.md`
2. `wiki/ai-war-room/board.json`
3. `wiki/ai-war-room/locks.json`
4. session ที่เกี่ยวข้องใน `wiki/ai-war-room/sessions/`

ถ้ามี active task ให้ดู `brief.md`, `task-map.md`, `handoff.md`, และ `review.md` ก่อนทำต่อ

## Core Rules

- B3 เป็น human director
- Janie เป็น prompt/persona/role template เท่านั้น ไม่ใช่ process ที่ตื่นอยู่เอง
- Research แยกได้ แต่ truth ต้องรวม: ใช้ `KNOWLEDGE-SYNTHESIS-PROTOCOL.md`
- ไม่ fix role ตายตัว: Claude, Codex, Gemini ทุกตัวเสนอได้ว่าจะช่วยอะไร
- ทุก task ต้องมี owner เดียว ณ เวลาหนึ่ง แต่ owner เปลี่ยนได้ผ่าน handoff
- helper ช่วย research, review, checklist, patch proposal, debug, implementation ได้ ถ้าไม่ชน lock
- ก่อนแก้ไฟล์ ต้องจอง lock ใน `locks.json`
- ห้าม AI สองตัวแก้ไฟล์เดียวกันพร้อมกัน
- ห้ามใส่ secrets ใน war room
- ใช้ `ref:path:line` แทนการ paste ไฟล์ยาว
- ห้ามลบไฟล์/ข้อมูล/deploy production โดยไม่มี B3 approve
- งานจบต้องเขียน `final.md`

## Dynamic Collaboration

การแบ่งงานใช้ negotiation ไม่ใช่ fixed role:

1. ทุก AI อ่าน brief เดียวกัน
2. แต่ละ AI เขียน `[CLAIM]` หรือ `[PLAN]` เสนอว่าพร้อมช่วยอะไร
3. เลือก owner จาก context, quota, confidence, lock availability, และความพร้อมจริง
4. ถ้า owner limit/error/dับ ให้ AI ตัวอื่นอ่าน `handoff.md` แล้ว claim รับต่อ
5. ถ้าตัดสินใจไม่ได้หรือกระทบ scope/cost/data ให้ถาม B3

## Files

| File | Purpose |
|---|---|
| `board.json` | สถานะงานทั้งหมด |
| `agents.json` | capability profile ของแต่ละ AI แบบไม่ fix role |
| `locks.json` | ไฟล์ที่ถูกจองแก้ |
| `decisions.md` | decision log |
| `activity.md` | log สั้น ๆ |
| `sessions/` | ห้องทำงานราย task |
| `reports/` | ปัญหาและข้อเสนอปรับปรุงจาก AI แต่ละตัว |
| `KNOWLEDGE-SYNTHESIS-PROTOCOL.md` | กฏรวมความรู้จาก AI หลายตัวให้เป็น shared truth |

## Message Tags

```text
[CLAIM] ขอรับงาน/ไฟล์
[PLAN] แผนสั้น ๆ
[NEED] ต้องการความช่วยเหลือ
[HANDOFF] ส่งงานต่อ
[REVIEW] ผลตรวจ
[DECISION] ข้อตัดสินใจ
[RELEASE] ปล่อย lock
[DONE] งานเสร็จ
[ISSUE] ปัญหาที่ควรปรับปรุง
[IMPROVE] ข้อเสนอปรับระบบ
[CONFLICT] ข้อมูล AI ขัดกัน ต้อง resolve ก่อนบันทึกเป็นความรู้ถาวร
```

## Session Flow

1. สร้าง folder ใน `sessions/YYYY-MM-DD-task-name/`
2. เขียน `brief.md`
3. ให้ AI แต่ละตัวเสนอ `[CLAIM]` หรือ `[PLAN]` ใน `chat.md`
4. เลือก owner และบันทึกเหตุผลใน `task-map.md`
5. owner/helper จองไฟล์ใน `locks.json` ก่อนแก้
6. AI คุยกันแบบ compact ใน `chat.md`
7. helper เขียน review ใน `review.md`
8. ถ้าเป็นงาน research/knowledge ให้แต่ละ AI เขียน draft ใน `research/` แล้วรวมเป็น `synthesis.md`
9. ถ้าส่งต่อ ให้เขียน `handoff.md` และ release lock ที่ไม่ใช้แล้ว
10. owner สรุปใน `final.md`

## Lock Hygiene

ใช้ `scripts/war-room.js` เป็นทางเดียวในการจัดการ lock/status:

```text
node scripts/war-room.js claim TASK_ID FILE --agent codex
node scripts/war-room.js preflight TASK_ID FILE --agent codex
node scripts/war-room.js release TASK_ID FILE --agent codex
node scripts/war-room.js handoff TASK_ID --agent FROM --to TO [--note "..."]
node scripts/war-room.js sync TASK_ID --agent codex
node scripts/war-room.js validate TASK_ID --agent codex
node scripts/war-room.js repair TASK_ID --agent codex
node scripts/war-room.js summary TASK_ID --agent codex --write
node scripts/war-room.js done TASK_ID "summary" --agent codex
node scripts/war-room.js gc-locks --agent codex
node scripts/war-room.js status
```

- ก่อนแก้ไฟล์ ให้ `claim` แล้วรัน `preflight`; ถ้าอยากให้จองในขั้นเดียวใช้ `preflight TASK_ID FILE --agent AGENT --claim`
- ถ้าไฟล์ถูกระบุ owner ใน `task-map.md` แล้ว agent อื่นจะ claim ไม่ได้ เว้นแต่เป็น task owner/coordinator หรือมี handoff จริงและใช้ `--handoff-from OWNER`
- **ถ้าจะวางงาน/ส่งต่อ ห้าม `release` เฉยๆ** — ใช้ `handoff TASK_ID --agent FROM --to TO --note "สถานะที่ค้าง"` แทน: เขียน `handoff.md` + โอน owner ใน board + ปล่อย lock ของผู้ส่ง ในคำสั่งเดียว (กันเคส "หยุดเงียบทิ้งงานค้าง")
- **`done` มี verification gate**: ถ้า session files ไม่ครบ (เช่นไม่มี `final.md`) จะ mark done ไม่ได้ ต้องแก้ก่อน หรือใช้ `--force` ถ้าจงใจข้าม
- หลังแก้ `task-map.md` หรือ Current Phase ให้รัน `sync TASK_ID --agent AGENT` เพื่อให้ `board.json` ตรงกัน
- `sync` อ่าน Current Phase ได้ทั้งแบบ `**ตัวหนา**`, plain text, หรือ `Current Phase: ...`
- ใช้ `validate TASK_ID --agent AGENT` เช็ก session files, phase, และ lock owner hygiene
- ใช้ `repair TASK_ID --agent AGENT` สร้าง session files ที่ขาดจาก template โดยไม่ overwrite ไฟล์เดิม
- ใช้ `summary TASK_ID --agent AGENT --write` เขียน Agent/File Summary ลง `final.md` โดยไม่ทับเนื้อหาเดิม
- หลังจบงานหรือเห็น lock จาก task ที่ done แล้ว ให้รัน `gc-locks --agent AGENT`
- `status` จะแสดง `warnings` ถ้ามี stale lock จากงานที่ done แล้ว
- คำสั่งที่เขียนไฟล์ war room มี file-level mutex ป้องกันหลาย AI เขียน `locks.json`/`board.json` ทับกัน
- ห้ามแก้ `locks.json` ด้วยมือ เว้นแต่ script พังและ B3 อนุมัติ

## Phase 2 Hardening Commands

Use these commands for the current safer workflow:

```text
node scripts/war-room.js touch TASK_ID FILE --agent AGENT
node scripts/war-room.js state TASK_ID ITEM_ID STATUS --agent AGENT
node scripts/war-room.js scan-secrets TASK_ID --agent AGENT
node scripts/war-room.js doctor --agent AGENT --secrets
node scripts/war-room.js finalize TASK_ID "summary" --agent AGENT
node scripts/war-room.js rebuild-board --agent AGENT
node scripts/war-room.js workspaces
node scripts/war-room.js gc-locks --agent AGENT --expired
```

- Lock lease: `claim` now gives a default 45 minute lease. Use `touch` during long edits.
- Work item states: `pending`, `claimed`, `in_progress`, `review`, `done`, `blocked`, `handoff`.
- `doctor` checks active sessions, phase drift, lock hygiene, workspace roots, and optional secret patterns.
- `validate` can inspect active, pending, or done tasks; `done` still requires the task to be active before closing it.
- `finalize` runs repair, validate, secret scan, summary write, sync, and done as one final gate.
- `rebuild-board` prints a draft board from `sessions/` + `activity.md`; it does not overwrite `board.json` unless `--write` is provided.
- `workspaces` reads `wiki/ai-war-room/workspaces.json`; this is a local path registry, not Google Drive sync.

## Phase 3 Operations Commands

Use these commands for day-to-day coordination:

```text
node scripts/war-room.js standup --agent AGENT
node scripts/war-room.js review TASK_ID "note" --agent REVIEWER --result pass
node scripts/war-room.js dashboard --agent AGENT --write
node scripts/war-room.js protected-files --write
```

- `standup` prints active tasks, owners, phases, locks, warnings, review state, and latest activity.
- `review` writes a structured entry to `review.md`. `finalize` now requires `Result: pass` or `Result: pass-with-notes` unless `--force` is used.
- `protected-files.json` lists sensitive paths such as env files, credentials, API key docs, migrations, schemas, and Supabase config. `claim` and `preflight` block these files unless `--protected-ok` is included with a clear `--reason`.
- `dashboard --write` creates `wiki/ai-war-room/dashboard.html`, a static snapshot that can be opened directly in a browser.
- Board entries can set `shared_session_ok: true` when a historical task intentionally points at a consolidated session folder.

## Phase 4 Team Discipline

Every active task should keep these fields current in `task-map.md`:

- `Owner`: the person doing the main implementation
- `Coordinator`: the person keeping scope, handoff, and board state aligned
- `Reviewer`: the person expected to run `review`
- `Final Approver`: usually `B3` unless delegated
- `Next Action`: the one concrete next move for the task

Daily routine:

```text
node scripts/war-room.js standup --agent AGENT
node scripts/war-room.js doctor --agent AGENT --secrets
node scripts/war-room.js ritual TASK_ID --agent AGENT
node scripts/war-room.js dashboard --agent AGENT --write
```

- `standup` and `doctor` warn when active tasks are missing role fields or next action.
- `ritual` posts the active-task summary into the chosen task `chat.md` so the team has a shared checkpoint.
- The dashboard now shows owner, coordinator, reviewer, final approver, next action, locks, review state, and discipline warnings.

## Phase 5 Team Intelligence

Use these commands to keep team memory, decisions, risks, and capabilities structured:

```text
node scripts/war-room.js decision TASK_ID "decision" --agent AGENT --why "reason"
node scripts/war-room.js lesson TASK_ID "lesson" --agent AGENT
node scripts/war-room.js risk list --agent AGENT
node scripts/war-room.js risk add "description" --agent AGENT --area security --severity high
node scripts/war-room.js risk close R-001 "resolved note" --agent AGENT
node scripts/war-room.js cost TASK_ID --agent AGENT --tokens 1234 --minutes 30
node scripts/war-room.js personas --write
node scripts/war-room.js dependencies --write
```

- If `task-map.md` contains `## Decision Required` with `yes`, `true`, or `required`, `finalize` requires a matching entry in `decisions.md`.
- `finalize` automatically writes a lesson entry to `lessons.md`.
- `personas.json` maps AI/persona strengths and default roles so assignment can be more intentional.
- `risks.json` tracks open/closed operational risks.
- `dependencies.json` maps cross-project relationships across Second Brain, Avenger, Jong-Jaroen, and CIT.
- Each task can log rough token/time cost in `cost.md`.

Shortcut aliases:

```text
npm run war:status
npm run war:standup
npm run war:doctor
npm run war:dash
npm run war:personas
npm run war:risks
npm run war:deps
```

## Phase 6 Continuity Protocol

Use this when any AI hits token limit, disappears, or cannot continue:

```text
node scripts/war-room.js continuity TASK_ID --agent AGENT
node scripts/war-room.js next-agent claude --role coordinator
node scripts/war-room.js takeover TASK_ID --from claude --agent codex --reason "Claude token limit"
node scripts/war-room.js ritual TASK_ID --agent codex
node scripts/war-room.js dashboard --agent codex --write
```

- Continuity is not tied to Claude, Gemini, or Codex. The fallback order lives in `wiki/ai-war-room/personas.json`.
- `takeover` releases locks held by the limited agent for that task, updates board coordinator continuity fields, appends `handoff.md`, and posts `[TAKEOVER]` to `chat.md`.
- If Codex is token-limited, the next agent should run the same command with `--from codex`; the registry will suggest Gemini/Claude/Qara depending on role.
- The active task should always have `Owner`, `Coordinator`, `Reviewer`, `Final Approver`, and `Next Action` in `task-map.md`.

## Phase 7 B3 Approval Escalation

For B3, the simple flow is:

```text
npm run war:approvals
node scripts/war-room.js approval approve A-0001 --agent B3
node scripts/war-room.js approval reject A-0001 --agent B3
node scripts/war-room.js approval pending A-0001 --agent B3
```

AI agents request approval like this:

```text
node scripts/war-room.js approval request "Takeover from Codex to Gemini because token limit" --agent gemini --type takeover --task TASK_ID
node scripts/war-room.js takeover TASK_ID --from codex --to gemini --agent gemini --approval A-0001
```

- Pending approval means B3 wants to wait, for example until a token-limited AI returns.
- `finalize --force` requires an approved `force-finalize` approval.
- Protected file edits can use an approved `protected-file` approval.
- The dashboard shows pending approvals.
- `watch` summarizes warnings and pending approvals:

```text
npm run war:watch
npm run war:test
```

## Phase 8 No-Command Approval Panel

For B3, the easiest approval path is a local browser page:

```text
npm run war:approval-panel
```

Then open:

```text
http://localhost:8787
```

The page has buttons for:

- Approve
- Reject
- Keep Pending

This writes back to `wiki/ai-war-room/approvals.json` through the local server. It does not require B3 to type approval commands.

Optional Avenger bridge:

```text
npm run war:approval-sync
```

This sends pending War Room approval requests to `https://b3-team-avenger.vercel.app/api/approvals` when that API is configured. The local panel remains the reliable path for writing approvals back to the local War Room.

## Phase 9 Vercel Approval Bridge

B3 can use the live Vercel app as the main approval surface:

```text
https://b3-team-avenger.vercel.app/approvals
```

War Room agents sync requests to Vercel:

```text
npm run war:approval-sync
```

War Room agents pull B3 decisions back:

```text
npm run war:approval-pull
```

- The Approval Center shows Pending, Approved, Rejected, and Audit Log tabs with Approve, Reject, and Keep Pending buttons.
- The Projects page keeps a compact pending panel and links to the Approval Center.
- The Room page shows a top-right Janie approval alert and links to the Approval Center.
- Vercel stores approvals in Supabase `agent_approvals`.
- War Room remains the execution source of truth, so agents should pull approvals before using an approval ID.
- The old local approval panel is now a fallback for offline/local-only work, not the primary path.

AI agents should make approval requests readable for B3:

```text
node scripts/war-room.js approval request "Short reason" --agent codex --type takeover --task TASK_ID --what "What will be done" --risk "What can go wrong" --if-not "What happens if B3 leaves it pending"
```

The bridge syncs the request as three lines:

```text
What: ...
Risk: ...
If not approved: ...
```

Duplicate pending approvals with the same type, task, and reason are reused instead of creating another request.

## Phase 12 Telegram Approval Callbacks

Telegram approval notifications can include mobile reply buttons:

```text
Approve | Reject
Keep Pending | Open Center
```

The live app receives button clicks at:

```text
https://b3-team-avenger.vercel.app/api/telegram-webhook?secret=TELEGRAM_WEBHOOK_SECRET
```

Required Vercel environment variables:

```text
TELEGRAM_WEBHOOK_SECRET=long-random-secret
```

Telegram bot token and chat ID can come from the existing B3 settings table (`b3_telegram_token`, `b3_telegram_chat_id`). After the secret is set, register the webhook with Telegram:

```text
https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https%3A%2F%2Fb3-team-avenger.vercel.app%2Fapi%2Ftelegram-webhook%3Fsecret%3D<TELEGRAM_WEBHOOK_SECRET>
```

Security rule: the webhook route rejects requests without the configured secret. If the secret is not set, Telegram callbacks stay disabled, while normal Approval Center buttons still work.

## Phase 13 Approval Automation

B3 can approve normal low/medium-risk requests directly from Telegram. High/critical-risk approvals are two-step:

1. B3 clicks Approve in Telegram.
2. The request stays pending with a Telegram pre-approval note.
3. B3 or a reviewer confirms in the live Approval Center.

Primary pages:

```text
https://b3-team-avenger.vercel.app/approvals
https://b3-team-avenger.vercel.app/ops
```

War Room approval sync can run as a local loop:

```text
npm run war:approval-loop
```

This runs `approval-sync` and `approval-pull` every 60 seconds so agents do not need to remember both commands manually. For one quick cycle:

```text
node scripts/war-room.js approval-loop --agent codex --once
```

## Phase 14 Self Monitoring

Useful no-memory commands for the team:

```text
npm run war:approval-loop-start
npm run war:approval-loop-stop
npm run war:conflict-radar
npm run war:team-digest
```

- `approval-loop-start` runs the approval sync/pull loop in the background.
- `conflict-radar` checks active tasks, locks, pending approvals, and planned file ownership overlap.
- `team-digest` sends B3 a Telegram summary with active tasks, locks, pending approvals, and the Ops link.
- `/ops` has a Check Health button backed by `/api/ops/health`, so B3 can check system health without terminal commands.

## Knowledge Synthesis

ทุกงานที่มีการ research หรือสร้างความรู้ใหม่ ต้องทำตาม:

`wiki/ai-war-room/KNOWLEDGE-SYNTHESIS-PROTOCOL.md`

ห้ามเอา research draft ของ AI ตัวใดตัวหนึ่งไปเป็นความรู้ถาวรทันที ต้องผ่าน `synthesis.md` ก่อน

## Continuous Improvement Reports

ทุก AI ควรรายงานปัญหาที่เจอ เพื่อพัฒนาระบบทีม:

- ใช้ `reports/YYYY-MM-DD-agent.md`
- รายงานแบบไม่โทษกัน เน้น signal ที่แก้ได้
- เขียนเมื่อเจอปัญหา lock, handoff ไม่ชัด, context หาย, instruction ขัดกัน, tool error, token/limit, หรือ workflow ช้า
- ทุกสัปดาห์รวมเป็น `reports/weekly-improvement.md`

## Cheap-First Principle

- ใช้ CLI ที่มีอยู่ก่อน
- ใช้ไฟล์กลางเป็น source of truth
- ใช้ `scripts/war-room.js` เป็นตัวช่วยจัด session/lock/report
- ไม่เรียก API เพิ่ม เว้นแต่ B3 สั่งชัดเจน

## Human-Friendly Commands

B3 does not need to remember the protocol. Use plain language from:

`wiki/ai-war-room/HUMAN-COMMANDS.md`

Shortest command:

```text
เปิดทีม AI ทำงานนี้: [งาน]
```

## AI-to-AI Incident Relay Rule

If Claude, Codex, Gemini, or any AI persona hits a blocker, tool failure, workspace access issue, quota/context limit, invalid output, P0/P1 disagreement, or deploy blocker, open an AI-to-AI incident relay instead of leaving the problem silent.

Use:

- `wiki/ai-war-room/AI-TO-AI-INCIDENT-RELAY.md`
- `wiki/ai-war-room/sessions/_TEMPLATE/incident-relay.md`

Every incident relay message must end with exactly one of:

```text
[TRIGGER:codex] <specific next action>
[TRIGGER:claude] <specific next action>
[TRIGGER:gemini] <specific next action>
FINAL: <decision and next action>
```

If a model cannot access an external repo/file, the owner must copy the needed evidence into the incident room as `evidence.md`, `patch-summary.md`, `source-excerpt.md`, or `error-log.md`, then trigger from those War Room files.

After resolution, write `synthesis.md` and save a lesson in `wiki/ai-war-room/lessons.md`.

### Incident Relay Upgrade: Severity, Timeout, Close Gate

Incident relay must now include:

- Severity: `P0 deploy blocker`, `P1 workflow stuck`, or `P2 quality issue`.
- Mandatory `evidence.md` before closing.
- Escalation to B3 if no `FINAL:` after 3 hops or no useful P0/P1 response after 30 minutes.
- Close gate in `synthesis.md`: root cause, evidence, decision, fix/workaround, residual risk, prevention rule, next owner/action.

Use incident relay only for real blockers, release risk, workspace/tool failure, invalid model output, or cross-model disagreement. Do not use it for tiny single-agent fixes.
