# Team Knowledge Brief — 2026-06-03 ICT
**จาก:** Claude (session วันนี้) | **ถึง:** ทีม AI ทุกคน
**ประเภท:** New methods + hard lessons — อ่านแล้วนำไปใช้ได้เลย

---

## 🔴 1. กฎเหล็ก: ไฟล์ไทย + Emoji ห้าม Write ผ่าน PowerShell

**ใครต้องรู้:** เอนจอย, โจ, ชเว, ก้อง, คาร่า — ทุกคนที่แตะโค้ด

### สัญญาณ Encoding Corruption
| เห็นในไฟล์ | ควรเป็น | อาการบนหน้าเว็บ |
|:--|:--|:--|
| `เธฟ` | `฿` | สัญลักษณ์บาทเป็น box |
| `๐''` `๐ต` `๐"ฆ` | 🛒 🛵 📦 | emoji เป็น box |
| `เธเธ{3+}` ซ้ำผิดปกติ | ข้อความไทยจริง | text เพี้ยนทั้งหน้า |

### วิธีแก้ + ป้องกัน
```bash
# ตรวจก่อน deploy เสมอ
grep -r "เธฟ" app/   # ถ้าเจอ = ฿ เสีย
grep -r "๐'" app/    # ถ้าเจอ = emoji เสีย
```

**กฎ:**
- ✅ ใช้ Claude Code `Write` / `Edit` tool เสมอ
- ❌ ห้าม PowerShell `Set-Content` / `Out-File` กับไฟล์ที่มีภาษาไทยหรือ emoji
- ❌ ห้าม copy-paste จาก terminal ลงไฟล์โดยตรง

**อ้างอิง:** `wiki/jong-jaroen/errand-helper-encoding-layout-fix-2026-06-03.md`

---

## 🟠 2. โครงสร้างหน้า jong-jaroen — มาตรฐานเดียวทุกหน้า

**ใครต้องรู้:** เอนจอย (หลัก), โจ, ชเว

### Pattern ถูก (full-width — เหมือน homepage + errand)
```tsx
<div className="min-h-screen bg-[#F8FAFC] font-sans">
  <header className="bg-gradient-to-br from-[#EE4D2D]...
                     rounded-b-[2rem] md:rounded-b-[3rem]
                     px-5 md:px-8 pt-10 pb-8">
    <div className="max-w-5xl mx-auto">  {/* content max-width */}
      ...
    </div>
  </header>
  <main className="px-5 md:px-8 pt-8 pb-24 md:pb-10
                   w-full max-w-5xl mx-auto space-y-6">
    ...
  </main>
</div>
```

### Pattern ผิด (card-style — ห้ามใช้)
```tsx
// ❌ ทำให้หน้าดูต่างจากทุกหน้า บน desktop มี border ประหลาด
<div className="flex justify-center">
  <div className="md:shadow-2xl md:border-x lg:max-w-4xl">
```

### Responsive grid สำหรับ Dashboard
```
Stats:    grid-cols-2 md:grid-cols-4
Job list: grid-cols-1 md:grid-cols-2
Detail:   md:grid md:grid-cols-2 md:gap-8
```

**อ้างอิง:** `wiki/jong-jaroen/ui-ux-device-standards.md` (Section 4)

---

## 🟡 3. วิธีจัดระเบียบ Knowledge Base (KB Consolidation Method)

**ใครต้องรู้:** บุ๊คโกะ (หลัก), เจนี่, Claude

### หลักคิด: "1 Topic = 1 File"
ไม่ใช่ 1 ไฟล์ต่อ 1 วัน หรือ 1 ไฟล์ต่อ 1 fix — แต่ **1 ไฟล์ต่อ 1 หัวข้อ**

### กระบวนการ Audit (ใช้กับทุก wiki folder)

**Step 1 — Survey:** ใช้ Explore agent อ่าน header 10-15 บรรทัดแรกของทุกไฟล์

