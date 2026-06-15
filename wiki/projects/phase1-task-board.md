# Phase 1 Task Board — Foundation (พ.ค. – มิ.ย. 2026)

> **ดูแลโดย:** คุณเจนี่ (Janie)
> **เป้าหมาย Phase 1:** สร้างระบบหลักให้ครบ, เทส JJWallet, จัดการเอกสารและกฎหมายให้พร้อมก่อน Closed Beta
> **Deadline:** ก่อนสิ้นมิถุนายน 2026

---

## 🔴 Critical — ต้องทำก่อนปิด Phase 1

| # | งาน | Owner | สถานะ |
|---|---|---|---|
| 1 | สมัคร EasySlip API | คุณบีสาม | ⏳ ยังไม่ได้ทำ |
| 2 | ทดสอบ JJWallet flow ครบทุก case (เติมเครดิต, ตัด, คืน) | คุณโจ | ⏳ |
| 3 | ตรวจสอบ RLS ทุก table ใน Supabase | คุณโจ + คุณชเว | ⏳ |
| 4 | จดทะเบียน หจก.จงเจริญ | คุณบีสาม + คุณกิตติ | ⏳ |
| 5 | ร่าง Privacy Policy ฉบับแรก | คุณกิตติ | ⏳ |

---

## 🟡 Important — ทำให้เสร็จใน Phase 1

| # | งาน | Owner | สถานะ |
|---|---|---|---|
| 6 | ยื่น DBD พาณิชย์อิเล็กทรอนิกส์ | คุณบีสาม + คุณกิตติ | ⏳ (หลังจดบริษัท) |
| 7 | ร่าง Terms of Service ฉบับแรก | คุณกิตติ | ⏳ |
| 8 | Finalize Logo จงเจริญ | เพื่อนคุณบีสาม (รอ) | ⏳ |
| 9 | สร้าง Facebook Page "จงเจริญ" | คุณนารา | ⏳ |
| 10 | ยื่น NIA Startup Voucher | คุณบีสาม + คุณปัทมา | ⏳ |
| 11 | เปิดบัญชีธนาคารในนามบริษัทจงเจริญ | คุณบีสาม + คุณพิม | ⏳ (หลังจดบริษัท) |

---

## 🟢 Nice to Have — ถ้ามีเวลา

| # | งาน | Owner | สถานะ |
|---|---|---|---|
| 12 | ออกแบบ e-Receipt template | คุณพิม | ⏳ |
| 13 | เตรียม Closed Beta onboarding script | คุณกานต์ | ⏳ |
| 14 | Draft แคมเปญ Teaser สำหรับ Facebook | คุณนารา | ⏳ |

---

## สถานะแอป (สำรวจจริง 2026-05-26 โดยทีม)

| ฟีเจอร์ | สถานะ |
|---|---|
| Auth (Email/Password) | ✅ |
| KYC (form + OCR + admin) | ⚠️ มี UI แต่ขาด Tier Logic |
| JJWallet (เติม/ตัด/ดูประวัติ) | ✅ |
| EasySlip API | ✅ integrate แล้ว (ต้องการ API Key จริง) |
| Job Board | ✅ |
| Services Marketplace | ⚠️ Checkout ยังเป็น stub |
| Shop Marketplace | ⚠️ Checkout ยังเป็น mock |
| Rider GPS | ⚠️ UI ✅ แต่ realtime push ❌ |
| Chat | ✅ |
| Push Notifications | ✅ |
| Admin Dashboard | ✅ |
| Payment Release (Escrow → Wallet) | ❌ ยังเป็น placeholder |
| Coupon/Lottery | ⚠️ migration ✅ แต่ยังไม่มี UI |
| RLS / Security | ⚠️ บางส่วนขาด admin role check |

## Top 5 Priority สำหรับ Phase 2 (Closed Beta)

| # | งาน | ความสำคัญ |
|---|---|---|
| 1 | **Payment Release Logic** — RPC Escrow → Wallet จริง | 🔴 CRITICAL |
| 2 | **KYC Tier Logic** — tier 1/2/3 → job eligibility | 🔴 CRITICAL |
| 3 | **Rider GPS Realtime** — Supabase Realtime + Auto-dispatch | 🔴 CRITICAL |
| 4 | **Checkout Flow** — Shop + Services + Rider delivery เชื่อมกัน | 🟡 HIGH |
| 5 | **RLS + Admin Role** — security audit ทุก table | 🟡 HIGH |

---

## Related Pages

- [[projects/jong-jaroen]] — Blueprint และ Roadmap หลัก
- [[ai-team/janie_secretary]] — ผู้ดูแล Task Board นี้
