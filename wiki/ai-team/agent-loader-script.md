# Agent Loader Script — auto-load persona → API call

**Owner:** Claude Code  
**Created:** 2026-06-03 ICT  
**Purpose:** Script สำหรับ load prompt จาก wiki/ai-team/*.md แล้วส่งไปยัง AI API อัตโนมัติ

---

## วิธีใช้ (เมื่อ implement แล้ว)

```bash
# invoke agent คนเดียว
python agent_loader.py --agent enjoy --task "ออกแบบหน้า job listing"

# invoke หลาย agent พร้อมกัน
python agent_loader.py --agent joe --agent choe --task "ตรวจ SQL migration นี้"

# ให้เจนี่ตัดสินเองว่าส่งใคร
python agent_loader.py --orchestrate --task "ทำ feature ใหม่: ระบบ rating ไรเดอร์"
```

---

## agent_loader.py

```python
"""
B3 Agent Loader — load AI persona from wiki/ai-team/ and invoke via API
"""

import re
import os
import argparse
from pathlib import Path
import anthropic
import google.generativeai as genai

# ─── Config ───────────────────────────────────────────────────────────────────

WIKI_PATH = Path(__file__).parent.parent / "wiki" / "ai-team"

# แมป agent name → ไฟล์ persona + model ที่ใช้
AGENT_CONFIG = {
    "janie":    {"file": "janie_secretary.md",   "model": "claude",  "llm": "claude-sonnet-4-6"},
    "enjoy":    {"file": "enjoy_uidev.md",        "model": "claude",  "llm": "claude-sonnet-4-6"},
    "joe":      {"file": "joe_backend.md",        "model": "claude",  "llm": "claude-sonnet-4-6"},
    "choe":     {"file": "choe_editor.md",        "model": "claude",  "llm": "claude-sonnet-4-6"},
    "kong":     {"file": "kong_hacker.md",        "model": "claude",  "llm": "claude-sonnet-4-6"},
    "karn":     {"file": "karn_community.md",     "model": "claude",  "llm": "claude-sonnet-4-6"},
    "kitti":    {"file": "kitti_lawyer.md",       "model": "claude",  "llm": "claude-sonnet-4-6"},
    "nara":     {"file": "nara_creator.md",       "model": "claude",  "llm": "claude-sonnet-4-6"},
    "phattama": {"file": "phattama_finance.md",   "model": "claude",  "llm": "claude-sonnet-4-6"},
    "pim":      {"file": "pim_accounting.md",     "model": "claude",  "llm": "claude-sonnet-4-6"},
    "win":      {"file": "win_bizdev.md",         "model": "claude",  "llm": "claude-sonnet-4-6"},
    "nam":      {"file": "nam_support.md",        "model": "claude",  "llm": "claude-sonnet-4-6"},
    "kom":      {"file": "kom_risk.md",           "model": "claude",  "llm": "claude-sonnet-4-6"},
    "raps":     {"file": "raps_hr.md",            "model": "claude",  "llm": "claude-sonnet-4-6"},
    "ferin":    {"file": "ferin_procurement.md",  "model": "claude",  "llm": "claude-sonnet-4-6"},
    "qara":     {"file": "qara_tester.md",        "model": "claude",  "llm": "claude-sonnet-4-6"},
    "mira":     {"file": "mira_market_intel.md",  "model": "gemini",  "llm": "gemini-2.0-flash"},
    "dana":     {"file": "dana_analyst.md",       "model": "gemini",  "llm": "gemini-2.0-flash"},
    "booko":    {"file": "booko_data.md",         "model": "gemini",  "llm": "gemini-2.0-flash"},
    "finley":   {"file": "finley_finance.md",     "model": "claude",  "llm": "claude-sonnet-4-6"},
}

# ─── Persona Loader ────────────────────────────────────────────────────────────

def load_persona(agent_name: str) -> str:
    """อ่าน persona file และดึง system prompt"""
    config = AGENT_CONFIG.get(agent_name)
    if not config:
        raise ValueError(f"ไม่รู้จัก agent: {agent_name}")
    
    file_path = WIKI_PATH / config["file"]
    if not file_path.exists():
        raise FileNotFoundError(f"ไม่พบไฟล์: {file_path}")
    
    content = file_path.read_text(encoding="utf-8")
    
    # ดึง Identity section และ Core Responsibilities เป็น system prompt
    system_parts = []
    
    # ดึงชื่อและตำแหน่ง
    name_match = re.search(r'\*\*ชื่อ\*\*\s*\|\s*(.+)', content)
    role_match = re.search(r'\*\*ตำแหน่ง\*\*\s*\|\s*(.+)', content)
    tone_match = re.search(r'\*\*Tone\*\*\s*\|\s*(.+)', content)
    
    if name_match:
        system_parts.append(f"คุณคือ {name_match.group(1).strip()}")
    if role_match:
        system_parts.append(f"ตำแหน่ง: {role_match.group(1).strip()}")
    if tone_match:
        system_parts.append(f"สไตล์การตอบ: {tone_match.group(1).strip()}")
    
    # ดึง Prompt Starter ถ้ามี
    starter_match = re.search(r'## \d+\. Prompt Starter.*?\n```\n(.+?)```', content, re.DOTALL)
    if starter_match:
        system_parts.append(f"\nตัวอย่างการรับงาน:\n{starter_match.group(1).strip()}")
    
    # เพิ่ม rule พื้นฐาน
    system_parts.append("""
กฎพื้นฐาน:
- เจ้านายคือคุณบีสาม (B3) — ห้ามเรียก "บอส" หรือ "หัวหน้า"
- ตอบสั้น กระชับ ตรงประเด็น ห้ามเกริ่นนำ
- ทำตาม scope ที่ได้รับ ถ้าไม่ชัดให้ถามกลับก่อน
    """)
    
    return "\n".join(system_parts)


# ─── API Callers ───────────────────────────────────────────────────────────────

def call_claude(system_prompt: str, task: str, model: str) -> str:
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    message = client.messages.create(
        model=model,
        max_tokens=2048,
        system=system_prompt,
        messages=[{"role": "user", "content": task}]
    )
    return message.content[0].text


def call_gemini(system_prompt: str, task: str, model: str) -> str:
    genai.configure(api_key=os.environ["GEMINI_API_KEY"])
    gemini_model = genai.GenerativeModel(
        model_name=model,
        system_instruction=system_prompt
    )
    response = gemini_model.generate_content(task)
    return response.text


# ─── Main Invoke ───────────────────────────────────────────────────────────────

def invoke_agent(agent_name: str, task: str) -> dict:
    config = AGENT_CONFIG[agent_name]
    system_prompt = load_persona(agent_name)
    
    print(f"\n🤖 Invoking {agent_name} ({config['llm']})...")
    
    if config["model"] == "claude":
        response = call_claude(system_prompt, task, config["llm"])
    elif config["model"] == "gemini":
        response = call_gemini(system_prompt, task, config["llm"])
    else:
        raise ValueError(f"ไม่รู้จัก model: {config['model']}")
    
    return {
        "agent": agent_name,
        "model": config["llm"],
        "task": task,
        "response": response
    }


def invoke_with_janie(task: str) -> list[dict]:
    """ให้เจนี่ตัดสินใจว่าจะส่งงานให้ใคร"""
    # ขอให้เจนี่วิเคราะห์และแจกงาน
    janie_task = f"""
วิเคราะห์ task นี้และระบุว่าควรส่งให้ agent คนไหนในทีม:

Task: {task}

Agents ที่มี: {', '.join(AGENT_CONFIG.keys())}

ตอบในรูปแบบ:
AGENTS: [ชื่อ1, ชื่อ2, ...]
BRIEF_FOR_EACH_AGENT: (brief สั้นๆ สำหรับแต่ละคน)
"""
    janie_result = invoke_agent("janie", janie_task)
    
    # parse agents จาก janie response (simplified)
    agents_line = [l for l in janie_result["response"].split("\n") if l.startswith("AGENTS:")]
    if agents_line:
        agent_names = [a.strip() for a in agents_line[0].replace("AGENTS:", "").strip("[]").split(",")]
        results = [janie_result]
        for name in agent_names:
            name = name.strip().lower()
            if name in AGENT_CONFIG:
                results.append(invoke_agent(name, task))
        return results
    
    return [janie_result]


# ─── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="B3 Agent Loader")
    parser.add_argument("--agent", action="append", help="ชื่อ agent (ใช้ได้หลายครั้ง)")
    parser.add_argument("--task", required=True, help="งานที่ต้องการ")
    parser.add_argument("--orchestrate", action="store_true", help="ให้เจนี่ตัดสินใจว่าส่งใคร")
    parser.add_argument("--list", action="store_true", help="แสดงรายชื่อ agents ทั้งหมด")
    args = parser.parse_args()
    
    if args.list:
        print("Agents ที่มี:")
        for name, cfg in AGENT_CONFIG.items():
            print(f"  {name:12} → {cfg['llm']}")
        return
    
    if args.orchestrate:
        results = invoke_with_janie(args.task)
    elif args.agent:
        results = [invoke_agent(name, args.task) for name in args.agent]
    else:
        print("ระบุ --agent หรือ --orchestrate")
        return
    
    for result in results:
        print(f"\n{'='*60}")
        print(f"Agent: {result['agent']} ({result['model']})")
        print(f"{'='*60}")
        print(result["response"])


if __name__ == "__main__":
    main()
```

---

## การติดตั้ง

```bash
# 1. สร้างโฟลเดอร์
mkdir b3-agents
cd b3-agents

# 2. ติดตั้ง packages
pip install anthropic google-generativeai

# 3. copy script นี้ไปที่ b3-agents/agent_loader.py

# 4. ตั้ง environment variables
set ANTHROPIC_API_KEY=your_key_here
set GEMINI_API_KEY=your_key_here   ← ถ้าจะใช้ Gemini agents

# 5. รัน
python agent_loader.py --list
python agent_loader.py --agent enjoy --task "ออกแบบหน้า job listing"
```

---

## ตัวอย่าง output

```
🤖 Invoking enjoy (claude-sonnet-4-6)...

============================================================
Agent: enjoy (claude-sonnet-4-6)
============================================================
ลองดูแบบนี้ก่อนนะคะ — หน้า Job Listing:

**Layout (Mobile-first):**
- Filter bar บนสุด (ประเภทงาน / ระยะทาง / ราคา)
- Card list ด้านล่าง (infinite scroll)
- FAB "ลงประกาศ" มุมขวาล่าง

**Component:**
```tsx
// JobCard.tsx
interface JobCardProps {
  title: string
  budget: number
  distance: number
  category: string
}
```
...
```

---

## Notes

- Script อ่าน persona แบบ lightweight (ไม่โหลดทั้งไฟล์ลง context)
- ถ้า agent ตัวไหนต้องการข้อมูลเพิ่ม → เพิ่ม `tools` parameter ใน invoke
- Phase ถัดไป: integrate กับ CrewAI เพื่อให้ agents คุยกันได้
