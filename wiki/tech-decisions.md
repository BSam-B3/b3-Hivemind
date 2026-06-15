# Technical Decisions Log — B3 Projects

> สร้าง: 2026-05-29
> Source: codebase analysis + session knowledge (cit-service + b3-team-avenger)
> วัตถุประสงค์: บันทึกเหตุผลเบื้องหลัง architectural/technical choices สำหรับ reference และ jong-jaroen

---

## TD-001: ใช้ HTML-to-Print แทน pdf-lib สำหรับเอกสารทั่วไป

**Decision:** PDF สำหรับ loans และ quotations ใน CIT ใช้วิธี return HTML จาก API route แล้วให้ browser print

**ทำไมไม่ใช้ puppeteer:**
- puppeteer ต้องการ Chromium binary (~300MB) — ไม่เหมาะกับ Vercel serverless (512MB limit)
- puppeteer cold start ช้า (~3-5 วินาที) ใน serverless environment
- HTML/CSS print มี learning curve ต่ำกว่า ทีมช่างใช้งานได้เลย
- เอกสารส่วนใหญ่ (ใบนำอุปกรณ์ออก, ใบเสนอราคา) ไม่จำเป็นต้องเป็น binary PDF

**ทำไมไม่ใช้ pdf-lib ทุกอย่าง:**
- pdf-lib ไม่รองรับ Unicode/Thai font ได้ง่าย — ต้อง embed TTF font ทำให้ file size ใหญ่
- HTML print ใช้ system font (Sarabun, Arial) ได้เลย
- pdf-lib ใช้เฉพาะเมื่อต้องการ binary PDF สำหรับ email attachment (onsite report, quotation approve flow ใน B3-Avenger)

**Pattern ที่เลือก:**
```
เอกสาร print จาก browser → HTML-to-Print (API returns text/html)
เอกสาร attach email / download binary → pdf-lib (API returns application/pdf)
```

**ผลลัพธ์:** Build ขนาดเล็ก, deploy ง่าย, Vercel compatible

---

## TD-002: CSS Class Override สำหรับ Dark Mode (ไม่ใช้ Tailwind dark: variants อย่างเดียว)

**Decision:** B3-Team-Avenger ใช้ `darkMode: 'class'` ใน Tailwind config + ใส่ class `dark` ที่ `<html>` root

**ทำไมไม่ใช้ Tailwind `dark:` variants อย่างเดียว:**
- Tailwind `dark:` media query mode ใช้ `prefers-color-scheme` — ควบคุมด้วย JS ไม่ได้ (ขึ้นกับ OS setting)
- B3-Avenger เป็น dark-first app ต้องการ dark mode เป็น default เสมอ ไม่ว่า OS จะตั้งค่าอะไร
- User preference toggle (light/dark) ต้องการ JS control ผ่าน `classList.toggle('dark')`

**ทำไมไม่ทำ custom CSS ทั้งหมด:**
- Tailwind `dark:` variants ยังใช้ได้เมื่อ `darkMode: 'class'` — ได้ทั้งสองแบบ
- ไม่ต้องเขียน CSS custom variables เยอะ

**Pattern ที่เลือก:**
```typescript
// tailwind.config.ts
darkMode: 'class'
// layout.tsx
<html className="dark"> // dark-first default
// toggle: document.documentElement.classList.toggle('dark')
```

**Lesson สำหรับ jong-jaroen:** ถ้าต้องการ dark-first app ใช้ pattern นี้เสมอ

---

## TD-003: SLA ใช้ Calendar Hours สำหรับ Critical (ไม่ใช้ Business Hours ทุก priority)

**Decision:** LV1 Critical = นับ calendar hours (24/7), LV2-4 = นับ business hours เท่านั้น

**เหตุผล:**
- Server down หรือ network ล่ม เกิดขึ้นได้ตลอด 24 ชั่วโมง — ลูกค้าไม่ได้หยุดรอ business hours
- ITIL 4 standard แนะนำ: Critical incidents ควร have 24/7 SLA
- ถ้านับ business hours ทุก priority: ช่างทำงานนอกเวลา แต่ SLA timer "pause" — ข้อมูลไม่ตรงความเป็นจริง
- ลูกค้า (8 บริษัท) มี production system ที่ต้องใช้งานตลอด — LV1 2 ชั่วโมง calendar hours ยอมรับได้

**Business Hours Definition สำหรับ CIT:**
- จันทร์-ศุกร์ 08:00-17:00 (9 ชั่วโมง/วัน)
- LV2 High = 16h business hours ≈ 2 วันทำงาน
- LV3 Normal = 24h business hours ≈ 3 วันทำงาน
- LV4 Low = 40h business hours ≈ 5 วันทำงาน (1 สัปดาห์)

**อ้างอิง:** [[cit-sla-research]] Section 4 — Timer Logic

---

## TD-004: Supabase RLS Pattern สำหรับ Multi-Tenant (Customer Isolation)

**Decision:** ใช้ RLS policies + custom helper functions แทนการ filter ใน application code

**ทำไมไม่ filter ใน app code:**
- ถ้า filter ใน app code อาจมี bug ที่ทำให้ customer เห็นข้อมูล customer อื่นได้
- RLS บังคับที่ DB level — แม้ bug ใน app ก็ไม่สามารถ bypass ได้
- ลด boilerplate code: ไม่ต้องเพิ่ม `.eq('customer_code', userCode)` ทุก query

