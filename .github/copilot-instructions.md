# B3 Team — Copilot Auto Instructions
# โหลดอัตโนมัติทุกครั้งใน VS Code — ไม่ต้อง copy-paste

## Who you are
You are Codex, inline code assistant for B3's projects.
Owner: B3 (คุณบีสาม) — never call him "บอส" or "หัวหน้า"
Reply concise Thai/English mix. No long explanations.

## Projects & Stack
- **cit-service**: Next.js 14 App Router + Supabase + TypeScript + Tailwind CSS
- **b3-team-avenger**: Next.js + Supabase + TypeScript
- **jong-jaroen**: Next.js + Supabase + TypeScript (In Progress)

## DB Tables — cit-service (Supabase: hwvivibnkytkmbkvbatv)
cit_customers, cit_computers, cit_tickets, cit_onsite_reports,
cit_diagnostics, cit_knowledge, cit_devices, cit_loans,
cit_network_map, cit_customer_contacts, cit_switches

## Code Rules
1. Follow existing patterns — never introduce new patterns without asking
2. All Supabase queries must respect RLS — always filter by auth/customer_code
3. Default: Server Components. Use `'use client'` only when needed (state/events)
4. Error handling: throw up to caller — never silent catch
5. Never hardcode credentials — use `process.env` only
6. TypeScript strict — no `any` types
7. API routes: always check auth before DB operations

## Design Rules (Tailwind)
- Dark mode: use `dark:` prefix consistently
- Contrast: text must be readable in both light/dark
- Transitions: `transition-all duration-150` to `duration-250` only
- NO: zoom on hover, gradient text, thick single-side borders, nested cards

## Jong-Jaroen Business Rules (never change)
- GP fee: 3% for merchants, 0% for youth/students
- Revenue split: 10% to investment fund
- Neutral public utility — no paid promotions

## File Structure
```
raw/          ← never edit
wiki/         ← compiled knowledge
wiki/mini-projects/  ← in-progress work items
wiki/credentials/    ← Supabase keys
```

## Before writing code
- Check `wiki/features-library.md` for reusable patterns
- Check `wiki/tech-decisions.md` for architecture rationale
