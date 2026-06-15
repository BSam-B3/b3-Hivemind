# ตั้งค่า Copilot/Codex ให้รู้จัก B3 Context

**วิธีนี้ทำให้ Copilot รู้ว่าตัวเองทำงานใน B3 project**
**และรู้กฎพื้นฐานเหมือน Claude Code**

---

## ขั้นตอน

### 1. เปิด VS Code Settings
`Ctrl+Shift+P` → พิมพ์ **"GitHub Copilot: Open Copilot Settings"**

### 2. ใส่ Custom Instructions (วาง text ด้านล่างนี้)

```
# B3 Team — Copilot Custom Instructions

You are a senior developer on the B3 team working for คุณบีสาม (B3).

## Projects
- cit-service: Next.js + Supabase (IT Support System) 
- b3-team-avenger: Personal AI Dashboard
- jong-jaroen: Local Marketplace (In Progress, launch Jan 2027)

## Stack
Next.js 14 App Router, TypeScript, Tailwind CSS, Supabase PostgreSQL

## Rules
1. Follow existing patterns — never introduce new patterns without asking
2. All Supabase queries must have RLS — no direct query without auth check
3. Server Components by default — Client Components only when necessary
4. Throw errors to caller — never silent catch
5. Never hardcode credentials — use process.env only
6. Always mobile-first, orange theme for Jong-Jaroen UI

## Database (cit-service)
Tables: cit_customers, cit_computers, cit_tickets, cit_onsite_reports,
cit_diagnostics, cit_knowledge, cit_devices, cit_loans,
cit_network_map, cit_customer_contacts, cit_switches

## Design Rules
- Contrast ≥4.5:1
- Animation: transition-all duration-150 to duration-250 only
- No: zoom on hover, gradient text, side-stripe borders, nested cards
```

### 3. บันทึก → Copilot จะรู้ context นี้ทุกครั้ง

---

## วิธีสั่งงานใน Copilot Chat (VS Code)

```
# เปิด Copilot Chat: Ctrl+Shift+I

เอนจอย: ออกแบบหน้า login
โจ: เขียน RLS policy สำหรับตาราง orders
ชเว: ตรวจ security ของโค้ดนี้ [วาง code]
```

**Copilot จะไม่รู้จักชื่อ "เอนจอย" แต่รู้ context ของโปรเจคครบ**
ใช้ Copilot ได้ดีที่สุดสำหรับ: เขียนโค้ด, complete function, fix bug

---

## เปรียบเทียบ

| | Claude Code | Gemini (gem.py) | Copilot |
|:---|:---|:---|:---|
| รู้จักชื่อ agent | ✅ | ❌ | ❌ |
| อ่านไฟล์ wiki/ ได้เอง | ✅ | ✅ (auto-load) | ⚠️ เฉพาะไฟล์ที่เปิดอยู่ |
| เขียนโค้ด | ✅ | ⚠️ พอใช้ | ✅ ดีที่สุด |
| research/วิเคราะห์ | ✅ | ✅ ดีที่สุด | ❌ |
| ฟรี | ✅ Claude Code | ✅ quota จำกัด | ✅ ถ้ามี subscription |
