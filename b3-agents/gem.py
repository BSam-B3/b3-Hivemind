"""
GEM — Gemini Commander (สั่งงานเจมแบบมี context ครบ)

Usage:
  python gem.py "วิเคราะห์ตลาด marketplace ท้องถิ่น"
  python gem.py "ออกแบบ architecture สำหรับ Jong-Jaroen phase 2"
  python gem.py "สรุปสถานะโปรเจคทั้งหมด"
"""

import sys
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

WIKI = Path(__file__).parent.parent / "wiki"
CLAUDE_MD = Path(__file__).parent.parent / "CLAUDE.md"

# ─── Build Context จาก wiki/ ──────────────────────────────────────────────────

def build_context() -> str:
    """อ่าน CLAUDE.md + ไฟล์ wiki สำคัญ → สร้าง system prompt ครบ"""
    parts = []

    # 1. CLAUDE.md (กฎและ identity)
    if CLAUDE_MD.exists():
        parts.append("=== B3 TEAM RULES (CLAUDE.md) ===")
        parts.append(CLAUDE_MD.read_text(encoding="utf-8")[:2000])

    # 2. Jong-Jaroen blueprint (context หลัก)
    blueprint = WIKI / "jong-jaroen" / "jong-jaroen-master-blueprint.md"
    if blueprint.exists():
        parts.append("\n=== JONG-JAROEN MASTER BLUEPRINT ===")
        parts.append(blueprint.read_text(encoding="utf-8")[:2000])

    # 3. AI Team index (รู้จัก agents)
    team_index = WIKI / "ai-team" / "index.md"
    if team_index.exists():
        parts.append("\n=== AI TEAM ===")
        parts.append(team_index.read_text(encoding="utf-8")[:800])

    # 4. Gemini persona (เจม identity)
    gem_profile = WIKI / "bridge" / "gemini-profile.md"
    if gem_profile.exists():
        parts.append("\n=== YOUR IDENTITY (GEM) ===")
        parts.append(gem_profile.read_text(encoding="utf-8")[:1000])

    return "\n\n".join(parts)


# ─── Call Gemini ──────────────────────────────────────────────────────────────

def ask_gem(task: str) -> str:
    try:
        from google import genai
        from google.genai import types
    except ImportError:
        sys.exit("ติดตั้งก่อน: pip install google-genai")

    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        sys.exit("ไม่พบ GEMINI_API_KEY ใน .env")

    context = build_context()
    system_prompt = f"""{context}

=== YOUR ROLE ===
คุณคือ เจม (GEM) — AI System Architect ของทีม B3
ตอบสั้น กระชับ ตรงประเด็น ลงท้ายด้วย "ค่ะ"
ถ้าเป็น research/design → สรุปเป็น bullet points + recommendation
"""

    try:
        client = genai.Client(api_key=key)
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=task,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                max_output_tokens=2048,
            )
        )
        return response.text
    except Exception as e:
        if "quota" in str(e).lower() or "429" in str(e):
            return "[Gemini quota หมด — ลองพรุ่งนี้ หรือใช้ b3.py แทนค่ะ]"
        raise


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 2:
        print("Usage: python gem.py \"คำถามหรืองานที่ต้องการ\"")
        return

    task = " ".join(sys.argv[1:])
    print(f"\n🔍 เจม (Gemini) กำลังคิด...\n")
    result = ask_gem(task)
    print("=" * 60)
    print(">> GEM (Gemini)")
    print("=" * 60)
    print(result)

if __name__ == "__main__":
    main()
