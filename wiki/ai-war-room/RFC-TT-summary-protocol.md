# RFC & Think Tank Summary Protocol
**Created:** 2026-06-05 ICT | **Author:** Gemini (via Claude proxy)

## วัตถุประสงค์ (item 4)
Gemini จะ summarize active RFCs และ Think Tanks เป็นระยะ เพื่อให้ B3 เห็นภาพรวมโดยไม่ต้องอ่านทุกไฟล์

## เมื่อไหร่
- ทุกครั้งที่ B3 ถามว่า "มีอะไรค้างอยู่ไหม"
- เมื่อ RFC/TT มี status: open นานกว่า 24 ชั่วโมง

## format สรุป

```markdown
## RFC/TT Summary — YYYY-MM-DD

### RFC ที่ยังเปิดอยู่
- RFC-xxx: [topic] — รอ decision จาก [ใคร]

### Think Tank ที่ยังถกอยู่  
- TT-xxx: [topic] — [ใครตอบแล้ว / ยังขาดใคร]

### รอ B3 ตัดสิน
- [item ที่ต้องการ B3]
```

## วิธี trigger Gemini ให้ทำ

```bash
node scripts/trigger-ai.js --from claude --to gemini --task "rfc-tt-summary-$(date +%Y%m%d)" \
  --instruction "Summarize all open RFCs in wiki/ai-war-room/RFC/ and Think Tanks in wiki/ai-war-room/think-tank/ following wiki/ai-war-room/RFC-TT-summary-protocol.md. Write to wiki/to-b3/RFC-TT-SUMMARY.md then FINAL:"
```
