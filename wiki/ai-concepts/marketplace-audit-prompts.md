# Marketplace UI Audit Prompts — B3 Team Guide
**อัปเดต:** 2026-06-10 ICT | **ใช้กับ:** Claude / Gemini / Codex

---

## วิธีใช้ไฟล์นี้
Copy prompt ตรงๆ แล้วแทนที่ `[URL]` / `[ชื่อ]` — ออกแบบให้ได้ผลลัพธ์ที่ actionable ทันที

---

## 1. Shop Listing Audit

**ใช้เมื่อ:** ต้องการ audit หน้ารายการสินค้า / shop / marketplace listing

```
Audit หน้า shop listing ที่ [URL] โดยตรวจสอบ:

VISUAL HIERARCHY
- Product card: ชื่อ / ราคา / รูปภาพ มี contrast และ reading order ที่ถูกต้องไหม?
- CTA (Add to cart / Buy now) โดดเด่นพอไหมเทียบกับ element อื่น?
- Badge / Label (Sale, New, Out of stock) อ่านง่ายไหม?

GRID & DENSITY
- จำนวน column บน mobile / tablet / desktop เหมาะสมไหม?
- Spacing ระหว่าง card สม่ำเสมอไหม?
- Infinite scroll vs pagination — UX ดีกว่ากันในบริบทนี้?

FILTER & SORT
- Filter อยู่ที่ไหน? เข้าถึงได้ง่ายไหมบน mobile?
- Active filter แสดงชัดไหม? ล้างได้ง่ายไหม?

OUTPUT: ให้คะแนน 1-10 พร้อม top 3 issues + spec แก้ไขสั้นๆ
```

---

## 2. Checkout Flow Audit

**ใช้เมื่อ:** ต้องการ audit หน้า checkout / cart / payment

```
Audit checkout flow ของ [ชื่อโปรเจค] ตั้งแต่ cart → payment confirmation โดยตรวจ:

FRICTION POINTS
- กี่ step จาก cart ถึง paid? มี step ไหนที่ตัดออกได้?
- Guest checkout มีไหม? ถ้าไม่มี — จำเป็นไหม?
- Form fields: มี field ไหนที่ไม่จำเป็นสำหรับ transaction นี้?

ERROR HANDLING
- ถ้ากรอก card ผิด — error message ชัดเจนและอยู่ใกล้ field ไหม?
- Session timeout ระหว่าง checkout — ข้อมูลที่กรอกไว้หายไหม?

TRUST SIGNALS
- SSL badge / payment logo / security text มีอยู่ตรงไหน?
- Order summary แสดงครบถ้วนก่อนกด confirm ไหม?

MOBILE SPECIFIC
- Keyboard type ถูกต้องไหม? (numeric สำหรับ card number, email สำหรับ email)
- CTA button ใหญ่พอสำหรับ thumb zone ไหม?

OUTPUT: Friction score (จำนวน unnecessary steps) + top 3 fixes
```

---

## 3. Mobile UX Audit

**ใช้เมื่อ:** ต้องการตรวจ mobile-specific UX ปัญหา

```
ทำ mobile UX audit สำหรับ [URL หรือ ชื่อ feature] โดยใช้ viewport 375px (iPhone SE) และ 390px (iPhone 14):

TOUCH TARGETS
- ปุ่มและ link ทั้งหมด ≥44×44px ไหม?
- Tap targets ชิดกันเกิน 8px ไหม? (fat-finger error risk)

THUMB ZONE
- Primary actions (Buy, Submit, Continue) อยู่ใน bottom 40% ของ screen ไหม?
- Navigation อยู่ position ไหน? ถือมือเดียวใช้ได้ไหม?

PERFORMANCE FEEL
- มี loading skeleton ระหว่างโหลดข้อมูลไหม?
- Image lazy loading ทำงานถูกต้องไหม?
- Interaction response ≤100ms รู้สึกได้ไหม?

SCROLL & OVERFLOW
- มี horizontal scroll ที่ไม่ตั้งใจไหม?
- Modal / bottom sheet ปิดได้ด้วย swipe down ไหม?

OUTPUT: Pass/Fail checklist + critical issues ที่ต้องแก้ก่อน launch
```

