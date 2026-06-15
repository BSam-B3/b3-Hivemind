# Character Creator — Pause Checkpoint
**Date:** 2026-06-04 17:35 ICT | **Status:** PAUSED — รอ layered sprite assets

---

## สิ่งที่เสร็จแล้ว (Production)

| ไฟล์ | สถานะ |
|:---|:---|
| `app/agents/create/page.tsx` | ✅ 4-step wizard + animated preview + CSS filter color |
| `app/agents/create/ColorPicker.tsx` | ✅ per-part color picker UI (รอ assets) |
| `app/agents/create/ColorSwapCanvas.tsx` | ✅ canvas palette swap (รอ assets) |
| `app/api/agents/create/route.ts` | ✅ รับ sprite_config jsonb |
| DB: `custom_agents.sprite_config` | ✅ column เพิ่มแล้ว |
| Dashboard button | ✅ navigate → /agents/create |
| OpenClaw Codex fix | ✅ codex.cmd EINVAL fixed, timeout 600s |

**Live:** https://b3-team-avenger.vercel.app/agents/create

---

## ทำไมถึง Pause

Sprite ปัจจุบัน (14 ตัว) เป็น PNG เดียวไม่แยก layer  
Per-part coloring (ผม/ตา/เสื้อ/กางเกง) ต้องการ **Layered Sprite Assets** ใหม่

---

## สิ่งที่ต้องทำเมื่อกลับมา

### Assets ที่ต้องสร้าง (B3 รู้แล้วว่าต้องใช้อะไร)
```
/public/characters/layers/{character}/
  body.png       ← silhouette/skin
  hair.png       ← ผม (transparent background)
  outfit.png     ← เสื้อผ้า (transparent background)
  eyes.png       ← ตา
  accessory.png  ← หมวก/แว่น (optional)
```
แต่ละ layer เป็น PNG transparent แล้ว stack ใน Canvas

### Code ที่รอ (เขียนไว้แล้ว ไม่ต้องทำใหม่)
- `ColorSwapCanvas.tsx` — canvas palette swap พร้อม แค่ต้องการ layer assets
- `ColorPicker.tsx` — UI per-part picker พร้อมแล้ว

### เมื่อมี Assets
1. เพิ่ม layer config ใน `SPRITE_DEFS` 
2. `AnimatedPreview` switch จาก `<img>` → Canvas layer stack
3. Step 2 ของ wizard จะ unlock per-part sliders จริงๆ

---

## Current Phase 1 Capability
- เปลี่ยนสีทั้งตัวด้วย Hue/Sat/Brightness slider ✅
- 8 color presets (Cyber, Fire, Forest, Galaxy, Sakura, Ocean, Golden) ✅
- 16 agent accent colors ✅
- Animated sprite preview (idle/walk/sit cycle) ✅
- Save sprite_config ลง Supabase ✅
