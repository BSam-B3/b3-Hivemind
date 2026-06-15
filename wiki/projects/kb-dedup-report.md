# KB Dedup Report

Date: 2026-06-05
Scope: active Markdown files, excluding `node_modules`, `.tmp.*`, and `wiki/recycle`

## Result

- Active Markdown files: 519
- Exact duplicate content groups: 0
- Archived in this cleanup pass: 106 Markdown files

## What Changed

- Repeated AI war-room session placeholders from 2026-06-03 and 2026-06-04 were moved to `wiki/recycle/2026-06-05/organize-md/`.
- Zero-byte session output files were moved to `wiki/recycle/2026-06-05/organize-md/`.
- `wiki/projects/notebooklm-kb-enhancement.md` was consolidated into `wiki/projects/cit-smart-kb-brain-sync.md`, then archived.
- The old 2026-05-31 dedup report was archived as `wiki/recycle/2026-06-05/organize-md/wiki/projects/kb-dedup-report-2026-05-31.md`.

## Active Master Notes

- CIT KB and Brain-Sync architecture: `wiki/projects/cit-smart-kb-brain-sync.md`
- Cleanup archive report: `wiki/recycle/2026-06-05/organize-md/report.md`

## Remaining Work

- Encoding cleanup is still separate. Several older Thai documents contain mojibake and should be repaired in a dedicated pass.
- `brain-doctor` reports 2 stale trigger prompts and 1 stale bridge status file; those were not changed because they are operational state, not old Markdown knowledge.
