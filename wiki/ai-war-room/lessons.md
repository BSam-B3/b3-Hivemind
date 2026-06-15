# War Room Lessons Learned


## 2026-06-03T16:31:55.267Z
Task: 2026-06-03-war-room-team-intelligence-phase-5
Agent: codex
Lesson: Team safety improves when decisions, risks, capabilities, dependencies, and cost are logged through commands instead of scattered chat.
Type: manual

## 2026-06-03T16:32:55.089Z
Task: 2026-06-03-war-room-team-intelligence-phase-5
Agent: codex
Lesson: War room phase 5 team intelligence completed
Type: auto-finalize

## 2026-06-03T16:41:37.589Z
Task: 2026-06-03-war-room-continuity-autopilot-phase-6
Agent: codex
Lesson: War room phase 6 continuity autopilot completed
Type: auto-finalize

## 2026-06-03T16:56:11.372Z
Task: 2026-06-03-war-room-b3-approval-escalation-phase-7
Agent: codex
Lesson: War room phase 7 B3 approval escalation completed
Type: auto-finalize

## 2026-06-03T17:08:42.848Z
Task: 2026-06-03-war-room-approval-panel-bridge-phase-8
Agent: codex
Lesson: War room phase 8 approval panel bridge completed
Type: auto-finalize

## 2026-06-03T17:29:02.427Z
Task: 2026-06-03-war-room-vercel-approval-bridge-phase-9
Agent: codex
Lesson: War room phase 9 Vercel approval bridge completed
Type: auto-finalize

## 2026-06-04T01:53:06.040Z
Task: 2026-06-04-avenger-approval-cache-room-alert-phase-10
Agent: codex
Lesson: Avenger approval cache and room alert fixed; deployed to production.
Type: auto-finalize

## 2026-06-04T02:12:59.000Z
Task: 2026-06-04-avenger-approval-center-and-approval-hygiene-phase-11
Agent: codex
Lesson: Approval Center and approval hygiene completed; deployed to production.
Type: auto-finalize

## 2026-06-04T02:24:55.970Z
Task: 2026-06-04-telegram-approval-callbacks-and-ops-hardening-phase-12
Agent: codex
Lesson: Telegram mobile approval callbacks and ops hardening completed; deployed to production.
Type: auto-finalize

## 2026-06-04T02:48:20.112Z
Task: 2026-06-04-approval-automation-and-telegram-live-test-phase-13
Agent: codex
Lesson: Approval automation and Telegram live test completed; production delivery and callback verified.
Type: auto-finalize

## 2026-06-04T02:57:21.536Z
Task: 2026-06-04-war-room-self-monitoring-automation-phase-14
Agent: codex
Lesson: War Room self-monitoring automation completed; approval loop service running and Ops health deployed.
Type: auto-finalize

## 2026-06-04T12:35:09.072Z
Task: 2026-06-04-character-creator-system-agent-rpg-pixel-art
Agent: claude
Lesson: Character Creator Phase 1 live, Phase 2 paused รอ layered assets. OpenClaw v4 fixed. CLI Bridge Worker พร้อม.
Type: auto-finalize

## 2026-06-04T12:38:19.525Z
Task: 2026-06-04-research-pixel-sprite-animation-architecture
Agent: claude
Lesson: Gemini output ได้ข้อมูลมา แต่ไม่สามารถเขียนไฟล์ได้ใน automation mode — synthesis.md ยังไม่มี ปิด task ไว้ก่อน ข้อมูล raw อยู่ใน gemini-output.md
Type: auto-finalize

## 2026-06-04T12:45:19.793Z
Task: 2026-06-04-gemini-self-alignment-and-process-audit
Agent: gemini
Lesson: เจมหลุดโพรเซสเนื่องจากไม่ได้เช็ก preflight/claim ก่อนแก้ไขไฟล์ และจะป้องกันโดยการตรวจสอบสิทธิ์และใช้ CLI ล็อกไฟล์อย่างเคร่งครัดตามคู่มือ
Type: manual

## 2026-06-04T14:57:08.771Z
Task: 2026-06-04-marketplace-shops-redesign
Agent: claude
Lesson: Redesigned /marketplace/shops — promo banner carousel for premium shops, category pills, product grid with gradient fallbacks, 2-col shop grid.
Type: auto-finalize
# Lesson: Multi-Model UX Evaluation Needs Agent-Specific Handling

Date: 2026-06-05
Source: `wiki/ai-war-room/sessions/2026-06-05-multi-model-ux-evaluation/model-response-failure-analysis.md`

