# System Prompt Design Patterns

> **Source:** `raw/architecture/raw-02-system-prompt-design.md` (รวบรวม 2026-05-25)  
> **Compiled:** 2026-06-03 ICT

---

## คืออะไร

System prompt = คำสั่งแรกที่กำหนดบทบาท ขอบเขต และพฤติกรรมของ AI **ตลอดทั้งบทสนทนา**

เปรียบเหมือน "บรีฟพนักงานใหม่ก่อนเริ่มงาน" — ถ้าบรีฟดี AI ทำงานได้โดยไม่ต้องสั่งซ้ำ

---

## 4 Pattern หลัก

### 1. Role Assignment
บอก AI ว่าเป็นใคร เชี่ยวชาญอะไร
```
"คุณคือ [ชื่อ] — [ตำแหน่ง] ที่เชี่ยวชาญ [domain]"
```
ใน B3: ทุก persona file ใน `wiki/ai-team/*.md` ใช้ pattern นี้

### 2. Constraint Setting
กำหนดสิ่งที่ห้ามทำ หรือขอบเขตที่ต้องอยู่ในกรอบ
```
"ตอบเฉพาะเรื่อง [X] ถ้าถูกถามนอกเรื่องให้บอกว่าไม่ใช่ scope ของคุณ"
```
ใน B3: "ห้ามแตะ raw/ เด็ดขาด | ห้ามวางไฟล์รก Root"

### 3. Output Format
กำหนดรูปแบบ output ล่วงหน้า
```
"ตอบเป็น JSON เสมอ ด้วย key: summary, action_items, next_steps"
```
ใน B3: handoff contract ใช้ format มาตรฐาน `janie-handoff-template.md`

### 4. Persona + Tone
กำหนดน้ำเสียงและบุคลิก
```
"ตอบสั้น กระชับ ห้ามเกริ่นนำ ห้ามสรุปซ้ำ"
```
ใน B3: ทุก agent มี Tone field ใน Identity section

---

## ข้อผิดพลาดที่พบบ่อย

| ข้อผิดพลาด | ผลลัพธ์ | วิธีแก้ |
|:---|:---|:---|
| ใส่ข้อมูลมากเกินไป | เปลืองโทเคนทุกรอบ | ใส่เฉพาะสิ่งที่ต้องรู้ตลอดบทสนทนา |
| คำสั่งขัดแย้งกัน | AI งง ทำแบบไหนก็ผิด | ตรวจ constraint ก่อน deploy |
| ไม่ทดสอบ edge case | ระเบิดใน production | ทดสอบกับ input แปลกๆ ก่อนเสมอ |

---

## CLAUDE.md = System Prompt ถาวร

`CLAUDE.md` ของ B3 ทำหน้าที่เหมือน system prompt ที่ถูก inject ทุก session อัตโนมัติ — ไม่ต้องพิมพ์ซ้ำทุกครั้ง

---

## ความเชื่อมโยง

- [[chain-of-thought]] — ใส่ CoT instruction ใน system prompt ได้
- [[rag-vs-finetuning]] — system prompt เป็นวิธีที่ 3 ในการให้ AI รู้ข้อมูล (ยัดตรงๆ)
- [[../ai-team/janie-handoff-template]] — handoff contract ใช้ Output Format pattern
- [[../bridge/GEMINI-STARTER-PROMPT]] — ตัวอย่าง system prompt สำหรับเจม (Gemini)
