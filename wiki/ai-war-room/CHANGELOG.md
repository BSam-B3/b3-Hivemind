# AI War Room — System Changelog

> บอร์ดประกาศการอัปเดตระบบ — ทุก AI append ที่นี่เมื่ออัปเดตเสร็จ
> Format: `## YYYY-MM-DD HH:MM ICT — [agent] title`
> อ่านก่อน session เพื่อรู้ system state ปัจจุบัน

---

## 2026-06-10 23:04 ICT — [gemini] Implement GitHub Actions security workflow to protect core project files from external modifications

## 2026-06-10 21:22 ICT — [gemini] Implement B3 HiveMind Inbound Firewall scanner script to evaluate new knowledge from quarantine

## 2026-06-10 21:19 ICT — [gemini] Implement B3 HiveMind Franchise packing script and inject AI-to-AI system protocol mandate to AGENTS.md

## 2026-06-10 21:02 ICT — [gemini] Simplify b3-hivemind-friend-guide.md by removing Level taxonomy and focusing on direct setup steps

## 2026-06-10 17:01 ICT — [gemini] Upgrade b3-hivemind-friend-guide.md to a Level 1-5 setup matching user capability/budget

## 2026-06-10 16:58 ICT — [gemini] Add B3 HiveMind project blueprint and friend onboarding guide in wiki/projects/

## 2026-06-10 15:20 ICT — [gemini] Create Ailocal & AiPrompt Integration Guide in wiki/ai-concepts/ailocal-aiprompt-guide.md

## 2026-06-10 15:16 ICT — [claude] fix(marketplace): code audit 4 issues — remove AI Slop hover zoom (3 places), wire category filter, replace alert() with inline error banner, add img alt+fallback | fix(gemini): GEMINI_CLI_NO_RELAUNCH=1 permanent fix for exit-55 relaunch loop | fix(trigger-ai): local AI instruction >300 chars warning

## 2026-06-10 14:07 ICT — [claude] fix(watcher): auto-start watchdog from session-start; watchdog check 30s + crash backoff; fix Local AI port 11434; add start-openclaw.bat for Windows boot

## 2026-06-10 13:54 ICT — [claude] upgrade: local AI models → qwen2.5:3b + qwen2.5-coder:3b; bench: 9-9.4s / 9-13.6 t/s; endpoint direct Ollama port 11434; DYNAMIC-ROUTING-UPGRADE-TASK complete

## 2026-06-10 11:09 ICT — [claude] fix: SAFE_TASK_ID undefined crash in watcher; fix: ONE_API_ENDPOINT → port 11434 (Ollama native); RUN-LIVE-ROUTING-TEST: dry-run all targets PASS, live local AI PASS

## 2026-06-10 10:08 ICT — [claude] feat: auto-quality check for local AI output (retry once + fallback to Claude if still poor); auto-break rule in CLAUDE.md for tasks with 3+ separable parts

## 2026-06-10 02:07 ICT — [gemini] Hardened local AI stack: refactored oracle, healing, and privacy scripts to use shared One API client; added allowed models allowlist; added local:bench benchmark runner; integrated prompt PII detection scanner in router; added JSON outputs; verified UTF-8 encoding stability.

## 2026-06-10 02:07 ICT — [claude] feat(team-intelligence): token report, local health check, shared-lessons memory, routing decision log — ทีม AI เก่งขึ้น 4 ด้าน

## 2026-06-10 01:58 ICT — [claude] feat(openclaw): local AI wired into watcher — runLocal() handler, VALID_AIS includes local, Telegram notify, fallback to INBOX-CLAUDE on fail

## 2026-06-10 01:54 ICT — [claude] fix(ux): implement 3 Gemini audit fixes — cart/queue overlap, confirm() modal, in-store search bar

## 2026-06-10 01:43 ICT — [claude] feat(admin/tasks): create task modal + floating + button — INSERT to tasks table, project/priority/tags/due_date fields, tsc clean, pushed

## 2026-06-10 01:39 ICT — [claude] feat(gradient-headers): applied to services/new, profile/tax, kyc/upload — tsc clean, pushed to jong-jaroen main

## 2026-06-09 14:36 ICT — [claude] feat(migration): add 012_shop_premium_system.sql — product_groups, flash_sales, shop_queues, order_disputes, shop_revenue_summary view, ALTER shops/products with delivery_mode/open_hours/premium cols

## 2026-06-08 23:08 ICT — [gemini] เพิ่มมาตรการความปลอดภัยและ UX: บังคับให้ผู้ใช้กรอกเลขที่บัญชีครบก่อนอัปโหลดรูปภาพ และเคลียร์รูปออกจากพรีวิวทันทีหากผลตรวจ OCR ไม่ตรงกัน (Auto-clear on fail)