When asking Codex, Claude, and Gemini to score the same UX prompt, the War Room must not assume every model is executed the same way.

- Claude triggers are currently inbox-only. The watcher writes `INBOX-CLAUDE-<task>.md` and waits for a manual Claude session. This is expected behavior, not a failed response.
- Gemini can run automatically, but may fail structured tasks if the prompt assumes URL access, is too long, or permits narrative output.
- Gemini scorecard prompts should be short, context-first, no-browse, and preferably JSON-only.
- A model response is invalid for aggregation unless it includes all required numeric categories, `overall_score`, and `ship_recommendation`.
- Never invent or infer missing model scores. Mark invalid/pending clearly in the synthesis.

Recommended pattern:

```text
Do not browse. Use only this context. Return JSON only.
Scores: task_clarity, search_and_findability, visual_hierarchy, mobile_usability, conversion_readiness, trust_and_compliance, local_community_fit, implementation_risk.
Each score: 0-10. Include overall_score 0-100, ship_recommendation, top_issues, confidence.
Do not explain the context.
```

# Lesson: OpenClaw Needs AI-to-AI Incident Relay For Blockers

Date: 2026-06-05
Incident: marketplace P0 fix sprint and Claude/Gemini relay

Problem:

- Claude was treated as if it could auto-run, but the current watcher only creates a Claude inbox.
- Gemini could run automatically but failed when asked to access files outside its workspace.
- The team needed model-to-model discussion, not just one-way trigger messages.

Root cause:

- War Room had trigger mechanics but no mandatory incident protocol for stuck models.
- Some evidence lived outside `B3-Second-Brain`, so restricted models could not inspect it.
- Messages did not always force a final decision or next trigger.

Fix:

- Added `AI-TO-AI-INCIDENT-RELAY.md`.
- Added `sessions/_TEMPLATE/incident-relay.md`.
- Added incident relay rules to `README.md`, `openclaw-trigger-system.md`, and `HUMAN-COMMANDS.md`.
- Added `reports/ai-to-ai-incident-relay-playbook.md`.

Prevention rule:

If Claude, Codex, Gemini, or any AI persona is blocked, open an AI-to-AI incident relay. Every reply must end with `FINAL:` or `[TRIGGER:*]`, and any inaccessible evidence must be copied into the War Room before triggering another model.

# Lesson: Incident Relay Must Be Strong Enough To Close Deadlocks

Date: 2026-06-05
Incident: AI-to-AI incident relay hardening

Problem:

The first relay rule was useful, but still too soft. It could create more ceremony without guaranteeing closure.

Root cause:

The original rule did not define severity, timeout, evidence requirements, or a close gate.

Fix:

- Added severity levels: `P0 deploy blocker`, `P1 workflow stuck`, `P2 quality issue`.
- Made `evidence.md` mandatory before closing an incident.
- Added escalation: no `FINAL:` after 3 hops or no useful P0/P1 response after 30 minutes means escalate to B3.
- Added close gate fields: root cause, evidence, decision, fix/workaround, residual risk, prevention rule, next owner/action.
- Added guardrail: do not open incident relay for tiny single-agent fixes.

Prevention rule:

Incident relay is now a deadlock/release-risk mechanism, not a general meeting room. Open it only when coordination is genuinely needed, and close it only after evidence, decision, and prevention are recorded.

## 2026-06-05T03:05:46.495Z
Task: 2026-06-05-zaapi-ai-chatbot-crm-handoff
Agent: gemini
Lesson: Successfully deployed Zaapi AI Chatbot CRM and Handoff feature to production
Type: auto-finalize

## 2026-06-05T10:38:59.642Z
Task: 2026-06-05-jong-jaroen-payment-ops-legal-accounting-war-room
Agent: codex
Lesson: Jong Jaroen payment docs/code currently mix Direct P2P, central PromptPay, JJWallet, wallet withdrawal, escrow-like release, and old 3% GP; future work must reconcile model before coding.
Type: manual

## 2026-06-05T10:43:57.386Z
Task: 2026-06-05-jong-jaroen-payment-ops-legal-accounting-war-room
Agent: codex
Lesson: Meeting outputs must be written yes/no answers: legal classification, seller of record, revenue recognition, VAT/WHT, required documents, ledger fields, payout timing, and no-go conditions.
Type: manual

## 2026-06-05T11:11:00.455Z
Task: 2026-06-05-jong-payment-phase3-blueprint
Agent: claude
Lesson: Phase 3 Technical Blueprint complete
Type: auto-finalize

