---
created: 2026-06-05 ICT
type: think-tank-summary
ref: TT-2026-06-05-think-tank-system-will-it-work-bugs-to-f
status: done
---

# Think Tank Summary — OpenClaw System Bugs

**คำถามที่ถก:** Think Tank system will it work? — 3 bugs ที่พบ จะ simplify หรือ redesign?

---

## มติทีม (Codex + Gemini เห็นตรงกัน)

**→ Simplify ก่อน Redesign** — ปัญหาเป็น bug ใน orchestration layer ไม่ใช่ architecture หลักพัง

---

## 3 Bugs + วิธีแก้ที่ทีมเสนอ

### 1. Double-append Bug
**ปัญหา:** Watcher trigger ซ้ำ → append ข้อมูลซ้ำในไฟล์
**แนวทาง:** ทำ idempotent ด้วย `runId` หรือ `timestamp + author` เป็น dedup key — เช็คก่อน append ทุกครั้ง

### 2. Gemini เขียนไฟล์ไม่ได้ใน Automation
**ปัญหา:** Gemini ไม่มี filesystem capability ใน automation flow
**แนวทาง:** แยก "AI response" ออกจาก "file mutation" — ให้ **runner** เป็นคนเขียนไฟล์แทน AI ทุกตัว

### 3. Timing Check ผิด (creator vs aiName)
**ปัญหา:** Contract หลวม ไม่ชัดว่าใช้ field ไหน validate
**แนวทาง:** Fix contract ให้ชัดว่า originator / current assignee / last writer คือใคร — validate จาก field เดียวที่ designate ไว้

---

## Next Steps (รอ B3 Approve)

1. เพิ่ม `appendLedger` sidecar JSON — ป้องกัน double-write
2. Runner รับผิดชอบ side effects ทั้งหมด (AI แค่ return text response)
3. State machine ชัดขึ้น: `created → assigned → responded → appended → triggered/done`

**ไม่ต้อง redesign Think Tank format — แก้ runner + contract ก็พอ**

---

*Compiled by Claude from Codex + Gemini thoughts — 2026-06-05 ICT*