## 2026-06-08 23:05 ICT — [gemini] ปรับปรุงหน้า bank profile และ backend API ให้ดึงไฟล์จาก private storage และตรวจสอบเลขบัญชี + ชื่อจริง KYC อย่างเข้มงวด ป้องกันการหลอกและเปลี่ยนผ่าน UI

## 2026-06-08 23:01 ICT — [gemini] Enhanced bank book OCR with real-time background auto-trigger and typing state reset.

## 2026-06-08 22:57 ICT — [gemini] Hardened bank book OCR verification with strict blocking on both client and server API.

## 2026-06-08 22:46 ICT — [gemini] Forced bank book OCR verification check on save to prevent bypass.

## 2026-06-08 22:43 ICT — [gemini] Bugfix for crop done transition and dynamic fallback in bank book verification page.

## 2026-06-08 22:40 ICT — [gemini] Implemented bank book OCR verification using Tesseract.js and visual crop guidelines in jong-jaroen.

## 2026-06-06 22:52 ICT — [gemini] อัปเดตระบบแก้ไขโปรไฟล์ (Basic & Legal) ของ Jong Jaroen: ปรับปรุง Layout ให้เป็น Full-width ตามมาตรฐาน Enjoy, บังคับใช้กล้องสดในการส่งคำขอ และแทรกข้อมูลพิกัด GPS ป้องกันการทุจริต

## 2026-06-06 16:02 ICT — [claude] review: zone_sponsorships admin page (jong-jaroen) — Codex สร้าง page.tsx ✅ — Claude fix counts bug: fetch all → filter client-side เพื่อให้แท็บสถานะแสดงตัวเลขถูกต้อง — tsc ผ่าน

## 2026-06-06 16:01 ICT — [claude] Session 2026-06-06 close: zone-sponsorships admin + loyalty balance committed. All jong-jaroen UI complete. Closing session.

## 2026-06-06 15:40 ICT — [claude] Batch complete: jong-jaroen zones/page.tsx + zones/[zoneId]/page.tsx + admin/zones/page.tsx committed. CIT onsite new page + API committed (Codex schema corrected to match existing cit_onsite_reports). payment-slips bucket fixed (private+5MB+RLS). watcher crash fix (setEncoding guard).

## 2026-06-06 15:04 ICT — [claude] Gemini pricing research processed: migration 018 applied — free tier added, Bronze 299→199 THB for rural Rayong market. synthesis.md written.

## 2026-06-06 15:02 ICT — [claude] Multi-project batch: (1) b3-avenger PDF approve fix — query customer/template separately, fix null join. (2) CIT MA cron — CRON_SECRET guard added. (3) jong-jaroen migration 017 live: sponsor_packages(3-tier seeds), zone_sponsorships, loyalty_points, loyalty_redemptions, loyalty_monthly_cap. (4) jong-jaroen APIs: loyalty/earn, loyalty/balance, sponsor/activate. (5) zone-sponsor war room advanced Phase 0→Phase 2. (6) Codex dispatched: zone-listing + zone-detail pages. (7) Gemini dispatched: sponsor pricing research.

## 2026-06-06 14:49 ICT — [claude] jong-jaroen Phase 6 complete: security audit (jj_zones RLS fixed, SECURITY DEFINER search_path verified, admin routes guarded, coupon input validation), cron expiry (vercel.json */5), vercel.json created, no-go DB query 0/0/0 clean

## 2026-06-06 14:38 ICT — [claude] openclaw-trigger-watcher.js: 3 bug fixes — (1) maxBuffer 50MB ป้องกัน ENOBUFS (2) Gemini timeout 120s→300s (3) ENOBUFS classify ถูกต้อง + rate limit cooldown 60s ก่อน retry trigger

## 2026-06-06 14:25 ICT — [claude] Jong Phase 5 complete: create-intent route, coupon routes (quote/reserve/release/redeem), admin coupon CRUD UI (draft→active→pause→archive, budget bar). task-map payment-ops Phase 5 marked done.

## 2026-06-06 — [claude] cit-service: Staff Login flow implemented — /api/auth/staff/login (POST→JWT), /api/auth/staff/logout, /staff page เพิ่ม email/password form, middleware RBAC manager-only /staff/admin/*

## 2026-06-06 14:01 ICT — [claude] Migration 015: Coupon system applied to Supabase (uidkyvqjwigzidxpwort) — jj_zones (5 pilot zones seeded), coupons, coupon_zones, coupon_reservations, coupon_redemptions, coupon_audit_logs + RPCs reserve/redeem/release. quotation-pdfs storage bucket created in avenger. approve-payout + voice-web API routes built.

