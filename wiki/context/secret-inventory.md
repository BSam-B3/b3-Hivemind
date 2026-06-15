---
type: project-status
project: b3-second-brain
status: active
owner: B3
source: secret-inventory
created: 2026-06-04
last_reviewed: 2026-06-04
confidence: high
---

# Secret Inventory

รายงานนี้ไม่ย้าย ไม่ลบ และไม่แสดงค่า secret เต็ม

Generated: 2026-06-04T10:04:51.034Z

Secret candidates: 8

| File | Type | Bytes | Fingerprint |
|---|---|---:|---|
| .env | env | 155 | da03a92f2ba5a662 |
| .env.example | env | 483 | 4c388177b6559cb7 |
| b3-agents/.env | env | 936 | 48e11b6d467c0b67 |
| client_secret_2_427643888397-84cmg93r1k5p612tnnrn4lu68avcu8e2.apps.googleusercontent.com.json | oauth-client-secret | 451 | ece392e37aa7f2b1 |
| wiki/api-keys.txt | api-key-document | 69 | 99f2ef899f3c32ec |
| wiki/cit/USER-CREDENTIALS-GUIDE.md | credential-document | 7637 | c1f586baebcaa82a |
| wiki/credentials/README.md | credential-document | 1127 | 5a80901132985e81 |
| wiki/credentials/SUPABASE-CREDENTIALS.md | credential-document | 2059 | 5ff6585972459d22 |

## คำแนะนำ

- ห้ามลบหรือย้ายไฟล์เหล่านี้โดยไม่ตรวจ dependency ก่อน
- Google Drive sync ช่วยกันหาย แต่ถ้าบัญชีหลุด ไฟล์เหล่านี้เสี่ยง
- ใช้ masked report เมื่อต้องให้ AI ตรวจค่า config
