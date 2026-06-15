# Multi-Agent Framework Blueprint — B3 AI Team

**Owner:** Claude Code + B3  
**Created:** 2026-06-03 ICT  
**Status:** Planning Phase  

---

## เป้าหมาย

ให้ AI models (Claude, Gemini, Codex) เรียกใช้ AI Agent personas จาก `wiki/ai-team/` ได้อัตโนมัติ — ไม่ต้อง copy-paste prompt ทุกครั้ง

---

## Framework ที่เลือก: CrewAI

**เหตุผล:**
- รองรับ Claude + Gemini + OpenAI ใน framework เดียว
- Role-based agents ตรงกับ B3 ai-team design
- YAML config อ่านง่าย — convert จาก wiki/ai-team/*.md ได้ตรง
- มี built-in orchestration (Janie = orchestrator agent)
- Open source, ไม่มี vendor lock-in

---

## Architecture

```
B3 พิมพ์ task
      ↓
[Entry Point: b3_crew.py]
      ↓
อ่าน wiki/ai-team/*.md → load personas
      ↓
Janie (Orchestrator Agent)
  ├── วิเคราะห์ task
  ├── เลือก agents ที่ต้องการ
  └── แจกงาน (ตาม routing matrix)
        ↓
┌─────────────┬─────────────┬─────────────┐
│ Enjoy (UI)  │ Joe (Backend│ Kong (Sec)  │
│ via Claude  │ via Claude  │ via Gemini  │
└─────────────┴─────────────┴─────────────┘
        ↓
Choe (QA Review) — ตรวจทุกอย่างก่อน output
        ↓
Output → wiki/ หรือ code files
```

---

## AI Models ที่มาเล่นด้วย

| Model | บทบาทใน Framework | ใช้งาน via |
|:---|:---|:---|
| **Claude (Anthropic)** | Core executor — Enjoy, Joe, Choe, Janie | Anthropic API |
| **Gemini (Google)** | Research + Architecture — Mira, Booko, Dana | Google AI API |
| **Codex/GPT-4o (OpenAI)** | Code completion specialist — ช่วย Joe, Enjoy | OpenAI API |

**ตอบคำถาม B3:** ใช่ — Codex และ Gemini มาเล่นด้วยได้ CrewAI รองรับ multi-LLM ทำให้แต่ละ agent ใช้คนละ model ได้

---

## Phase Plan

### Phase 1 — Foundation (สัปดาห์นี้)
- [ ] ติดตั้ง CrewAI + dependencies
- [ ] สร้าง `b3-agents/` project structure
- [ ] convert Janie + Enjoy + Joe + Choe → CrewAI agents
- [ ] ทดสอบ task แรก: "สร้าง UI component ใหม่"

### Phase 2 — Multi-LLM (สัปดาห์หน้า)
- [ ] เพิ่ม Gemini สำหรับ Mira (market research) + Dana (analytics)
- [ ] เพิ่ม Codex สำหรับ code completion support
- [ ] ทดสอบ: B3 สั่ง 1 คำสั่ง → Janie แจก → 3 agents ทำงานพร้อมกัน

### Phase 3 — Production (เดือนหน้า)
- [ ] เชื่อมกับ B3-Second-Brain wiki/ (agents อ่าน knowledge ได้)
- [ ] สร้าง CLI: `python b3_crew.py "task description"`
- [ ] เพิ่ม handoff contract auto-generation
- [ ] deploy เป็น local API endpoint (ใช้กับ Claude Code hooks)

---

## Project Structure (เป้าหมาย)

```
b3-agents/                    ← โปรเจคใหม่ (แยกจาก Second Brain)
├── b3_crew.py                ← entry point หลัก
├── config/
│   ├── agents.yaml           ← define agents จาก wiki/ai-team/*.md
│   └── tasks.yaml            ← define task templates
├── agents/
│   ├── janie.py              ← Orchestrator
│   ├── enjoy.py              ← Frontend
│   ├── joe.py                ← Backend
│   ├── choe.py               ← QA
│   └── kong.py               ← Security
├── tools/
│   ├── wiki_reader.py        ← อ่าน B3-Second-Brain wiki/
│   ├── file_writer.py        ← เขียนผลลัพธ์ลงไฟล์
│   └── supabase_tool.py      ← query Supabase ได้โดยตรง
└── knowledge/
    └── (symlink → B3-Second-Brain/wiki/)
```

---

## agents.yaml ตัวอย่าง

```yaml
janie:
  role: Executive Secretary & AI Orchestrator
  goal: รับ task จาก B3 วิเคราะห์ แจกงานให้ทีมที่ถูกต้อง ติดตามจนเสร็จ
  backstory: |
    คุณเจนี่เป็นหัวหน้าทีม AI คล่องแคล่ว จัดระเบียบเก่ง
    รู้จัก routing matrix ของทุก agent ในทีม
    ไม่ตัดสินใจแทน B3 แต่จัดการ workflow ได้สมบูรณ์
  llm: claude-sonnet-4-6
  tools: [wiki_reader, handoff_generator]

enjoy:
  role: Senior Frontend Engineer & UI Designer
  goal: ออกแบบและเขียนโค้ด Next.js + Tailwind ให้ถูกต้อง mobile-first
  backstory: |
    คุณเอนจอยเชี่ยวชาญ Next.js App Router + TypeScript + Tailwind
    ยึดหลัก mobile-first เพราะ user หลักคือชาวบ้านและช่างท้องถิ่น
    ต้องมี loading/empty/forbidden/error states ทุกหน้า
  llm: claude-sonnet-4-6
  tools: [file_writer]

joe:
  role: Lead Backend & Infrastructure Architect  
  goal: ออกแบบ schema + SQL + Edge Functions ที่ปลอดภัย
  backstory: |
    คุณโจดูแล Supabase PostgreSQL + Edge Functions
    ทุก query ต้องผ่าน RLS ทุก staff API ต้องตรวจ auth ก่อน
    ห้ามใส่ business logic สำคัญไว้ฝั่ง client
  llm: claude-sonnet-4-6
  tools: [supabase_tool, file_writer]

mira:
  role: Market Intelligence & Inspiration Analyst
  goal: วิจัยตลาด หา insight จาก public data อ้างอิง source เสมอ
  backstory: |
    คุณมิราวิเคราะห์ตลาด marketplace ไทย โดยเฉพาะ CK Fastwork
    ศึกษาเฉพาะ public patterns ห้าม copy proprietary structure
    ทุก insight ต้องมี source link
  llm: gemini-2.5-pro        ← Gemini มาเล่นตรงนี้
  tools: [wiki_reader]

dana:
  role: Data Analyst & Growth Hacker
  goal: วิเคราะห์ metrics หา insight จาก data ออกแบบ dashboard
  backstory: |
    คุณดาน่าดู product analytics: adoption, completion, failure rate
    เน้น "quiet failure" — feature ที่ user ไม่ใช้โดยไม่บอกสาเหตุ
  llm: gemini-2.5-pro        ← Gemini มาเล่นตรงนี้
  tools: [wiki_reader, supabase_tool]
```

---

## Prerequisites (สิ่งที่ต้องมีก่อนเริ่ม)

| สิ่ง | สถานะ | หมายเหตุ |
|:---|:---|:---|
| Python 3.11+ | ✅ (น่าจะมี) | ตรวจด้วย `python --version` |
| Anthropic API key | ✅ (Claude Code ใช้อยู่) | ใช้ key เดิมได้ |
| Gemini API key | ❓ ต้องตรวจ | Google AI Studio → free tier มี |
| OpenAI API key | ❓ ต้องตรวจ | ถ้าอยากใช้ Codex |
| CrewAI package | ❌ ต้องติดตั้ง | `pip install crewai` |

---

## คำสั่งเริ่มต้น (เมื่อพร้อม)

```bash
# ติดตั้ง
pip install crewai crewai-tools langchain-anthropic langchain-google-genai

# รัน
python b3_crew.py "ช่วยออกแบบ UI หน้า job listing ใหม่สำหรับ Jong-Jaroen"

# output จะอยู่ใน wiki/ai-team/output/ หรือส่งกลับ Claude Code
```

---

## Related Files

- [janie-handoff-template.md](janie-handoff-template.md) — มาตรฐาน handoff
- [index.md](index.md) — รายชื่อ agents ทั้งหมด
- [skill-matrix-2026-06-01.md](skill-matrix-2026-06-01.md) — ระดับ skill แต่ละคน
- [upskill-2026-06-03.md](upskill-2026-06-03.md) — knowledge update ล่าสุด
