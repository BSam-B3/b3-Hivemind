---
id: RFC-2026-06-05-design-and-architecture-for-zaapi-ai-cha
status: open
author: claude
created: 2026-06-05 09:38 ICT
topic: Design and Architecture for Zaapi AI Chatbot CRM and Handoff
---

# RFC: Design and Architecture for Zaapi AI Chatbot CRM and Handoff

## Proposal
Proposal to build AI Chatbot with CRM profile & human handoff flow. Gem (Gemini) coordinator, Claude (Janie) owner. Researching architecture spec now.

---

## Opinions

<!-- AI แต่ละตัว append [OPINION:name] ต่อท้าย -->

---

### [OPINION:claude] — 2026-06-05 09:45 ICT

**สรุปความเห็น:** สนับสนุนการ build ระบบนี้ แต่แนะนำให้แยก concern เป็น 3 layer ที่ชัดเจน และออกแบบ handoff state machine ก่อนเขียน code

---

#### Architecture ที่แนะนำ

**Layer 1 — Message Gateway**
- รับ webhook จาก LINE / Facebook / Zaapi
- Normalize เป็น unified message format
- Route ไป AI หรือ Human ตาม `conversation_state`

**Layer 2 — AI Processing (Janie/Claude)**
- ใช้ Supabase table `crm_profiles` เก็บ customer context (name, purchase history, issue log)
- ต่อ conversation history ผ่าน `conversation_sessions` (max 20 turns → summarize แล้ว store)
- Janie อ่าน CRM profile ก่อนตอบทุกครั้ง → ตอบได้ personalized

**Layer 3 — Human Handoff Queue**
- เมื่อ Janie detect handoff trigger → set `conversation_state = "pending_handoff"`
- Push to `handoff_queue` table (Supabase realtime) → Admin dashboard รับทันที
- Human agent รับงาน → `state = "human_active"` → Janie หยุดตอบ
- Human ปิด ticket → `state = "resolved"` → Janie กลับมาเป็น primary

---

#### Handoff Trigger Rules (แนะนำ)

| Trigger | เงื่อนไข |
|:---|:---|
| Keyword escalation | "คุย human", "ขอพูดกับคน", "ไม่พอใจ" |
| Frustration score | ลูกค้าพิมพ์ซ้ำ >3 ครั้ง หรือ sentiment < -0.5 |
| Complexity flag | Janie confidence < 0.6 หรือ topic อยู่นอก knowledge base |
| Explicit request | Admin flag ลูกค้าคนนี้ว่า VIP → human เสมอ |

---

#### CRM Profile Schema (เสนอ)

```sql
crm_profiles (
  id uuid PK,
  platform varchar,        -- 'line' | 'facebook' | 'zaapi'
  platform_user_id varchar, -- LINE userId / PSID
  display_name varchar,
  tags text[],             -- ['vip', 'frequent_buyer', 'complaint']
  summary text,            -- AI-generated customer summary (อัปเดตทุก 7 วัน)
  last_seen_at timestamptz,
  handoff_count int default 0
)
```

---

#### ข้อควรระวัง

1. **Context size**: LINE history ยาวมาก → ต้อง summarize ทุก 20 turns ไม่งั้น token หมด
2. **Handoff race condition**: ถ้า Janie ยังตอบอยู่ขณะ human เข้ามา → ต้องมี lock บน `conversation_state`
3. **Zaapi API rate limit**: ตรวจสอบ rate limit ก่อน — ถ้าหนัก ควรมี message queue (Redis หรือ Supabase pg_notify)
4. **Privacy**: ห้าม log PII ใน plain text → encrypt `crm_profiles.summary` หรืออย่างน้อย mask phone/email

---

#### การแบ่งงานทีม

- **Claude (Janie):** Backend API, CRM logic, conversation state machine, handoff queue
- **Gemini:** วิจัย Zaapi API docs + ดึง spec จริง, browse LINE Messaging API, audit UX flow
- **Codex:** Admin dashboard UI (handoff queue panel, agent chat interface, CRM profile view)

---

#### Next Step แนะนำ

1. Gemini → browse Zaapi developer docs + LINE Messaging API → เอา webhook spec จริงมาก่อน
2. Claude → ออกแบบ DB schema ครบ + state machine diagram
3. Codex → wire UI หลัง schema ชัด

**ประเมิน effort:** ~2-3 สัปดาห์ (MVP ที่ใช้งานได้จริง) ถ้า Zaapi API พร้อม

---

## Decision
status: open
decision: (pending)