---
type: project-status
project: b3-second-brain
status: active
owner: B3
source: b3-control-panel
created: 2026-06-04
last_reviewed: 2026-06-04
confidence: high
---

# B3 Control Panel

อัปเดตล่าสุด: 2026-06-04T10:04:51.665Z

## สรุปสำหรับบีสาม

สถานะรวม: มีเรื่องที่ควรดู

- OpenClaw watcher: ทำงานอยู่ PID 29196
- งาน trigger ค้าง: 0
- ไฟล์ prompt ชั่วคราวค้าง: 0
- งานที่ต้องกู้/ส่งต่อ: 2
- รายการรออนุมัติ: 0
- session ที่มี watchdog status: 3

## เปิดแบบ Dashboard

- เปิดไฟล์ HTML: [B3-CONTROL-PANEL.html](B3-CONTROL-PANEL.html)

## สิ่งที่ต้องให้บีสามตัดสินใจ

- ไม่มี

## งานที่ควรดู

- 2026-06-04-character-creator-system-agent-rpg-pixel-art: no_output -> manual_recovery
- 2026-06-04-research-pixel-sprite-animation-architecture: token_or_context_limit -> manual_recovery

## คำสั่งภาษาคนที่ใช้ได้

- "เช็กสุขภาพทีม" -> รัน `npm run b3:check`
- "ส่ง Gemini แกะลิงก์นี้" -> ใช้ CMD 11 / `npm run trigger -- ...`
- "กู้ task นี้" -> `npm run trigger:recover -- TASK_ID`
- "เปิด War Room" -> `npm run war:standup`
- "ขอสรุปวันนี้" -> `npm run team:digest`

## Next Action

- เปิดไฟล์รายงานด้านบน แล้วจัดการรายการที่ค้างก่อนเริ่มงานใหญ่
