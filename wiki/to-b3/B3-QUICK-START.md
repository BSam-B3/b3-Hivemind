---
type: reference
project: b3-second-brain
status: active
owner: B3
source: b3-quick-start
created: 2026-06-04
last_reviewed: 2026-06-04
confidence: high
---

# B3 Quick Start

## เริ่มวัน

```bash
npm run b3:morning
```

ระบบจะเช็กสุขภาพทีม อัปเดต Control Panel และตรวจภาษาไทยที่อาจเพี้ยน

## เช็กสุขภาพทีมเมื่อไรก็ได้

```bash
npm run b3:check
```

อ่านผลที่:

- `wiki/to-b3/B3-CONTROL-PANEL.md`
- `wiki/to-b3/B3-CONTROL-PANEL.html`

## ส่งงานให้ AI

บอกเป็นภาษาคนได้ เช่น:

- ส่ง Gemini แกะลิงก์นี้ [URL]
- กู้ task [TASK_ID]
- เปิด War Room งานนี้ [รายละเอียด]
- ขอสรุปวันนี้

## ปิดวัน

```bash
npm run b3:close
```

ระบบจะสรุปวันนี้ อัปเดตบทเรียน และเตรียม next action

## ถ้าเห็นสถานะไม่ปกติ

1. เปิด `wiki/to-b3/B3-CONTROL-PANEL.md`
2. ดูหัวข้อ "สิ่งที่ต้องให้บีสามตัดสินใจ"
3. ดูหัวข้อ "งานที่ควรดู"
4. ถ้าเป็น production/database/security ให้เปิด War Room ก่อน
