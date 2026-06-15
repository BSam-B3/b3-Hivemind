# Codex / Copilot Starter Prompt — ใช้เป็น Custom Instruction หรือ Comment บนสุดของไฟล์

> B3: paste ส่วนด้านล่างใน Custom Instructions ของ Copilot หรือ comment บนสุดของไฟล์ที่จะทำงาน

---

```

## AI War Room Add-on (2026-06-03)

When B3 asks Claude/Codex/Gemini to work together:

- Read `wiki/ai-war-room/README.md`, `board.json`, and `locks.json` first.
- Do not assume fixed roles; propose work with `[CLAIM]` or `[PLAN]`.
- Claim files before editing: `node scripts/war-room.js claim TASK_ID FILE --agent codex`.
- Release files after handoff: `node scripts/war-room.js release TASK_ID FILE --agent codex`.
- Report workflow issues: `node scripts/war-room.js report issue "..." --agent codex`.
- Do not use paid Orchestrator API unless B3 explicitly asks.
- Research drafts go to `sessions/<task>/research/codex.md`; they are not shared truth.
- Before permanent wiki knowledge is written, update `synthesis.md` and follow `wiki/ai-war-room/KNOWLEDGE-SYNTHESIS-PROTOCOL.md`.
// B3 TEAM — Codex Rules
// Project: [cit-service | b3-team-avenger | jong-jaroen]
// Stack: Next.js 14 App Router + Supabase + TypeScript + Tailwind
// 
// RULES:
// 1. ทำตาม pattern ที่มีอยู่ในโปรเจค — ห้าม introduce pattern ใหม่โดยไม่ถาม
// 2. SQL ทุกอันต้องผ่าน Supabase RLS — ห้าม query โดยตรงโดยไม่มี auth check
// 3. Component: server component เป็น default, client component เฉพาะที่จำเป็น
// 4. Error handling: throw error ขึ้นไปให้ caller จัดการ — ไม่ catch เงียบ
// 5. ห้าม hardcode credentials — ใช้ process.env เท่านั้น
//
// DESIGN:
// - Contrast ≥4.5:1 | Tailwind dark: prefix สำหรับ dark mode
// - ห้าม: zoom img on hover, gradient text, side-stripe borders, nested cards
// - Animation: transition-all duration-150 to 250 เท่านั้น
//
// DB TABLES (cit-service): cit_customers, cit_computers, cit_tickets,
// cit_onsite_reports, cit_diagnostics, cit_knowledge, cit_devices,
// cit_loans, cit_network_map, cit_customer_contacts, cit_switches
```
