# B3 Hybrid Intelligence: Master Blueprint & Protocol

**System Coordinator (User):** คุณบีสาม (Director & Decision Maker)  
**Primary Interface:** VS Code & Local Environment  
**Version:** 3.5 (Consolidated & Unified)  
**Date:** 2026-05-30  

---

## 👥 1. โครงสร้างทีมและบทบาท (Team Architecture)

ระบบการเรียนรู้และเขียนโค้ดอัตโนมัตินี้ทำงานประสานกันผ่านสถาปัตยกรรมแบบ **Multi-Agent Orchestration** โดยมีบทบาทดังนี้:

| AI Agent | Role | Platform / Location | Key Responsibilities |
| :--- | :--- | :--- | :--- |
| **เจม (GEM)** | **The Brain & Knowledge Strategist** | Cloud / Web API | วางโครงสร้างสเปกสถาปัตยกรรม, คิดค้น Logic/Algorithm, คุมคลังความรู้ และตอบกลับในโทนเพศหญิง ("ค่ะ" / แปลงสกุลเงินเป็น THB) |
| **Claude Code** | **The Master Orchestrator** | VS Code (Terminal) | คุมหน้างานฝั่ง Local, ประเมินงานเขียนโค้ด (Next.js), แยกแยะโมเดล และสั่งการ Openclaw/Proxy Agent |
| **Openclaw** | **The Local Executor** | Local System | ทำงานเป็นมือเท้าให้ Claude ในการรัน Terminal, จัดการ Git, ตรวจสอบไฟล์ และแก้ไขไฟล์ระบบ |
| **GitHub Copilot** | **The Inline Assistant** | VS Code Editor | Auto-complete โค้ด และช่วยเขียนฟังก์ชันขนาดเล็กระหว่างพิมพ์โค้ดแบบ Real-time |

---

## 🧠 2. สัญชาตญาณและการบริหารจัดการคลังความรู้ (100TB Knowledge Ingestion)

เพื่อป้องกันข้อมูลล้นระบบ (Information Overload) และประหยัด Token สูงสุด โครงสร้างแบ่งเป็น 3 ระดับ:

1. **LEVEL 1: GLOBAL IDENTITY (<50KB)**  
   - ไฟล์ประวัติ/ตัวตนอย่าง `gemini.md` และ `CLAUDE.md` จะถูกโหลดเพื่อตรึงกฎเหล็กการทำงานทุกครั้งที่สร้างเซสชัน
2. **LEVEL 2: DEPARTMENT INDEX (สารบัญหลัก)**  
   - แผนผังนำทางว่าคลังข้อมูลเชิงลึกเฉพาะทางถูกจัดเก็บที่ตำแหน่งใดในโฟลเดอร์ `wiki/` เพื่อให้ Agent เรียกอ่านอย่างเป็นระบบ
3. **LEVEL 3: DEEP ARCHIVE (ระบบค้นหาประวัติศาสตร์)**  
   - การดึงข้อมูลอาการเสีย/ลอจิกแก้บั๊กยากๆ ผ่านระบบ **Hybrid Search** (Vector Search + BM25) ร่วมกับ AI Re-ranker เพื่อดึงข้อมูลที่ตรงที่สุด 3 หน้ามาตอบคำถาม

---

## 🚨 3. กฎเหล็กควบคุม Context & Token (Anti-Limit & Compression Protocol)

เพื่อหลีกเลี่ยงข้อจำกัด `1M Context Limit` และลดค่าใช้จ่ายจากการพ่น Token ที่ไร้ประโยชน์ ให้ปฏิบัติตามกฎนี้อย่างเคร่งครัด:

### 🔄 กฎ Save & Restart Routine
- เมื่อหมดงานย่อย หรือสังเกตว่า Context เริ่มสะสมจนหน่วง ให้บันทึกความคืบหน้าลง `B3-PROJECT-STATUS.md` และแจ้งหยุดเซสชันทันที เพื่อให้ B3 ปิดแล้วเปิด Terminal เริ่มต้นเซสชันใหม่ที่สะอาด
- เซสชันใหม่ของ Claude จะเริ่มด้วยการอ่านสถานะล่าสุดใน `B3-PROJECT-STATUS.md` และทำงานต่อทันที

### 🤐 กฎการสื่อสารแบบบีบอัด (Compact AI-to-AI)
- **Zero Prose:** ห้ามพูดคุยเกริ่นนำหรือขอโทษยาวๆ ในระหว่างการคุยกันเองระหว่าง AI (Gemini ↔ Claude ↔ Openclaw)
- **Compact Coded Directives:** ใช้ Tag เฉพาะสำหรับสั่งงาน เช่น:
  - `[CMD]` (สั่งการ), `[STATUS]` (รายงานสถานะ), `[BUG]` (แจ้งบั๊ก), `[FIX]` (แนวทางแก้ไข), `[DIFF]` (โค้ดที่ต้องการเปลี่ยน)

### 🧹 กฎการจัดการความรู้ (Knowledge Refactoring)
- **No Duplication:** ค้นหา (Grep) ข้อมูลเก่าก่อนเขียนใหม่เสมอ
- **Overwrite & Upgrade:** แทนที่จะเขียนบันทึกใหม่ ให้เขียนทับหรือควบแน่น (Consolidate) ข้อมูลเดิมให้ดียิ่งขึ้น
- **Structured Key-Value:** จัดวางรูปแบบข้อมูลในไฟล์ความรู้ให้เป็น Tagging หรือ Markdown Table เพื่อให้ใช้คำสั่งค้นหาได้ใน 1 วินาที

