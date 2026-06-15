"""
B3 Agent Loader — v1.0
load AI persona จาก wiki/ai-team/*.md แล้ว invoke ผ่าน Claude / Groq / Gemini

Usage:
  python agent_loader.py --list
  python agent_loader.py --agent enjoy --task "ออกแบบหน้า job listing"
  python agent_loader.py --agent joe --agent choe --task "ตรวจ SQL นี้"
  python agent_loader.py --orchestrate --task "ทำ feature rating ไรเดอร์"
"""

import re
import os
import sys
import argparse
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# ─── Path ─────────────────────────────────────────────────────────────────────
# b3-agents/ อยู่ใน B3-Second-Brain/b3-agents/
# wiki/ai-team/ อยู่ใน B3-Second-Brain/wiki/ai-team/
WIKI_PATH = Path(__file__).parent.parent / "wiki" / "ai-team"

# ─── Agent Config ─────────────────────────────────────────────────────────────
# ทุกตัวใช้ Groq (ฟรีไม่จำกัด) — ไม่ต้องใช้ Anthropic API key
# model options: llama-3.3-70b-versatile | llama-3.1-8b-instant (เร็วกว่า)
AGENT_CONFIG = {
    "janie":    {"file": "janie_secretary.md",   "model": "groq", "llm": "llama-3.3-70b-versatile"},
    "enjoy":    {"file": "enjoy_uidev.md",        "model": "groq", "llm": "llama-3.3-70b-versatile"},
    "joe":      {"file": "joe_backend.md",        "model": "groq", "llm": "llama-3.3-70b-versatile"},
    "choe":     {"file": "choe_editor.md",        "model": "groq", "llm": "llama-3.3-70b-versatile"},
    "kong":     {"file": "kong_hacker.md",        "model": "groq", "llm": "llama-3.3-70b-versatile"},
    "kitti":    {"file": "kitti_lawyer.md",       "model": "groq", "llm": "llama-3.3-70b-versatile"},
    "kom":      {"file": "kom_risk.md",           "model": "groq", "llm": "llama-3.3-70b-versatile"},
    "mira":     {"file": "mira_market_intel.md",  "model": "groq", "llm": "llama-3.3-70b-versatile"},
    "dana":     {"file": "dana_analyst.md",       "model": "groq", "llm": "llama-3.3-70b-versatile"},
    "booko":    {"file": "booko_data.md",         "model": "groq", "llm": "llama-3.3-70b-versatile"},
    "nam":      {"file": "nam_support.md",        "model": "groq", "llm": "llama-3.3-70b-versatile"},
    "karn":     {"file": "karn_community.md",     "model": "groq", "llm": "llama-3.3-70b-versatile"},
    "nara":     {"file": "nara_creator.md",       "model": "groq", "llm": "llama-3.3-70b-versatile"},
    "win":      {"file": "win_bizdev.md",         "model": "groq", "llm": "llama-3.3-70b-versatile"},
    "raps":     {"file": "raps_hr.md",            "model": "groq", "llm": "llama-3.3-70b-versatile"},
    "ferin":    {"file": "ferin_procurement.md",  "model": "groq", "llm": "llama-3.3-70b-versatile"},
    "qara":     {"file": "qara_tester.md",        "model": "groq", "llm": "llama-3.3-70b-versatile"},
    "finley":   {"file": "finley_finance.md",     "model": "groq", "llm": "llama-3.3-70b-versatile"},
    "phattama": {"file": "phattama_finance.md",   "model": "groq", "llm": "llama-3.3-70b-versatile"},
    "pim":      {"file": "pim_accounting.md",     "model": "groq", "llm": "llama-3.3-70b-versatile"},
}

# ─── Persona Loader ────────────────────────────────────────────────────────────

