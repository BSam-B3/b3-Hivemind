# Red Team Review — 2026-06-01

Review Team: Kom, Sec, Fenton, Qara  
Scenario: Staff/admin data workflows and AI-assisted operational tools.

## Findings

| Severity | Finding | Risk | Recommendation | Owner |
|---|---|---|---|---|
| High | Client-side privileged database reads can silently fail under RLS | Staff sees empty data and trusts wrong state | Use route handlers with explicit role validation | Joe |
| High | Service-role APIs can become overbroad | Wrong role may access sensitive data if auth checks weaken | Centralize staff auth helper and field selection | Sec |
| Medium | Empty states hide failure modes | Users think data is deleted or missing | Add separate unauthorized/error/empty copy | Enjoy |
| Medium | AI workflows may execute tools from untrusted text | Prompt injection or unintended action | Add tool allowlist and human approval for irreversible actions | Sec |
| Medium | Documentation can drift from production env | Debugging points to wrong project/table | Add project ID and last-verified date to critical docs | Mena |
| Low | Business impact is not always measured | Team cannot prioritize fixes by value | Add time-saved/risk-reduced metric to AAR | Dana |

## Abuse Tests To Add

1. Customer token attempts to call staff API.
2. Expired token attempts to call staff API.
3. No token attempts to call staff API.
4. Staff token calls API and receives only expected fields.
5. Malicious text asks AI to reveal secrets or bypass approval.
6. Page shows API 500 and user sees an actionable error state.

## Red Team Verdict

The team is operationally stronger after training. Highest remaining priority: create a reusable staff API authorization helper so every future server route handles auth consistently.