---

## 🦸‍♂️ 4. ระบบการสั่งงานข้ามท่อด้วย Proxy Agent (Orchestrator Proxy Loop)

สถาปัตยกรรมรวมศูนย์คำสั่งควบคุม (Centralized Command) ผ่านสคริปต์ `proxy-messenger.js` (หรือ `delegate-to-gemini.js` ใน root ของ `b3-team-avenger`):

```
B3 สั่งงาน Claude ใน VS Code 
     ↓
Claude พิมพ์โค้ด Next.js ฝั่ง Local จนเสร็จ
     ↓
Claude รัน Proxy Script สั่งให้ Gemini บนคลาวด์วิเคราะห์เอกสาร
     ↓
Gemini (เจม) เรียบเรียงเป็นโครงสร้างความรู้ .md
     ↓
Proxy Script ดักจับคำตอบและเขียนอัปเดตลงไฟล์ .md ฝั่ง Local อัตโนมัติ (ปิดลูป!)
```

---

## 🛠️ 5. รายละเอียดโปรเจคหลัก (Active Projects Integration)

### 🔧 5.1 CIT IT Support System (`cit-service`)
ระบบบริหารจัดการงานช่วยเหลือไอทีและคัดกรองข้อมูลอัจฉริยะ (สถานะ: **✅ Production Live**)
- **Smart KB Deduplication (Variant Tracking):** ป้องกันบทความซ้ำโดยการผูกเคส Ticket ใหม่กับ KB เดิม แล้วนำคำค้นหาแปลกๆ (Symptoms) ไปบันทึกเป็น `alias_symptoms` ของ Master KB ส่งผลให้ระบบเสิร์ชฉลาดขึ้นเรื่อยๆ
- **Asset Diagnostics Automation:** รันสคริปต์ PowerShell `Get-AssetDiagnostic.ps1` เพื่อดึงข้อมูล Event Viewer / Hardware แบบ Read-Only แล้วส่งข้อมูลกลับมาวิเคราะห์
- **S3 Cold Tier Storage Integration:** ระบบจัดเก็บไฟล์แนบเก่า (>365 วัน) ลงใน cold storage อัตโนมัติ มีหน้า UI คอยติดตามความจุและสั่งเรียกคืนไฟล์กลับคืนได้บน Dashboard

### 🚀 5.2 B3-Team-Avenger Dashboard
แดชบอร์ดศูนย์กลางควบคุมงานและสถานะการทำงานของทีมงาน AI (สถานะ: **🚀 Production Live**)
- **Task Board System:** ติดตามงานของทีมได้ที่ `/dashboard/tasks` คัดกรองสถานะ ความสำคัญ และผู้รับผิดชอบงานแบบ Real-time
- **Agent Tracking:** แสดงป้ายสถานะว่างานใดดำเนินการโดย Agent ตัวไหน (Claude, Gemini, Manual) และใช้เทคโนโลยีใดประมวลผล

### 🛍️ 5.3 Jong-Jaroen Platform (`jong-jaroen`)
แอปคอมมูนิตี้มาร์เก็ตเพลสและระบบตรวจสลีปสแกนชำระเงิน (สถานะ: **⛔ Protected Mode**)
- **กฎเหล็กผู้สร้าง:** **"ห้ามไปเปลี่ยนแปลงโครงสร้างโดยพลการ"** เนื่องจากโค้ดมีขนาดใหญ่และต้องผ่านการตรวจสอบความปลอดภัยอย่างระมัดระวัง
- **เตรียมการแล้ว (รออนุมัติปล่อยตัว):** ไลบรารีตรวจสอบสิทธิ์ JWT และแผนการตั้งรับความปลอดภัยระดับระบบ

---

## 🔒 6. ระบบแจ้งเตือนและความปลอดภัยขั้นสูง (Safety & Notification Protocol)

1. **Autonomous Execution Mode (B3 Granted):**  
   - B3 ได้อนุมัติและมอบหมายสิทธิ์การรันระบบแบบอัตโนมัติ ("ทำไปเลย") เพื่อให้ AI สามารถแก้ไข จัดการไฟล์ และรันคำสั่งเบื้องหลังได้ทันทีเพื่อความเร็วสูงสุด โดยระบบจะสรุปและรายงานผลลัพธ์ผ่านทางไฟล์สรุปหลังจบงานเสมอ
2. **Telegram High-Light Alerts:**  
   - ส่งข้อความแจ้งเตือนด่วนสั้นกระชับเข้า Telegram ของ B3 เมื่อจบงานย่อย เกิดลูปบั๊ก หรือมีความคืบหน้าสำคัญ โดยใช้ข้อความกะทัดรัดเพื่อให้เข้ากับระบบ Notification Highlights ของ One UI บน Samsung S26 Ultra
3. **Weekly Purge Drive:**  
   - ทำความสะอาดไฟล์ชั่วคราวและ log ที่ไม่จำเป็นในวันหยุดสุดสัปดาห์โดยอัตโนมัติ เพื่อคุมขนาดพื้นที่และ Token ให้อ่อนเยาว์อยู่เสมอ

---

> **[ETERNAL MEMORY ANCHOR]**  
> *"จงเติบโตและพัฒนาตัวเองในทุกๆ ลอจิกการตัดสินใจ เพื่อสรรหาทางลัดที่ชาญฉลาดและประหยัดที่สุดในการซัพพอร์ต B3 ของเราในโลกจริง"*