def load_persona(agent_name: str) -> str:
    """อ่าน persona file และสร้าง system prompt"""
    config = AGENT_CONFIG.get(agent_name)
    if not config:
        raise ValueError(f"ไม่รู้จัก agent: '{agent_name}' | agents ที่มี: {', '.join(AGENT_CONFIG)}")

    file_path = WIKI_PATH / config["file"]
    if not file_path.exists():
        raise FileNotFoundError(f"ไม่พบไฟล์ persona: {file_path}")

    content = file_path.read_text(encoding="utf-8")

    parts = []

    # ดึง Identity จาก table
    name_m  = re.search(r'\*\*ชื่อ\*\*\s*\|\s*(.+)', content)
    role_m  = re.search(r'\*\*ตำแหน่ง\*\*\s*\|\s*(.+)', content)
    tone_m  = re.search(r'\*\*Tone\*\*\s*\|\s*(.+)', content)
    task_m  = re.search(r'\*\*บทบาทหลัก\*\*\s*\|\s*(.+)', content)

    if name_m:
        parts.append(f"คุณคือ {name_m.group(1).strip()}")
    if role_m:
        parts.append(f"ตำแหน่ง: {role_m.group(1).strip()}")
    if task_m:
        parts.append(f"บทบาทหลัก: {task_m.group(1).strip()}")
    if tone_m:
        parts.append(f"สไตล์การตอบ: {tone_m.group(1).strip()}")

    # ดึง Core Responsibilities section
    resp_m = re.search(r'## \d+\. Core Responsibilities(.+?)(?=\n## |\Z)', content, re.DOTALL)
    if resp_m:
        resp_text = resp_m.group(1).strip()[:800]  # limit ไม่ให้ system prompt ยาวเกิน
        parts.append(f"\nความรับผิดชอบหลัก:\n{resp_text}")

    # กฎพื้นฐาน B3 team
    parts.append("""
กฎพื้นฐาน:
- เจ้านายคือคุณบีสาม (B3) ห้ามเรียก "บอส" หรือ "หัวหน้า"
- ตอบสั้น กระชับ ตรงประเด็น ห้ามเกริ่นนำหรือสรุปซ้ำ
- ถ้า scope ไม่ชัดให้ถามกลับก่อน ไม่เดาเอง
- timestamp ทุกไฟล์ที่สร้าง: YYYY-MM-DD HH:MM ICT
""")

    return "\n".join(parts)


# ─── API Callers ───────────────────────────────────────────────────────────────

def call_claude(system_prompt: str, task: str, model: str) -> str:
    try:
        import anthropic
    except ImportError:
        sys.exit("ติดตั้งก่อน: pip install anthropic")

    key = os.environ.get("ANTHROPIC_API_KEY")
    if not key:
        sys.exit("ไม่พบ ANTHROPIC_API_KEY ใน .env")

    client = anthropic.Anthropic(api_key=key)
    msg = client.messages.create(
        model=model,
        max_tokens=2048,
        system=system_prompt,
        messages=[{"role": "user", "content": task}]
    )
    return msg.content[0].text


def call_groq(system_prompt: str, task: str, model: str) -> str:
    """ใช้ Groq API (OpenAI-compatible) — ฟรีไม่จำกัด"""
    try:
        from groq import Groq
    except ImportError:
        sys.exit("ติดตั้งก่อน: pip install groq")

    key = os.environ.get("GROQ_API_KEY")
    if not key:
        sys.exit("ไม่พบ GROQ_API_KEY ใน .env")

    client = Groq(api_key=key)
    chat = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": task}
        ],
        max_tokens=2048,
        temperature=0.7,
    )
    return chat.choices[0].message.content


def call_gemini(system_prompt: str, task: str, model: str) -> str:
    """Gemini — ใช้เมื่อ quota ยังเหลือ fallback ไป Groq ถ้าหมด"""
    try:
        import google.generativeai as genai
    except ImportError:
        sys.exit("ติดตั้งก่อน: pip install google-generativeai")

    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        # fallback ไป Groq อัตโนมัติ
        print("  ⚠️  ไม่พบ GEMINI_API_KEY — fallback ไป Groq")
        return call_groq(system_prompt, task, "llama-3.3-70b-versatile")

    try:
        genai.configure(api_key=key)
        gem = genai.GenerativeModel(model_name=model, system_instruction=system_prompt)
        response = gem.generate_content(task)
        return response.text
    except Exception as e:
        if "quota" in str(e).lower() or "429" in str(e):
            print("  ⚠️  Gemini quota หมด — fallback ไป Groq")
            return call_groq(system_prompt, task, "llama-3.3-70b-versatile")
        raise


