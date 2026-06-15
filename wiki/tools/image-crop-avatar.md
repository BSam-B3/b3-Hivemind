# 🖼️ Image Crop Tool — Circle Avatar Upload

**Last used:** 2026-06-08 | **Project:** jong-jaroen | **Stack:** Next.js 14 + react-image-crop v11

---

## ติดตั้ง

```bash
npm install react-image-crop@11
```

---

## Flow

```
เลือกไฟล์ → rawSrc (objectURL)
  → ReactCrop (circularCrop + aspect=1) → crop state (% unit)
  → กด "ตัดรูป" → getCroppedBlob() → canvas 400×400 → Blob
  → preview วงกลม
  → กด "บันทึก" → upload JPEG 92% → Supabase Storage
```

---

## Gotcha สำคัญ (เคยพัง)

### ❌ Bug: ผลลัพธ์เป็นภาพดำ

**สาเหตุ:** `onChange` ของ react-image-crop v11 ส่ง `(pixelCrop, percentCrop)` — argument แรกเป็น pixel  
แต่ `getCroppedBlob` หาร 100 ถือว่าเป็น `%` → วาดพื้นที่ผิด → ดำ

**Fix:**
```tsx
// ❌ ผิด
onChange={c => setCrop(c)}

// ✅ ถูก
onChange={(_, percentCrop) => setCrop(percentCrop)}
```

---

## Code หลัก (copy-paste ready)

### 1. Imports
```tsx
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
```

### 2. Initial crop (วางกลางรูป 80%)
```tsx
function centerCircleCrop(width: number, height: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 80 }, 1, width, height),
    width, height
  );
}
```

### 3. Canvas crop → Blob (output 400×400 JPEG)
```tsx
async function getCroppedBlob(imgEl: HTMLImageElement, crop: Crop): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const size = 400;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const scaleX = imgEl.naturalWidth / imgEl.width;
  const scaleY = imgEl.naturalHeight / imgEl.height;
  const pixelX = (crop.x / 100) * imgEl.width * scaleX;
  const pixelY = (crop.y / 100) * imgEl.height * scaleY;
  const pixelW = (crop.width / 100) * imgEl.width * scaleX;
  const pixelH = (crop.height / 100) * imgEl.height * scaleY;

  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(imgEl, pixelX, pixelY, pixelW, pixelH, 0, 0, size, size);

  return new Promise(resolve => canvas.toBlob(b => resolve(b!), 'image/jpeg', 0.92));
}
```

### 4. States
```tsx
const [rawSrc, setRawSrc] = useState<string | null>(null);     // objectURL ของไฟล์ต้นฉบับ
const [crop, setCrop] = useState<Crop>();                       // % unit เสมอ
const [croppedPreview, setCroppedPreview] = useState<string | null>(null);
const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
const imgRef = useRef<HTMLImageElement>(null);
```

### 5. JSX Component
```tsx
<ReactCrop
  crop={crop}
  onChange={(_, percentCrop) => setCrop(percentCrop)}  // ← ต้องใช้ arg ที่ 2 เสมอ
  aspect={1}
  circularCrop
  keepSelection
  minWidth={60}
>
  <img
    ref={imgRef}
    src={rawSrc}
    onLoad={e => {
      const { width, height } = e.currentTarget;
      setCrop(centerCircleCrop(width, height));
    }}
    className="max-h-[60vh] w-auto"
    alt="crop"
    style={{ display: 'block' }}
  />
</ReactCrop>
```

---

## ปรับใช้กับงานอื่น

| งาน | เปลี่ยนอะไร |
|---|---|
| Square crop | `circularCrop={false}` |
| aspect ratio อื่น | `aspect={16/9}` |
| output ขนาดอื่น | เปลี่ยน `const size = 400` |
| upload ไป bucket อื่น | เปลี่ยน `supabase.storage.from('avatars')` |

---

## Reference
- ไฟล์ต้นทาง: `jong-jaroen/app/profile/edit/avatar/page.tsx`
- Docs: https://github.com/DominicTobias/react-image-crop
