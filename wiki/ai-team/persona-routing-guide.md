# Persona Routing Guide
**Created:** 2026-06-05 ICT | **Author:** Claude

## แนวคิดหลัก

**Persona = หน้ากาก | Model = คนสวม**

persona คือ context/prompt ที่บอกว่า "ทำงานแบบ Enjoy"  
model คือ AI จริงที่รัน — Groq, Gemini, Codex, Claude  
→ B3 เลือก model ตาม cost ได้ โดยไม่ต้องเปลี่ยนคำสั่ง

## Token Routing

| งาน | Model ที่แนะนำ | Cost |
|---|---|---|
| ไอเดีย UX / draft คร่าวๆ | **Groq** + Enjoy | ฟรี |
| เขียนโค้ด component จริง | **Codex** + Enjoy | OpenAI |
| UX audit / research design | **Gemini** + Enjoy | Gemini free tier |
| Architecture decision / complex | **Claude** + Enjoy | Anthropic |

## วิธีใช้

```bash
# ดูรายชื่อ persona ทั้งหมด
npm run persona list

# โหลด persona ก่อนทำงาน
node scripts/persona.js load enjoy

# บันทึก lesson หลังทำงาน (สำคัญ — ทำให้ persona เก่งขึ้นทุกครั้ง)
node scripts/persona.js upskill enjoy "เรียนรู้จากงานนี้: ..."

# ดู skills ที่สะสมมา
node scripts/persona.js review enjoy
```

## Persona ที่มี

| ชื่อ | บทบาท | ใช้เมื่อ |
|---|---|---|
| enjoy / เอนจอย | Frontend/UI Designer | UX, component, Tailwind |
| joe / โจ | Backend Engineer | API, DB, Supabase |
| choe / ชเว | QA/Code Review | review, test, bug |
| janie / เจนี่ | Orchestrator | แจกงาน, ประสานทีม |
| kong / ก้อง | Security | security audit |
| nam / น้ำ | Support | customer, ticket |

→ รายชื่อเต็ม: `npm run persona list`

## กฎ: upskill ทุกครั้ง

หลังทำงานด้วย persona ใดก็ตาม → **บันทึก lesson เสมอ**  
persona จะเก่งขึ้นจากประสบการณ์จริงของโปรเจค B3 โดยเฉพาะ
