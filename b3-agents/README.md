# B3 Agent Loader — คู่มือเริ่มต้น

**Created:** 2026-06-03 ICT  
**ใช้กับ:** B3 AI Team personas ใน `wiki/ai-team/`

---

## ขั้นตอน 1 — ติดตั้ง Python (ทำครั้งเดียว)

1. ไปที่: **https://python.org/downloads**
2. กด "Download Python 3.12" (ตัวล่าสุด)
3. รัน installer → **ติ๊ก "Add Python to PATH"** ก่อนกด Install ⚠️
4. ปิด terminal แล้วเปิดใหม่
5. ทดสอบ: พิมพ์ `python --version` → ควรเห็น `Python 3.12.x`

---

## ขั้นตอน 2 — ติดตั้ง packages (ทำครั้งเดียว)

เปิด terminal ใน folder นี้แล้วพิมพ์:

```bash
pip install anthropic groq google-generativeai python-dotenv
```

รอสักครู่จนเสร็จ

---

## ขั้นตอน 3 — ตั้ง API Key

เปิดไฟล์ `.env` ในโฟลเดอร์นี้ แล้วใส่ Anthropic API key:

```
ANTHROPIC_API_KEY=sk-ant-xxxxxxxx
```

(Groq และ Gemini key ใส่ไว้แล้ว)

---

## ขั้นตอน 4 — ใช้งาน

```bash
# ดูรายชื่อ agents ทั้งหมด
python agent_loader.py --list

# เรียก agent คนเดียว
python agent_loader.py --agent enjoy --task "ออกแบบหน้า job listing สำหรับ Jong-Jaroen"

# เรียกหลาย agent พร้อมกัน
python agent_loader.py --agent joe --agent choe --task "ตรวจ SQL migration นี้"

# ให้เจนี่ตัดสินใจว่าส่งงานให้ใคร
python agent_loader.py --orchestrate --task "ทำ feature ระบบ rating ไรเดอร์"
```

---

## Models ที่ใช้

| Agent | Model | ราคา |
|:---|:---|:---|
| Janie, Enjoy, Joe, Choe, Kong, Kitti, Kom | Claude Sonnet | ตามค่า API |
| Mira, Dana, Booko, Nam, Karn, Nara, Win, Raps, Ferin, Qara, Finley, Phattama, Pim | Groq Llama-3.3 | **ฟรีไม่จำกัด** |
| (ถ้าตั้งใจใช้) | Gemini | ฟรี 1M tokens/วัน |

---

## ตัวอย่าง output

```
⚡ mira (llama-3.3-70b-versatile) กำลังทำงาน...

============================================================
🎭 MIRA  (llama-3.3-70b-versatile)
============================================================
[ผลการวิเคราะห์ตลาด Jong-Jaroen vs CK/Fastwork...]
```

---

## โครงสร้างไฟล์

```
b3-agents/
├── agent_loader.py     ← script หลัก
├── .env                ← API keys (ห้าม commit git)
├── requirements.txt    ← packages ที่ต้องการ
└── README.md           ← คู่มือนี้

wiki/ai-team/           ← persona files (script อ่านจากที่นี่)
├── janie_secretary.md
├── enjoy_uidev.md
├── joe_backend.md
└── ...
```
