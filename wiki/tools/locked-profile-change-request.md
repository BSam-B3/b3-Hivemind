# 🔒 Locked Profile + Change Request System

**Last used:** 2026-06-08 | **Project:** jong-jaroen | **Stack:** Next.js 14 + Supabase

---

## Use Case

ข้อมูลที่ต้องล็อกหลัง submit ครั้งแรก และขอแก้ไขผ่าน Admin เท่านั้น  
เช่น: ข้อมูลรถ Rider, รูปหน้า Rider, ข้อมูล KYC, ใบอนุญาต

---

## DB Migration

```sql
CREATE TABLE IF NOT EXISTS change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  request_type text NOT NULL CHECK (request_type IN ('vehicle_info', 'rider_photo')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reason text,
  review_note text,
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE change_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_requests" ON change_requests FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "admin_all_requests" ON change_requests FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
```

เพิ่ม `request_type` ใหม่ได้เลยโดยเพิ่มใน `CHECK (request_type IN (...))`

---

## Page Mode Pattern

```tsx
type PageMode = 'loading' | 'register' | 'readonly';

useEffect(() => {
  // 1. check session
  // 2. query ว่ามีข้อมูลใน target table แล้วหรือยัง
  // 3. ถ้ามี → mode = 'readonly', ถ้าไม่มี → mode = 'register'
  // 4. query change_requests ล่าสุดของ user → set status per type
}, []);
```

---

## Query Change Request Status

```tsx
const { data: reqs } = await supabase
  .from('change_requests')
  .select('request_type, status')
  .eq('user_id', session.user.id)
  .order('created_at', { ascending: false });

const latestVehicle = reqs?.find(r => r.request_type === 'vehicle_info');
const latestPhoto   = reqs?.find(r => r.request_type === 'rider_photo');
```

---

## Send Change Request

```tsx
await supabase.from('change_requests').insert({
  user_id: user.id,
  request_type: 'vehicle_info', // หรือ 'rider_photo'
  reason: reason.trim(),
  status: 'pending',
});
```

---

## RequestBlock Component (copy-paste)

Component แสดงปุ่ม/สถานะตาม reqStatus:
- `none` / `rejected` → ปุ่ม "ขอแก้ไข" → textarea เหตุผล → ส่ง
- `pending` → banner แจ้งรอ Admin
- `approved` → banner แจ้งติดต่อทีมงาน

```tsx
const RequestBlock = ({ type, reqStatus, showBox, setShowBox, reason, setReason, requesting, label }) => (
  <div className="mt-3 space-y-2">
    {reqStatus === 'none' || reqStatus === 'rejected' ? (
      !showBox ? (
        <button onClick={() => setShowBox(true)}>✏️ ขอแก้ไข{label}</button>
      ) : (
        <div>
          <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="ระบุเหตุผล..." />
          <button onClick={() => sendChangeRequest(type, reason)}>ส่งคำขอ</button>
        </div>
      )
    ) : reqStatus === 'pending' ? (
      <div>⏳ คำขอรอ Admin อนุมัติ</div>
    ) : reqStatus === 'approved' ? (
      <div>✅ Admin อนุมัติแล้ว</div>
    ) : null}
  </div>
);
```

---

## Admin Page — `/admin/change-requests`

Features:
- Filter: pending / approved / rejected / ทั้งหมด
- แสดง user info + เหตุผล + link ดูโปรไฟล์
- textarea หมายเหตุ Admin (ไม่บังคับ)
- ปุ่ม อนุมัติ / ปฏิเสธ → update status + reviewed_by + reviewed_at

```tsx
await supabase.from('change_requests').update({
  status: 'approved', // หรือ 'rejected'
  review_note: note,
  reviewed_by: adminUserId,
  reviewed_at: new Date().toISOString(),
}).eq('id', requestId);
```

---

## ไฟล์ต้นทาง

| ไฟล์ | หน้าที่ |
|---|---|
| `jong-jaroen/app/provider/register/page.tsx` | User page (register + readonly + request) |
| `jong-jaroen/app/admin/change-requests/page.tsx` | Admin review page |

---

## ขยายไปใช้กับข้อมูลอื่น

1. เพิ่ม `request_type` ใน CHECK constraint
2. copy `RequestBlock` + states ไปใส่หน้าที่ต้องการล็อก
3. Admin page รองรับอัตโนมัติ (filter by type ถ้าต้องการ)