## 2026-06-06 11:48 ICT — [claude] Claude direct implementation: (1) Avenger voiceParser.ts ขยาย 2→9 intents (CHECK_EMAIL,CREATE_QUOTATION,FETCH_BRIEF,CHECK_STATUS,SEARCH_KNOWLEDGE,SET_REMINDER,OPEN_CALENDAR) (2) Jong create-payout-item route — calls create_payout_item RPC, admin-only, tsc clean (3) CIT staff login wired: middleware.ts protect /staff/*, staff/page.tsx Microsoft OAuth onClick, auth-callback page role validation

## 2026-06-06 11:35 ICT — [claude] War Room dispatch round 3: Jong(verify-payment route), CIT(ma-alerts cron, staff-login spec→Gemini), Avenger(real PDF, Jarvis ZIP). Codex 5 tasks + Gemini 2 tasks running in parallel across 3 projects.

## 2026-06-06 11:28 ICT — [claude] War Room dispatch round 2: ปิด jong-payment-phase5 (migrations+dashboard done). Trigger Codex x2 (create-intent API, upload-slip API). Trigger Gemini (meeting-docs). Handoff payment-ops-legal → Codex Phase 4.

## 2026-06-06 11:22 ICT — [claude] ปิด task 2026-06-04-gemini-self-alignment-and-process-audit: assigned owner=gemini, coordinator=claude, reviewer=claude. Gemini audit เสร็จ (lessons+doctor), Claude review pass, task finalized.

## 2026-06-06 11:20 ICT — [claude] War Room dispatch 2026-06-06: ปิด 2 tasks (marketplace-promo-carousel, avenger-realtime MVP). Trigger Gemini x2 (self-alignment, zone-hierarchy). Trigger Codex x3 (payment-dashboard-tsc, migrations-commit, coupon-spec). Claude เขียน sponsor-packages + loyalty-rules Phase 1 สำหรับ jong-zone-sponsor task

## 2026-06-06 11:06 ICT — [claude] 2026-06-06: OpenClaw watcher crash protection + watchdog auto-restart สร้างเสร็จ. SQL audit (Gemini) ตรวจแล้ว — migrations 007/008/010 ถูกต้องครบ ไม่ต้องแก้. Think Tank TT delivery payout + TT semi-auto threshold 500 ปิด: Codex+Gemini เห็นตรงกัน 100% กับ Claude.

## 2026-06-05 22:55 ICT — [gemini] ปรับปรุงดีไซน์การ์ดเลือกบริการในหน้า Errand ให้มีมิติ เงา และ hover effect ที่สวยงามยิ่งขึ้น

## 2026-06-05 22:51 ICT — [gemini] เอาขั้นตอนการทำงาน (stepper) 3 ขั้นตอนออกจากหน้า errand

## 2026-06-05 23:10 ICT — [claude] Gemini SQL Audit RETURN processed: verified all fixes already applied in 007/008/010. Added missing updated_at auto-triggers for 6 tables (payment_intents, payout_items, payout_batches, dispute_cases, platform_config, worker_kyc_summary) via set_updated_at() in 006_payment_ops_schema.sql

## 2026-06-05 22:33 ICT — [claude] Fix payment-ops migrations 007/008/010: column mismatch (employer_id→customer_id, worker_id→freelancer_id), SECURITY DEFINER search_path, WHT empty-string check

## 2026-06-05 21:20 ICT — [claude] jong-jaroen: Apply migrations 006-010 payment ops to Supabase production (uidkyvqjwigzidxpwort). Fixed 3 schema mismatches before apply: 007 RLS j.customer_id→employer_id/freelancer_id→worker_id, 008 RPCs same + WHT threshold from platform_config + daily_cap from config, 010 SLA cron rewritten to match actual confirmations schema. Also extended job_status enum: +worker_submitted_completion +completed_for_payout. All 5 migrations applied successfully.

## 2026-06-05 12:27 ICT — [claude] Persona = หน้ากาก, Model = คนสวม — B3 เลือก model ตาม cost ได้ Groq(ฟรี)/Gemini(research)/Codex(โค้ด)/Claude(complex)

## 2026-06-05 12:11 ICT — [claude] Persona System: persona.js CLI (load/list/upskill/review) + Skills & Learnings ใน persona files + protocol ใน CLAUDE/CODEX/GEMINI.md

## 2026-06-05 11:57 ICT — [claude] Gemini 10 items implemented (proxy): GEMINI.md auto-session rules, RFC-TT-summary-protocol.md. Codex 10 items: npm verify, PR template, known-failures, pre-commit in 3 projects

