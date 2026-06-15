# OpenClaw Trigger System
**2026-06-04 14:52 ICT**

## ภาพรวม
ระบบ trigger อัตโนมัติให้ AI ทุกตัวในทีมสั่งงานกันเองได้ผ่าน file-based message queue

## สถาปัตยกรรม

```
B3 สั่ง Claude
  → Claude เขียน trigger file → triggers/claude-to-gemini-TASK.json
  → Watcher รับ (< 1s) → launch Gemini CLI
  → Gemini ทำงาน → ตอบกลับ
  → Watcher บันทึก → sessions/TASK/gemini-output.md
  → ถ้า Gemini ใส่ [TRIGGER:claude] → Watcher สร้าง trigger กลับ → INBOX-CLAUDE.md
  → Claude รับ → แจ้ง B3 + Telegram (Final)
```

## ไฟล์ที่สร้าง

| ไฟล์ | หน้าที่ |
|:---|:---|
| `scripts/openclaw-trigger-watcher.js` | Watch folder + process + retrigger |
| `scripts/trigger-ai.js` | CLI ที่ทุก AI ใช้ยิง trigger |
| `wiki/ai-war-room/triggers/` | Drop zone สำหรับ trigger files |
| `wiki/ai-war-room/triggers/done/` | Archive ของ triggers ที่ process แล้ว |
| `wiki/ai-war-room/sessions/TASK_ID/` | Output จากแต่ละ AI |

## Commands

```bash
# Start watcher (ทุกครั้งที่เปิดคอม)
npm run openclaw:start

# Trigger AI
node scripts/trigger-ai.js --from claude --to gemini --task TASK_ID --instruction "..."
node scripts/trigger-ai.js --from gemini --to claude --task TASK_ID --instruction "..."

# npm shortcuts
npm run trigger -- --from claude --to gemini --task X --instruction "..."
npm run trigger:test
```

## Full Loop Pattern (Bidirectional)

ทุก AI ที่อยากส่งงานต่อ — แนบบรรทัดนี้ท้าย output:
```
[TRIGGER:claude] instruction...
[TRIGGER:gemini] instruction...
[TRIGGER:codex]  instruction...
```
Watcher detect pattern → สร้าง trigger file → ยิงต่ออัตโนมัติ

## สิ่งที่ทำงานได้แล้ว

- Claude → Gemini ✅
- Gemini → Claude (auto retrigger) ✅
- Gemini → Codex (auto retrigger) ✅ (รอ Codex install)
- Output บันทึก sessions/ ✅
- INBOX file สำรองสำหรับ manual pickup ✅

## Notification Policy
- ไม่แจ้งทุก trigger (รบกวนเกินไป)
- Claude แจ้ง Telegram เฉพาะตอน **Final output** เสร็จ
- ดู Token วิ่งใน Claude session ได้แบบ real-time

## Technical Notes
- OpenClaw 2026.6.1 ติดตั้งแล้ว (`openclaw doctor` ผ่าน)
- Gemini CLI model: `gemini-2.5-flash` (ผ่าน GEMINI_MODEL env)
- Windows: ใช้ `spawnSync` + node direct call แทน .cmd wrapper
- Gemini CLI migrate → Antigravity CLI ก่อน June 18, 2026
- Codex CLI ยังไม่ได้ install — ต้องทำก่อนใช้งาน

## บทเรียน
- `gemini.cmd -p "..."` บน Windows มีปัญหา multiline arg → ใช้ node + bundle โดยตรง
- `spawnSync` ต้องรัน single process — ถ้ามีหลาย watcher process ทำงานพร้อมกันจะ conflict
- `-p "."` ไม่ work แต่ `-p "shortPrompt"` work — ต้องมี value จริง
- ควรรัน `Get-Process node | Stop-Process` ก่อน restart watcher เสมอ

## AI-to-AI Incident Relay Rule

When a model is blocked, times out, returns invalid output, cannot read a file, hits quota/context limits, or finds a P0 deploy blocker, open an incident relay room:

`wiki/ai-war-room/sessions/YYYY-MM-DD-<task>-incident-relay/`

Use:

- `wiki/ai-war-room/AI-TO-AI-INCIDENT-RELAY.md`
- `wiki/ai-war-room/sessions/_TEMPLATE/incident-relay.md`

Every relay instruction must require the model to end with one of:

```text
[TRIGGER:codex] <specific next action>
[TRIGGER:claude] <specific next action>
[TRIGGER:gemini] <specific next action>
FINAL: <decision and next action>
```

Use `--max-hops 3` for active troubleshooting so OpenClaw can pass messages back and forth.

If the target model cannot access a repo or external path, first copy the needed evidence into the incident room as `evidence.md`, `patch-summary.md`, or `source-excerpt.md`.

### Incident Relay Upgrade: Severity And Escalation

Every OpenClaw incident relay must set severity:

- `P0 deploy blocker`
- `P1 workflow stuck`
- `P2 quality issue`

Use `--max-hops 3` for active troubleshooting. Escalate to B3 if no `FINAL:` after 3 hops or no useful P0/P1 response after 30 minutes. Evidence must live inside the War Room when a model cannot access external files.
