# Human Commands for B3 AI War Room

Created: 2026-06-03

ไฟล์นี้คือคำสั่งภาษาคนสำหรับ B3 ใช้สั่ง Claude, Codex, Gemini โดยไม่ต้องจำ protocol ละเอียด

## เปิดงานใหม่

พูดแบบนี้ได้เลย:

```text
เปิด war room งาน [ชื่องาน]
ให้พวกคุณช่วยกันคิดว่าใครควรทำอะไร
```

AI ที่รับคำสั่งต้อง:

1. สร้าง session ใน `wiki/ai-war-room/sessions/`
2. เขียน brief
3. ให้ AI แต่ละตัวเสนอว่าจะช่วยอะไร
4. ใช้ lock ก่อนแก้ไฟล์

## ให้ AI ตัวอื่นเข้ามาช่วย

```text
[Claude/Codex/Gemini] ไปช่วยงาน [ชื่องาน] ใน war room
```

AI ต้องอ่าน session, ดู lock, แล้วเสนอว่าจะช่วยอะไร

## รับงานต่อเมื่ออีกตัว limit/error

```text
[Claude/Codex/Gemini] รับงานต่อจาก [ชื่อ AI] ใน war room
```

AI ต้องอ่าน `handoff.md`, `review.md`, `task-map.md`, `locks.json` แล้วทำต่อถ้า lock ว่าง

## ขอให้ช่วยกันตัดสินใจ

```text
ให้ Claude Codex Gemini ช่วยกันดูงานนี้ แล้วเสนอทางเลือกที่ดีที่สุด
```

AI ต้องเสนอเหตุผลสั้น ๆ แล้วบันทึก decision ถ้ามีผลต่อโปรเจกต์

## ขอรีวิว

```text
[Claude/Codex/Gemini] ช่วยรีวิวงานนี้ใน war room
```

AI ต้องเขียนผลลง `review.md`

## ขอรายงานปัญหาระบบทีม

```text
ทุก AI รายงานปัญหาที่เจอจากการทำงานร่วมกัน
```

AI ต้องเขียนลง `wiki/ai-war-room/reports/`

## Research แล้วรวมความรู้กลาง

```text
เปิดทีม AI research เรื่องนี้ แล้วรวมเป็นความรู้กลางแบบกรองแล้ว
```

AI ต้อง:

1. เปิดหรือใช้ war room session
2. ให้แต่ละ AI เขียน draft ใน `research/`
3. รวมข้อมูลใน `synthesis.md`
4. ตัดซ้ำ เช็ก conflict และ confidence
5. บันทึกเป็น knowledge กลางเมื่อผ่านการกรองแล้ว

## คำสั่งสั้นที่สุด

```text
เปิดทีม AI ทำงานนี้: [งาน]
```

แปลว่า:

- เปิด war room
- ให้ Claude/Codex/Gemini เสนอเอง
- เลือก owner จากความพร้อมจริง
- ใช้ lock กันไฟล์ชน
- เขียน handoff ถ้าส่งต่อ
- report ปัญหาถ้ามี

## Open AI-to-AI Incident Relay

B3 can say:

```text
เปิด AI-to-AI incident relay สำหรับปัญหานี้: [อธิบายปัญหา]
ให้ Claude Codex Gemini คุยกันผ่าน OpenClaw จนได้ FINAL หรือ trigger ต่อ
บันทึก evidence, synthesis, และ lesson ด้วย
```

The AI receiving this command must:

1. Open an incident relay session in `wiki/ai-war-room/sessions/`.
2. Use `wiki/ai-war-room/AI-TO-AI-INCIDENT-RELAY.md`.
3. Create `incident-relay.md` from the template.
4. Create evidence or patch summary if a model cannot read the real file/repo.
5. Trigger the relevant models with `--max-hops 3`.
6. Require every model to end with `FINAL:` or `[TRIGGER:*]`.
7. Write synthesis and lesson after the conclusion.

### Incident Relay Full Command

Use this when the team is really stuck:

```text
เปิด AI-to-AI incident relay สำหรับปัญหานี้: [อธิบายปัญหา]
Severity: [P0 deploy blocker / P1 workflow stuck / P2 quality issue]
ให้สร้าง evidence.md ก่อน แล้วให้ Claude Codex Gemini คุยผ่าน OpenClaw
ทุกคำตอบต้องจบด้วย FINAL หรือ [TRIGGER:*]
ถ้าไม่จบใน 3 hops หรือ P0/P1 ไม่ตอบใน 30 นาที ให้ escalate ถึง B3
ก่อนปิดห้องต้องมี root cause, fix, residual risk, prevention rule และ lesson
```