---

## 4. AI Slop UI Detection

**ใช้เมื่อ:** ต้องการตรวจว่า UI มีลักษณะ AI-generated โดยไม่ตั้งใจหรือไม่

```
ตรวจ UI ของ [URL หรือ component] ว่ามี "AI Slop" patterns ต่อไปนี้ไหม:

❌ PATTERNS ที่ต้องหลีกเลี่ยง (B3 Design Rules)
□ Neon Glow / สีสะท้อนแสง (เช่น cyan glow บน dark background)
□ Glassmorphism สะเปะสะปะ (blur + transparency ทุก card โดยไม่มีเหตุผล)
□ Shadow หนาเกิน (box-shadow spread >20px หรือ opacity >0.4)
□ Gradient text (background-clip: text) โดยไม่จำเป็น
□ Side-stripe border (colored left-border เป็น decoration เท่านั้น)
□ Nested cards (card ซ้อน card ซ้อน card)
□ Zoom on hover สำหรับ image (transform: scale >1.05)
□ Icon + text ทุกที่ไม่มีลำดับความสำคัญ
□ Animation ที่นาน >250ms หรือ easing ที่ bouncy เกิน

✅ PATTERNS ที่ดี (Restrained Style)
□ Harmonious Palette — ≤3 สีหลัก ไม่มีสีเสริมเกิน 2 ตัว
□ Sleek Dark Mode — พื้นหลัง neutral dark ไม่ใช่ pure black
□ Premium Feel — spacing 넓넓 element บางเบา weight น้อย
□ Contrast ≥4.5:1 ทุก text
□ Animation 150-250ms ease-out เท่านั้น

OUTPUT: รายการ violations + ตำแหน่ง component + แนะนำ fix สั้นๆ
```

---

## 5. Codex Spec Template

**ใช้เมื่อ:** ต้องการเขียน spec ให้ Codex implement UI component

```
Implement [ชื่อ component] ใน [file path]

SPEC:
- Layout: [อธิบาย layout สั้นๆ]
- Breakpoints: mobile (375px) / tablet (768px) / desktop (1280px)
- Colors: ใช้ CSS variable จาก design system — ห้าม hardcode hex
- Typography: ใช้ font scale ที่มีอยู่ใน globals.css
- Animation: transition 150-250ms ease-out เท่านั้น

CONSTRAINTS (B3 Rules — ห้ามทำ):
- ห้าม neon glow / glassmorphism / heavy shadow
- ห้าม gradient text
- ห้าม nested cards เกิน 1 ระดับ
- ห้าม zoom on hover

ACCEPTANCE:
- tsc ผ่าน (npx tsc --noEmit)
- mobile 375px ไม่มี horizontal scroll
- touch targets ≥44px
- เมื่อเสร็จ: node scripts/autonomous-loop.js --project [project] --task [task-id]
```

---

## 6. Gemini Browse Audit

**ใช้เมื่อ:** ต้องการให้ Gemini browse URL แล้วเทียบกับ design reference

```
Browse [URL] แล้วทำ visual audit:

1. Visual hierarchy: อธิบายจาก top → bottom
2. Color palette: สีหลักกี่สี? มี contrast issue ไหม?
3. AI Slop check: มี neon glow / glassmorphism / heavy shadow ไหม?
4. Mobile: ถ้า viewport แคบ elements ซ้อนกันไหม?
5. Design gap: เทียบกับ [reference] ต่างกันตรงไหนมากที่สุด?

OUTPUT:
- คะแนน UX: X/10
- Top 3 issues (เรียงตาม impact)
- Spec แก้ไข (1-2 ประโยคต่อ issue)
เขียนผลลง wiki/to-b3/GEMINI-RETURN-[TASK_ID].md
```

---

*เพิ่ม pattern ใหม่ต่อท้าย section ที่เกี่ยวข้องได้เลย*
