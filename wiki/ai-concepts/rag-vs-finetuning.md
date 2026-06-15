# RAG vs Fine-tuning — เลือกอะไรดี

> **Source:** `raw/architecture/raw-03-rag-vs-finetuning.md` (รวบรวม 2026-05-25)  
> **Compiled:** 2026-06-03 ICT

---

## คืออะไร

สองวิธีหลักทำให้ AI รู้ข้อมูลเฉพาะทางของเรา:

| วิธี | อธิบาย |
|:---|:---|
| **RAG** (Retrieval-Augmented Generation) | ดึงข้อมูลที่เกี่ยวข้องมา inject ให้ AI อ่านตอนถาม |
| **Fine-tuning** | เทรน model ใหม่ด้วยข้อมูลของเรา |

---

## เปรียบเทียบ

| หัวข้อ | RAG | Fine-tuning |
|:---|:---|:---|
| ค่าใช้จ่ายเริ่มต้น | ต่ำ–กลาง | สูง |
| อัปเดตข้อมูล | ง่าย — แค่เพิ่มเอกสาร | ต้องเทรนใหม่ทุกครั้ง |
| ความแม่นยำ | ดี ถ้า retrieval ดี | ดีมาก ถ้า dataset ดี |
| เหมาะกับ | ข้อมูลเปลี่ยนบ่อย, FAQ, docs | สไตล์เฉพาะ, ศัพท์เฉพาะทาง |
| ความซับซ้อน setup | กลาง (ต้อง vector DB) | สูง (ต้อง dataset + GPU) |

---

## คำแนะนำสำหรับ B3

**90% ของ use case → RAG พอแล้ว** ไม่ต้อง fine-tune

Fine-tuning เหมาะเมื่อ:
- ต้องการให้ AI "พูดเหมือนแบรนด์จงเจริญ"
- รู้ศัพท์เฉพาะของชุมชนท้องถิ่นมากๆ
- มี dataset เฉพาะที่สะอาดพอ

---

## B3-Second-Brain คือ RAG แบบ Manual

```
B3 หาข้อมูล → เก็บใน raw/ → Claude compile → wiki/
                                    ↓
                        Claude อ่านจาก wiki/ ตอนตอบ
```

เราเป็นคน "retrieve" ให้ Claude เอง ผ่าน CLAUDE.md + wiki files — ไม่ต้องมี vector DB

**ขั้นถัดไปถ้าจะ automate:** ใช้ Supabase pgvector + embedding เพื่อ semantic search ใน wiki

---

## 3 วิธีให้ AI รู้ข้อมูล (เรียงตามง่าย → ยาก)

1. **System Prompt injection** — ยัดข้อมูลลง prompt ตรงๆ (B3 ทำอยู่)
2. **RAG** — ดึงจาก vector DB ตามคำถาม (ขั้นถัดไป)
3. **Fine-tuning** — เทรน model ใหม่ (ระยะยาวมาก)

---

## ความเชื่อมโยง

- [[system-prompt-design]] — วิธีที่ 1: inject ข้อมูลผ่าน system prompt
- [[chain-of-thought]] — ช่วย RAG เมื่อต้อง reason บน retrieved documents
- [[../ai-team/multi-agent-framework-blueprint]] — framework จะใช้ wiki/ เป็น knowledge base ของ agents
- [[../features-library]] — มีตัวอย่าง Gemini AI + Supabase full-text search สำหรับ RAG ใน cit-service
