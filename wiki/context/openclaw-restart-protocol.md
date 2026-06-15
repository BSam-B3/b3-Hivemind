---
type: runbook
project: b3-second-brain
status: active
owner: B3
source: openclaw-safety-policy
created: 2026-06-04
last_reviewed: 2026-06-04
confidence: high
---

# OpenClaw Restart Protocol

Use this before restarting the trigger watcher.

## Preconditions

1. Pending triggers must be 0.
2. Sessions needing attention should be reviewed.
3. Stale prompt files should be archived if they are not active.
4. B3 approval is needed if restart may interrupt active work.

## Commands

```bash
npm run openclaw:doctor:report
npm run team:health
```

If safe:

```powershell
Stop-Process -Id <WATCHER_PID>
Start-Process -FilePath "node" -ArgumentList "scripts/openclaw-trigger-watcher.js" -WorkingDirectory (Get-Location) -WindowStyle Hidden
npm run openclaw:doctor:report
```

## After Restart

- Confirm exactly one watcher process is running.
- Confirm pending triggers are 0.
- Run a controlled test with `maxHops: 0`.
- Update `wiki/to-b3/DAILY-DIGEST.md`.

