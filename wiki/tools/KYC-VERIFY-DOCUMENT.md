# KYC Document Verification — Gemini Vision Tool

**สร้าง:** 2026-06-07 ICT
**โปรเจคแรก:** jong-jaroen
**สถานะ:** ✅ Production Ready

---

## ภาพรวม

ตรวจสอบเอกสาร KYC (บัตรประชาชน / ใบขับขี่ / เซลฟี่) ด้วย Gemini Vision API
ผ่าน Supabase Edge Function — ใช้ซ้ำได้ทุกโปรเจค

---

## ไฟล์ที่เกี่ยวข้อง (jong-jaroen)

| ไฟล์ | หน้าที่ |
|---|---|
| `supabase/functions/verify-kyc-document/index.ts` | Edge Function หลัก |
| `app/lib/kyc/verifyDocument.ts` | Client hook — import ใช้ได้เลย |
| `supabase/migrations/017_kyc_verification.sql` | เพิ่ม column ใน profiles |

---

## วิธีใช้ใน Component ใหม่

```typescript
import { verifyDocument, saveKycResult } from '@/app/lib/kyc/verifyDocument';

// หลังถ่ายรูป/เลือกไฟล์:
const result = await verifyDocument(file, 'thai_id');

if (!result.is_valid) {
  alert(`เอกสารไม่ถูกต้อง: ${result.reason}`);
  return;
}

// บันทึกผลลง profiles:
await saveKycResult(userId, result);
```

---

## doc_type ที่รองรับ

| doc_type | เอกสาร | ข้อมูลที่ดึง |
|---|---|---|
| `thai_id` | บัตรประชาชนไทย | extracted_name, extracted_id_number |
| `license_moto` | ใบขับขี่จักรยานยนต์ | extracted_name, license_type |
| `license_car` | ใบขับขี่รถยนต์ | extracted_name, license_type |
| `license_transport` | ใบขับขี่ ท.1-ท.3 | extracted_name, license_type |
| `selfie_with_id` | เซลฟี่คู่กับบัตร | has_face, has_document, face_and_document_together |
| `vehicle_tax` | ภาษีรถ / พ.ร.บ. | extracted_plate |

---

## KycResult Interface

```typescript
interface KycResult {
  success: boolean;
  is_valid: boolean;
  doc_type: KycDocType;
  extracted_name?: string | null;
  extracted_id_number?: string | null;
  extracted_plate?: string | null;
  license_type?: string | null;
  has_face?: boolean;
  has_document?: boolean;
  face_and_document_together?: boolean;
  confidence: 'high' | 'medium' | 'low';
  reason?: string | null;
  error?: string;
}
```

---

## KycBadge Component (copy-paste)

```typescript
function KycBadge({ status }: { status?: 'idle'|'checking'|'ok'|'fail' }) {
  if (!status || status === 'idle') return null;
  if (status === 'checking') return (
    <div className="flex items-center gap-1.5 text-[10px] font-black text-orange-500">
      <span className="w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
      กำลังตรวจสอบ...
    </div>
  );
  if (status === 'ok') return <div className="text-[10px] font-black text-green-600">✅ เอกสารถูกต้อง</div>;
  return <div className="text-[10px] font-black text-red-500">❌ เอกสารไม่ถูกต้อง — ถ่ายใหม่</div>;
}
```

---

## Database Columns (profiles table)

```sql
kyc_status          TEXT  -- 'none' | 'pending' | 'approved' | 'rejected'
kyc_extracted_name  TEXT  -- ชื่อที่ OCR ได้
kyc_extracted_id    TEXT  -- เลข 13 หลัก
kyc_confidence      TEXT  -- 'high' | 'medium' | 'low'
kyc_verified_at     TIMESTAMPTZ
kyc_rejected_reason TEXT
```

---

## Deploy Edge Function

```bash
cd [project-root]
supabase functions deploy verify-kyc-document

# ต้องมี env var:
# GEMINI_API_KEY = [Gemini API Key จาก wiki/credentials/SUPABASE-CREDENTIALS.md]
```

---

## ค่าใช้จ่าย

Gemini 2.0 Flash Vision — ประมาณ **ฟรี** ใน free tier (1,500 req/day)
Production: ~$0.0001 ต่อภาพ (ถูกมาก)

---

## ใช้แล้วใน

- [x] jong-jaroen — `/provider/register`
- [ ] cit-service
- [ ] b3-team-avenger
