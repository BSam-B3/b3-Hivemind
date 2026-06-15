# 📂 To B3 — Communication Hub

**One-stop folder for everything B3 needs to know.**

---

## 📋 Files in This Folder

### 1️⃣ **START HERE: STATUS-SUMMARY.md**
- Current status of all projects
- What's live, what's pending
- Token balance (daily)
- Quick overview (5 min read)

### 2️⃣ **THEN READ: CHECKPOINT.md**
- What happened in last session
- What's ready for next session
- Gemini tasks queued (Phase 1 + 2)
- Step-by-step playbook

### 3️⃣ **FOR GEMINI: GEMINI-INSTRUCTIONS.md**
- Phase 1: Consolidate briefs (30 min)
- Phase 2: Implement archive system (2-3 hours)
- Token reporting format
- Success criteria for each phase

### 4️⃣ **THIS FILE: README.md**
- How to use this folder
- Quick reference

---

## 🎯 When to Read What

| Situation | Read |
|-----------|------|
| **"What's the status of my projects?"** | STATUS-SUMMARY.md |
| **"What happened last session?"** | CHECKPOINT.md |
| **"What should Gemini do?"** | GEMINI-INSTRUCTIONS.md |
| **"How do I use this folder?"** | README.md (you're here) |
| **"I need all the details"** | Go to wiki/bridge/ or memory/ |

---

## 🚀 Typical Workflow

```
1. Session starts
   ↓
2. Read STATUS-SUMMARY.md (2 min)
   ↓
3. Read CHECKPOINT.md (5 min)
   ↓
4. Send GEMINI-INSTRUCTIONS.md to Gemini
   ↓
5. Gemini executes Phase 1 + 2
   ↓
6. Come back to STATUS-SUMMARY.md to check token balance
   ↓
7. Session end
```

---

## 📊 Token Balance Check

Every morning:
```
Open: STATUS-SUMMARY.md

Look for:
🔵 Gemini: {number} / 1,000,000 limit

If < 20% → use Groq for next task
If > 80% → monitor, may need 2 sessions to finish
```

Daily reset at **00:00 UTC** (all counters → 0)

---

## 📝 Gemini Reporting

After each task, Gemini reports:
```
[GEMINI REPORT] Task Name
📊 Token Used Today:
   Gemini: X,XXX / 1,000,000 limit (Y% used)
   Groq: Z / unlimited
```

Then Claude updates STATUS-SUMMARY.md

---

## 🔗 Communication Guide

### **B3 Sends Message:**

| Your Message | Put It Here | Why |
|---|---|---|
| "Start work on X" | **Chat** (here) | Quick direction, no overhead |
| "Here's detailed spec" | **wiki/bridge/PROJECT-spec.md** | Claude reads file, saves tokens |
| "Use these requirements" | **wiki/bridge/REQUIREMENTS.md** | Standing reference |
| "Approval feedback" | **Chat** (here) | Quick confirmation |
| "Change approach to Y" | **Chat** (here) | Real-time adjustment |

### **Claude Tells You:**

| We Say | We Put It | You Read It |
|---|---|---|
| Project status | **wiki/to-b3/STATUS-SUMMARY.md** | Once per session |
| What happened | **wiki/to-b3/CHECKPOINT.md** | Once per session |
| Gemini tasks | **wiki/to-b3/GEMINI-INSTRUCTIONS.md** | Copy to Gemini |
| Implementation plan | **wiki/bridge/PROJECT-brief.md** | Before starting |

**Golden Rule:** Chat for quick (<50 words), .md files for detailed/reusable

---

## 🔗 Related Folders

```
wiki/to-b3/             ← YOU READ (B3 communication hub)
wiki/bridge/            ← YOU WRITE (detailed specs/briefs)
wiki/cit/               ← Knowledge docs (final, polished)
wiki/recycle/           ← Archived briefs (auto-delete after 7 days)
memory/                 ← Workflows + guidelines (Claude reference)
```

---

## ✅ Checklist Before Each Session

- [ ] Read STATUS-SUMMARY.md
- [ ] Read CHECKPOINT.md
- [ ] Check token reset (should be 0/1M at 00:00 UTC)
- [ ] Send GEMINI-INSTRUCTIONS.md if new work
- [ ] Monitor token balance throughout session

---

## 💡 Pro Tips

1. **Always come here first** if you have questions
2. **Token balance** = B3's decision point (proceed or wait)
3. **GEMINI-INSTRUCTIONS** = exact task list (copy-paste to Gemini)
4. **CHECKPOINT** = what happened + what's next (reference)
5. **STATUS-SUMMARY** = one-page project dashboard

---

## 🛑 If Something's Wrong

| Problem | Solution |
|---------|----------|
| "Token limit reached" | Wait for 00:00 UTC reset (or use Groq) |
| "File not found" | Check wiki/bridge/ or wiki/cit/ |
| "Gemini confused" | Share GEMINI-INSTRUCTIONS.md again |
| "Need context" | Read CHECKPOINT.md + memory/MEMORY.md |

---

## 📞 Communication Flow

```
B3 (you)
  ↓
  reads: STATUS-SUMMARY.md + CHECKPOINT.md
  ↓
Claude
  ↓
  sends task: GEMINI-INSTRUCTIONS.md
  ↓
Gemini
  ↓
  completes task
  reports: [GEMINI REPORT]
  ↓
Claude
  ↓
  updates: STATUS-SUMMARY.md
  ↓
B3 (you)
  ↓
  reads update, decides next action
```

---

## ✨ Key Principle

**Everything in this folder is B3-friendly:**
- ✅ Simple language (no jargon)
- ✅ Action-oriented (what to do)
- ✅ Quick reads (5-10 min)
- ✅ No unnecessary details
- ✅ Links to deeper info if needed

**If a file here doesn't make sense, it's our fault. Please feedback!**

---

**You're all set. Good luck!** 🚀
