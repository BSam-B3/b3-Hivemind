# 🚀 Master Architecture Document: CIT Smart KB & Project Brain-Sync
**Date:** 2026-05-29
**Project Context:** การยกระดับระบบ CIT IT Support Knowledge Base และการสร้าง Automated Data Pipeline สำหรับเทรน AI ให้โปรเจกต์ Jong-Jaroen โดยใช้ Openclaw Agent

---

## 🎯 Executive Summary
โปรเจกต์นี้แบ่งออกเป็น 2 ส่วนหลักที่ทำงานประสานกัน:
1. **Frontend / DB Layer (Smart KB Dedup):** ป้องกันการสร้างบทความซ้ำซ้อนด้วยสถาปัตยกรรม "The Self-Learning Master KB" (1 ปัญหา = 1 บทความ)
2. **Backend / AI Layer (Project Brain-Sync):** ใช้ **Openclaw (Node.js Agent)** ทำหน้าที่ดึงข้อมูลที่สมบูรณ์จาก Supabase ส่งเข้า Gemini 1.5 Pro API เพื่อสกัดเป็นชุดข้อมูล Q&A, สรุปปัญหา และส่งกลับเข้า DB อัตโนมัติ (ทดแทนการใช้ NotebookLM แบบ Manual)

---

## 🏗️ PART 1: Smart KB Deduplication (Hybrid Model)
**เป้าหมาย:** ฐานข้อมูลต้องสะอาด 100% (Zero Data Pollution) และระบบต้องเรียนรู้คำศัพท์ (อาการเสีย) ใหม่ๆ ได้เอง

### 1.1 Database Schema (Supabase)
เราจะไม่ใช้ระบบ `duplicate_of` แต่จะใช้การ Track Keywords และ References แทน

```sql
-- 1. Table: cit_knowledge (Master Article)
ALTER TABLE cit_knowledge ADD COLUMN usage_count INT DEFAULT 0;
ALTER TABLE cit_knowledge ADD COLUMN alias_symptoms TEXT[] DEFAULT '{}'; -- เก็บคำบ่น/อาการที่หลากหลายจากตั๋วที่มาผูก

-- 2. Table: cit_tickets (Incident)
ALTER TABLE cit_tickets ADD COLUMN linked_kb_id UUID REFERENCES cit_knowledge(id);
```

### 1.2 User Workflow & UI

เมื่อพนักงานกด "บันทึกเข้า KB":

1. **Auto-Search:** ส่ง อาการ (Symptom) ไปค้นหาใน DB (BM25) และใช้ AI ประเมิน % ความตรงกัน
    
2. **Smart Modal:** แสดงผล 3 อันดับแรก พร้อม % Match
    
3. **Action (Link):** หากพนักงานกด "เชื่อมโยง" ระบบจะ:
    
    - ผูก Ticket ID เข้ากับ `linked_kb_id`
        
    - นำ Symptom จาก Ticket ปัจจุบันไปเพิ่มใน Array `alias_symptoms` ของ KB นั้น
        
    - อัปเดต `usage_count` + 1
        

## 🧠 PART 2: Project Brain-Sync (Automated AI Pipeline)

**เป้าหมาย:** สกัดความรู้จาก KB และ Closed Tickets แบบอัตโนมัติ เพื่อสร้าง Training Data ให้ AI ของ Jong-Jaroen และจัดทำ สถิติของ CIT โดยใช้ Openclaw Agent

### 2.1 The Workflow Architecture

1. **Trigger (Supabase pg_cron / Webhook):** เมื่อตั๋วถูกปิดครบ 50 ใบ หรือถึงรอบทุกวันศุกร์ ส่ง Webhook ไปหา Openclaw
    
2. **Harvest (Openclaw):** Node.js Agent วิ่งเข้าไป Query ข้อมูลดิบ (`cit_knowledge` + `cit_tickets` ที่เพิ่งปิด)
    
3. **Process (Gemini API):** Openclaw ส่ง Context ทั้งหมดเข้า Gemini 1.5 Pro API (ใช้ System Prompt บังคับ Output เป็น JSON)
    
4. **Inject (Openclaw -> Supabase):** นำ JSON ที่ได้ ไป Insert ลงตาราง `ai_training_qa` หรืออัปเดต Report Dashboard
    

### 2.2 System Prompt & JSON Schema (สำหรับ Gemini API)

Openclaw จะส่งคำสั่งพร้อม Schema เพื่อป้องกัน AI ตอบนอกกรอบ

**System Prompt:**

> "คุณคือ AI Data Analyst หน้าที่คุณคือวิเคราะห์ข้อมูล IT Support Tickets และ Knowledge Base ที่แนบมา สกัดข้อมูลออกเป็น 2 ส่วน:
> 
> 1. Q&A สำหรับใช้เป็น Context ให้ AI ตอบคำถาม (เน้นภาษาที่เข้าใจง่าย)
>     
> 2. สรุป Pattern ปัญหาที่พบบ่อย ตอบกลับมาในรูปแบบ JSON ตาม Schema ที่กำหนดเท่านั้น ห้ามมีข้อความอื่นปะปน"
>     

**Expected JSON Schema:**

```json
{
  "qa_pairs": [
    {
      "question": "มีคนบ่นว่าเข้าเน็ตไม่ได้ อาการคืออะไร?",
      "answer": "วิธีแก้ปัญหา...",
      "tags": ["network", "internet", "offline"]
    }
  ],
  "pattern_analysis": [
    {
      "issue_type": "Microsoft 365 Login",
      "frequency": 15,
      "recommendation_for_it": "ควรทำคู่มือแจกพนักงานใหม่"
    }
  ]
}
```

## 🛠️ PART 3: Implementation Phases (Action Plan)

**Phase 1: DB & Smart KB UI (CIT Support Side)**

- [ ] อัปเดต Schema ใน Supabase (เพิ่ม `linked_kb_id`, `alias_symptoms`)
    
- [ ] สร้าง API Endpoint สำหรับ Search KB (BM25 + Semantic/Score)
    
- [ ] สร้าง UI Modal ในระบบ Ticket ให้พนักงานกดเชื่อมโยงได้
    

**Phase 2: Openclaw Automation Pipeline (Backend / AI Side)**

- [ ] เขียน Node.js Worker ให้ Openclaw รับ Webhook จาก Supabase
    
- [ ] สร้างฟังก์ชัน Query ดึงข้อมูลตั๋วที่แก้เสร็จแล้ว
    
- [ ] เชื่อมต่อ Gemini API พร้อมส่ง System Prompt & JSON Schema
    
- [ ] เขียนฟังก์ชันรับ JSON จาก Gemini กลับไป Insert ลงตารางใน Supabase
    

**Phase 3: Integration (Jong-Jaroen Side)**

- [ ] นำข้อมูล Q&A ที่ได้จากตารางใหม่ ไปใช้เป็น RAG (Retrieval-Augmented Generation) Context ให้กับแชทบอทของ Jong-Jaroen

---

## Legacy NotebookLM Plan Consolidated

Source archived on 2026-06-05:
`wiki/projects/notebooklm-kb-enhancement.md` -> `wiki/recycle/2026-06-05/organize-md/wiki/projects/notebooklm-kb-enhancement.md`

NotebookLM was the earlier manual path for turning CIT KB articles into:

- Short and long KB summaries.
- Q&A pairs for agent training.
- Audio or study-guide material for staff training.
- Knowledge-gap reports.

The active architecture is now the Openclaw/Supabase/Gemini pipeline described in this document. Keep NotebookLM only as an optional fallback for manual review or staff-learning content, not as the primary KB synchronization process.
