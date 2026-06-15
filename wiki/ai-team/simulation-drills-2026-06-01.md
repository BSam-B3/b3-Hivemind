# AI Team Simulation Drills — 2026-06-01

Scenario: `/staff/onsite` shows no documents, but the database contains onsite reports.

Each AI employee practiced: risk, improvement, test case, metric.

| AI Employee | Risk Found | Improvement Proposed | Test Case | Metric |
|---|---|---|---|---|
| Janie | Work bounces between agents without clear owner | Create handoff with owner, file path, expected proof | Assign same bug to 2 agents and compare duplicate work | Time to owner assignment |
| Enjoy | Empty state hides auth/RLS errors | Add visible error state and retry guidance | Force API 401/500 and inspect UI copy | Error comprehension rate |
| Joe | Browser query leaks implementation and depends on RLS | Move staff reads into route handler with token validation | Call API with no token, customer token, staff token | Unauthorized access blocked |
| Fenton | Code swallows Supabase errors | Require error logging and user-visible fallback | Mock Supabase error and verify message | Error paths covered |
| Karn | Customers may think data was deleted | Prepare calm status message for staff/customer comms | Draft message for incident update | Support tickets avoided |
| Kitti | No decision record for service-role route | Add risk note for server-side privileged access | Review API decision note for audit completeness | Decisions with owner/date |
| Nara | Training explains feature, not workflow | Create 3 cards: login, find report, troubleshoot empty page | Ask new user to recover from empty state | Task completion rate |
| Metha | Debug time cost invisible | Estimate cost of recurring manual support | Compare fix time vs repeated support hours | Hours saved per month |
| Pim | Reports may be trusted without source check | Add source field and export timestamp to reports | Verify report data matches table rows | Reconciliation pass rate |
| Win | Feature pitch lacks measurable proof | Pitch "staff report visibility restored" as SLA improvement | Draft customer-facing value note | Renewal confidence signal |
| Nam | Staff may panic when page empty | Write support macro: check login, refresh, escalate | Simulate staff chat asking why data is gone | First-contact resolution |
| Kom | Service-role API could become overbroad | Limit selected fields and require staff role | Attempt customer token access | Privilege boundary violations |
| Raps | Skills update not connected to future tasks | Add matrix owner and next drill date | Check matrix after one week | Skills updated on schedule |
| Ferin | New AI tools could store sensitive data | Add procurement question: data retention and training use | Evaluate vendor answer quality | Vendor risk score |
| Mena | Knowledge docs become too long to retrieve | Create compact source cards and tags | Retrieve answer from training doc | Retrieval hit rate |
| Qara | Happy-path-only QA misses RLS bugs | Add negative tests for auth states | No token, expired token, wrong role, staff role | Negative tests passing |
| Dana | No metric tells whether fix worked | Track API success, page loads, zero-result rate | Compare before/after deployment | Empty-list anomaly rate |
| Chief | Operational logs mixed with durable knowledge | Split incident, pattern, and playbook records | Find correct file for future RLS bug | Lookup time |
| Finley | Cost of API calls untracked | Add lightweight API usage review for heavy routes | Estimate cost at 1k, 10k, 100k calls | Cost per workflow |
| Sec | Prompt injection could target staff tools | Add tool-use allowlist and no-secret policy | Inject malicious instruction into support note | Injection blocked |

## Drill Result

Pass. Every AI employee produced one actionable improvement. The strongest shared pattern: staff/admin workflows should use server-side authorization and visible failure states.

