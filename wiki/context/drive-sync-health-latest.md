---
type: project-status
project: b3-second-brain
status: active
owner: B3
source: drive-sync-doctor
created: 2026-06-04
last_reviewed: 2026-06-04
confidence: medium
---

# Drive Sync Doctor

Generated: 2026-06-04T10:04:50.901Z

## สรุปสำหรับบีสาม

- ไฟล์ใหญ่กว่า 50MB: 0
- ไฟล์/โฟลเดอร์ที่อาจมีข้อมูลลับ: 8
- ไฟล์ชั่วคราวที่อาจไม่ควร sync: 1

## ไฟล์ใหญ่

- ไม่มี

## ข้อมูลลับที่ควรระวัง

- .env
- .env.example
- b3-agents/.env
- client_secret_2_427643888397-84cmg93r1k5p612tnnrn4lu68avcu8e2.apps.googleusercontent.com.json
- wiki/api-keys.txt
- wiki/cit/USER-CREDENTIALS-GUIDE.md
- wiki/credentials/README.md
- wiki/credentials/SUPABASE-CREDENTIALS.md

## ไฟล์ชั่วคราวที่ควรระวัง

- .gitignore.tmp

## คำแนะนำ

- Google Drive sync ช่วยกันเครื่องพัง/ไฟล์หายได้ดี
- แต่ไม่ควรพึ่งเป็นระบบ version control แทน Git
- ไฟล์ secret เช่น `.env` และ client secret ควรเก็บด้วยความระวัง
- ไฟล์ใหญ่ เช่น video recording อาจทำให้ sync ช้า