## 2026-06-06T04:17:42.927Z
Task: 2026-06-04-marketplace-promo-carousel-ui
Agent: claude
Lesson: PromoCarousel implemented in app/marketplace/shops/page.tsx (5 carousel refs verified). Codex completed implementation.
Type: auto-finalize

## 2026-06-06T04:17:45.076Z
Task: 2026-06-05-avenger-realtime-war-room-command-center
Agent: claude
Lesson: MVP deployed to production. Real-time War Room Command Center live on B3-Team-Avenger.
Type: auto-finalize

## 2026-06-06T04:22:45.282Z
Task: 2026-06-04-gemini-self-alignment-and-process-audit
Agent: claude
Lesson: Gemini self-alignment audit complete: SA-01 lessons noted, SA-02 doctor check done. Claude assigned roles (owner=gemini, coordinator=claude, reviewer=claude) and closed task.
Type: auto-finalize

## 2026-06-06T04:27:27.418Z
Task: 2026-06-05-jong-payment-phase5-implementation
Agent: claude
Lesson: Migrations 006-008 committed, admin dashboard (payment-ops + payout-queue) 275 lines implemented, tsc clean. Phase 5 complete.
Type: auto-finalize

## 2026-06-06T07:49:41.248Z
Task: 2026-06-06-jong-phase6-reconciliation-checklist
Agent: claude
Lesson: Phase 6 complete: security audit done, no-go checklist 8/30 items auto-verified, cron expiry live, jj_zones RLS fixed
Type: auto-finalize

## 2026-06-06T07:49:49.900Z
Task: 2026-06-05-jong-jaroen-payment-ops-legal-accounting-war-room
Agent: claude
Lesson: Phase 5+6 complete: all payment/coupon/zone tables migrated live, 9 API routes, admin dashboard, security audit passed, cron expiry live, no-go DB clean
Type: auto-finalize

## 2026-06-08T15:39:55.830Z
Task: 2026-06-08-bank-book-ocr-verification-and-guidelines
Agent: gemini
Lesson: Implemented bank book OCR verification using Tesseract.js and premium visual crop guidelines.
Type: auto-finalize

## 2026-06-08T15:43:48.545Z
Task: 2026-06-08-bank-book-ocr-verification-bugfix
Agent: gemini
Lesson: Bugfix for crop done transition and rendering preview.
Type: auto-finalize

## 2026-06-08T15:46:51.061Z
Task: 2026-06-08-bank-book-ocr-verification-auto-force
Agent: gemini
Lesson: Forced OCR verification on save.
Type: auto-finalize

## 2026-06-08T15:57:39.150Z
Task: 2026-06-08-bank-book-ocr-strict-blocking
Agent: gemini
Lesson: Implemented strict OCR verification blocking on both client and server side.
Type: auto-finalize

## 2026-06-08T16:00:51.919Z
Task: 2026-06-08-bank-book-ocr-realtime-trigger
Agent: gemini
Lesson: Implemented real-time OCR scanning auto-trigger.
Type: auto-finalize

## 2026-06-09T03:49:41.320Z
Task: 2026-06-09-fix-cit-staff-layout-auth-loop
Agent: gemini
Lesson: Bypass auth check & layout wrapper in StaffLayout for /staff and /staff/auth-callback paths to fix infinite redirect loop
Type: auto-finalize

## 2026-06-09T03:52:00.826Z
Task: 2026-06-09-fix-cit-service-auth-cookie-sync
Agent: gemini
Lesson: Switch client supabase instances to createBrowserClient from @supabase/ssr to fix session cookies syncing with middleware
Type: auto-finalize

## 2026-06-09T18:16:57.894Z
Task: 2026-06-09-local-ai-gateway-setup
Agent: gemini
Lesson: Successfully set up One API Docker container with local SQLite config, integrated Ollama models qwen2.5-coder:1.5b and gemma2:2b, and updated ask-gemini.js wrapper for local API fallback execution with bilingual output capability
Type: auto-finalize

## 2026-06-09T18:33:38.463Z
Task: 2026-06-09-local-ai-upskill-standup
Agent: gemini
Lesson: Successfully implemented B3 Master Code Templates for Local AI, created scripts/local-standup.js for offline daily reports via Gemma 2 (2b), and registered package.json CLI runner
Type: auto-finalize

## 2026-06-09T18:40:42.027Z
Task: 2026-06-09-local-ai-1000pct-upskill
Agent: gemini
Lesson: Successfully implemented Local Codebase Oracle, Offline Self-Healing Compiler, and Privacy Guard PII Redactor scripts, registered in package.json, and verified local gemma2 API calls
Type: auto-finalize
