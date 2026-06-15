# Multi-AI Workspace Solution for B3

Created: 2026-06-03
Owner: B3
Scope: Claude CLI, Codex CLI, Gemini CLI working together in `B3-Second-Brain`

## 2026-06-03 Update: Cheap-First + Dynamic Roles

B3 decision:

- Do not start with paid Orchestrator API.
- Use existing CLI tools, shared files, and local scripts first.
- Do not permanently assign Claude/Gemini/Codex to fixed roles.
- Every AI can propose what it should do through `[CLAIM]` or `[PLAN]`.
- Owner is selected dynamically from context, quota, confidence, tool access, and file locks.
- Janie is a prompt/persona/role template only, not a persistent running process.

Target collaboration level without paid API:

- Manual file handoff: 55-65%
- War room startup + locks + handoff: 75-80%
- Local `scripts/war-room.js`: 80-85%
- Free file watcher later: 85-90%

## Executive View

ควรมีพื้นที่กลางให้ AI ต่างโมเดลทำงานร่วมกันครับ แต่ไม่ควรปล่อยให้คุยกันแบบ chat อิสระอย่างเดียว เพราะจะเกิด 4 ปัญหาเร็วมาก:

- งานชนกัน: AI สองตัวแก้ไฟล์เดียวกันคนละทิศ
- สถานะไม่ตรงกัน: แต่ละ session รู้ไม่เท่ากัน
- ตัดสินใจซ้ำ: คุยเยอะกว่างานจริง
- audit ยาก: ไม่รู้ว่าใครสั่ง ใครทำ ใคร approve

ทางออกคือสร้าง "B3 Multi-AI Workspace" เป็นพื้นที่กลางแบบ file-based ที่ทุก CLI อ่าน/เขียนได้ โดยมี task board, role, lock, handoff, review, และ decision log ชัดเจน

## Recommendation

ใช้แนวคิดนี้:

```text
B3 = Human Director
Janie = AI Chief of Staff / Orchestrator
Claude = Product + UI + fullstack executor
Codex = Code executor + scripts + refactor + build/debug
Gemini = research + architecture + analysis + QA reasoning

ทุกคนคุยผ่านไฟล์กลาง ไม่คุยมั่วใน root
ทุกงานต้องมี owner เดียว แต่มี helper ได้หลายคน
ทุกไฟล์สำคัญต้องมี lock ก่อนแก้
ทุก decision ต้องลง decision log
```

## Proposed Folder

เพิ่ม workspace กลางที่ `wiki/ai-war-room/`

```text
wiki/ai-war-room/
  README.md
  board.json
  decisions.md
  activity.md
  locks.json
  agents.json
  sessions/
    2026-06-03-page-a/
      brief.md
      task-map.md
      chat.md
      handoff.md
      review.md
      final.md
```

### Purpose

| File | Purpose |
|---|---|
| `board.json` | source of truth ของงานทั้งหมด |
| `agents.json` | รายชื่อ AI, จุดแข็ง, ข้อจำกัด, command ที่ใช้เรียก |
| `locks.json` | กัน AI แก้ไฟล์ชนกัน |
| `decisions.md` | บันทึก decision ที่มีผลกับโปรเจกต์ |
| `activity.md` | log สั้น ๆ ว่าใครทำอะไร |
| `sessions/<task>/brief.md` | คำสั่งจาก B3 + goal + acceptance criteria |
| `sessions/<task>/task-map.md` | แบ่งงานว่าใครทำอะไร |
| `sessions/<task>/chat.md` | AI-to-AI compact discussion |
| `sessions/<task>/handoff.md` | ส่งงานต่อกัน |
| `sessions/<task>/review.md` | QA/review findings |
| `sessions/<task>/final.md` | สรุปส่ง B3 |

## Core Protocol

### 1. One Owner, Many Helpers

ทุก task ต้องมี `owner` เดียว เช่น Claude หรือ Codex

Helper ทำได้ 3 อย่าง:

- research
- propose patch / implementation plan
- review / test / debug

Helper ไม่ควรแก้ไฟล์เดียวกับ owner โดยตรง เว้นแต่ owner มอบ lock ให้

### 2. File Lock Before Edit

ก่อนแก้ไฟล์ ให้ AI จอง lock:

```json
{
  "locks": [
    {
      "file": "app/page-a/page.tsx",
      "owner": "codex",
      "task_id": "page-a",
      "locked_at": "2026-06-03T12:00:00+07:00",
      "expires_at": "2026-06-03T12:30:00+07:00",
      "reason": "implement layout and state"
    }
  ]
}
```

ถ้า lock หมดอายุหรือ owner เขียน `[RELEASE]` ใน `handoff.md` คนอื่นถึงรับต่อได้

### 3. Compact Message Tags

ใช้ tag เดิมจาก `wiki/BRIDGE-PROTOCOL.md` แต่เพิ่ม tag สำหรับ war room:

```text
[CLAIM] ขอรับงาน/ไฟล์
[PLAN] แผนสั้น ๆ
[NEED] ต้องการความช่วยเหลือ
[HANDOFF] ส่งงานต่อ
[REVIEW] ผลตรวจ
[DECISION] ข้อตัดสินใจ
[RELEASE] ปล่อย lock
```

ตัวอย่าง:

```text
[NEED] @gemini from:@codex ts:2026-06-03-12:10
Need data table UX patterns for Page A admin filters.
ref: sessions/2026-06-03-page-a/brief.md
---
```

### 4. Decision Authority

ลำดับการตัดสินใจ:

```text
B3 > Janie/Orchestrator > Task Owner > Helper
```

AI คุยกันเองได้ในเรื่อง implementation แต่ถ้ามีเรื่องต่อไปนี้ต้อง flag กลับ B3:

