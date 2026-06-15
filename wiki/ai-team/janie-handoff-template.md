# Janie — Handoff Contract Template

> **Owner:** คุณเจนี่ (Janie)  
> **Created:** 2026-06-03 ICT  
> **Use:** กรอกทุกครั้งก่อนส่งงานให้ AI agent หรือ Claude/Gemini/Codex

---

## วิธีใช้

1. copy section ด้านล่าง
2. กรอกทุก field — ห้ามปล่อยว่าง
3. ส่งให้ agent พร้อม task
4. รับ Done Evidence กลับมาก่อน mark ว่าเสร็จ

---

## 📋 HANDOFF CONTRACT

```
═══════════════════════════════════════════
HANDOFF CONTRACT — B3 AI Team
═══════════════════════════════════════════

[META]
Task ID    : HO-YYYYMMDD-001
Date       : YYYY-MM-DD HH:MM ICT
From       : เจนี่ (Janie)
To         : [ชื่อ agent / Claude / Gemini / Codex]
Project    : [cit-service | b3-team-avenger | jong-jaroen | second-brain]

───────────────────────────────────────────
[TASK]
Goal       : [เป้าหมายสั้น 1 บรรทัด]
Context    : [บริบท — ทำไมต้องทำ, มี dependency อะไร]
Scope      : [ขอบเขตชัดเจน — ทำอะไร / ไม่ทำอะไร]

───────────────────────────────────────────
[INPUT FILES]
- [path/to/file1.md]
- [path/to/file2.md]
(ถ้าไม่มีใส่ "none")

───────────────────────────────────────────
[ACCEPTANCE CRITERIA]
✅ [เงื่อนไขที่ต้องผ่านข้อ 1]
✅ [เงื่อนไขที่ต้องผ่านข้อ 2]
✅ [เงื่อนไขที่ต้องผ่านข้อ 3]

───────────────────────────────────────────
[CONSTRAINTS]
⚠️  [ข้อห้าม / ข้อจำกัดที่ต้องรู้]
⚠️  [เช่น: ห้ามแตะ raw/ | ต้องผ่าน Choe ก่อน deploy]

───────────────────────────────────────────
[RISK FLAGS]
🔴 HIGH   : [ถ้ามี — ระบุความเสี่ยงสำคัญ]
🟡 MEDIUM : [ถ้ามี]
🟢 LOW    : [ถ้ามี]
(ถ้าไม่มี risk ใส่ "none")

───────────────────────────────────────────
[DONE EVIDENCE REQUIRED]
agent ต้องส่งกลับมาพร้อม:
- [ ] output file path หรือ code ที่แก้แล้ว
- [ ] ผลทดสอบ (ถ้าใช้ได้)
- [ ] ข้อความยืนยัน: "Acceptance Criteria ผ่านแล้วทุกข้อ"

═══════════════════════════════════════════
```

---

## ตัวอย่างที่กรอกแล้ว

```
═══════════════════════════════════════════
HANDOFF CONTRACT — B3 AI Team
═══════════════════════════════════════════

[META]
Task ID    : HO-20260603-001
Date       : 2026-06-03 10:00 ICT
From       : เจนี่ (Janie)
To         : Claude Code
Project    : jong-jaroen

───────────────────────────────────────────
[TASK]
Goal       : เขียน Supabase RLS policy สำหรับตาราง jj_orders
Context    : ตารางใหม่ที่โจสร้าง buyer เห็นได้แค่ order ของตัวเอง rider เห็นเฉพาะ order ที่ assign
Scope      : เขียน SQL policy เท่านั้น ไม่ต้องสร้าง migration file

───────────────────────────────────────────
[INPUT FILES]
- wiki/jong-jaroen/schema-overview.md
- wiki/ai-team/joe_backend.md

───────────────────────────────────────────
[ACCEPTANCE CRITERIA]
✅ buyer SELECT ได้เฉพาะ order ที่ user_id = auth.uid()
✅ rider SELECT ได้เฉพาะ order ที่ rider_id = auth.uid()
✅ admin SELECT ได้ทุก row
✅ ไม่มี policy ที่ allow ALL โดยไม่มีเงื่อนไข

───────────────────────────────────────────
[CONSTRAINTS]
⚠️  ห้าม deploy ตรง — ส่งให้ Choe ตรวจก่อน
⚠️  ใช้ auth.uid() เท่านั้น ห้าม hardcode user id

───────────────────────────────────────────
[RISK FLAGS]
🔴 HIGH : ถ้า policy ผิด → ข้อมูล order รั่วข้ามบัญชี
🟡 MEDIUM : ถ้าลืม admin policy → Janie dashboard พัง

───────────────────────────────────────────
[DONE EVIDENCE REQUIRED]
- [ ] SQL policy code ครบ 3 roles
- [ ] test scenario: buyer A ไม่เห็น order ของ buyer B
- [ ] "Acceptance Criteria ผ่านแล้วทุกข้อ"

═══════════════════════════════════════════
```

---

## Routing Guide — เจนี่ส่งงานให้ใคร

| งานประเภท | ส่งให้ | ผ่าน Review |
|:---|:---|:---|
| UI / Component / หน้าใหม่ | เอนจอย (Enjoy) | ชเว (Choe) |
| Schema / SQL / Edge Function | โจ (Joe) | ชเว (Choe) |
| Security / Pentest | ก้อง (Kong) | คมน์ (Kom) |
| Legal / Compliance | กิตติ (Kitti) | B3 approve |
| Financial / Budget | ปัทมา (Phattama) + พิม (Pim) | B3 approve |
| Community Content | กานต์ (Karn) | นารา (Nara) |
| Research / Analysis | Gemini (GEM) | เจนี่ summary |
| Code Implementation | Claude Code | ชเว (Choe) |
| Code Completion | Codex | ชเว (Choe) |
| QA / Testing | คาร่า (Qara) | ชเว (Choe) |
| Data Architecture | บุ๊คโกะ (Booko) | โจ (Joe) |
| Market Research | มิรา (Mira) | เจนี่ summary |

---

## Status Codes ที่เจนี่ใช้

| Code | ความหมาย |
|:---|:---|
| `[ASSIGNED]` | ส่งงานให้แล้ว รอผล |
| `[IN REVIEW]` | อยู่ที่ Choe/Kom ตรวจ |
| `[NEEDS REVISION]` | ส่งกลับให้แก้ |
| `[APPROVED]` | ผ่านแล้ว พร้อม deploy |
| `[BLOCKED]` | ติดปัญหา รอ B3 ตัดสิน |
| `[DONE]` | เสร็จสมบูรณ์ |
