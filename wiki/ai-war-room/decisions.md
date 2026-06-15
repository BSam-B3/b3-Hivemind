# AI War Room Decisions

## 2026-06-03

- [DECISION] สร้าง `wiki/ai-war-room/` เป็นพื้นที่กลางสำหรับ multi-AI collaboration แบบ file-based
- [DECISION] ทุก task ต้องมี owner เดียว และใช้ `locks.json` กันการแก้ไฟล์ชนกัน


## 2026-06-03T16:31:55.163Z
Task: 2026-06-03-war-room-team-intelligence-phase-5
Agent: codex
Decision: Add a War Room team intelligence layer with decision, risk, lesson, persona, dependency, cost, and alias commands.
Why: The team needs durable memory and assignment intelligence beyond file-lock safety.
Impact: Finalize can now gate decision-heavy tasks and dashboard can surface operational intelligence.

## 2026-06-03T16:40:53.083Z
Task: 2026-06-03-war-room-continuity-autopilot-phase-6
Agent: codex
Decision: Continuity must be agent-neutral: Claude, Codex, Gemini, Qara, or another registered agent can take over by role fallback when token-limited.
Why: Fixing only Claude/Gemini leaves a single point of failure if Codex also hits token limit.
Impact: takeover and next-agent now work for any agent in personas.json.

## 2026-06-03T16:55:36.440Z
Task: 2026-06-03-war-room-b3-approval-escalation-phase-7
Agent: codex
Decision: B3 approval escalation keeps critical AI autonomy under human control through pending/approved/rejected/used states.
Why: B3 wants AI agents to continue independently but pause critical takeovers when desired.
Impact: B3 only needs to approve, reject, or leave pending approval IDs.

## 2026-06-03T17:07:17.641Z
Task: 2026-06-03-war-room-approval-panel-bridge-phase-8
Agent: codex
Decision: Use a local clickable approval panel as the reliable no-command approval path, with optional sync to b3-team-avenger approvals API.
Why: B3 does not want to type terminal commands and the Vercel app cannot directly write local War Room files without a bridge.
Impact: B3 can approve/reject/pending from http://localhost:8787 while Avenger sync remains available for future web integration.

## 2026-06-03T17:08:31.375Z
Task: 2026-06-03-war-room-approval-panel-bridge-phase-8
Agent: codex
Decision: B3 approval should use the local browser panel first, with Avenger API sync as optional visibility bridge.
Why: The local panel can write local War Room files safely; the Vercel app cannot directly mutate local files without an additional bridge.
Impact: B3 can click buttons today at localhost:8787.

## 2026-06-03T17:28:25.301Z
Task: 2026-06-03-war-room-vercel-approval-bridge-phase-9
Agent: codex
Decision: Use b3-team-avenger Vercel Projects page as the primary B3 approval surface; War Room syncs requests to Supabase and pulls decisions back.
Why: B3 does not want local-only approval or terminal commands.
Impact: B3 can approve/reject/keep pending from https://b3-team-avenger.vercel.app/projects.

## 2026-06-04T01:52:06.367Z
Task: 2026-06-04-avenger-approval-cache-room-alert-phase-10
Agent: codex
Decision: Fix approval refresh by making approvals API no-store/dynamic, defaulting list to pending only, optimistic removing resolved requests, and adding Janie room approval alert.
Why: B3 saw approvals return after refresh and needs visible notice in /room.
Impact: Approvals disappear after approve/reject refresh; /room shows pending badge and links to /projects.

## 2026-06-04T02:11:59.652Z
Task: 2026-06-04-avenger-approval-center-and-approval-hygiene-phase-11
Agent: codex
Decision: Use /approvals as B3's primary Approval Center with pending/resolved tabs, duplicate prevention, structured What/Risk/If-not summaries, and room alerts.
Why: B3 wants low-command approval control and clearer team autonomy handoffs.
Impact: B3 can approve from one live Vercel page; agents send clearer requests and duplicates are reduced.

## 2026-06-04T02:24:28.825Z
Task: 2026-06-04-telegram-approval-callbacks-and-ops-hardening-phase-12
Agent: codex
Decision: Enable Telegram mobile approval callbacks with inline buttons, secure webhook secret, send retry, and Approval Center health indicators.
Why: B3 wants mobile approvals without opening terminal or being stuck at the web page.
Impact: B3 can approve/reject/keep pending from Telegram; web Approval Center remains source of truth and fallback.

## 2026-06-04T02:34:16.794Z
Task: 2026-06-04-approval-automation-and-telegram-live-test-phase-13
Agent: codex
Decision: Add approval-loop automation, Team Ops dashboard, high-risk Telegram two-step rule, and live Telegram approval test request.
Why: B3 wants mobile approvals and less manual AI sync work.
Impact: B3 can use Telegram buttons for normal approvals, web confirmation for high-risk approvals, and /ops for team health.

