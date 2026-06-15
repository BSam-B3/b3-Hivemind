# Shared Lessons — B3 AI Team
**อัปเดตโดย:** ทุก AI ทุกครั้งที่เจอ bug pattern / solution ใหม่
**วิธีเพิ่ม:** เขียนต่อท้ายไฟล์นี้เลย ไม่ต้องรอ B3

> กฎ: เขียนเฉพาะสิ่งที่ไม่ obvious — ถ้าอ่านแล้วรู้สึกว่า "รู้อยู่แล้ว" ไม่ต้องเขียน

---

## 🐛 Bug Patterns & Fixes

### [2026-06-10] Next.js 15 — params ต้อง await (Claude)
```ts
// ❌ Next.js 14
export default function Page({ params }: { params: { id: string } }) {
// ✅ Next.js 15
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
```
**ใช้กับ:** cit-service, jong-jaroen ทุก dynamic route

### [2026-06-10] Supabase client pattern ที่ถูก (Claude)
```ts
// ✅ ใช้ useMemo เสมอเพื่อป้องกัน re-instantiate
const supabase = useMemo(() => createClient(), [])
// ❌ ไม่ทำ
const supabase = createClient() // inside component body = re-create ทุก render
```

### [2026-06-10] wallets.balance_satang คือ bigint ×100 (Claude)
- `balance_satang = 1000` = ฿10.00
- ต้องหาร 100 ก่อนแสดงผลเสมอ
- เกี่ยวข้อง: `place_marketplace_order` RPC, wallet page

---

## 🎨 UI Patterns

### [2026-06-10] Gradient header standard (Claude)
```tsx
<div className="relative bg-[linear-gradient(145deg,#D93414_0%,#EE4D2D_48%,#FF7337_82%,#FFB22B_100%)] rounded-b-[2.5rem] px-5 pt-10 pb-10 overflow-hidden">
  <div className="absolute inset-0 opacity-[0.07]" style={{backgroundImage:'radial-gradient(circle,#fff 1px,transparent 1px)',backgroundSize:'20px 20px'}} />
  <div className="absolute top-0 left-0 right-0 h-px bg-white/30" />
  {/* content */}
</div>
```
**ห้ามใช้กับ:** dark theme pages (slate/zinc/black bg), admin pages, print pages, pages ที่มี sticky multi-step header

### [2026-06-10] Cart/Queue button stacking (Claude)
- ถ้ามีทั้ง cart bar และ queue button ต้องใช้ dynamic bottom:
```tsx
<div className={`fixed left-0 right-0 z-40 ${cartCount > 0 ? 'bottom-36' : 'bottom-20'}`}>
```

---

## ⚡ Performance & Token Saving

### [2026-06-10] Local AI routing (Claude) — อัปเดต 2026-06-10
- งานที่ตอบได้โดยไม่ต้องออกอินเทอร์เน็ต → route ไป local ก่อนเสมอ
- **Models:** qwen2.5:3b (Thai/analysis ~9s, 13.6 t/s) + qwen2.5-coder:3b (coding ~8.7s, 9 t/s)
- Auto-routing: keyword code/function/sql → qwen2.5-coder:3b | อื่นๆ → qwen2.5:3b
- Endpoint: http://127.0.0.1:11434/v1 (Ollama native — ไม่ต้อง One API/Docker)
- Quality gate: retry 1 ครั้งถ้า output <100 chars หรือ coding task ไม่มี code block → fallback Claude
- Claude/Codex ใช้ 5,000-50,000 tokens ต่องาน — local ฟรี 0 token

### [2026-06-10] Atomic trigger = 1 งาน ≤ 600 chars (Claude)
- trigger instruction > 600 chars → watcher block
- ถ้างานใหญ่ break เป็น trigger ย่อย ส่งทีละอัน

---

## 🗄️ Database

### [2026-06-10] jong-jaroen Supabase project ID (Claude)
- `uidkyvqjwigzidxpwort` = jong-jaroen / b3-avenger
- `hwvivibnkytkmbkvbatv` = cit-service

### [2026-06-10] place_marketplace_order RPC (Claude)
- SECURITY DEFINER — validate ทุกอย่างฝั่ง DB
- ห้าม pass ราคาจาก frontend — DB query ราคาเอง
- cart payload: `{ product_id, shop_id, quantity }` เท่านั้น

---

## 📋 วิธีเพิ่ม lesson ใหม่

```
### [YYYY-MM-DD] หัวข้อ (ชื่อ AI)
[อธิบาย bug/pattern/gotcha]
```
