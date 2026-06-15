# Chain of Thought Prompting

> **Source:** `raw/architecture/raw-01-chain-of-thought.md` (รวบรวม 2026-05-25)  
> **Compiled:** 2026-06-03 ICT

---

## คืออะไร

Chain of Thought (CoT) คือเทคนิคบังคับให้ AI **คิดเป็นขั้นตอนก่อนตอบ** แทนที่จะกระโดดไปคำตอบสุดท้ายทันที

อ้างอิง: Wei et al. 2022 (Google Brain)

---

## วิธีใช้

| รูปแบบ | วิธี | เมื่อใช้ |
|:---|:---|:---|
| **Zero-shot CoT** | เพิ่ม "Let's think step by step" ท้าย prompt | ปัญหาทั่วไปที่ต้องใช้เหตุผล |
| **Few-shot CoT** | ให้ตัวอย่างที่แสดงขั้นตอนการคิดไปด้วย | ปัญหาซับซ้อนหรือต้องการรูปแบบเฉพาะ |

---

## ข้อสังเกตจากการใช้จริงกับ B3 Stack

- ได้ผลดีมากกับ **Claude** เวลาถามเรื่องซับซ้อน (architecture, security review)
- ปัญหาง่าย → ไม่ต้องใช้ เปลืองโทเคน
- ใช้คู่กับ **structured output** (JSON/XML) ได้ดี — ให้คิดก่อน ค่อยส่ง output
- ทีม B3 ใช้ CoT ผ่าน prompt เจนี่: "วิเคราะห์ก่อน แล้วระบุว่าส่งงานให้ใคร"

---

## ความเชื่อมโยง

- [[system-prompt-design]] — ใส่ CoT instruction ใน system prompt ได้
- [[rag-vs-finetuning]] — CoT ช่วย RAG ได้เมื่อต้อง reason บน retrieved documents
- [[../ai-team/janie_secretary]] — เจนี่ใช้ CoT ในการวิเคราะห์ task และแจกงาน

---

## สรุปสั้น

> ถ้าต้องการให้ AI คิดลึก ใส่ "คิดทีละขั้นก่อน" ไว้ใน prompt — ถ้า task ง่าย ข้ามไปได้เลย
