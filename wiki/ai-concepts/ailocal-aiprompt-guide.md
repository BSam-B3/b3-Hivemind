# Ailocal & AiPrompt Integration Guide
**สำหรับทีม B3 AI (Claude / Gemini / Codex / Local)**  
**อัปเดต:** 2026-06-10 ICT | **สถานะ:** 🟢 Active

---

## 1. วิสัยทัศน์ (Vision)
การผสานพลังระหว่าง **Local AI (Ailocal)** และ **AI Prompt Templates (AiPrompt Agent)** เพื่อลดภาระค่าใช้จ่าย API (Claude/Gemini Paid) ให้เหลือน้อยที่สุด พร้อมกับรักษาคุณภาพงานระดับสูงสุด โดยใช้โมเดลขนาดเล็กในเครื่องเป็นตัวคัดกรอง หรือร่างงานขั้นต้น (Draft) ก่อนส่งให้โมเดลใหญ่

---

## 2. แผนผังการกระจายงาน (Complexity-Based Routing)

```
                       [ งานเข้าระบบ ]
                              │
               ┌──────────────┴──────────────┐
       [ งานเล็ก / Draft / ตรวจสอบ ]   [ งานใหญ่ / ซับซ้อน / Architecture ]
               │                             │
               ▼                             ▼
       ┌──────────────┐              ┌──────────────┐
       │ Ailocal (3B) │              │ Cloud Model  │
       └──────────────┘              └──────────────┘
         (ฟรี 100% ในเครื่อง)           (Claude 3.5 / Gemini Paid)
```

### เกณฑ์การแบ่งงาน (Routing Criteria)
* **Ailocal (qwen2.5:3b / qwen2.5-coder:3b)**:
  * เขียน utility function ขนาดเล็ก (ไม่เกิน 30 บรรทัด)
  * อธิบายโค้ด / สรุปความหมายของโค้ดทีละจุด
  * ร่างคอมเมนต์ หรือเขียน JSDoc / Docstring
  * รีวิวสไตล์การเขียนโค้ดเบื้องต้น (เช่น linting, naming conventions)
  * แปลงประเภทข้อมูล (Type definitions, Interface mapping)
* **Cloud AI (Claude / Gemini / Codex)**:
  * การแก้ไขไฟล์หลายไฟล์ที่มีการพึ่งพาซึ่งกันและกัน (Multi-file dependency)
  * การแก้ไขสถาปัตยกรรม (Architecture & DB Migrations)
  * การเชื่อมต่อ API ภายนอก หรือแก้ไข Shared Utility
  * งานที่ต้องการ Live Web Search/Browse URL จริง

---

## 3. รูปแบบการทำงานร่วมกันแบบ Hybrid (Workflow Patterns)

### Pattern A: Local Draft, Cloud Refine (ร่างด้วย Local, เกลาด้วย Cloud)
1. **Step 1 (Local)**: ใช้ `ask-local.js` ร่างโครงสร้างฟังก์ชัน หรือเขียนโค้ดเบื้องต้น
2. **Step 2 (Validation)**: รันการทดสอบเบื้องต้น (เช่น TypeScript compilation หรือ Local tests)
3. **Step 3 (Cloud)**: หากมีส่วนที่ซับซ้อน ค่อยส่งโค้ดร่างนั้นไปให้ Claude หรือ Codex ตรวจสอบและเกลาต่อ

### Pattern B: Auto-Prompt Audit (การใช้ Prompt Agent คอยคุมสไตล์)
ก่อนที่ Codex หรือ Claude จะเขียน UI ให้ใช้กฎจาก `wiki/ai-concepts/marketplace-audit-prompts.md` เสมอ โดยการส่งกฎเหล่านั้นไปให้ Ailocal ตรวจสอบโค้ดก่อนทำการบันทึกจริง เพื่อป้องกันปัญหา "AI Slops UI" (Neon glow, Shadow หนาเกิน)

---

## 4. วิธีการเรียกใช้ Ailocal

เรียกใช้งานผ่าน CLI ในเครื่องได้โดยตรง:

```bash
# ร้องขอคำอธิบายโค้ด (ใช้ qwen2.5:3b อัตโนมัติ)
node scripts/ask-local.js "อธิบายฟังก์ชันนี้ให้ฟังหน่อย: [code]" --template thai-explain

# ร้องขอการรีวิวโค้ดหาบั๊กเบื้องต้น
node scripts/ask-local.js --task-file path/to/task.json --template bug-hunt

# บังคับเลือกโมเดล coder สำหรับงานเขียนโปรแกรม
node scripts/ask-local.js "เขียน TypeScript helper สำหรับคำนวณวันหมดอายุ" --model qwen2.5-coder:3b
```

---

## 5. เทคนิคการเขียน Prompt สำหรับ Ailocal (3B Models)
โมเดลขนาดเล็ก (เช่น `qwen2.5:3b`) ต้องการ Prompt ที่กระชับและมีโครงสร้างชัดเจนเพื่อให้ได้ผลลัพธ์ที่ดีที่สุด:
1. **ใช้ System Prompt ที่สั้นและตรงประเด็น**: หลีกเลี่ยงข้อความเกริ่นนำที่เยิ่นเย้อ
2. **จำกัดทางเลือก (Few-Shot Examples)**: หากต้องการผลลัพธ์ในรูปแบบเฉพาะ ควรใส่ตัวอย่างรูปแบบอินพุต/เอาต์พุตลงไปด้วย
3. **ระบุ Output Format ให้ชัดเจน**: เช่น สั่งให้ตอบเฉพาะโค้ดใน markdown block หรือตอบเป็น JSON เท่านั้น

---

## 6. แนวทางพัฒนาในอนาคต (Next Steps)
1. **เพิ่ม Template ใน `local-ai-client.js`**: ขยายความสามารถให้ครอบคลุมการเขียน UI, CSS components
2. **เพิ่มระบบ Auto-Pre-Commit Hook**: ให้ Ailocal ตรวจสอบโค้ดก่อน commit อัตโนมัติเพื่อกรองบั๊กเบื้องต้น
3. **การทำ Fine-tuning / RAG เล็กๆ ในเครื่อง**: เพื่อให้ Ailocal เข้าใจโครงสร้างโปรเจกต์ cit-service และ jong-jaroen ได้ดียิ่งขึ้นโดยไม่ต้องอัปโหลดขึ้น Cloud

---
*บันทึกโดย เจม (GEM) | Gemini: 5k / 1M limit*