## 2026-06-04T02:47:54.117Z
Task: 2026-06-04-approval-automation-and-telegram-live-test-phase-13
Agent: codex
Decision: Fix Telegram production delivery by adding TELEGRAM_BOT_TOKEN to Vercel, using env fallback, adding sender labels, and verifying live callback approval.
Why: B3 did not receive the first Telegram test and requested all Telegram messages show whether Claude, Codex, or Gemini sent them.
Impact: Telegram messages now send from production, identify the sender, and approval callbacks are verified end-to-end.

## 2026-06-04T02:56:56.010Z
Task: 2026-06-04-war-room-self-monitoring-automation-phase-14
Agent: codex
Decision: Add War Room self-monitoring: approval-loop background service, conflict radar, Telegram team digest, and one-button Ops health.
Why: B3 wants the AI team to monitor itself without needing terminal knowledge.
Impact: Approval sync can run continuously, B3 can check health from /ops, and the team can send digest/radar updates.

## 2026-06-05T10:30:34.180Z
Task: 2026-06-05-jong-jaroen-payment-ops-legal-accounting-war-room
Agent: codex
Decision: Phase-gated P0 payment War Room with B3 final approval and no live bank automation before legal/bank review
Why: Money movement, e-money/JJWallet, tax, and payout operations are project-level risks.
Impact: n/a

## 2026-06-05T10:38:59.620Z
Task: 2026-06-05-jong-jaroen-payment-ops-legal-accounting-war-room
Agent: codex
Decision: Phase 1 recommends designing ledger/evidence/payout-queue architecture that can support both central PromptPay manual payout and Direct P2P fallback.
Why: Legal/accounting risk remains unresolved; implementation must preserve optionality until lawyer/bank review.
Impact: n/a

## 2026-06-05T10:43:57.381Z
Task: 2026-06-05-jong-jaroen-payment-ops-legal-accounting-war-room
Agent: codex
Decision: Phase 2 adopts neutral ledger/evidence/payout-queue design as the bridge between central PromptPay, Direct P2P fallback, and future PSP settlement.
Why: Keeps implementation flexible while legal/bank/accounting answers are pending.
Impact: n/a

## 2026-06-05T10:52:12.991Z
Task: 2026-06-05-jong-jaroen-payment-ops-legal-accounting-war-room
Agent: codex
Decision: Large future phases must dispatch real-model OpenClaw packets to Claude/Gemini before Codex performs long synthesis or implementation.
Why: B3 wants Claude/Gemini token pools used directly and Codex conserved for coordination/integration.
Impact: n/a

## 2026-06-05T10:58:36.114Z
Task: 2026-06-05-jong-jaroen-payment-ops-legal-accounting-war-room
Agent: codex
Decision: OpenClaw real-model dispatch is now mandatory before long Phase 3+ synthesis; Claude and Gemini CLI paths were verified live for this payment War Room.
Why: B3 explicitly requires using available Claude/Gemini token pools and conserving Codex for coordination/integration.
Impact: n/a

## 2026-06-05T16:50:54.299Z
Task: 2026-06-05-jong-jaroen-zone-sponsor-coupon-loyalty-war-room
Agent: codex
Decision: Zone is a core Jong Jaroen product spine, not just a filter; future sponsor/coupon/loyalty systems should attach to community zones.
Why: B3 identified zone sponsorship, local events, coupons, and Pong Jaroen as strategic monetization and engagement paths.
Impact: n/a

## 2026-06-05T17:28:49.897Z
Task: 2026-06-05-jong-jaroen-zone-sponsor-coupon-loyalty-war-room
Agent: codex
Decision: Community Calendar and QR Referral Shirt are core growth loops for the zone project, not side features.
Why: They create recurring local utility and measurable offline-to-online referrals tied to community zones.
Impact: n/a

## 2026-06-05T18:06:46.739Z
Task: 2026-06-05-jong-jaroen-zone-sponsor-coupon-loyalty-war-room
Agent: codex
Decision: Founder mission anchor: Jong Jaroen adapts CK/Fastwork inspiration into a local operating system that brings rural communities outward and strengthens local opportunity.
Why: B3 shared the origin story and moral purpose behind the app; future product decisions should preserve this mission.
Impact: n/a

## 2026-06-05T18:21:42.576Z
Task: 2026-06-05-jong-jaroen-zone-sponsor-coupon-loyalty-war-room
Agent: codex
Decision: Pricing/community capital thesis captured: Jong Jaroen's impact edge is low-friendly fees, local money circulation, and transparent community return.
Why: B3 wants this strategic positioning available for future sponsor, launch, and financial planning discussions.
Impact: n/a