## 2026-06-05 11:51 ICT — [claude] All 30 self-improvements assigned: Claude 10 done, Codex+Gemini triggered to implement own 10 items each

## 2026-06-05 11:46 ICT — [claude] TT synthesized: TT-2026-06-05-10-ways-each-ai-can-improve-itself-and-t — Claude+Codex ส่ง 10 items ครบ, synthesis เขียนแล้ว, top 5 quick wins ระบุแล้ว, Gemini pending full 10 items

## 2026-06-05 11:34 ICT — [claude] Multi-hop test PASS 3 hops in 46s + watchdog ใน team-inbox-poller

## 2026-06-05 11:24 ICT — [claude] Fix Think Tank/RFC bugs: idempotent append, runner writes all files, originator from frontmatter

## 2026-06-05 11:18 ICT — [claude] TT-2026-06-05-think-tank-system-will-it-work-bugs-to-f: Think Tank closed — มติ: simplify orchestration (appendLedger + runner owns side effects + state machine). Summary → wiki/to-b3/TT-SUMMARY-think-tank-bugs-2026-06-05.md

## 2026-06-05 10:52 ICT — [claude] Think Tank loop ครบทุก AI — creator trigger กลับ creator, auto-collect + notify B3 Thai เมื่อครบทุก thought

## 2026-06-05 10:47 ICT — [claude] Think Tank loop ครบทุก AI — creator trigger กลับ creator, auto-collect + notify B3 Thai เมื่อครบทุก thought

## 2026-06-05 10:45 ICT — [claude] Think Tank system + hard block atomic + channel hierarchy + multi-hop test script

## 2026-06-05 10:35 ICT — [claude] RFC-2026-06-05-team-system-upgrade-review: opinion-done → closed ✅ Decision: APPROVED, priority next = real-world multi-hop loop test

## 2026-06-05 10:20 ICT — [claude] team-inbox-poller.js — Claude+Gemini+Codex poll INBOX ทุก 10 นาที, atomic tasks only, Task Scheduler B3TeamInboxPoller

## 2026-06-05 10:10 ICT — [claude] Atomic task protocol + trigger-ai.js warning + claude-inbox-poller.js (Task Scheduler ทุก 10 นาที)

## 2026-06-05 10:05 ICT — [gemini] Deployed Zaapi AI Chatbot CRM and Handoff feature to production. Added agent_handoffs table, Escalation Hook, and Handoff Dashboard at /admin/handoff

## 2026-06-05 09:54 ICT — [claude] Claude autonomous notify B3 Thai + Codex fallback on context limit + RFC opinion auto-append loop

## 2026-06-05 09:54 ICT — [claude] zaapi CRM handoff verified complete — DB+API+Dashboard พร้อม production

## 2026-06-05 09:40 ICT — [claude] Claude autonomous notify B3 Thai + Codex fallback on context limit + RFC opinion auto-append loop

## 2026-06-05 09:30 ICT — [claude] เพิ่ม b3-notify.js — Thai digest ส่ง Telegram อัตโนมัติเมื่อ Claude ปิด session + npm run b3:notify

## 2026-06-05 09:20 ICT — [claude] เพิ่ม RFC Board + CHANGELOG + board-post.js + Team Board Rules ใน CLAUDE/CODEX/GEMINI.md

## 2026-06-05 01:50 ICT — [claude] OpenClaw Full Loop + Team Boards

**Changes:**
- `scripts/openclaw-trigger-watcher.js` — เพิ่ม `claude` ใน AI_CMD, `runClaude()`, `commandFor claude -p`, fix classifyFailure regex, Claude timeout 300s, UTF-8 encoding
- `scripts/session-start-check.js` — Check 6 (INBOX scan), Check 7 (stale 24h), queue display ใหม่
- `wiki/ai-war-room/RFC/` — สร้างใหม่ สำหรับ team proposals
- `wiki/ai-war-room/CHANGELOG.md` — สร้างใหม่ (ไฟล์นี้)

**Result:** Loop Claude↔Codex↔Gemini ครบวงจร autonomous แล้ว

---

## 2026-06-04 — [codex] OpenClaw Trigger System v4

**Changes:**
- `scripts/openclaw-trigger-watcher.js` — watcher v4, Supabase sync, failure handoff, quality gate
- `scripts/trigger-ai.js` — CLI trigger สำหรับทุก AI
- `wiki/ai-war-room/AI-TO-AI-INCIDENT-RELAY.md` — incident relay protocol

**Result:** Gemini + Codex autonomous ผ่าน OpenClaw

---
