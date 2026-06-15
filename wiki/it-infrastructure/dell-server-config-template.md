# Dell Server — System Configuration Template

> **ประเภทหน้า:** Template / แบบฟอร์มกรอกข้อมูล  
> **Source:** สร้างขึ้นโดยตรง (ไม่ได้ synthesize จาก raw/) — ใช้เป็นแม่แบบสำหรับบันทึก config เซิร์ฟเวอร์แต่ละเครื่อง  
> **อัปเดตล่าสุด:** 2026-05-25

---

## 1. ข้อมูลพื้นฐาน (Identity)

| รายการ | ค่า |
|---|---|
| Hostname | |
| Service Tag (Dell) | |
| Asset Tag (Internal) | |
| รุ่น (Model) | Dell PowerEdge ___ |
| Data Center / ห้อง | |
| Rack / Unit (U) | |
| วันที่ติดตั้ง | |
| ผู้รับผิดชอบ (Owner) | |
| สถานะ (Status) | `Production` / `Staging` / `Decommissioned` |

---

## 2. Hardware Specification

### CPU
| รายการ | ค่า |
|---|---|
| จำนวน Socket | |
| รุ่น CPU | |
| จำนวน Core / Thread | |
| Base Clock | |

### Memory (RAM)
| รายการ | ค่า |
|---|---|
| ความจุรวม | GB |
| จำนวน DIMM | |
| ชนิด | DDR4 / DDR5 |
| ความเร็ว | MHz |

### Storage
| Slot | รุ่น / ขนาด | ชนิด (SSD/HDD/NVMe) | RAID Role |
|---|---|---|---|
| Bay 0 | | | |
| Bay 1 | | | |
| Bay 2 | | | |
| Bay 3 | | | |

### RAID Configuration
| RAID Group | RAID Level | Members | Virtual Disk Size | หมายเหตุ |
|---|---|---|---|---|
| VD0 | | | | |

### Network Interface Card (NIC)
| Port | MAC Address | Speed | VLAN | ใช้งาน |
|---|---|---|---|---|
| NIC1 Port1 | | 10GbE / 25GbE | | Management |
| NIC1 Port2 | | | | |
| NIC2 Port1 | | | | |
| NIC2 Port2 | | | | |

### Power Supply Unit (PSU)
| รายการ | ค่า |
|---|---|
| จำนวน PSU | 2 (Redundant) |
| Wattage ต่อ PSU | W |
| สถานะ PSU1 | OK / Fault |
| สถานะ PSU2 | OK / Fault |

---

## 3. iDRAC / Out-of-Band Management

| รายการ | ค่า |
|---|---|
| iDRAC IP Address | |
| iDRAC Subnet Mask | |
| iDRAC Gateway | |
| iDRAC Version | |
| License | Basic / Enterprise |
| VLAN (iDRAC) | |

> **หมายเหตุความปลอดภัย:** ห้ามบันทึก password iDRAC ที่นี่ — เก็บใน password manager เท่านั้น

---

## 4. Operating System

| รายการ | ค่า |
|---|---|
| OS | |
| Version / Build | |
| Edition | |
| Install Date | |
| Activation Key Location | |
| Kernel / Build Number | |
| Timezone | Asia/Bangkok (UTC+7) |

---

## 5. IP Address & Network

| Interface | IP Address | Subnet | Gateway | DNS | VLAN | วัตถุประสงค์ |
|---|---|---|---|---|---|---|
| eth0 / eno1 | | | | | | Management |
| eth1 / eno2 | | | | | | Production |
| bond0 | | | | | | |

---

## 6. Firmware & Driver Versions

| Component | Current Version | Latest Available | วันที่อัปเดตล่าสุด |
|---|---|---|---|
| BIOS / UEFI | | | |
| iDRAC Firmware | | | |
| PERC / RAID Controller | | | |
| NIC Firmware | | | |
| HBA Firmware | | | |

> ตรวจสอบ firmware ล่าสุดได้ที่ Dell Support โดยใช้ Service Tag

---

## 7. Installed Software & Services

| Software / Service | Version | Port | สถานะ | หมายเหตุ |
|---|---|---|---|---|
| | | | Running / Stopped | |
| | | | | |

---

## 8. Backup & Recovery

| รายการ | ค่า |
|---|---|
| Backup Solution | |
| Backup Schedule | |
| Backup Destination | |
| Retention Policy | |
| Recovery Time Objective (RTO) | |
| Recovery Point Objective (RPO) | |
| วันที่ทดสอบ restore ล่าสุด | |

---

## 9. Monitoring

| รายการ | ค่า |
|---|---|
| Monitoring Tool | |
| Agent ติดตั้งแล้ว | Yes / No |
| Alert ส่งไปที่ | |
| Dashboard URL | |

---

## 10. Change Log

| วันที่ | ผู้ดำเนินการ | การเปลี่ยนแปลง | Ticket/Ref |
|---|---|---|---|
| 2026-05-25 | | สร้าง config record ครั้งแรก | |

---

## หน้าที่เกี่ยวข้อง

- [[it-infrastructure/index]] — สารบัญ IT Infrastructure ทั้งหมด
