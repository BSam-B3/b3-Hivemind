---
type: reference
project: b3-second-brain
status: active
owner: B3
source: b3-control-panel
created: 2026-06-04
last_reviewed: 2026-06-04
confidence: high
---

# คำสั่งภาษาคนสำหรับบีสาม

## เช็กระบบ

พูดว่า: "เช็กสุขภาพทีม"

ระบบควรรัน:

```bash
npm run b3:check
```

ผลลัพธ์หลักอยู่ที่:

- `wiki/to-b3/B3-CONTROL-PANEL.md`

## ส่ง Gemini แกะลิงก์

พูดว่า: "ส่ง Gemini แกะลิงก์นี้ [URL]"

กฎ:

- ถ้าเข้าไม่ได้ ต้องบอกว่าเข้าไม่ได้
- ห้ามเดาเนื้อหา
- ใช้ CMD 12 format ตอนส่งกลับ

## กู้ task

พูดว่า: "กู้ task [TASK_ID]"

ระบบควรรัน:

```bash
npm run trigger:recover -- TASK_ID
```

## เปิด War Room

พูดว่า: "เปิด War Room งานนี้ [รายละเอียด]"

ระบบควรรัน:

```bash
npm run war:standup
npm run war:doctor
```

## ขอสรุปวันนี้

พูดว่า: "ขอสรุปวันนี้"

ระบบควรรัน:

```bash
npm run team:digest
```

