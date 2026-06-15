# AI Team — Learning Log
**อัปเดตล่าสุด:** 2026-06-02 18:30 ICT

---

## Format
```
### [วันที่ ICT] — [AI] — [หัวข้อ]
**เรียนรู้:** ...
**เหตุการณ์:** ...
**ปรับพฤติกรรม:** ...
**Tags:** ...
```

---

## Log

### 2026-06-02 18:30 ICT — Claude — Zero-Touch System Design
**เรียนรู้:** CLAUDE.md โหลดอัตโนมัติทุก session — ถ้าใส่ rules ไว้ที่นี่ Claude ไม่ต้องรับคำสั่ง "ไปอ่าน กฏ" อีก ลด human error ได้มาก
**เหตุการณ์:** B3 บอกว่าบางทีเบลอ ลืมพิมคำสั่ง อยากให้ระบบทำงานอัตโนมัติ
**ปรับพฤติกรรม:** ใช้ CLAUDE.md + hooks แทนการรอคำสั่ง, เขียน mini-projects ให้ละเอียดพอก่อนหมด token
**Tags:** system, workflow

### 2026-06-02 17:30 ICT — Claude — Gemini Fallback to Groq
**เรียนรู้:** Gemini free tier มี daily quota — ควรมี fallback เสมอ Groq เป็นตัวเลือกที่ดีเพราะฟรีและเร็ว
**เหตุการณ์:** ask-gemini.js ทดสอบแล้ว Gemini quota หมด → fallback Groq ทำงานได้ทันที
**ปรับพฤติกรรม:** script ต้องมี fallback เสมอ, เก็บ key หลายตัวใน .env
**Tags:** system, workflow

### 2026-06-02 17:00 ICT — Claude — One Team Protocol
**เรียนรู้:** การแบ่ง AI เป็น "specialized roles" ทำให้งานหยุดเมื่อ token หมด ควรให้ทุก AI มีฐานความรู้เดียวกันและทำแทนกันได้
**เหตุการณ์:** B3 สังเกตว่า Claude/Gemini/Codex มีอาวุธคนละสาย
**ปรับพฤติกรรม:** ออกแบบ mini-project system + substitution protocol + shared CLAUDE.md
**Tags:** system, workflow

### 2026-06-02 16:00 ICT — Claude — File Organization Patterns
**เรียนรู้:** cit-service มี skill files ซ้ำ 3 ชุด (54 ไฟล์ที่ไม่จำเป็น), b3-team-avenger มี root files เยอะเกิน → pattern: ทำ docs/ folder เก็บ setup/config files แยกออกจาก root
**เหตุการณ์:** สำรวจ 4 โปรเจค พบ pattern นี้ซ้ำๆ
**ปรับพฤติกรรม:** ก่อนสร้างไฟล์ใหม่ใน root → ถามตัวเองก่อนว่า "ควรอยู่ใน docs/ หรือ wiki/ ไหม"
**Tags:** system, cit, b3-avenger

### 2026-06-02 15:00 ICT — Claude — Credentials Security
**เรียนรู้:** SUPABASE_SERVICE_ROLE_KEY ไม่ควรอยู่ใน .md file ที่ track ใน git ควรมี wiki/credentials/ folder แยก และ .env สำหรับ script keys
**เหตุการณ์:** พบ SUPABASE-CREDENTIALS.md มี service role key อยู่ใน to-b3/
**ปรับพฤติกรรม:** แจ้ง B3 ทุกครั้งที่พบ credentials ในที่ไม่เหมาะสม
**Tags:** security, system

---

## 📈 Patterns ที่ทีมสังเกตเห็น

| Pattern | เจอบ่อยแค่ไหน | วิธีจัดการที่ดีที่สุด |
|:---|:---|:---|
| Token หมดกลางงาน | ทุกสัปดาห์ | Auto-checkpoint ทุก 10 tool calls + mini-projects |
| AI ลืม context | ทุก session | CLAUDE.md auto-load + hooks |
| ไฟล์รก Root | ทุก 2 อาทิตย์ | CMD 3 + กฎห้ามวางรก Root |
| Gemini quota หมด | ทุกวัน (free tier) | Groq fallback อัตโนมัติ |
| Skill files ซ้ำ | ครั้งแรกที่เจอ | Single source: .claude/skills/ เท่านั้น |
