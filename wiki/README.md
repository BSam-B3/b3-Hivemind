# 📚 B3 Second Brain — Wiki Index

**Last Updated:** 2026-05-30  
**Total Articles:** 50+ across all projects

---

## 🟢 CIT IT Support System

**Status:** Production Live ✅

- **[CIT Knowledge Master](cit/CIT-KNOWLEDGE-MASTER.md)** ← START HERE
  - Consolidated guide for all CIT documentation
  - Database schema, KB articles, customer profiles, procedures
  
### Individual References
- [CIT Project Reference](cit/cit-project.md) — Full tech stack + API routes
- [CIT Quick Start](cit/cit-quickstart-guide.md) — First-time user guide
- [Customer Profiles](cit/cit-customer-profiles.md) — 8 client organizations
- [Knowledge Base](cit/cit-kb-from-tickets.md) — 104 troubleshooting articles
- [Onsite Procedures](cit/cit-onsite-patterns.md) — Field work checklist
- [Image Upload Feature](cit/cit-image-upload-feature.md) — Attachment system
- [Archive System](cit/cit-archive-system.md) — Auto-compress old files
- [Signing Knowledge](cit/cit-signing-knowledge.md) — Document signing
- [System Manual](cit/cit-system-manual.md) — Technical details

---

## 🟢 B3-Team-Avenger

**Status:** Dashboards Live ✅

- [Task Board System](b3-avenger/b3-team-avenger-project.md) — Real-time task tracking
- [B3-Team-Avenger Progress](b3-team-avenger-progress.md) — Current status

---

## 🟡 jong-jaroen (Marketplace)

**Status:** Feature-Complete 65%, Security Hardening In Progress

- **[Jong-Jaroen Status](jong-jaroen/jong-jaroen-status.md)** ← Project overview
- [Security Audit Report](jong-jaroen/SECURITY-AUDIT.md) — 6 critical issues + fixes
- [JWT Implementation Reference](jong-jaroen/jwt-implementation-reference.md) — Ready to deploy
- [Development Guidelines](../jong-jaroen/CLAUDE.md) — Safety rules

---

## 📖 Knowledge & Features

### Reusable Patterns
- [Features Library](features-library.md) — Telegram, PDF, SLA, Calendar, RLS, Dark mode, Voice NLP
- [Tech Decisions Log](tech-decisions.md) — Why we chose: pdf-lib, dark mode class, SLA hours, RLS pattern

### Project Management
- [Bridge Protocol](bridge/BRIDGE-PROTOCOL.md) — AI-to-AI communication rules
- [Communication Protocol](bridge/communication-protocol.md) — Claude ↔ B3 ↔ Gemini messaging

---

## 🔗 Status & Reporting

- [TO-B3 Status Summary](to-b3/STATUS-SUMMARY.md) — Current state of all projects
- [Gemini Phase 2 Request](to-b3/GEMINI-PHASE2-REQUEST.md) — Archive System specs
- [Jong-Jaroen Pause Notice](to-b3/JONG-JAROEN-PAUSE.md) — Development hold details

---

## 🗂️ Directory Structure

```
wiki/
├── cit/                      # CIT IT Support (13 guides)
│   └── CIT-KNOWLEDGE-MASTER.md  ← Consolidated reference
├── b3-avenger/               # B3-Team-Avenger dashboards
├── jong-jaroen/              # Marketplace platform
├── bridge/                   # AI-to-AI communication
├── to-b3/                    # Status reports for B3
├── recycle/2026-05-29/       # Archived briefs
└── features-library.md       # Reusable patterns
```

---

## 🎯 Navigation Tips

**For B3:**
- Status updates → [Status Summary](to-b3/STATUS-SUMMARY.md)
- CIT questions → [CIT Master Guide](cit/CIT-KNOWLEDGE-MASTER.md)
- jong-jaroen updates → [Jong-Jaroen Status](jong-jaroen/jong-jaroen-status.md)
- Task Board → https://b3-team-avenger.vercel.app/dashboard/tasks

**For Claude/Gemini:**
- Communication → [Bridge Protocol](bridge/BRIDGE-PROTOCOL.md)
- How to format messages → [Communication Protocol](bridge/communication-protocol.md)
- Reusable patterns → [Features Library](features-library.md)

**For Developers (Future):**
- CIT architecture → [CIT Project Reference](cit/cit-project.md)
- Jong-jaroen API → [Jong-Jaroen Status](jong-jaroen/jong-jaroen-status.md)
- Tech decisions → [Tech Log](tech-decisions.md)

---

**Wiki maintained by:** Claude  
**Last review:** 2026-05-30 14:XX น.  
**Next update:** When Gemini Phase 2 completes
