# 🛠️ พิมพ์เขียวระบบ Jong Jaroen: ปรับปรุงระบบแสดงผลข้อเสนอและผลงาน (Proposals & Fallback Portfolio)

เอกสารฉบับนี้เป็นการสังเคราะห์สถานะการทำงาน, โครงสร้างโค้ดปัจจุบัน และลอจิกความปลอดภัยที่ได้ปรับปรุงล่าสุดในหน้ากระดานหางาน (`app/job-board/[id]/page.tsx`) ของแพลตฟอร์ม **จงเจริญ (Jong Jaroen)** เพื่อให้คุณบีสามใช้ประสานงานร่วมกับ AI Agent ตัวอื่นๆ (เช่น Claude หรือ Codex) ในการพัฒนาต่อได้อย่างไร้รอยต่อค่ะ

---

## 🎯 1. รายละเอียดของสิ่งที่ปรับปรุงไปแล้ว (Completed Implementations)

### A. ปุ่มยกเลิกข้อเสนอ (Withdraw Proposal Button)
* **การทำงาน:** เพิ่มปุ่ม "ยกเลิกข้อเสนอนี้" ในส่วน "ข้อเสนอของคุณ" (สำหรับฝั่งช่าง/ฟรีแลนซ์เจ้าของใบเสนอราคา)
* **ระบบความปลอดภัย (RLS):** มีการเขียนตรวจจับสิทธิ์การลบผ่าน Supabase RLS หากฐานข้อมูลยังไม่อนุญาต ระบบจะแสดงหน้าต่าง Alert พร้อมคำสั่ง SQL ทันที
* **คำสั่ง SQL สำหรับตั้งค่าใน Supabase RLS:**
  ```sql
  ALTER TABLE job_proposals ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Allow workers to delete own proposals" 
  ON job_proposals 
  FOR DELETE 
  TO authenticated 
  USING (auth.uid() = worker_id);
  ```

### B. ระบบ Fail-safe ป้องกันภาพแตก (404 Image Handling)
* **ปัญหา:** ลิงก์รูปภาพในฐานข้อมูล (เช่น Unsplash หรือ Supabase storage บางจุด) คืนค่า HTTP 404/403 ทำให้หน้าเว็บแสดงไอคอนรูปภาพแตก (Broken Icon) เสียเกรดความพรีเมียม
* **แนวทางแก้ไข:** เพิ่มคุณสมบัติ `onError` ให้กับแท็ก `<img>` เมื่อเบราว์เซอร์โหลดรูปภาพล้มเหลว จะสลับแหล่งที่มา (`src`) ไปเป็น **Inline SVG Image Placeholder** สไตล์ Minimalist สีเทาอ่อนโดยอัตโนมัติ:
  ```tsx
  onError={(e) => {
    e.currentTarget.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect x='3' y='3' width='18' height='18' rx='2' ry='2'/><circle cx='8.5' cy='8.5' r='1.5'/><polyline points='21 15 16 10 5 21'/></svg>";
  }}
  ```

### C. อัลบั้มภาพผลงาน (Full 5-Image Gallery Album)
* **การทำงาน:** ปรับปรุงลอจิกการดึงข้อมูล โดยเชื่อมโยงข้อเสนอ `job_proposals` เข้ากับคลังภาพ `images` และ `cover_image_url` จากตาราง `services` (Jobs-Card) ของผู้รับจ้าง
* **การแสดงผล:** แสดงผลในลักษณะ **Grid อัลบั้ม**:
  * รูปภาพหลัก (Highlight Cover) ขนาด 48x48 (`w-48 h-48`) เด่นชัด 1 รูป
  * แถบภาพขนาดย่อ (Thumbnails Strip) ขนาด 11x11 (`w-11 h-11`) ด้านล่าง เพื่อให้คลิกดูรูปพอร์ตโฟลิโอประกอบการตัดสินใจได้ครบทั้ง 5 รูป เพิ่มโอกาสปิดการขายของช่างสูงสุด

