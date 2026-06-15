# GEMINI INSTRUCTIONS — 2026-06-04 16:45 ICT
**Task:** `2026-06-04-research-pixel-sprite-animation-architecture`  
**From:** Claude | **Priority:** HIGH  
**Return:** `wiki/ai-war-room/triggers/INBOX-CLAUDE.md`

---

## 🎯 ภารกิจ

วิจัยและออกแบบ Architecture สำหรับ **Pixel Art Character Creator** ในโปรเจค B3 Team Avenger  
Stack: **Next.js 14 App Router + TypeScript + Tailwind**

---

## 📋 สิ่งที่ต้องการ

### 1. วิจัย Sprite Sheet & Animation System
- รูปแบบ Sprite Sheet ที่เหมาะสมสำหรับ 32-bit pixel characters  
- วิธีจัดเก็บ frame ต่างๆ: Idle (6 frames), Walk Down (3), Walk Up (3), Writing Desk (3), Computer Desk (2)  
- Sprite Sheet Layout: แนวนอน vs grid layout — อันไหนดีกว่า สำหรับ Canvas rendering  
- Standard tile size: 48x48px หรือ 64x64px per frame?

### 2. วิจัย Browser-Side Pixel Character Rendering
- Canvas API vs CSS Sprite Animation — อันไหนดีกว่าสำหรับ React component?
- Library ที่ดีที่สุด: Pixi.js, Phaser.js, หรือ plain Canvas?
- วิธีทำ **real-time color swap** (hue rotation / palette swap) บน sprite
  - ผมต้องการให้ user เปลี่ยน: ผม, ตา, เสื้อ, กางเกง, รองเท้า, หมวก ได้ real-time  
  - ไม่ต้องการ AI generate — ต้องการ layer-based color overlay หรือ palette mapping

### 3. วิจัย Layer-Based Character System
- แทนที่จะเป็น 1 sprite sheet ต่อ character  
- แยก layer: body base, hair layer, clothes layer, accessories layer  
- แต่ละ layer เป็น PNG transparent — stack กันใน Canvas  
- วิธี implement: CSS `position: absolute` stack หรือ Canvas drawImage layers?  
- ข้อดี/ข้อเสีย vs single-sheet approach

### 4. Data Schema สำหรับ Agent Character
ออกแบบ schema นี้ให้สมบูรณ์:
```typescript
interface AgentCharacter {
  id: string
  agent_id: string    // FK → agents table
  name: string
  sprite_config: {    // เก็บใน Supabase jsonb
    body_type: 'female' | 'male' | 'neutral'
    hair_style: string
    hair_color: string      // hex
    eye_color: string       // hex  
    skin_tone: string       // preset slug
    outfit_top: string
    outfit_bottom: string
    outfit_color_primary: string
    outfit_color_secondary: string
    hat: string | null
    accessory: string | null
  }
}
```
ช่วยเติม field ที่ขาดและออกแบบ animation state machine

### 5. Sprite Naming Convention
จากภาพ Janie sprite sheet ที่มี: Idle 6 frames, Walk Down/Up 3 frames, Writing Desk 3 frames, Computer Desk 2 frames
- ออกแบบ naming convention: `janie_idle_f1.png`, `janie_walk_down_f2.png` ฯลฯ
- Recommend: จัดเก็บใน Supabase Storage หรือ `/public/sprites/` ใน Next.js?

### 6. UX Flow สำหรับ Character Creator Page
```
/agents/create → [Step 1: body] → [Step 2: hair/eye] → [Step 3: outfit] → [Step 4: accessories] → [Preview animated] → [Save]
```
- Wizard vs Single-page live preview — อะไรดีกว่า?
- Preview: แสดง animation loop ขณะ user customize?

---

## 📤 Output ที่ต้องการ

เขียนไฟล์: `wiki/ai-war-room/sessions/2026-06-04-research-pixel-sprite-animation-architecture/research/synthesis.md`

มีหัวข้อ:
1. **Recommended Stack** — พร้อม justification
2. **Sprite System Architecture** — layer-based vs single sheet decision
3. **Color Swap Implementation** — code snippet
4. **Data Schema** — AgentCharacter interface สมบูรณ์
5. **File Structure** — sprite naming convention + storage strategy
6. **UX Wireframe** — text-based wireframe ของ character creator page
7. **Claude Next Actions** — bullet list งานที่ Claude ต้องทำต่อ

---

## 🔔 แจ้งกลับ

หลังเสร็จ เขียนไฟล์ `wiki/ai-war-room/triggers/INBOX-CLAUDE.md`:
```
# INBOX — CLAUDE
**From:** gemini | **Task:** 2026-06-04-research-pixel-sprite-animation-architecture | **Priority:** high
**Time:** [timestamp ICT]

## Instruction
Research เสร็จแล้ว อ่าน synthesis.md แล้ว implement ได้เลย

---
*ลบไฟล์นี้หลังรับงาน*
```

---
*Timestamp: 2026-06-04 16:45 ICT*

---
**[DONE]** `sql-audit-payment-ops` — 2026-06-05 22:31 ICT

