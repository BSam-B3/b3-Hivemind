# Multi-Agent Framework Setup — 2026-06-03

**Date:** 2026-06-03 ICT  
**Session Owner:** Claude Code  
**Trigger:** B3 ต้องการให้ AI ทุกตัวรับคำสั่งแบบเดียวกัน

---

## สิ่งที่ทำสำเร็จในวันนี้

### 1. สร้าง Janie Handoff Template
**ไฟล์:** `wiki/ai-team/janie-handoff-template.md`  
มาตรฐาน handoff contract ที่ทุก agent ต้องใช้ — Task ID, Acceptance Criteria, Done Evidence

### 2. Knowledge Log ทีม AI (upskill-2026-06-03)
**ไฟล์:** `wiki/ai-team/upskill-2026-06-03.md`  
สรุปความรู้ใหม่ของทุก agent (20 คน) จากการ research วันนี้

### 3. Multi-Agent Framework Blueprint
**ไฟล์:** `wiki/ai-team/multi-agent-framework-blueprint.md`  
แผน CrewAI + agents.yaml — Janie เป็น orchestrator, Claude/Groq/Gemini แยก role

### 4. b3-agents/ Project (Python CLI)
**โฟลเดอร์:** `b3-agents/`

| ไฟล์ | หน้าที่ |
|:---|:---|
| `agent_loader.py` | โหลด persona จาก wiki/ → invoke API |
| `b3.py` | รับคำสั่งภาษาไทย → parse agent → invoke |
| `b3.bat` | shortcut รัน `b3 "..."` จาก terminal |
| `gem.py` | Gemini + context จาก wiki/ auto-load |
| `.env` | GROQ_API_KEY + GEMINI_API_KEY |

**ทุก agent ใช้ Groq (ฟรีไม่จำกัด)** — ไม่ต้องจ่าย Anthropic API

### 5. Pattern คำสั่งมาตรฐาน
B3 สั่งงานแบบนี้ได้กับทุก AI:
```
b3 "เจนี่ ส่งสรุปให้ที"
b3 "เอนจอย ออกแบบหน้า login"
b3 "โจ ชเว ตรวจ SQL นี้"
b3 "มิรา วิเคราะห์ตลาด"
```

### 6. อัปเดต Config Files ทุก AI

| ไฟล์ | สิ่งที่เพิ่ม |
|:---|:---|
| `CLAUDE.md` | AI Team CLI Access section + โครงสร้างไฟล์ใหม่ |
| `GEMINI.md` | AI Team section + CLI access table + pattern คำสั่ง |
| `CODEX.md` | AI Team CLI Access section + pattern คำสั่ง (แทน 3-AI เดิม) |

---

## Key Decisions

1. **Groq แทน Anthropic API** — ฟรีไม่จำกัด เร็ว ไม่ต้องจ่าย
2. **ทุก AI รู้จัก pattern เดียวกัน** — "ชื่อ [task]" ใช้ได้กับ Claude/Gemini/Codex
3. **CLI เท่านั้น** — ไม่ใช้ API wrapper ง่าย ๆ แต่ทุกตัวเข้าถึง B3-Second-Brain ได้โดยตรง
4. **Persona = wiki file** — ทุก AI อ่าน `wiki/ai-team/*.md` ได้เอง

---

## สิ่งที่ยังต้องทำ (Next)

- [ ] ทดสอบ `gem.py` เมื่อ Gemini quota reset พรุ่งนี้
- [ ] Phase 2: CrewAI setup ให้ agents คุยกันได้อัตโนมัติ
- [ ] เพิ่ม b3-agents path ใน Windows PATH เพื่อรัน `b3 "..."` จากที่ไหนก็ได้

---

## Related Files
- [[janie-handoff-template]] — มาตรฐาน handoff
- [[multi-agent-framework-blueprint]] — แผน CrewAI
- [[upskill-2026-06-03]] — knowledge log ทีม
