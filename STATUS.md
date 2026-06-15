# B3 Brain — Status Overview
**อัปเดตล่าสุด:** 2026-06-02 16:00 ICT  
**อัปเดตโดย:** Claude

> สถานะรายละเอียดโปรเจค → อ่าน `wiki/to-b3/STATUS-SUMMARY.md`

---

## ✅ งานล่าสุด

✅ เสร็จ: จัดระเบียบ B3-Second-Brain ทั้งหมด — 2026-06-02 16:00 ICT
- Root เหลือ 6 ไฟล์ system เท่านั้น
- wiki/bridge/ เหลือแค่ AI identity files
- wiki/to-b3/ เหลือแค่ active status files
- wiki/credentials/ สร้างใหม่ — จุดเดียวเก็บ Supabase keys
- กฏ.md อัปเดต — รองรับ Claude, Gemini, Codex + 3 commands

✅ เสร็จ: สร้าง กฏ.md (Master Rules Gateway) — 2026-06-02 ICT

---

## 📊 โปรเจคทั้งหมด

| โปรเจค | สถานะ | URL |
|:---|:---|:---|
| **cit-service** | ✅ Production Live | https://cit-service.vercel.app |
| **b3-team-avenger** | ✅ Production Live | https://b3-team-avenger.vercel.app |
| **jong-jaroen** | 🔄 In Progress | — |

---

## ⏳ Pending (ต้องรัน SQL ก่อน)

- รัน `migrations/20260601_contacts_and_network_map.sql` ใน Supabase Dashboard (cit-service)
- รัน `migrations/20260601_upgrade_computers_schema.sql` ใน Supabase Dashboard (cit-service)
- สร้าง 4 auth users ใน Supabase (surapong@, manager@, tech1@, tech2@)

---

## 🗂️ โครงสร้างไฟล์ (หลังจัดระเบียบ 2026-06-02)

```
B3-Second-Brain/
├── กฏ.md                    ← Master Rules Gateway (อ่านก่อนทุกอย่าง)
├── CLAUDE.md                ← Claude session protocol
├── CODEX.md                 ← Codex instructions
├── P3.md                    ← Core Axioms (source of truth)
├── STATUS.md                ← ไฟล์นี้
├── raw/                     ← ของดิบ ห้ามแก้
├── wiki/
│   ├── credentials/         ← 🔐 Supabase keys (AI อ่านจากที่นี่)
│   ├── cit/                 ← CIT Service knowledge
│   ├── jong-jaroen/         ← Jong Jaroen specs
│   ├── b3-avenger/          ← B3 Team Avenger
│   ├── bridge/              ← AI identity + comms
│   ├── to-b3/               ← Reports สำหรับ B3
│   ├── recycle/             ← ไฟล์เก่า (7-day TTL)
│   └── index.md             ← สารบัญ wiki
```
