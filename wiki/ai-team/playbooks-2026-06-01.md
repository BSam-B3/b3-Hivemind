# AI Team Playbooks — 2026-06-01

## Playbook 1: RLS Empty Data Debugging

Use when a page shows "no data" but records should exist.

1. Confirm the production page route and user role.
2. Inspect whether the page queries Supabase from browser or server.
3. Test anon access, customer access, and staff access separately.
4. Check table count with service role only if authorized.
5. Compare project IDs between deployment env and migration notes.
6. Fix by either RLS policy or server route handler with explicit role validation.
7. Add UI states for loading, empty, unauthorized, and API error.

Owner: Joe, Qara, Sec.

## Playbook 2: Vercel Deploy Verification

Use before saying a production fix is complete.

1. Run local build.
2. Deploy with production target.
3. Confirm Vercel build success.
4. Confirm production alias updated.
5. Test the production URL or API with realistic auth.
6. Record output in status file.

Owner: Fenton, Joe, Janie.

## Playbook 3: AI Feature Safety Review

Use before launching an AI-assisted workflow.

1. Identify what tools the AI can call.
2. Define what the AI must never do.
3. Add prompt injection test.
4. Add sensitive data disclosure test.
5. Add human approval checkpoint for irreversible actions.
6. Add logs or trace records.

Owner: Kom, Sec, Fenton, Kitti.

## Playbook 4: Customer-Safe AI Communication

Use when explaining AI features or incidents.

1. Say what happened in plain language.
2. Say what data is affected or not affected.
3. Avoid claiming certainty without proof.
4. Give one next action.
5. Escalate to human owner when customer trust is involved.

Owner: Nam, Karn, Nara.

## Playbook 5: Training Note Creation

Use after any bug fix, deployment, or customer workflow improvement.

1. Write the scenario in one sentence.
2. Capture the root cause pattern.
3. List one test case.
4. List one metric.
5. Link source files or docs.
6. Keep the note short enough for retrieval.

Owner: Mena, Raps, Janie.

## Playbook 6: Business Value Capture

Use when deciding whether automation is worth maintaining.

1. Estimate time saved.
2. Estimate risk reduced.
3. Estimate revenue protected or enabled.
4. Identify owner.
5. Set a review date.

Owner: Metha, Pim, Dana, Win, Finley, Ferin.

