"""
B3 Natural Language Commander
สั่งงาน AI Team ด้วยภาษาธรรมดา

ตัวอย่าง:
  python b3.py "เจนี่ ส่งสรุปให้ที"
  python b3.py "เอนจอย ออกแบบหน้า job listing ที"
  python b3.py "โจ ชเว เอนจอย ตรวจ SQL นี้ที"
  python b3.py "มิรา วิเคราะห์คู่แข่งของ Jong-Jaroen"
"""

import sys
from agent_loader import invoke_agent, invoke_with_janie

# ─── ชื่อไทย/ชื่อเล่น → agent key ────────────────────────────────────────────
NAME_MAP = {
    # เจนี่
    "เจนี่": "janie", "เจน": "janie", "janie": "janie",

    # เอนจอย
    "เอนจอย": "enjoy", "enjoy": "enjoy", "จิง": "enjoy",

    # โจ
    "โจ": "joe", "joe": "joe",

    # ชเว
    "ชเว": "choe", "choe": "choe", "เฟนตัน": "choe",

    # ก้อง
    "ก้อง": "kong", "kong": "kong",

    # กิตติ
    "กิตติ": "kitti", "kitti": "kitti",

    # คมน์
    "คมน์": "kom", "kom": "kom",

    # มิรา
    "มิรา": "mira", "mira": "mira",

    # ดาน่า
    "ดาน่า": "dana", "dana": "dana",

    # บุ๊คโกะ
    "บุ๊คโกะ": "booko", "booko": "booko",

    # น้ำ
    "น้ำ": "nam", "nam": "nam",

    # กานต์
    "กานต์": "karn", "karn": "karn",

    # นารา
    "นารา": "nara", "nara": "nara",

    # วิน
    "วิน": "win", "win": "win",

    # แรปส์
    "แรปส์": "raps", "raps": "raps",

    # เฟริน
    "เฟริน": "ferin", "ferin": "ferin",

    # คาร่า
    "คาร่า": "qara", "qara": "qara",

    # ฟินเล่
    "ฟินเล่": "finley", "finley": "finley",

    # ปัทมา
    "ปัทมา": "phattama", "phattama": "phattama",

    # พิม
    "พิม": "pim", "pim": "pim",
}

# ─── Parse ────────────────────────────────────────────────────────────────────

def parse_command(text: str):
    """
    แยกชื่อ agent และ task จาก natural language
    คืนค่า (agents: list, task: str)

    "เจนี่ ส่งสรุปให้ที"          → (["janie"], "ส่งสรุปให้ที")
    "โจ ชเว ตรวจ SQL นี้"         → (["joe", "choe"], "ตรวจ SQL นี้")
    "มิรา วิเคราะห์ตลาด"          → (["mira"], "วิเคราะห์ตลาด")
    """
    tokens = text.strip().split()
    agents = []
    task_start = 0

    for i, token in enumerate(tokens):
        # ลบ comma, Thai connector words ท้าย token
        clean = token.rstrip(".,!?,ที่")
        if clean in NAME_MAP:
            agents.append(NAME_MAP[clean])
            task_start = i + 1
        else:
            # หยุดเมื่อเจอคำที่ไม่ใช่ชื่อ agent
            break

    task = " ".join(tokens[task_start:]).strip()
    return agents, task


def print_result(result: dict):
    print(f"\n{'='*60}")
    print(f">> {result['agent'].upper()}  ({result['model']})")
    print(f"{'='*60}")
    print(result["response"])
    print()


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 2:
        print("\nวิธีใช้:")
        print('  python b3.py "เจนี่ ส่งสรุปให้ที"')
        print('  python b3.py "เอนจอย ออกแบบหน้า job listing"')
        print('  python b3.py "โจ ชเว ตรวจ SQL นี้ที"')
        print('  python b3.py "มิรา วิเคราะห์คู่แข่ง Jong-Jaroen"')
        print()
        print("Agents ที่มี:", ", ".join(NAME_MAP.keys()))
        return

    text = " ".join(sys.argv[1:])
    agents, task = parse_command(text)

    if not task:
        print(f"ไม่พบ task — ลองพิมพ์ใหม่ เช่น: เจนี่ ช่วยสรุปสถานะโปรเจคที")
        return

    if not agents:
        # ไม่มีชื่อ agent → ให้เจนี่แจกเอง
        print(f"ไม่พบชื่อ agent — ให้เจนี่แจกงานให้...")
        results = invoke_with_janie(task)
    else:
        results = [invoke_agent(name, task) for name in agents]

    for r in results:
        print_result(r)


if __name__ == "__main__":
    main()
