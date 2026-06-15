# แผนจัดระเบียบ 4 โปรเจค — Phase 1 Proposal
**วันที่:** 2026-06-02 ICT | **จัดทำโดย:** Claude
**สถานะ:** ⏳ รอ B3 Confirm → สั่ง "execute" เพื่อดำเนินการ

---

## 🚨 CRITICAL — ทำก่อนเลย

| # | Project | ปัญหา | Action |
|:--|:--------|:------|:-------|
| 1 | **cit-service** | ไฟล์ skill reference ซ้ำ 3 ชุด (25 ไฟล์ × 3 = 75 ไฟล์) อยู่ใน `.agents/` `.claude/` `.gemini/` | ลบ 2 ชุดออก เก็บไว้แค่ `.claude/skills/impeccable/` |
| 2 | **B3-Second-Brain** | `raw/jong-jaroen/jong-jaroen-blueprint.md.md` — ชื่อผิด มี `.md.md` | rename → `.md` |
| 3 | **b3-team-avenger** | `DEPLOY.md` + `DEPLOYMENT.md` — ซ้ำกัน | รวมเป็นไฟล์เดียว ลบไฟล์เก่า |

---

## 📁 B3-Second-Brain

### ✅ Root level — สะอาดดีแล้ว (6 ไฟล์ system)
ไม่ต้องทำอะไร

### เพิ่ม index.md ที่ขาดหายไป
| Action | ที่ไหน |
|:---|:---|
| ➕ สร้าง | `wiki/cit/index.md` — 20 ไฟล์แต่ไม่มี index |
| ➕ สร้าง | `wiki/jong-jaroen/index.md` — 13 ไฟล์แต่ไม่มี index |

### 📦 Archive recycle เก่า (2026-05-28, 2026-05-29)
| Action | Folder | ไฟล์ |
|:---|:---|:---|
| 🗑️ ลบ | `wiki/recycle/2026-05-28/` | 4 ไฟล์ (inbox เก่า) |
| 🗑️ ลบ | `wiki/recycle/2026-05-29/` | 9 ไฟล์ (เกิน 7 วัน) |

---

## 📁 b3-team-avenger

### Root มี 15 ไฟล์ — เยอะเกินไป แนะนำย้าย
| Action | ไฟล์ | ย้ายไป |
|:---|:---|:---|
| ✅ ย้าย | `ADMIN_SETUP.md` | `docs/setup/` |
| ✅ ย้าย | `SETUP_CHECKLIST.md` | `docs/setup/` |
| ✅ ย้าย | `SETUP_STATUS.md` | `docs/setup/` |
| ✅ ย้าย | `CONFIG_GUIDE.md` | `docs/setup/` |
| ✅ ย้าย | `DEPLOY.md` (หลังรวมแล้ว) | `docs/` |
| 📦 Recycle | `SESSION_2_SUMMARY.md` | เก่าแล้ว |

### Archive logs เก่า
| Action | ที่ไหน |
|:---|:---|
| 📦 Recycle | `logs/` ทั้งโฟลเดอร์ (9 ไฟล์ จาก May 29) |

---

## 📁 cit-service

### Root มี 11 ไฟล์ — แนะนำย้าย ENV files
| Action | ไฟล์ | ย้ายไป |
|:---|:---|:---|
| ✅ ย้าย | `ENV_ARCHIVE_SETUP.md` | `docs/` |
| ✅ ย้าย | `ENV_GROQ_SETUP.md` | `docs/` |
| ✅ ย้าย | `ENV_S3_SETUP.md` | `docs/` |

### Critical: ลบ duplicate skill files
| Action | ที่ไหน | จำนวน |
|:---|:---|:---|
| 🗑️ ลบ | `.agents/skills/impeccable/reference/` ทั้งโฟลเดอร์ | 25 ไฟล์ |
| 🗑️ ลบ | `.gemini/skills/impeccable/reference/` ทั้งโฟลเดอร์ | 25 ไฟล์ |
| ✅ เก็บ | `.claude/skills/impeccable/reference/` | 25 ไฟล์ (single source) |

---

## 📁 jong-jaroen

### ✅ สะอาดดีแล้ว — ไม่ต้องทำอะไร
แค่ 3 ไฟล์ root level ทั้งหมด

---

## 📊 สรุปตัวเลข

| Action | จำนวน |
|:---|:---|
| 🚨 Rename ไฟล์ชื่อผิด | 1 |
| ✅ ย้าย (misplaced) | 9 |
| 🗑️ ลบ duplicate skills | 50 |
| 📦 Recycle เก่า | 13 + 9 = 22 |
| ➕ สร้าง index ที่ขาด | 2 |
| **รวม** | **~84 ไฟล์** |

---

**⏳ รอ B3 confirm → สั่ง "execute" เพื่อดำเนินการ Phase 2**