- เปลี่ยน scope
- เปลี่ยน database schema
- เพิ่มค่าใช้จ่าย/API ใหม่
- deploy production
- ลบข้อมูล
- ขัดกับ rule ใน `CLAUDE.md`, `CODEX.md`, `GEMINI.md`

## Example Flow: B3 Orders Page A

### Step 1: B3 Creates Mission

```text
B3: ทำหน้า Page A ให้หน่อย ระหว่างทำให้ Claude/Gemini/Codex ช่วยกัน
```

Janie หรือ AI ตัวแรกที่รับคำสั่งสร้าง:

```text
wiki/ai-war-room/sessions/2026-06-03-page-a/brief.md
wiki/ai-war-room/sessions/2026-06-03-page-a/task-map.md
```

### Step 2: Orchestrator Splits Work

```text
Owner: Codex
Claude helper: UI product judgment, visual review
Gemini helper: requirements, edge cases, architecture risks

Codex:
- inspect repo
- implement page
- run build/test

Claude:
- review UX and copy
- check consistency with design rules

Gemini:
- produce edge cases and acceptance checklist
- review architecture tradeoffs
```

### Step 3: Codex Claims Files

Codex updates `locks.json`:

```json
{
  "file": "src/app/page-a/page.tsx",
  "owner": "codex",
  "task_id": "page-a",
  "reason": "primary implementation"
}
```

### Step 4: Gemini Returns Checklist

Gemini writes to `review.md`:

```text
[REVIEW] @codex from:@gemini ts:2026-06-03-12:20
Acceptance: empty state, loading state, mobile layout, permission denied state.
---
```

### Step 5: Claude Reviews UI

Claude writes:

```text
[REVIEW] @codex from:@claude ts:2026-06-03-12:30
Keep admin UI dense; avoid landing-page hero; table filters should remain visible.
---
```

### Step 6: Codex Implements and Hands Off

Codex writes:

```text
[HANDOFF] @claude from:@codex ts:2026-06-03-12:50
Implementation done. Need UI review and final approval.
ref: src/app/page-a/page.tsx
---
```

### Step 7: Final Report to B3

Owner writes `final.md`:

```text
Done:
- Page A implemented
- Build passed
- Claude UI review passed
- Gemini edge-case checklist covered

Needs B3:
- Confirm production deploy
```

## Automation Layer

Phase 1 ใช้ไฟล์ล้วน ๆ ก่อน ไม่ต้องซับซ้อน

Phase 2 เพิ่ม script:

```text
node scripts/war-room.js start "page-a" --owner codex
node scripts/war-room.js claim page-a src/app/page-a/page.tsx --agent codex
node scripts/war-room.js ask page-a gemini "review edge cases"
node scripts/war-room.js status
node scripts/war-room.js release page-a src/app/page-a/page.tsx --agent codex
```

Phase 3 ค่อยผูกกับ CLI:

```text
claude < wiki/ai-war-room/sessions/2026-06-03-page-a/brief.md
codex exec --prompt-file wiki/ai-war-room/sessions/2026-06-03-page-a/brief.md
gemini -p "@wiki/ai-war-room/sessions/2026-06-03-page-a/brief.md ..."
```

## MVP Build Plan

### MVP 1: Manual War Room

สร้างไฟล์:

- `wiki/ai-war-room/README.md`
- `wiki/ai-war-room/board.json`
- `wiki/ai-war-room/locks.json`
- `wiki/ai-war-room/agents.json`
- `wiki/ai-war-room/decisions.md`
- `wiki/ai-war-room/activity.md`
- `wiki/ai-war-room/sessions/_TEMPLATE/`

ใช้ได้ทันทีกับ Claude/Codex/Gemini CLI โดยให้ทุกตัวอ่าน README ก่อนเริ่มงาน

### MVP 2: War Room CLI

เพิ่ม `scripts/war-room.js` สำหรับ:

- create session
- claim/release lock
- append message
- show status
- detect stale locks

### MVP 3: Auto Orchestrator

เพิ่ม watcher:

- เห็น `[NEED] @gemini` แล้วเตรียม prompt ให้ Gemini
- เห็น `[NEED] @codex` แล้วเตรียม prompt ให้ Codex
- เห็น `[HANDOFF]` แล้ว update board
- เห็น stale lock แล้ว alert

## Important Guardrails

- ห้าม AI สองตัวแก้ไฟล์เดียวกันพร้อมกัน
- ห้าม helper commit หรือ deploy แทน owner
- ห้ามส่ง secrets เข้า `chat.md`
- ห้าม paste file ใหญ่ลง war room ใช้ `ref:path:line` เท่านั้น
- ห้ามลบไฟล์/ข้อมูลโดยไม่มี B3 approve
- ทุกงานต้องมี acceptance criteria
- ทุกงานจบต้องมี `final.md`

## Best Role Split

| Model | Best Use |
|---|---|
| Claude | product sense, UI, orchestration, code review, frontend judgment |
| Codex | implementation, scripts, API wiring, debugging, tests, refactor |
| Gemini | research, broad analysis, architecture options, edge cases, docs |

## Verdict

ควรทำครับ และควรทำแบบมีโครงสร้าง ไม่ใช่แค่ให้ AI คุยกันเอง

พื้นที่กลางนี้จะทำให้ B3 สั่งงานครั้งเดียว แล้ว AI หลายตัวแบ่งงานกันได้ โดยยังคุมความเสี่ยงเรื่องไฟล์ชนกัน, scope หลุด, และสถานะหายระหว่าง session

คำแนะนำของ Codex: เริ่มจาก MVP 1 ทันที แล้วค่อยสร้าง `scripts/war-room.js` ในรอบถัดไป
