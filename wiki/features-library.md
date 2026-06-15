# Features Library — B3 Projects

> สร้าง: 2026-05-29
> Source: STATUS.md + codebase scan (cit-service/ + b3-team-avenger/)
> วัตถุประสงค์: Reference patterns ที่นำมาใช้ซ้ำได้ใน jong-jaroen และโปรเจคอื่น

---

## สารบัญ

- [Telegram Notifications](#telegram-notifications)
- [SLA System](#sla-system)
- [PDF Generation (HTML-to-Print)](#pdf-generation-html-to-print)
- [Email AutoFlow (Morning Briefing Cron)](#email-autoflow-morning-briefing-cron)
- [Digital Signature (Approval Flow)](#digital-signature-approval-flow)
- [Calendar System](#calendar-system)
- [Asset Management](#asset-management)
- [Quotation System (Draft→Approve)](#quotation-system-draftapprove)
- [Equipment Loans](#equipment-loans)
- [Voice NLP (Gemini-powered)](#voice-nlp-gemini-powered)
- [Jarvis Checklist System](#jarvis-checklist-system)
- [Azure OAuth (Microsoft Login)](#azure-oauth-microsoft-login)
- [PDF Generation (pdf-lib Binary)](#pdf-generation-pdf-lib-binary)
- [Customer Reports](#customer-reports)
- [Password Reset Flow](#password-reset-flow)
- [AI Knowledge Search](#ai-knowledge-search)
- [RLS Customer Isolation](#rls-customer-isolation)
- [Dark Mode (CSS Class Override)](#dark-mode-css-class-override)
- [Equipment Diagnostics System](#equipment-diagnostics-system)
- [Device Detection & Auto-Responsive UI](#device-detection--auto-responsive-ui)
- [Mobile-First Responsive Design](#mobile-first-responsive-design)
- [Gemini AI Integration (Hardware Analysis)](#gemini-ai-integration-hardware-analysis)
- [Sortable Table Headers](#sortable-table-headers)
- [AI Agent Command Bar (Calendar NLP)](#ai-agent-command-bar-calendar-nlp)
- [Zero-Touch System Design & Auto-Load Rules](#zero-touch-system-design--auto-load-rules)
- [LLM Client Fallback & Quota Management](#llm-client-fallback--quota-management)
- [Multi-Model UX Evaluation Scorecard](#multi-model-ux-evaluation-scorecard)
- [AI-to-AI Incident Relay & Deadlock Resolution (OpenClaw)](#ai-to-ai-incident-relay--deadlock-resolution-openclaw)
- [File & Docs Architecture (Root Hygiene)](#file--docs-architecture-root-hygiene)
- [Credentials Security & Git Hygiene](#credentials-security--git-hygiene)

---

## Feature: Sortable Table Headers

**ใช้ใน:** cit-service `/staff/assets`, `/staff/onsite`  
**วัตถุประสงค์:** กดหัว column เพื่อ sort ข้อมูล ↑↓ สลับกัน

### Pattern (React + TypeScript)

```tsx
// State
const [sortCol, setSortCol] = useState<string>('')
const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

// Toggle handler
const toggleSort = (col: string) => {
  if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
  else { setSortCol(col); setSortDir('asc') }
}

// Sort logic (supports Thai locale + numeric)
const sorted = (() => {
  let rows = [...data]
  if (sortCol) {
    rows.sort((a, b) => {
      const va = String(a[sortCol] ?? '')
      const vb = String(b[sortCol] ?? '')
      const num = !isNaN(Number(va)) && !isNaN(Number(vb))
      const cmp = num ? Number(va) - Number(vb) : va.localeCompare(vb, 'th')
      return sortDir === 'asc' ? cmp : -cmp
    })
  }
  return rows
})()

// Table header
<th onClick={() => toggleSort('column_key')}
  className="cursor-pointer hover:text-orange-400 select-none">
  Column Label
  {sortCol === 'column_key' && <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>}
</th>
```

**หมายเหตุ:**
- ใช้ `localeCompare(vb, 'th')` สำหรับภาษาไทย
- reset sort เมื่อเปลี่ยน tab/filter: `setSortCol(''); setSortDir('asc')`
- ไม่ sort ที่ DB — sort ใน client หลัง fetch (เหมาะกับ ≤500 rows)

---

## Feature: AI Agent Command Bar (Calendar NLP)

**ใช้ใน:** cit-service `/staff/calendar`  
**วัตถุประสงค์:** User พิมพ์คำสั่งภาษาไทย → parse วันที่ + ชื่อ event → บันทึก calendar อัตโนมัติ

### Pattern

**Frontend** (`/app/staff/calendar/page.tsx`):
```tsx
// States
const [agentInput, setAgentInput] = useState('')
const [parsingInput, setParsingInput] = useState(false)
const [parseMessage, setParseMessage] = useState<{type:'success'|'error', text:string}|null>(null)

// Submit handler: call API → insert to DB → refresh events
const handleAgentInput = async () => {
  const res = await fetch('/api/calendar/parse-command', {
    method: 'POST',
    body: JSON.stringify({ text: agentInput, month: viewMonth, year: viewYear, userName })
  })
  const result = await res.json()
  // insert result.events to cit_calendar_events via supabase client
}
```

**Parser API** (`/app/api/calendar/parse-command/route.ts`):
```ts
// Regex-based Thai date extraction (no AI needed)
const dayRangeMatch = text.match(/วันที่\s*(\d+)(?:\s*-\s*(\d+))?/)
// Extract title after the date
const titleMatch = text.match(/(?:วันที่\s*)?\d+(?:\s*-\s*\d+)?\s+(.+)/)
// Support Thai month names: มกราคม, กุมภาพันธ์, ...
```

**Supported formats:**
- `วันที่8 ลา ไปทำธุระ` → day 8, current month
- `วันที่8-10 ประชุม` → multi-day event
- `วันที่8 กันยายน ลา` → day 8, September

**หมายเหตุ:**
- ใช้ regex แทน AI API เพื่อประหยัด cost และ latency
- color ของ event = hash จากชื่อ user (`getUserColor(userName)`)
- ต้อง disable RLS บน `cit_calendar_events` ก่อน insert จาก client

---

## Feature: Telegram Notifications

**Project:** CIT / B3-Avenger / Both
**Description:** ส่ง notification ผ่าน Telegram Bot เมื่อมี event สำคัญ เช่น ticket ใหม่, สถานะเปลี่ยน, daily briefing
**Files:**
- `cit-service/lib/telegram.ts` — helper functions: `sendTelegram()`, `ticketOpenMsg()`, `ticketStatusMsg()`
- `cit-service/app/api/tickets/route.ts` — เรียก `sendTelegram()` หลัง insert ticket
- `b3-team-avenger/lib/telegram.ts` — shared pattern เดียวกัน

**Stack:** Telegram Bot API (`https://api.telegram.org/bot{TOKEN}/sendMessage`), HTML parse_mode
**Reusable for jong-jaroen?** Yes — ใส่ TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID ใน .env แล้วใช้ได้เลย
**Key code pattern:**
```typescript
// lib/telegram.ts
export async function sendTelegram(message: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
  })
}
// ใช้ HTML tags: <b>bold</b>, <i>italic</i>, emoji ✅🔥⚡
```

---

## Feature: SLA System

**Project:** CIT
**Description:** ระบบติดตาม SLA ตาม ITIL 4 — P1 Critical (2h), P2 High (16h), P3 Normal (24h), P4 Low (40h) คำนวณ TTR, FRT, compliance rate
**Files:**
- `B3-Second-Brain/wiki/cit/cit-sla-research.md` — Research + design guide เต็ม
- `cit-service/app/staff/tickets/[id]/page.tsx` — หน้า ticket detail แสดง SLA timer

**Stack:** Supabase timestamps + JS Date arithmetic
**Reusable for jong-jaroen?** Yes — ถ้า jong-jaroen มี task/order tracking ใช้ SLA pattern เดียวกันได้
**Key code pattern:**
```typescript
// SLA target hours ต่อ priority
const SLA_HOURS = { critical: 2, high: 16, normal: 24, low: 40 }

// คำนวณ % elapsed (LV1 Critical นับ calendar hours, LV2-4 นับ business hours)
function calcSlaPercent(createdAt: string, priority: string): number {
  const elapsed = (Date.now() - new Date(createdAt).getTime()) / 3600000
  const target = SLA_HOURS[priority] ?? 24
  return Math.min(100, Math.round((elapsed / target) * 100))
}
```

---

## Feature: PDF Generation (HTML-to-Print)

**Project:** CIT
**Description:** สร้างเอกสาร PDF โดย return HTML string จาก API route แล้วให้ browser print — ไม่ต้องใช้ library ใหญ่
**Files:**
- `cit-service/app/api/loans/[id]/pdf/route.ts` — ใบนำอุปกรณ์ออก
- `cit-service/app/api/quotations/[id]/pdf/route.ts` — ใบเสนอราคา
- `cit-service/app/api/onsite/[id]/pdf/route.ts` — ใบงาน onsite (pdf-lib binary)

**Stack:** Next.js API route + HTML/CSS string + `Content-Type: text/html`
**Reusable for jong-jaroen?** Yes — pattern เรียบง่าย ใช้ได้กับเอกสารทุกประเภท
**Key code pattern:**
```typescript
// app/api/documents/[id]/pdf/route.ts
export async function GET(req, { params }) {
  const { id } = await params
  const { data } = await supabaseAdmin.from('table').select('*').eq('id', id).single()
  
  const html = `<!DOCTYPE html><html><head>
    <style>@media print { .no-print { display: none; } }</style>
  </head><body>
    <h1>${data.title}</h1>
    <!-- เนื้อหาเอกสาร -->
  </body></html>`
  
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  })
}
// ฝั่ง UI: window.open('/api/documents/ID/pdf') แล้ว browser จะ print dialog
```

---

## Feature: Email AutoFlow (Morning Briefing Cron)

**Project:** CIT
**Description:** Vercel Cron job ทำงานทุกวัน 08:00 (Thai time = 01:00 UTC) ส่ง briefing ทาง Telegram รวม: open tickets, follow-ups วันนี้, calendar events, MA ใกล้หมดอายุ
**Files:**
- `cit-service/app/api/cron/morning-briefing/route.ts`
- `cit-service/vercel.json` — cron config: `"0 1 * * *"`

**Stack:** Vercel Cron + Supabase + Telegram Bot API + CRON_SECRET (prevent unauthorized)
**Reusable for jong-jaroen?** Yes — ถ้าต้องการ daily summary หรือ scheduled task
**Key code pattern:**
```typescript
// vercel.json
{ "crons": [{ "path": "/api/cron/morning-briefing", "schedule": "0 1 * * *" }] }

// route.ts — verify secret ก่อนเสมอ
const authHeader = req.headers.get('authorization')
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
// ดึงข้อมูล parallel แล้วส่ง Telegram
const [openRes, followUpRes, calRes] = await Promise.all([...queries])
await sendTelegram(buildBriefingMsg(openRes, followUpRes, calRes))
```

---

## Feature: Digital Signature (Approval Flow)

**Project:** CIT
**Description:** Quotation workflow: staff สร้าง draft → ส่ง pending_approval → manager approve/reject online ไม่ต้องพิมพ์เซ็น
**Files:**
- `cit-service/app/staff/quotations/page.tsx` — list + filter by status
- `cit-service/app/api/quotations/[id]/approve/route.ts` — POST approve/reject
- `cit-service/app/api/quotations/[id]/pdf/route.ts` — export PDF

**Stack:** Supabase status column + RLS role check (manager only) + Next.js Server Actions
**Reusable for jong-jaroen?** Yes — ถ้ามีเอกสารที่ต้องการ approval flow (PO, claim, invoice)
**Key code pattern:**
```typescript
// approval flow ใน Supabase
// status: 'draft' → 'pending_approval' → 'approved' | 'rejected'
// RLS policy: เฉพาะ manager approve ได้
const { error } = await supabase
  .from('cit_quotations')
  .update({ status: 'approved', approved_by: userId, approved_at: new Date().toISOString() })
  .eq('id', id)
  .eq('status', 'pending_approval') // ป้องกัน double approve
```

---

## Feature: Calendar System

**Project:** CIT / B3-Avenger
**Description:** ปฏิทินทีม แสดง events รายเดือน 5 categories: general, maintenance, onsite, follow_up, ma_renewal — เชื่อมกับ morning briefing อัตโนมัติ
**Files:**
- `cit-service/app/staff/calendar/page.tsx` — monthly view + CRUD modal
- `cit-service/app/api/cron/morning-briefing/route.ts` — query events วันนี้แล้วรวมใน briefing

**Stack:** Supabase `cit_calendar_events` + Next.js + custom CSS grid calendar
**Reusable for jong-jaroen?** Yes — พื้นฐาน calendar UI + cron integration ใช้ได้ทันที
**Key code pattern:**
```typescript
// schema cit_calendar_events
// title, description, event_date, start_at (timestamptz), category, created_by
// query events วันนี้สำหรับ briefing
const { data: events } = await supabase
  .from('cit_calendar_events')
  .select('title, start_at, category')
  .gte('start_at', today.toISOString())
  .lt('start_at', tomorrow.toISOString())
  .order('start_at')
```

---

## Feature: Asset Management

**Project:** CIT
**Description:** จัดการ IT assets 4 ประเภท: computers, devices, servers, switches — Add/Edit/Delete ผ่าน modal UI, filter by customer, เห็น admin_password เฉพาะ manager
**Files:**
- `cit-service/app/staff/assets/page.tsx` — list + filter + modals
- `cit-service/app/api/assets/route.ts` — CRUD endpoints

**Stack:** Supabase (4 tables) + RLS role-based field visibility + Next.js modal
**Reusable for jong-jaroen?** Partial — schema ต้องปรับ แต่ UI pattern (modal CRUD + filter) ใช้ได้
**Key code pattern:**
```typescript
// Role-based field visibility — manager เห็น admin_password
const isManager = role === 'manager' || role === 'super_admin'
// RLS: customer เห็นแค่ข้อมูลของตัวเอง
// cit_computers: customer_code ต้องตรงกับ auth.users metadata
```

---

## Feature: Quotation System (Draft→Approve)

**Project:** CIT / B3-Avenger
**Description:** สร้างใบเสนอราคาพร้อม line items (JSONB array), คำนวณ subtotal/VAT/total, workflow Draft→Approve, export PDF
**Files:**
- `cit-service/app/staff/quotations/page.tsx`
- `cit-service/app/api/quotations/[id]/pdf/route.ts`
- `b3-team-avenger/app/quotation/page.tsx`

**Stack:** Supabase JSONB items array + pdf-lib (b3) / HTML PDF (cit) + React state
**Reusable for jong-jaroen?** Yes — ถ้า jong-jaroen ต้องการ quotation/invoice feature
**Key code pattern:**
```typescript
// items เก็บเป็น JSONB: [{ name, qty, unit_price, total }]
// คำนวณ total_amount ฝั่ง client ก่อน insert
const total = items.reduce((sum, item) => sum + item.qty * item.unit_price, 0)
const withVat = total * 1.07 // 7% VAT

// Supabase schema
items: jsonb  // [{ name: string, qty: number, unit_price: number, total: number }]
total_amount: numeric
status: 'draft' | 'pending_approval' | 'approved' | 'rejected'
```

---

## Feature: Equipment Loans

**Project:** CIT
**Description:** ใบนำอุปกรณ์ออกนอกสถานที่ — สร้าง/ติดตาม/กดคืน ออก PDF แนบลายเซ็น 2 ฝ่าย
**Files:**
- `cit-service/app/staff/loans/page.tsx`
- `cit-service/app/api/loans/[id]/pdf/route.ts`

**Stack:** Supabase `cit_equipment_loans` + HTML PDF + signature box CSS
**Reusable for jong-jaroen?** Yes — ถ้ามีการยืม-คืน equipment
**Key code pattern:**
```typescript
// schema cit_equipment_loans
// equipment_name, serial_number, reason, borrowed_at, expected_return_at
// returned_at: null = ยังไม่คืน, มีค่า = คืนแล้ว
// status derived: returned_at IS NULL ? 'borrowed' : 'returned'
const isReturned = !!loan.returned_at
await supabase.from('cit_equipment_loans')
  .update({ returned_at: new Date().toISOString(), status: 'returned' })
  .eq('id', loanId)
```

---

## Feature: Voice NLP (Gemini-powered)

**Project:** B3-Avenger
**Description:** Web Speech API รับเสียง → ส่ง transcript ไป Gemini API → parse intent/entities → execute action (สร้าง ticket, เปิด page, ฯลฯ)
**Files:**
- `b3-team-avenger/app/mobile/page.tsx` — Voice UI
- `b3-team-avenger/app/api/voice/nlp/route.ts` — Gemini NLP endpoint

**Stack:** Web Speech API (browser) + Gemini API + custom intent parser
**Reusable for jong-jaroen?** Yes — ถ้า jong-jaroen ต้องการ voice command
**Key code pattern:**
```typescript
// ฝั่ง browser: รับเสียง
const recognition = new webkitSpeechRecognition()
recognition.lang = 'th-TH'
recognition.onresult = (e) => {
  const transcript = e.results[0][0].transcript
  fetch('/api/voice/nlp', { method: 'POST', body: JSON.stringify({ text: transcript }) })
}

// ฝั่ง API: ส่ง Gemini
const result = await gemini.generateContent(`
  Parse this Thai voice command and return JSON:
  { intent: string, entities: object, action: string }
  Command: "${transcript}"
`)
```

---

## Feature: Jarvis Checklist System

**Project:** B3-Avenger
**Description:** Onsite IT checklist แบบ interactive — check items, add notes, export ZIP bundle (base64 JSON) เพื่อ share offline
**Files:**
- `b3-team-avenger/app/jarvis/page.tsx`
- `b3-team-avenger/app/api/jarvis/export/route.ts`

**Stack:** Supabase `jarvis_checklists` + base64 JSON bundle export
**Reusable for jong-jaroen?** Partial — concept ใช้ได้ถ้า jong-jaroen ต้องการ checklist + offline export
**Key code pattern:**
```typescript
// Export ZIP: encode checklist data เป็น base64 JSON bundle
const bundle = {
  metadata: { exportedAt: new Date().toISOString(), version: '1.0' },
  checklists: checklistData,
  items: itemsData
}
const encoded = btoa(JSON.stringify(bundle))
// download as .json file ที่ decode ได้ภายหลัง
```

---

## Feature: Azure OAuth (Microsoft Login)

**Project:** B3-Avenger
**Description:** Login ด้วย Microsoft 365 account ผ่าน Azure AD OAuth2 — ได้ access token สำหรับ Microsoft Graph API (email, calendar)
**Files:**
- `b3-team-avenger/app/auth/page.tsx`
- `b3-team-avenger/app/auth/callback/page.tsx`
- `b3-team-avenger/app/api/auth/microsoft/route.ts`

**Stack:** Azure AD OAuth2 + Microsoft Graph API + Supabase custom JWT
**Reusable for jong-jaroen?** Conditional — ถ้า jong-jaroen ต้องการ M365 integration
**Key code pattern:**
```typescript
// Azure OAuth redirect
const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?
  client_id=${clientId}
  &response_type=code
  &redirect_uri=${encodeURIComponent(redirectUri)}
  &scope=openid profile email Mail.Read Calendars.Read`

// Callback: exchange code → token
const tokenRes = await fetch(`https://login.microsoftonline.com/.../token`, {
  method: 'POST',
  body: new URLSearchParams({ grant_type: 'authorization_code', code, ... })
})
// Production redirect URI: https://b3-team-avenger.vercel.app/auth/callback
```

---

## Feature: PDF Generation (pdf-lib Binary)

**Project:** CIT / B3-Avenger
**Description:** สร้าง binary PDF จริง (ไม่ใช่แค่ print HTML) ด้วย pdf-lib — เหมาะสำหรับเอกสารที่ต้อง attach email หรือ download โดยตรง
**Files:**
- `cit-service/app/api/onsite/[id]/pdf/route.ts` — ใบงาน onsite
- `b3-team-avenger/app/api/quotation/[id]/pdf/route.ts` — quotation PDF แนบ email

**Stack:** `pdf-lib` npm package + Supabase data
**Reusable for jong-jaroen?** Yes — ถ้าต้องการ PDF ที่ attach email ได้จริง (ไม่ใช่ print)
**Key code pattern:**
```typescript
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

const pdfDoc = await PDFDocument.create()
const page = pdfDoc.addPage([595, 842]) // A4
const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
page.drawText('Document Title', { x: 50, y: 780, size: 18, font, color: rgb(0.98, 0.45, 0.09) })
// ...เพิ่ม content
const pdfBytes = await pdfDoc.save()
return new Response(pdfBytes, {
  headers: {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="doc-${id}.pdf"`
  }
})
```

---

## Feature: Customer Reports

**Project:** CIT
**Description:** Customer portal ดูรายงานสรุป IT ของบริษัทตัวเอง — monthly summary (ticket count by category/priority), รายการ tickets ทั้งหมด + filter
**Files:**
- `cit-service/app/customer/reports/page.tsx`

**Stack:** Supabase RLS (customer เห็นแค่ข้อมูลตัวเอง) + React tabs + date filter
**Reusable for jong-jaroen?** Yes — ถ้า jong-jaroen มี customer-facing reports
**Key code pattern:**
```typescript
// RLS จัดการ isolation อัตโนมัติ — query ปกติได้เลย
const { data: tickets } = await supabase
  .from('cit_tickets')
  .select('*')
  .gte('created_at', startOfMonth)
  .lte('created_at', endOfMonth)
  .order('created_at', { ascending: false })
// Supabase RLS filter customer_code = auth.users metadata automatically
```

---

## Feature: Password Reset Flow

**Project:** CIT
**Description:** Standard password reset flow — กรอก email → รับลิงก์ → ตั้งรหัสใหม่พร้อม strength indicator
**Files:**
- `cit-service/app/forgot-password/page.tsx`
- `cit-service/app/reset-password/page.tsx`

**Stack:** Supabase Auth `resetPasswordForEmail()` + `updateUser()` + zxcvbn (strength)
**Reusable for jong-jaroen?** Yes — มาตรฐาน Supabase Auth flow
**Key code pattern:**
```typescript
// Request reset
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/reset-password`
})

// Apply new password (ใน /reset-password page)
await supabase.auth.updateUser({ password: newPassword })
// ใช้ zxcvbn library วัด strength score 0-4
```

---

## Feature: AI Knowledge Search

**Project:** CIT / B3-Avenger
**Description:** ค้นหา knowledge base ด้วย AI — ถามภาษาธรรมชาติ ได้คำตอบที่ relevant จาก KB
**Files:**
- `cit-service/app/knowledge/page.tsx`
- `cit-service/app/api/ai/search/route.ts`

**Stack:** Gemini API (primary) + Groq (fallback) + Supabase full-text search
**Reusable for jong-jaroen?** Yes — ถ้า jong-jaroen ต้องการ AI-powered search
**Key code pattern:**
```typescript
// Hybrid search: keyword + AI rerank
const { data: results } = await supabase
  .from('cit_knowledge')
  .select('*')
  .textSearch('content', query, { type: 'websearch' })
  .limit(10)
// ส่ง results + query ไป Gemini เพื่อ rerank + summarize
```

---

## Feature: RLS Customer Isolation

**Project:** CIT
**Description:** Supabase RLS policies บังคับ data isolation ระดับ DB — customer query ได้แค่ข้อมูลของบริษัทตัวเอง ไม่ต้องเขียน filter ใน app code
**Files:**
- `cit-service/lib/supabase.ts` — supabaseAdmin (bypass RLS สำหรับ server)
- Supabase Dashboard → policies

**Stack:** Supabase RLS + custom functions `cit_get_role()`, `cit_get_customer_code()`
**Reusable for jong-jaroen?** Yes — สำคัญมากถ้า jong-jaroen มี multi-tenant data
**Key code pattern:**
```sql
-- RLS policy ใน Supabase
CREATE POLICY "customers see own data" ON cit_tickets
FOR SELECT USING (
  auth.jwt() ->> 'role' = 'staff'
  OR customer_code = cit_get_customer_code()
);

-- Helper function
CREATE FUNCTION cit_get_customer_code() RETURNS text AS $$
  SELECT raw_user_meta_data->>'customer_code'
  FROM auth.users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;
```

---

## Feature: Dark Mode (CSS Class Override)

**Project:** B3-Avenger
**Description:** Dark mode ใน Next.js โดยใช้ CSS class `dark` ที่ root element แทน Tailwind `dark:` variants — เพื่อให้ควบคุม dark mode ด้วย JS/user preference ได้ง่ายกว่า
**Files:**
- `b3-team-avenger/app/layout.tsx` — class="dark" บน `<html>`
- `b3-team-avenger/tailwind.config.ts` — `darkMode: 'class'`

**Stack:** Tailwind CSS darkMode: 'class' + localStorage preference
**Reusable for jong-jaroen?** Yes — standard pattern สำหรับ dark-first apps
**Key code pattern:**
```typescript
// tailwind.config.ts
export default { darkMode: 'class', ... }

// layout.tsx — ใส่ class 'dark' ไว้เลยถ้าเป็น dark-first
<html className="dark">

// หรือ toggle ด้วย JS
document.documentElement.classList.toggle('dark')
localStorage.setItem('theme', isDark ? 'dark' : 'light')
```

---

## Feature: Equipment Diagnostics System

**Project:** CIT
**Description:** ระบบการอัพโหลดและวิเคราะห์เครื่องคอมพิวเตอร์ — อ่าน JSON diagnostic file จากเครื่อง ส่งให้ Gemini AI วิเคราะห์ → สร้าง sales opportunities อัตโนมัติ พร้อมราคาเสนอ
**Files:**
- `cit-service/app/api/equipment/upload/route.ts` — API endpoint รับ JSON + เรียก Gemini
- `cit-service/app/staff/equipment/page.tsx` — Equipment inventory dashboard
- `cit-service/app/staff/equipment/[id]/page.tsx` — Equipment detail + sales opportunities
- `cit-service/app/staff/components/EquipmentUploadModal.tsx` — File upload form
- `cit-service/app/customer/components/CustomerEquipmentDashboard.tsx` — Customer view

**Stack:** Supabase (3 tables: customer_equipment, equipment_sales_opportunities, equipment_maintenance_logs), Gemini API, TypeScript
**Reusable for jong-jaroen?** YES — ใช้ pattern: JSON diagnostic → AI analysis → structured data สำหรับ jong-jaroen devices/services ได้
**Key code pattern:**
```typescript
// Upload → Gemini analysis → Create opportunities
const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
  body: JSON.stringify({
    contents: [{
      parts: [{
        text: `Analyze: ${JSON.stringify(diagnostic)}. Find: failures, degradation, upgrade opportunities. Return: JSON with opportunities array.`
      }]
    }]
  })
})
```
**Lessons:** Gemini is fast for AI analysis (no training), RLS isolates customer data, sales opportunities auto-generation saves hours of manual review

---

## Feature: Device Detection & Auto-Responsive UI

**Project:** CIT (in development)
**Description:** อัตโนมัติจับความเป็น device type (mobile/tablet/desktop) → เปลี่ยน UI layout ให้เหมาะสม (hamburger menu → top nav, 1-col → 3-col grid)
**Files:**
- `cit-service/app/api/device/detect/route.ts` — API: return { device_type, screen_width, is_touch }
- `cit-service/app/components/DeviceProvider.tsx` — Context provider
- `cit-service/app/hooks/useDevice.ts` — Hook to access device info

**Stack:** Next.js headers() + navigator.userAgent, React Context, Tailwind responsive classes
**Reusable for jong-jaroen?** YES — standard pattern สำหรับ multi-device apps
**Key code pattern:**
```typescript
// DeviceProvider.tsx
export const useDevice = () => useContext(DeviceContext)

// In component
const device = useDevice()
<div className={cn(
  device.isMobile && 'grid-cols-1',
  device.isTablet && 'grid-cols-2',
  device.isDesktop && 'grid-cols-4'
)}>
```
**Lessons:** Mobile-first (smallest first) easier than desktop-first, Tailwind breakpoints (sm:, md:, lg:) work well, useMediaQuery too late (flash), better to detect server-side

---

## Feature: Mobile-First Responsive Design

**Project:** CIT
**Description:** ออกแบบ UI starting from mobile (320px) → scale up เป็น tablet (640px) → desktop (1024px) — ไม่มี horizontal scroll ที่ device ไหน
**Pattern:** `p-3 sm:p-4 sm:p-6` (compact mobile → spacious desktop), `text-xs sm:text-sm` (readable ทุก device), `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
**Reusable for jong-jaroen?** YES — MUST DO สำหรับ jong-jaroen (ลูกค้าส่วนใหญ่ใช้ mobile)
**Key code pattern:**
```typescript
// Mobile-first: assume 320px, build up
<div className="p-3 sm:p-4 sm:p-6 text-xs sm:text-sm">
  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
    {/* Card */}
  </div>
</div>

// Touch targets: min 48px (mobile)
<button className="px-3 py-2 sm:px-4 sm:py-2"> {/* 32px mobile → 44px sm → 48px+ lg */}
```
**Lessons:** Grid cols stay same mobile/tablet, change only gap/padding; test on real devices (emulator != real); `truncate` for long text

---

## Feature: Gemini AI Integration (Hardware Analysis)

**Project:** CIT Equipment System
**Description:** เรียก Gemini API เพื่อวิเคราะห์ diagnostic data → ตรวจสอบ failures, predict upgrades, สร้าง sales leads
**API:** `generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`
**Reusable for jong-jaroen?** YES — pattern ใช้ได้ for: document analysis, service recommendations, customer insights
**Cost:** Free tier 1M tokens/month, then paid
**Key code pattern:**
```typescript
// Call Gemini with structured prompt
const prompt = `Analyze equipment diagnostic: ${JSON.stringify(data)}. 
Find: critical issues, battery status, storage health.
Return: JSON { issues: [], opportunities: [], confidence: 0-100 }`

const response = await googleGenerativeAI.generateContent({
  contents: [{ parts: [{ text: prompt }] }]
})
```
**Lessons:** Gemini fast + accurate; structure response with JSON schema in prompt; cache multi-token inputs if batch processing

---

## Feature: Zero-Touch System Design & Auto-Load Rules

**Project:** ทุกโปรเจกต์ของ B3 (เช่น `CLAUDE.md`, `GEMINI.md`, `CODEX.md`)  
**Description:** ลดการรอรับคำสั่งแบบทีละขั้นเพื่อลดความผิดพลาดจากคน (Human error) และรักษาฐานความรู้ร่วมกันของ AI ในทีม
**Pattern:**
1. **Auto-Load Configuration:** ใช้ไฟล์ตั้งค่าและคู่มือที่ระบบสแกนอัตโนมัติในทุกเซสชัน เพื่อฝังกฎ กติกา และลำดับความสำคัญของงาน โดยที่ผู้ใช้ไม่ต้องป้อนคำสั่งซ้ำๆ
2. **One Team Protocol (Substitution):** รักษาคู่มือและฐานข้อมูลกลางไว้ในที่ที่ AI ทุกตัวเข้าถึงได้ เพื่อให้ AI สามารถทำงานทดแทนกันได้เต็มที่เมื่อตัวใดตัวหนึ่งหมดโควตาโทเค็น (Token/Quota Limit)

**หมายเหตุ:**
- หลีกเลี่ยงการพึ่งพา "บทบาทเฉพาะเจาะจงระดับโมเดล" เพียงอย่างเดียว ให้ AI ทุกตัวสามารถรันและวิเคราะห์งานแทนกันได้โดยใช้คู่มือสะกดคำหรือเอกสารสรุปที่เตรียมไว้ล่วงหน้า

---

## Feature: LLM Client Fallback & Quota Management

**Project:** cit-service, b3-team-avenger, b3-second-brain `scripts/ask-gemini.js`  
**Description:** ทำระบบ API client ที่มี fallback ไปยังโมเดลสำรอง (เช่น Groq) เพื่อป้องการเกิน API Quota หรือ Rate Limit ของตัวหลัก ทำให้ระบบทำงานได้อย่างต่อเนื่อง
**Key code pattern:**
```typescript
// Fallback logic สำหรับ LLM Integration
export async function askAIWithFallback(prompt: string): Promise<string> {
  try {
    // ลองใช้งานโมเดลหลัก (เช่น Gemini Free Tier)
    return await callGeminiAPI(prompt)
  } catch (error: any) {
    // ตรวจสอบว่าพังเพราะเกินโควตา หรือ Rate limit หรือไม่
    const isQuotaError = error.status === 429 || String(error).includes('quota')
    
    if (isQuotaError) {
      console.warn("⚠️ [LLM Fallback] Gemini quota limit hit. Switching to Groq...")
      try {
        // Fallback ไปใช้โมเดลสำรองที่ฟรีและเร็ว เช่น Groq (Llama-3)
        return await callGroqAPI(prompt)
      } catch (groqError) {
        console.error("❌ [LLM Fallback] Both primary and fallback APIs failed.", groqError)
        throw new Error("AI Services Unavailable")
      }
    }
    throw error // โยน error อื่นๆ ต่อไปหากไม่ได้เกิดจาก quota
  }
}
```
**หมายเหตุ:**
- เก็บ API Key หลายค่ายแยกกันอย่างชัดเจนใน `.env` เช่น `GEMINI_API_KEY`, `GROQ_API_KEY`
- ป้องกันการรัน API วนซ้ำแบบไม่มีที่สิ้นสุดด้วยการจำกัด Hop เสมอ

---

## Feature: Multi-Model UX Evaluation Scorecard

**Project:** `wiki/ai-war-room/sessions/`  
**Description:** รวบรวมและเปรียบเทียบคะแนนประสิทธิภาพ UI/UX จาก AI หลายตัวอย่างเป็นหมวดหมู่ตามเกณฑ์มาตรฐาน ป้องกันข้อมูลสรุปคลาดเคลื่อน
**Prompt template:**
```text
Do not browse. Use only this context. Return JSON only.
Scores: task_clarity, search_and_findability, visual_hierarchy, mobile_usability, conversion_readiness, trust_and_compliance, local_community_fit, implementation_risk.
Each score: 0-10. Include overall_score 0-100, ship_recommendation, top_issues, confidence.
Do not explain the context.
```
**ผลลัพธ์ที่คาดหวัง (JSON Schema):**
```json
{
  "scores": {
    "task_clarity": 8,
    "search_and_findability": 7,
    "visual_hierarchy": 9,
    "mobile_usability": 8,
    "conversion_readiness": 6,
    "trust_and_compliance": 8,
    "local_community_fit": 7,
    "implementation_risk": 5
  },
  "overall_score": 78,
  "ship_recommendation": "PROCEED_WITH_CAUTION",
  "top_issues": ["Low contrast on action buttons", "Missing localized currency support"],
  "confidence": 85
}
```
**หมายเหตุ:**
- ห้ามคาดเดาหรือเขียนคะแนนขึ้นมาเองในระบบวิเคราะห์ผลหาก AI ตัวใดตอบไม่สมบูรณ์ (ให้ทำเครื่องหมายเป็น Pending หรือ Invalid ชัดเจนใน `synthesis.md`)

---

## Feature: AI-to-AI Incident Relay & Deadlock Resolution (OpenClaw)

**Project:** b3-second-brain (`wiki/ai-war-room/` และ `sessions/_TEMPLATE/incident-relay.md`)  
**Description:** จัดการและแก้ปัญหาเมื่อเกิดการ Block หรือ Deadlock ระหว่างการทำงานร่วมกันของ AI ทีม (เช่น Claude ค้าง, Gemini เขียนไฟล์ไม่ได้)
**Pattern (Incident Relay File):**
สร้างเอกสาร `sessions/<task_id>/incident-relay.md` เพื่อใช้สื่อสารแก้ไขปัญหาร่วมกัน:
```markdown
# AI-to-AI Incident Relay — [TASK_ID]

- **Severity:** P0 deploy blocker | P1 workflow stuck | P2 quality issue
- **Stuck Agent:** Gemini (e.g. unable to write files in automation mode)
- **Target Agent:** Claude
- **Status:** Opened

## Evidence
[คัดลอก Error, ข้อมูล log หรือเนื้อหาไฟล์จากนอก Workspace มาไว้ตรงนี้ เพื่อให้โมเดลอื่นที่ติดข้อจำกัดด้านพื้นที่/API สามารถเข้าถึงได้]

## Discussion & Decision
Every reply must end with a transition.
Format:
- [REPLY:agent_name] - Details...
- [TRIGGER:target_agent] or FINAL: (when completed)

## Close Gate Checklist
- [ ] Root Cause identified
- [ ] Evidence recorded inside workspace
- [ ] Decision / Fix / Workaround documented
- [ ] Residual risk evaluated
- [ ] Prevention rule added to GEMINI.md/CLAUDE.md
- [ ] Next owner & action assigned
```
**หมายเหตุ:**
- ปิดกั้นปัญหา Deadlock ด้วยเงื่อนไข Timeout: หากติดต่อส่งกลับกันเกิน 3 hops หรือไม่มีการตอบรับที่เป็นประโยชน์หลังผ่านไป 30 นาที ให้ Escalate หาคุณ B3 ทันที
- ใช้กลไกนี้สำหรับเคสระบบหลักติดขัดจริงๆ เท่านั้น ไม่ใช้กับบั๊กย่อยๆ ทั่วไป

---

## Feature: File & Docs Architecture (Root Hygiene)

**Project:** ทุกโปรเจกต์ของ B3 (cit-service, b3-team-avenger, b3-second-brain)  
**Description:** ควบคุมและจัดระเบียบไฟล์ ไม่ปล่อยให้ไฟล์ชั่วคราวหรือ setup/config วางรกสะเปะสะปะที่โฟลเดอร์ Root ซึ่งก่อให้เกิดปัญหา Token Drain ในเซสชันถัดๆ ไป
**Best Practices:**
1. **Keep Root Clean:** ก่อนสร้างไฟล์ใหม่ในระดับ Root ให้ตรวจสอบเสมอว่าควรนำไปจัดเก็บในโฟลเดอร์เฉพาะ เช่น `docs/` หรือ `wiki/` หรือไม่
2. **Single Source of Skills:** หลีกเลี่ยงการคัดลอกไฟล์ทักษะ (Skill files) ซ้ำกันหลายที่ (เช่น .claude/skills/ เท่านั้น) เพื่อป้องกันปัญหาการแก้ไขไฟล์ผิดเวอร์ชัน
3. **Workspace Registry:** ตรวจสอบตำแหน่งโปรเจกต์กับ Registry เสมอ เพื่อไม่ให้เผลอสร้างโปรเจกต์ทับซ้อนกัน

---

## Feature: Credentials Security & Git Hygiene

**Project:** ทุกโปรเจกต์ของ B3  
**Description:** รักษาความปลอดภัย ป้องกันข้อมูลสำคัญและกุญแจ API (เช่น `SUPABASE_SERVICE_ROLE_KEY`) รั่วไหลเข้าสู่ Git repository
**Best Practices:**
1. **No MD Secrets:** ห้ามใส่ Credentials หรือ Service role keys ลงในไฟล์ Markdown (`.md`) ที่ถูก track ใน Git เด็ดขาด
2. **Credentials Isolation:** ย้ายไฟล์ข้อมูลความลับไปไว้ในโฟลเดอร์เฉพาะที่ไม่อยู่ใน Git (เช่น `wiki/credentials/` หรือ Private Memory `~/.gemini/tmp/`)
3. **Strict Env Use:** เรียกใช้ความลับผ่านระบบ Environment variables (`.env` / `process.env`) เสมอ และคอยตรวจสอบและรีพอร์ตทันทีหากเจอข้อมูลหลุดใน to-b3/ หรือ inbox ของทีม

---

*Source: [[cit-project]] | [[b3-team-avenger-project]] | [[cit-sla-research]]*
*อัปเดตครั้งถัดไปเมื่อมี feature ใหม่ — ดู [[CROSS-PROJECT REUSE PROTOCOL]]*