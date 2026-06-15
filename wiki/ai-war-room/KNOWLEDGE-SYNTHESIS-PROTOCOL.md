# Knowledge Synthesis Protocol

Created: 2026-06-03

กฏพื้นฐาน: **research แยกได้ แต่ truth ต้องรวม**

AI แต่ละตัวสามารถค้นคว้า วิเคราะห์ หรือทดลองแยกกันได้ในพื้นที่ชั่วคราว แต่ห้ามสร้างคลังความรู้ถาวรคนละชุดโดยไม่ผ่านการรวมและกรอง

## Required Flow

```text
Brief
  ↓
Separate research drafts
  ↓
Cross-check / conflict check
  ↓
Synthesis
  ↓
Final shared knowledge
  ↓
Archive drafts as supporting notes
```

## Session Files

ในทุก war room session ที่มี research หรือ knowledge work ต้องใช้ไฟล์เหล่านี้:

```text
sessions/<task>/
  research/
    claude.md
    codex.md
    gemini.md
  synthesis.md
  final.md
```

## Draft Rules

Research draft ของแต่ละ AI ต้องเขียนแบบนี้:

```markdown
# Research Draft - <agent>

## Claims

## Evidence / References

## Confidence

High / Medium / Low

## Risks / Unknowns

## Recommended Knowledge To Keep
```

## Synthesis Rules

`synthesis.md` ต้องกรองข้อมูลก่อนบันทึกเป็นความรู้กลาง:

- รวมข้อมูลที่หลาย AI เห็นตรงกัน
- แยกข้อมูลที่ขัดกัน
- ตัดข้อมูลซ้ำ
- ตัดข้อสรุปที่ไม่มี evidence
- ระบุ confidence
- ระบุสิ่งที่ยังต้อง verify
- สรุปเป็น decision, checklist, pattern, lesson, หรือ next action

## Permanent Knowledge Rules

ห้ามบันทึก draft ตรงเข้า wiki ถาวรทันที

ก่อนลง `wiki/[project]/`, `wiki/ai-team/`, หรือ `wiki/knowledge-base.md` ต้องมี:

1. `synthesis.md`
2. ความเห็นตรงกัน หรือ owner decision
3. ไม่มี conflict สำคัญที่ยังไม่ resolve
4. ระบุ source/reference เท่าที่มี
5. final summary ให้ B3 อ่านได้

## Conflict Handling

ถ้า AI ให้ข้อมูลไม่ตรงกัน:

```text
[CONFLICT] @team from:@agent
topic:
claude says:
codex says:
gemini says:
needed decision:
---
```

ถ้ากระทบ scope, cost, legal, security, data, production ให้ถาม B3 ก่อน

## Human Command

B3 สั่งสั้น ๆ ได้ว่า:

```text
เปิดทีม AI research เรื่องนี้ แล้วรวมเป็นความรู้กลางแบบกรองแล้ว
```

AI ต้องแปลเป็น:

- เปิด war room session
- ให้แต่ละ AI เขียน research draft
- รวมเป็น `synthesis.md`
- กรองความรู้
- บันทึก shared knowledge
- รายงาน B3

