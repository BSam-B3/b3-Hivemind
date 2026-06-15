# Latest INBOX - CODEX

Latest task file: INBOX-CODEX-product-multi-image-edit-20260610.md

# INBOX - CODEX
**From:** claude | **Task:** product-multi-image-edit-20260610 | **Priority:** urgent
**Run:** run-20260610160520-49wy53
**Hops:** 0/2
**Time:** 2026-06-10T16:05:20.595Z
## Instruction
แก้ไฟล์ C:\Users\CIT-COMPUTER-001\Desktop\jong-jaroen\app\marketplace\manage-shop\products\[id]\edit\page.tsx

DB มี: images text[], image_url text, promo_video_url text

1. เปลี่ยน 'ลิงก์รูปภาพ' field เดียว → multi-image URL inputs สูงสุด 5 รูป
   - input + thumbnail 48x48 preview แต่ละ URL
   - ปุ่ม + เพิ่ม (disabled ถ้าครบ 5), ปุ่ม × ลบ
   - รูปแรก = image_url (backward compat)
2. เพิ่ม promo_video_url field (label: ลิงก์วิดีโอสินค้า ไม่บังคับ)
3. save: images[], image_url=images[0]||null, promo_video_url
4. load: อ่าน images[] ถ้าว่าง fallback image_url
5. style: rounded-2xl border-gray-200 focus:border-[#EE4D2D] เหมือนเดิม
---
Write output to wiki/ai-war-room/sessions/product-multi-image-edit-20260610/