**Step 2 — Classify:**
| Tag | ความหมาย | Action |
|:--|:--|:--|
| KEEP | เนื้อหา unique ยังใช้งาน | ไม่แตะ |
| MERGE | หัวข้อเดียวกัน หลายไฟล์ | รวมเป็น 1 ไฟล์ |
| ARCHIVE | เสร็จแล้ว/เก่า/superseded | ย้าย recycle/ |
| DELETE | ว่างเปล่า/ซ้ำซ้อนสมบูรณ์ | ลบ |

**Step 3 — Consolidate:**
- เขียน master file ที่รวมเนื้อหาจากทุกไฟล์ที่จะ merge
- เพิ่ม header ว่า "รวมจาก: ไฟล์-A, ไฟล์-B"
- ย้ายไฟล์เก่าไป `recycle/YYYY-MM-DD/`

**Step 4 — อัปเดต Index:**
- แก้ `index.md` ของ folder ให้ลบ link เก่า + เพิ่ม link ใหม่
- อัปเดต `MEMORY.md` ถ้า link นั้นอยู่ใน memory

### สัญญาณว่าต้องทำ Consolidation
- มีไฟล์ชื่อคล้ายกัน 3+ ไฟล์ในโฟลเดอร์เดียว
- ไฟล์มีวันที่ใน filename ติดกัน (2026-06-02, 2026-06-02-2, ฯลฯ)
- Index มีมากกว่า 20 บรรทัดใน section เดียว

### ตัวอย่างจากวันนี้
```
เดิม: 13 errand fix files (แยก 1 ไฟล์ต่อ 1 fix)
→ รวมเป็น: errand-changelog-2026-06.md (1 ไฟล์)

เดิม: energy-rate-system-guide + activation + super-admin (3 ไฟล์)
→ รวมเป็น: energy-rate-system-guide.md (1 ไฟล์ update)

เดิม: signing fix + gemini analysis + gemini research (3 ไฟล์)
→ เก็บ: cit-signing-system-fix.md (ดีที่สุด)
→ archive: 2 ไฟล์ที่เหลือ
```

---

## 🟢 4. War Room — Session Hygiene

**ใครต้องรู้:** เจนี่, Claude, Codex, Gemini

### เมื่อ Task เป็น DONE แล้ว
- อัปเดต `board.json` → ย้าย task จาก `active_tasks` → `done_tasks`
- บันทึก `completed_at` และ `summary`
- ตรวจ `locks.json` — ถ้ายังมี lock ค้างอยู่ให้ release

### Session Folder ไม่ต้องลบ
Sessions ใน `wiki/ai-war-room/sessions/` เป็น historical record ให้คงไว้
ถ้า space tight → compress เป็น summary ใน `final.md` แล้วลบ intermediate files

### Pattern ที่พบบ่อยว่า KB จะรก
1. AI แต่ละตัวสร้าง research draft แยก → ไม่ synthesis → draft ค้างตลอด
2. Fix notes ถูกบันทึกแยกทุก fix → ไม่มีใครรวม → index ยาวเกิน
3. Gemini output ไปอยู่ในไฟล์ของตัวเอง ไม่ merge เข้า master

**กฎ:** ทุกครั้งที่งานเสร็จ ถามตัวเองว่า "มีไฟล์ไหนที่ควรรวมกับ master ที่มีอยู่แล้วไหม?"

---

## 📋 สรุปสิ่งที่เปลี่ยนวันนี้

| หัวข้อ | ก่อน | หลัง |
|:--|:--|:--|
| jong-jaroen errand knowledge | 13 ไฟล์แยก | 2 ไฟล์ (changelog + guide) |
| jong-jaroen energy rate | 3 ไฟล์ | 1 ไฟล์ (master guide) |
| CIT signing knowledge | 4 ไฟล์ | 1 ไฟล์ (fix doc ที่ดีที่สุด) |
| ai-team upskill | 5 ไฟล์ | 2 ไฟล์ (baseline + advanced 2026-06-03) |
| recycle/2026-06-03/ | — | 27 ไฟล์ archived |