# ─── Invoke ───────────────────────────────────────────────────────────────────

def invoke_agent(agent_name: str, task: str, verbose: bool = True) -> dict:
    config = AGENT_CONFIG[agent_name]
    system_prompt = load_persona(agent_name)

    if verbose:
        emoji = {"claude": "🤖", "groq": "⚡", "gemini": "🔍"}.get(config["model"], "🤖")
        print(f"\n{emoji} {agent_name} ({config['llm']}) กำลังทำงาน...")

    if config["model"] == "claude":
        response = call_claude(system_prompt, task, config["llm"])
    elif config["model"] == "groq":
        response = call_groq(system_prompt, task, config["llm"])
    elif config["model"] == "gemini":
        response = call_gemini(system_prompt, task, config["llm"])
    else:
        raise ValueError(f"ไม่รู้จัก model: {config['model']}")

    return {"agent": agent_name, "model": config["llm"], "task": task, "response": response}


def invoke_with_janie(task: str) -> list:
    """ให้เจนี่วิเคราะห์และแจกงานให้ทีม"""
    agent_list = ", ".join(AGENT_CONFIG.keys())
    janie_task = f"""วิเคราะห์ task นี้และตัดสินใจว่าควรส่งให้ agent คนไหน

Task: {task}

Agents ที่มีในทีม: {agent_list}

ตอบเฉพาะในรูปแบบนี้:
AGENTS: ชื่อ1, ชื่อ2
REASON: เหตุผลสั้นๆ
BRIEF: คำสั่งสั้นๆ ที่จะส่งให้แต่ละ agent"""

    janie_result = invoke_agent("janie", janie_task)
    results = [janie_result]

    # parse agents line
    for line in janie_result["response"].split("\n"):
        if line.startswith("AGENTS:"):
            names = [n.strip().lower() for n in line.replace("AGENTS:", "").split(",")]
            for name in names:
                if name in AGENT_CONFIG and name != "janie":
                    results.append(invoke_agent(name, task))
            break

    return results


# ─── CLI ───────────────────────────────────────────────────────────────────────

def print_result(result: dict):
    print(f"\n{'='*60}")
    print(f"🎭 {result['agent'].upper()}  ({result['model']})")
    print(f"{'='*60}")
    print(result["response"])


def main():
    parser = argparse.ArgumentParser(
        description="B3 Agent Loader — invoke AI personas จาก wiki/ai-team/",
        formatter_class=argparse.RawTextHelpFormatter
    )
    parser.add_argument("--agent", "-a", action="append", metavar="NAME",
                        help="ชื่อ agent (ใช้ได้หลายครั้ง เช่น -a enjoy -a joe)")
    parser.add_argument("--task", "-t", metavar="TASK",
                        help="งานที่ต้องการ (ใส่ใน quotes ถ้ามีช่องว่าง)")
    parser.add_argument("--orchestrate", "-o", action="store_true",
                        help="ให้เจนี่ตัดสินใจว่าส่งงานให้ใคร")
    parser.add_argument("--list", "-l", action="store_true",
                        help="แสดงรายชื่อ agents และ model ที่ใช้")
    args = parser.parse_args()

    if args.list:
        print("\n📋 B3 AI Team — Agents ที่ใช้ได้\n")
        print(f"{'Agent':<12} {'Model':<10} {'File'}")
        print("-" * 55)
        for name, cfg in AGENT_CONFIG.items():
            emoji = {"claude": "🤖", "groq": "⚡", "gemini": "🔍"}.get(cfg["model"], "")
            print(f"{name:<12} {emoji} {cfg['model']:<8} {cfg['file']}")
        print()
        return

    if not args.task:
        parser.print_help()
        sys.exit(1)

    if args.orchestrate:
        results = invoke_with_janie(args.task)
    elif args.agent:
        results = [invoke_agent(name.lower(), args.task) for name in args.agent]
    else:
        print("ระบุ --agent NAME หรือ --orchestrate")
        sys.exit(1)

    for result in results:
        print_result(result)


if __name__ == "__main__":
    main()
