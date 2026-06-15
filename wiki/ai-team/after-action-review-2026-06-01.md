# After Action Review — CIT Onsite Visibility Incident

Date: 2026-06-01  
Facilitator: Codex  
Scenario: Staff onsite page returned empty results even when records existed.

## What Was Expected

Staff should open `/staff/onsite` and see onsite reports from `cit_onsite_reports`.

## What Happened

The page queried Supabase directly from the browser. The UI treated empty data as "no reports" and did not expose whether the underlying cause was RLS, auth, or query failure.

## Root Cause Pattern

Client-side privileged reads depend on RLS and session propagation. When the RLS/auth path fails, the UI can look like a normal empty state.

## What Worked

- Production JS inspection revealed the actual client query.
- API testing separated "rendering issue" from "data visibility issue".
- Server-side route handler pattern restored staff access while keeping authorization checks.
- Production deployment and API verification confirmed the fix.

## What Did Not Work

- The page swallowed Supabase errors.
- The empty state did not distinguish "no data" from "cannot load data".
- Documentation had mixed project IDs, increasing confusion risk.

## New Team Rules

1. Staff/admin data reads should prefer route handlers with explicit staff validation.
2. Empty state must not hide API/RLS/auth errors.
3. Production verification must include authenticated API checks.
4. Any service-role route needs selected-field limits and role checks.

## Follow-Up Owners

| Owner | Follow-Up |
|---|---|
| Joe | Create reusable staff API auth helper |
| Enjoy | Add visible empty/error/loading design standard |
| Qara | Add auth/RLS negative test template |
| Sec | Review service-role endpoints for overbroad access |
| Mena | Create one compact RLS debugging knowledge card |
| Raps | Add this incident to training rotation |

