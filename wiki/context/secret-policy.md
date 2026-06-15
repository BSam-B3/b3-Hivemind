---
type: operating-rule
project: b3-second-brain
status: active
owner: B3
source: secret-policy
created: 2026-06-04
last_reviewed: 2026-06-04
confidence: high
---

# Secret Policy

ไฟล์ลับของ B3 ห้ามลบ ห้ามย้าย ห้ามแก้ค่า โดยไม่มีคำสั่งตรงจาก B3

## กฎหลัก

- ห้าม AI paste ค่า secret เต็มลง chat หรือ report
- ห้ามย้าย `.env`, client secret, Supabase credential โดยไม่ตรวจ dependency ก่อน
- ห้ามลบไฟล์ลับ เพราะบางตัวเอาใหม่ไม่ได้แล้ว
- ถ้าต้องวิเคราะห์ config ให้ใช้ `secret-masked-report.md`
- ถ้าต้องเปลี่ยนตำแหน่ง secret ให้สร้างแผน migration และขอ B3 approve ก่อน

## ไฟล์ที่ถือว่า sensitive

- `.env`
- `.env.*`
- `b3-agents/.env`
- `client_secret_*.json`
- `wiki/api-keys.txt`
- `wiki/credentials/*`

## คำสั่งตรวจ

```bash
npm run secret:inventory
```

ผลลัพธ์:

- `wiki/context/secret-inventory.md`
- `wiki/context/secret-masked-report.md`

