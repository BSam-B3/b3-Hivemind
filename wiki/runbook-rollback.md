# Rollback Runbook
**อัปเดตล่าสุด:** 2026-06-04 ICT

---

## เมื่อไหร่ควร Rollback

- Deploy ใหม่ทำให้ feature หลักพัง (dashboard, approvals, Janie)
- Smoke test report `critical` หลัง deploy
- B3 ตัดสินใจ rollback เอง

---

## Vercel — Rollback ใน 30 วินาที (วิธีแนะนำ)

```
1. เปิด https://vercel.com/bsam-b3s-projects/[project]/deployments
2. คลิก deployment ก่อนหน้า
3. กด "..." → "Promote to Production"
```

ใช้ได้กับทุกโปรเจค: b3-team-avenger / cit-service / jong-jaroen

---

## Git Revert — ถ้า Vercel ทำไม่ได้

```bash
# ดู commit ที่ต้องการ revert ไป
git log --oneline -10

# Revert commit ล่าสุด 1 ตัว
git revert HEAD --no-edit
git push origin main

# Revert หลาย commit (เช่น 2 ตัว)
git revert HEAD~2..HEAD --no-edit
git push origin main
```

---

## แจ้งทีมหลัง Rollback

```
node scripts/war-room.js report issue "Rollback: [reason]" --agent [agent]
```

ส่ง Telegram แจ้ง B3:
```
POST /api/telegram-notify
{ "type": "alert", "agent": "Claude", "message": "🔄 Rolled back to [commit] — [reason]" }
```

---

## ห้ามทำ

- ห้าม `git push --force` บน main โดยไม่บอก B3
- ห้าม reset ข้าม migration ที่ apply ไปแล้ว
- ถ้า Supabase migration พัง → ติดต่อ B3 ก่อนทุกครั้ง

---

## Supabase — กรณี DB migration ผิดพลาด

```sql
-- ดู migration ล่าสุด
SELECT * FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 5;

-- ถ้า migration ใหม่ทำให้พัง ต้อง rollback manually
-- สร้าง migration ใหม่ที่ revert การเปลี่ยนแปลง
-- อย่า DROP table โดยตรง — ให้ rename ก่อน (_backup)
```