### D. สิทธิ์การมองเห็นและการคุยแชท (Visibility & Chat Permissions)
* **การมองเห็นบอร์ดข้อเสนอ (Public Proposals list):** ย้ายส่วนแสดงผลรายการผู้นำเสนอราคาออกมาให้ **ผู้ใช้ทั่วไปทุกคนสามารถเห็นบอร์ดข้อเสนอของช่างคนอื่นๆ ได้** เพื่อเปิดรับไอเดียราคาและผลงาน
* **ปุ่ม "ดู Jobs-Card ผู้รับจ้าง":** ปรากฏให้ **ทุกคน** สามารถกดเข้าไปชมโปรไฟล์หลักของช่างคนนั้นๆ ได้
* **ปุ่ม "สอบถามข้อมูลเพิ่มเติม (แชท)":** มีเงื่อนไขป้องกันอย่างเข้มงวด โดยปุ่มแชทจะแสดงให้เฉพาะ **"ผู้ว่าจ้าง / เจ้าของโพสต์หางานตัวจริง" (`isEmployer`)** เท่านั้น! ช่างหรือบุคคลทั่วไปจะไม่เห็นปุ่มแชท เพื่อป้องกันสปิล์ดแชทที่ไม่เกี่ยวข้อง

---

## 💻 2. โครงสร้างลอจิกการดึงข้อมูลในโค้ดปัจจุบัน (`app/job-board/[id]/page.tsx`)

### ลอจิกการ Fetch ข้อมูลของข้อเสนอตัวเอง (`myProposal`):
```typescript
if (user) {
  const { data: myProp } = await supabase
    .from('job_proposals')
    .select('*, profiles!worker_id(*)')
    .eq('job_id', jobId)
    .eq('worker_id', user.id)
    .maybeSingle();

  if (myProp) {
    let fallback_url = null;
    let fallback_images = [];
    // ดึงภาพจาก Jobs-Card (services) เสมอเพื่อนำมาทำเป็นคลังภาพผลงาน
    const { data: serviceData } = await supabase
      .from('services')
      .select('cover_image_url, images')
      .eq('provider_id', user.id)
      .eq('is_active', true)
      .limit(1);
    if (serviceData && serviceData[0]) {
      fallback_url = serviceData[0].cover_image_url;
      fallback_images = serviceData[0].images || [];
    }
    myPropDetail = {
      ...myProp,
      fallback_portfolio_url: fallback_url,
      fallback_portfolio_images: fallback_images
    };
    setMyProposal(myPropDetail);
  }
}
```

### ลอจิกการ Fetch รายการผู้นำเสนองานทั้งหมด (`proposalsData`):
```typescript
const { data: rawProposals } = await supabase
  .from('job_proposals')
  .select('*, profiles!worker_id(*)')
  .eq('job_id', jobId);

proposalsData = rawProposals || [];

proposalsData = await Promise.all(
  proposalsData.map(async (prop: any) => {
    const { data: serviceData } = await supabase
      .from('services')
      .select('cover_image_url, images')
      .eq('provider_id', prop.worker_id)
      .eq('is_active', true)
      .limit(1);
    if (serviceData && serviceData[0]) {
      return { 
        ...prop, 
        fallback_portfolio_url: serviceData[0].cover_image_url,
        fallback_portfolio_images: serviceData[0].images || []
      };
    }
    return prop;
  })
);
```

---

## 📝 3. คำสั่งแนะนำสำหรับการคุยกับ Codex / Claude เพื่อพัฒนาต่อยอด

หากคุณบีสามต้องการส่งงานชิ้นนี้ต่อให้ Codex หรือ AI ตัวอื่นดำเนินการต่อ สามารถใช้ Prompt ด้านล่างนี้บรีฟงานได้ทันทีค่ะ:

> **"กรุณาอ่านพิมพ์เขียวไฟล์ `jong_jaroen_proposals_blueprint.md` เพื่อทำความเข้าใจโครงสร้างลอจิกของตาราง `job_proposals` และระบบอัลบั้มผลงาน 5 รูปในหน้า `app/job-board/[id]/page.tsx` ตอนนี้ระบบรองรับการเปิดใช้งาน RLS การดึงรูปภาพ Fallback และการจำกัดสิทธิ์ปุ่มแชท เรียบร้อยแล้ว [ให้ดำเนินการต่อตามเป้าหมายถัดไป...]"**

---
*เจมทำการเรียบเรียงและบันทึกข้อมูลทางเทคนิคทั้งหมดลงใน Second Brain เรียบร้อยแล้วค่ะคุณบีสาม!* 🌸