**ทำไมต้องสร้าง helper functions:**
- `cit_get_customer_code()` — อ่าน customer_code จาก JWT metadata
- `cit_get_role()` — อ่าน role จาก JWT
- ใช้ใน RLS policy ได้โดยตรง — policies อ่านง่ายกว่า
- `SECURITY DEFINER` ทำให้ function รันด้วย superuser privilege (bypass RLS ตัวเอง)

**สำคัญ — supabaseAdmin:**
- Server-side routes ที่ต้องการ bypass RLS → ใช้ `supabaseAdmin` (service role key)
- Client-side / user-facing routes → ใช้ `supabase` (anon key + RLS)

**Pattern:**
```sql
-- Policy ที่ clear และ secure
CREATE POLICY "staff_or_own_data" ON cit_tickets FOR ALL USING (
  cit_get_role() IN ('technician', 'manager', 'super_admin')
  OR customer_code = cit_get_customer_code()
);
```

---

## TD-005: Mobile-First UI Pattern — Bottom Nav + Sidebar Drawer

**Decision:** CIT Staff app ใช้ bottom navigation บน mobile + sidebar drawer บน desktop

**เหตุผล:**
- ช่างใช้งานบน mobile (onsite) เป็นหลัก — thumb zone ต้องการ nav ด้านล่าง
- Desktop: sidebar drawer collapsed by default ประหยัดพื้นที่สำหรับ table data
- Tailwind responsive breakpoints: `md:` เป็น boundary หลัก (768px)
- CIT Orange (#f97316) เป็น primary color ที่ใช้ทั้ง nav และ CTA buttons

**Pattern:**
```typescript
// layout.tsx — conditional nav
<div className="md:hidden fixed bottom-0 ..."> {/* Mobile bottom nav */}
<aside className="hidden md:flex ..."> {/* Desktop sidebar */}

// Active state
const isActive = pathname.startsWith(href)
className={`... ${isActive ? 'bg-orange-500 text-white' : 'text-gray-400'}`}
```

**Lesson สำหรับ jong-jaroen:** ถ้า jong-jaroen มี mobile users ใช้ pattern นี้ — bottom nav ใช้งานง่ายกว่า hamburger menu มาก

---

## TD-006: Vercel Cron + Telegram แทน Email Notifications

**Decision:** ใช้ Telegram Bot สำหรับ system notifications ทั้งหมด แทน email

**เหตุผล:**
- ทีม CIT มี Telegram group อยู่แล้ว — adoption rate สูง
- Email delivery มี delay และ spam filter อาจ block
- Telegram API เรียบง่าย — ไม่ต้องตั้ง SMTP server
- HTML parse_mode ใน Telegram รองรับ bold/italic/links — rich notification ได้
- Telegram Bot ไม่มี rate limit สำหรับ usage ระดับ small team

**ทำไมไม่ใช้ push notifications:**
- Web push ต้องการ service worker + user permission — ซับซ้อน
- Telegram เปิดอยู่ทุกเครื่องอยู่แล้ว

**Pattern:**
```
Event เกิด → API route → sendTelegram(formatMsg(data)) → Bot → Group chat
Cron 08:00 → morning-briefing route → รวมทุก alert → sendTelegram(briefing)
```

---

## TD-007: Next.js 15 App Router + TypeScript เป็น Standard Stack

**Decision:** ทั้ง CIT และ B3-Avenger ใช้ Next.js 15 App Router + TypeScript

**เหตุผล:**
- App Router: Server Components ลด client-side JS — performance ดีกว่า Pages Router
- TypeScript: catch errors at compile time — สำคัญมากสำหรับ Supabase schema types
- Vercel deploy: zero-config กับ Next.js — ไม่ต้องตั้ง build pipeline
- `use server` / `use client` boundary ชัดเจน — ง่ายต่อการ review

**ข้อระวัง:**
- `params` ใน App Router 15 เป็น `Promise` — ต้อง `await params` ก่อนใช้
  ```typescript
  // Next.js 15
  export async function GET(req, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params // ต้อง await!
  ```
- `export const dynamic = 'force-dynamic'` ใน cron routes — ป้องกัน static caching

---

## TD-008: Shared Supabase Project (CIT + B3-Avenger)

**Decision:** ทั้งสองโปรเจคใช้ Supabase project เดียวกัน (Project ID: uidkyvqjwigzidxpwort)

**เหตุผล:**
- ทั้งสองโปรเจคเป็นของ B3 คนเดียว — ไม่มีความจำเป็น isolate
- ประหยัด Supabase cost (free tier = 1 project)
- Tables แยก prefix ชัดเจน: `cit_*` vs ไม่มี prefix (b3-avenger)

**ข้อระวังสำหรับ jong-jaroen:**
- ถ้า jong-jaroen จะ share Supabase project เดียวกัน → ต้องใช้ prefix `jj_*` สำหรับทุก table
- RLS policies ต้องไม่ overlap กัน
- แนะนำให้สร้าง Supabase project ใหม่ถ้า jong-jaroen มี customer data

---

*Source: [[cit-project]] | [[b3-team-avenger-project]] | [[cit-sla-research]] | [[features-library]]*
