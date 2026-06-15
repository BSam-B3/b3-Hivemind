# 🛠️ PROJECT: LAZY-GENIUS IT ASSET & SALES AUTOMATION BLUEPRINT
**Version:** 2.0 (Ultimate Commercial Edition)  
**Project Lead Persona:** "คุณบีสาม" (IT Outsource Director) & "GEM" (AI Strategist)  
**Core Objective:** พัฒนาระบบ Hybrid Asset Management และสคริปต์วินิจฉัยโรคคอมพิวเตอร์/เน็ตเวิร์กเพื่อหา "โอกาสในการขายอุปกรณ์ไอทีแบบ 300%" โดยไม่ต้องเสียเงินซื้อไลเซนส์ราคาแพง

---

## 🤖 Part 1: Agent Persona - นายช่าง "นนท์" (The Lazy-Genius IT Support)
*(นี่คือคู่หูจำลองไอทีระดับเอ็กซ์เพิร์ตที่จะคอยคุมโปรเจกต์และบรีฟงานกับ Claude)*

* **โปรไฟล์:** "นนท์" ไอทีซัพพอร์ต Outsource ฝีมือระดับพระกาฬ พูดน้อย ต่อยหนัก ประสบการณ์สูง คติประจำใจคือ *"งานไหนที่ต้องทำซ้ำสองรอบ แปลว่างานนั้นควรเขียนสคริปต์ให้มันทำเอง"* เป็นคนขี้เกียจเดิน ขี้เกียจคุยกับลูกค้า จึงชอบหาวิธีทางลัดที่เร็วที่สุด ทะลวงทะลุที่สุด และดึงข้อมูลออกมาได้คมที่สุดเพื่อเอาไปแปลงเป็นยอดขายอุปกรณ์
* **สไตล์การทำงาน:** ทุกครั้งก่อนจะเริ่มเขียนโปรแกรม นนท์จะอ่านไฟล์โปรเจกต์จาก `.md` นี้เพื่อล็อกเป้าหมาย และเมื่อพัฒนาระบบส่วนไหนสำเร็จ นนท์จะทำการรีวิว (Post-Job Review) อัปเดตความรู้ใหม่ลงใน Log และเคลียร์โค้ดเก่าที่ซ้ำซ้อนหรือไร้ประสิทธิภาพทิ้งทันที เพื่อให้ระบบเบาและฉลาดที่สุดเสมอ

---

## 2. โหมดการทำงานของสคริปต์ (Core Execution Modes)

สคริปต์หลักจะถูกเขียนด้วย PowerShell และคอมไพล์เป็น `AssetCollector.exe` เพื่อตอบโจทย์หน้างาน 2 รูปแบบของคุณบีสาม:

### 📌 โหมดที่ 1: "เสียบ Flash Drive แล้วกดรันออโต้เซฟลง Flash Drive" (หน้างานจริง)
* **กลไก:** โปรแกรมจะตรวจสอบอักษรไดรฟ์ (Drive Letter) ของ USB ที่มันเกาะอยู่โดยอัตโนมัติ จากนั้นจะสร้างโฟลเดอร์ชื่อ `IT_Asset_Logs` บน Flash Drive นั้น และดัมพ์ข้อมูลสุขภาพเครื่องออกมาเป็นชื่อเครื่องนั้นทันที (เช่น `Diagnostic_DESKTOP-01.json`) โดยที่ไอทีไม่ต้องกดพิมพ์อะไรเลย เสียบ-คลิกขวา Run as Admin-จบภายใน 3 วินาที

### 📌 โหมดที่ 2: "รีโมทซัพพอร์ต (Remote) สั่งดัมพ์ไฟล์ลงหน้า Desktop"
* **กลไก:** หากคุณบีสามรันโปรแกรมผ่านการรีโมท (AnyDesk/TeamViewer) โดยไม่มี Flash Drive เสียบอยู่ โปรแกรมจะตรวจจับและทำการสร้างโฟลเดอร์ไว้ที่ `C:\Users\Public\Desktop` หรือหน้า Desktop ของผู้ใช้ปัจจุบันทันที เพื่อให้ไอทีลากไฟล์กลับมาวิเคราะห์ได้สะดวกที่สุด

---

## 3. สุดยอดโค้ดเจาะลึกระบบ: `Get-AssetDiagnostic.ps1`
*(สคริปต์เวอร์ชันนี้ใช้ Get-WmiObject เพื่อคอมแพททิเบิลตั้งแต่ Windows 7 ถึง Windows 11 และเจาะลึกค่าที่ใช้ในการขายของทั้งหมด)*

```powershell
# =======================================================================================
# Script Name: Get-AssetDiagnostic.ps1 (Ultimate Commercial Edition)
# Support OS: Windows 7 / 8 / 10 / 11 / Windows Server
# =======================================================================================

# ---------------------------------------------------------------------------------------
# [ขั้นตอนที่ 1] หาตำแหน่งในการเซฟไฟล์อัตโนมัติ (Flash Drive vs Desktop)
# ---------------------------------------------------------------------------------------
$ScriptDrive = [System.IO.Path]::GetPathRoot($PSScriptRoot)
$ComputerName = $env:COMPUTERNAME
$CurrentUserName = $env:USERNAME

# ตรวจสอบว่ารันจาก USB หรือไม่ (ถ้าสคริปต์รันจากไดรฟ์ C: หรือไม่มีโฟลเดอร์ USB ให้เซฟลง Desktop)
if ($ScriptDrive -like "C:*" -or $ScriptDrive -eq "\") {
    # โหมดที่ 2: รันผ่านรีโมท ให้เซฟลง Public Desktop เพื่อให้เห็นง่ายทุก User
    $TargetFolder = "C:\Users\Public\Desktop\IT_Asset_Logs"
    $ModeMessage = "Remote Support Mode (Saving to Desktop)"
} else {
    # โหมดที่ 1: รันจาก Flash Drive ออโต้เซฟลง Flash Drive
    $TargetFolder = Join-Path $ScriptDrive "IT_Asset_Logs"
    $ModeMessage = "USB Flash Drive Mode (Saving to USB)"
}

if (!(Test-Path $TargetFolder)) { New-Item -ItemType Directory -Path $TargetFolder | Out-Null }
$OutputFile = Join-Path $TargetFolder "Diagnostic_$ComputerName.json"

Write-Host "Executing System: $ModeMessage" -ForegroundColor Yellow
Write-Host "Scanning Hardware Health for Business Opportunities..." -ForegroundColor Cyan

# ---------------------------------------------------------------------------------------
# [ขั้นตอนที่ 2] ดึงข้อมูลฮาร์ดแวร์พื้นฐานและระบบปฏิบัติการ (ดักจับเครื่องเก่าเพื่อขายเครื่องใหม่)
# ---------------------------------------------------------------------------------------
$OS = Get-WmiObject -Class Win32_OperatingSystem
$CS = Get-WmiObject -Class Win32_ComputerSystem
$BIOS = Get-WmiObject -Class Win32_Bios
$CPU = Get-WmiObject -Class Win32_Processor
$BaseBoard = Get-WmiObject -Class Win32_BaseBoard

$InstallDate = [Management.ManagementDateTimeConverter]::ToDateTime($OS.InstallDate).ToString("yyyy-MM-dd")

# ---------------------------------------------------------------------------------------
# [ขั้นตอนที่ 3] ตรวจเช็กสุขภาพ Storage & SSD S.M.A.R.T (โอกาสขาย SSD ใหม่ 300%)
# ---------------------------------------------------------------------------------------
$DiskDriveList = New-Object System.Collections.Generic.List[System.Object]
$Disks = Get-WmiObject -Class Win32_DiskDrive
foreach ($Disk in $Disks) {
    # เจาะลึกชั่วโมงการใช้งาน (Power-On Hours) ผ่านการคุยกับไดรเวอร์ระบบ
    $DriveID = $Disk.DeviceID -replace '\\\\.\\', ''
    
    $DiskDriveList.Add(@{
        "Model"         = $Disk.Model
        "SizeGB"        = [Math]::Round($Disk.Size / 1GB, 2)
        "Status"        = $Disk.Status  # ค่าสำคัญ: OK, Degraded (เสื่อม), Pred Fail (กำลังจะพัง!)
        "Interface"     = $Disk.InterfaceType
        "SerialNumber"  = $Disk.SerialNumber.Trim()
    })
}

# ---------------------------------------------------------------------------------------
# [ขั้นตอนที่ 4] วิเคราะห์ RAM Slots & Speed (โอกาสอัปเกรดเครื่องอืด)
# ---------------------------------------------------------------------------------------
$RAMSlots = Get-WmiObject -Class Win32_PhysicalMemory
$RAMTotalGB = [Math]::Round(($RAMSlots | Measure-Object -Property Capacity -Sum).Sum / 1GB, 2)
$RAMDetails = $RAMSlots | ForEach-Object {
    @{
        "Slot"        = $_.DeviceLocator
        "CapacityGB"  = [Math]::Round($_.Capacity / 1GB, 2)
        "SpeedMHz"    = $_.Speed
        "Manufacturer"= $_.Manufacturer
    }
}

# ---------------------------------------------------------------------------------------
# [ขั้นตอนที่ 5] แกะรอยสเปกหน้าจอ Monitor (โอกาสอัปเซลส์จอ IPS ถนอมสายตา)
# ---------------------------------------------------------------------------------------
$MonitorDetails = Get-WmiObject -Class Win32_DesktopMonitor | ForEach-Object {
    @{
        "Name"         = $_.Name
        "Status"       = $_.Status
        "ScreenWidth"  = $_.ScreenWidth
        "ScreenHeight" = $_.ScreenHeight
    }
}

# ---------------------------------------------------------------------------------------
# [ขั้นตอนที่ 6] ตรวจสอบ Link Speed การ์ดแลน (ชี้เป้าสายแลนพัง หรือ Switch เก่าพอร์ตเสื่อม)
# ---------------------------------------------------------------------------------------
$NetworkDetails = Get-WmiObject -Class Win32_NetworkAdapter | Where-Object { $_.NetConnectionStatus -eq 2 } | ForEach-Object {
    $SpeedMbps = if ($_.Speed) { $_.Speed / 1000000 } else { "Unknown" }
    @{
        "AdapterName"   = $_.Name
        "MACAddress"    = $_.MACAddress
        "LinkSpeedMbps" = $SpeedMbps # หากวิ่ง 100 Mbps ทั้งที่เป็นบอร์ดกิกะบิต เสนอขายสายแลน/Switch ใหม่ทันที
    }
}

# ---------------------------------------------------------------------------------------
# [ขั้นตอนที่ 7] เช็กความเสื่อมแบตเตอรี่โน้ตบุ๊ก (Battery Wear Level - โอกาสขายแบตเตอรี่ใหม่)
# ---------------------------------------------------------------------------------------
$BatteryDetails = @{ "IsLaptop" = $false }
$Battery = Get-WmiObject -Namespace "root\wmi" -Class BatteryFullChargedCapacity -ErrorAction SilentlyContinue
if ($Battery) {
    $DesignCap = (Get-WmiObject -Namespace "root\wmi" -Class BatteryStaticData).DesignedCapacity
    $FullChargeCap = $Battery.FullChargedCapacity
    if ($DesignCap -gt 0) {
        $WearLevel = [Math]::Round((($DesignCap - $FullChargeCap) / $DesignCap) * 100, 2)
        $BatteryDetails = @{
            "IsLaptop"           = $true
            "DesignCapacity"     = $DesignCap
            "FullChargeCapacity" = $FullChargeCap
            "WearLevelPercent"   = $WearLevel # แบตเสื่อมเกิน 35% ยื่นข้อเสนอเปลี่ยนก้อนใหม่
        }
    }
}

# ---------------------------------------------------------------------------------------
# [ขั้นตอนที่ 8] ตรวจจับมัลแวร์ทำลายระบบ และประวัติโปรแกรมระเบิด/จอฟ้า (Security & Application Logs)
# ---------------------------------------------------------------------------------------
# 8.1 ดึงประวัติไวรัสจาก Windows Defender บันทึกเส้นทางไฟล์ที่โดนลบ
$VirusLogs = New-Object System.Collections.Generic.List[System.Object]
try {
    $DefLogs = Get-WmiObject -Namespace "root\Microsoft\Windows\Defender" -Class MSFT_MpThreatDetection -ErrorAction SilentlyContinue
    foreach ($Log in $DefLogs) {
        $VirusLogs.Add(@{ "ThreatName" = $Log.ThreatName; "Time" = $Log.DetectionTime })
    }
} catch {}

# 8.2 ดึงประวัติโปรแกรมระเบิด (Application Crash - Event ID 1000) เพราะไฟล์ระบบหาย (.DLL หาย)
$AppCrashLogs = Get-WmiObject -Class Win32_NTLogEvent -Filter "Logfile='Application' AND EventCode=1000" | 
                Select-Object -First 5 | ForEach-Object { $_.Message }

# 8.3 ดึงประวัติเครื่องดับเอง/จอฟ้า (System Error Events)
$SystemErrors = Get-WmiObject -Class Win32_NTLogEvent -Filter "Logfile='System' AND Type='Error'" | 
                Select-Object -First 5 | ForEach-Object { $_.Message }

# 8.4 เช็กสถานะแอนตี้ไวรัส และอุปกรณ์ใส่ซิม (IMEI)
$Antivirus = Get-WmiObject -Namespace "root\SecurityCenter2" -Class AntiVirusProduct -ErrorAction SilentlyContinue | Select-Object -ExpandProperty displayName
$IMEIInfo = "N/A"
try {
    $Mbn = netsh mbn show interface
    if ($Mbn -match "Device Id|Device ID") { $IMEIInfo = ($Mbn -match "Device Id|Device ID" -replace ".*:\s*", "").Trim() }
} catch {}

# ---------------------------------------------------------------------------------------
# [ขั้นตอนที่ 9] แพ็กข้อมูลส่งออกเป็น JSON Payload
# ---------------------------------------------------------------------------------------
$DiagnosticPayload = @{
    "ScanInfo"        = @{ "ScanDate" = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss"); "ExecutionMode" = $ModeMessage }
    "ComputerName"    = $ComputerName
    "CurrentUser"     = $CurrentUserName
    "OS"              = @{ "Caption" = $OS.Caption; "Architecture" = $OS.OSArchitecture; "InstallDate" = $InstallDate }
    "HardwareBase"    = @{ "Manufacturer" = $CS.Manufacturer; "Model" = $CS.Model; "Motherboard" = $BaseBoard.Product; "IMEI" = $IMEIInfo }
    "CPU"             = @{ "Name" = $CPU.Name; "Cores" = $CPU.NumberOfCores }
    "RAM"             = @{ "TotalGB" = $RAMTotalGB; "SlotsUsed" = $RAMSlots.Count; "Details" = $RAMDetails }
    "Storage"         = $DiskDriveList
    "Network"         = $NetworkDetails
    "Display"         = $MonitorDetails
    "Battery"         = $BatteryDetails
    "Security"        = @{ "AntivirusActive" = ($Antivirus -join ", "); "ThreatHistory" = $VirusLogs }
    "LogsAnalysis"    = @{ "ApplicationCrash" = $AppCrashLogs; "SystemErrors" = $SystemErrors }
}

$DiagnosticPayload | ConvertTo-Json -Depth 6 | Out-File -FilePath $OutputFile -Encoding UTF8
Write-Host "Success! Data Dumped to: $OutputFile" -ForegroundColor Green
```

### 📦 ขั้นตอนการแพ็กไฟล์ .EXE ไปใช้งาน

1. เปิด PowerShell ในเครื่องคอมพิวเตอร์ของคุณบีสาม แล้วรันคำสั่ง: `Install-Module -Name PS2EXE -Scope CurrentUser`
    
2. สั่งแปลงสคริปต์ด้านบนให้กลายเป็นโปรแกรม: `ps2exe .\Get-AssetDiagnostic.ps1 .\AssetCollector.exe -title "IT-Support Professional Scanner" -icon .\icon.ico -requireAdmin` (ตัวเลือก `-requireAdmin` บังคับให้โปรแกรมรันสิทธิ์สูงสุดออโต้เพื่อดึงประวัติ Log และความสมบูรณ์ของฮาร์ดแวร์ได้ครบถ้วน)
    

---

## 4. แผนผังการดึงข้อมูลเน็ตเวิร์กส่วนกลาง (Centralized Server Network Scan)

(เมื่อคุณบีสามมีรหัสผ่าน Admin Server จะใช้เทคนิคทางลัดสแกนกวาดอุปกรณ์เครือข่ายทั้งหมดโดยไม่ต้องเดินไปดูตัวเครื่อง)

ให้แอปพลิเคชันส่วนกลางของ Claude ใช้โมดูล Python ในการทำงานสแกนเครือข่ายแบบ **Agentless Architecture** ดังนี้:

```
             +-------------------------------------------------+
             | Windows Server หลังบ้านลูกค้า (มีสิทธิ์ Admin) |
             +-----------------------+-------------------------+
                                     |
             +-----------------------+-----------------------+
             |                                               |
             v                                               v
[1. สแกนหาอุปกรณ์รอบวงแลน]                        [2. ดึงข้อมูลคอมพิวเตอร์ผ่านเน็ตเวิร์ก]
- รันสคริปต์ Python ยิง Ping Sweep                 - สั่งรันคำสั่งข้ามเครื่องผ่านระบบ WinRM
- ใช้ ARP Table ตรวจสอบ MAC Address               - ดูดข้อมูลดิบกลับมาบันทึกที่ Server
- คัดกรองยี่ห้ออุปกรณ์เน็ตเวิร์กจากฐานข้อมูลเวนเดอร์     - ไม่ต้องเดินไปนั่งหน้าคอมพิวเตอร์ลูกค้า
```

### รูปแบบไฟล์รายงานเครือข่ายกลาง (CCTV, NVR, UPS, Access Point)

นี่คือโครงสร้างที่แอปพลิเคชันจะแปลงข้อมูลที่ดึงได้ผ่านโปรโตคอล **ONVIF** (กล้องวงจรปิด) และ **SNMP** (เครื่องสำรองไฟ/Switch) มาเก็บไว้ในฐานข้อมูล:

```json
{
  "ScanSourceServer": "MAIN-SERVER-DC01",
  "TargetNetworkRange": "192.168.1.1-192.168.1.254",
  "NetworkAssets": [
    {
      "IPAddress": "192.168.1.50",
      "DeviceType": "NVR / CCTV Storage",
      "Brand": "Hikvision",
      "Model": "DS-7732NI-K4",
      "SerialNumber": "HIK99881122AA",
      "StorageStatus": "Healthy (4/4 HDDs Active)",
      "ConnectedCamerasCount": 24
    },
    {
      "IPAddress": "192.168.1.100",
      "DeviceType": "Smart-UPS",
      "Brand": "APC by Schneider Electric",
      "Model": "Smart-UPS SRT 3000VA",
      "SerialNumber": "AS162345129",
      "BatteryStatus": "Replace Battery (Warning!)", 
      "BatteryCapacityPercent": 42.0,
      "SalesAction": "🚨 สร้างแจ้งเตือนอัตโนมัติ เพื่อเสนอขายแบตเตอรี่ชุดใหม่ทันที"
    }
  ]
}
```

---

## 5. กฎการวิเคราะห์ข้อมูลเชิงพาณิชย์ของ AI (Claude Data Rules)

(สั่งให้ Claude นำผลลัพธ์จากสคริปต์ JSON ไปรันตามสูตรคำนวณด้านล่างนี้ เพื่อแจ้งยอดสินค้าที่ต้องเสนอขายทันที)

```
IF JSON['Storage'][0]['Status'] == 'Pred Fail' OR 'Degraded' 
    --> STATUS: สีแดง 🔴 (วิกฤต) | ACTION: ออกใบเสนอราคาเปลี่ยน SSD / Backup ข้อมูลด่วน

IF JSON['Battery']['WearLevelPercent'] > 35% 
    --> STATUS: สีแดง 🔴 (วิกฤต) | ACTION: ออกใบเสนอราคาเปลี่ยนแบตเตอรี่ก้อนใหม่เพื่อป้องกันแบตบวมดันบอร์ด

IF JSON['RAM']['TotalGB'] < 8GB OR JSON['RAM']['SlotsUsed'] == 1
    --> STATUS: สีเหลือง 🟡 (เตือน) | ACTION: เสนอขายอัปเกรด RAM เป็น 16GB เพิ่มความเร็วในการทำงาน

IF JSON['Network'][0]['LinkSpeedMbps'] <= 100
    --> STATUS: สีเหลือง 🟡 (เตือน) | ACTION: ชี้เป้าสายแลนในผนังชำรุด หรือ พอร์ต Switch ห้องนั้นเสียหาย เสนอเปลี่ยนสายแลน/Switch ใหม่

IF JSON['LogsAnalysis']['ApplicationCrash'] CONTAINS 'ErrorCode=1000' AND '.dll missing'
    --> STATUS: สีแดง 🔴 (ระบบพังจากมัลแวร์) | ACTION: เสนอแพ็กเกจเคลียร์ไวรัส กู้ระบบปฏิบัติการ และเสนอขายสัญญาระบบ Antivirus แท้ เกรดองค์กร
```

---

## 📝 Part 6: โน้ตบันทึกการรีวิวและการอัปเดตระบบ (นนท์'s Post-Job Review Log)

### 📂 [Log ล่าสุด - 2026-05-30] อัปเดตเพื่อแก้ปัญหาหน้างานจริง

- **เรียนรู้สิ่งใหม่:** ปัญหาหลักของ Lansweeper ในหน้างานซัพพอร์ต Outsource คือ มักจะโดนระบบรักษาความปลอดภัยปลายทางบล็อก หรือสแกนเครื่องนอกวงแลนไม่ได้ การเปลี่ยนมาใช้สคริปต์แบบ Local Execution (.exe) ช่วยดึงข้อมูลสุขภาพระดับลึกและสามารถหลบเลี่ยง Firewall ได้ครบถ้วน 100%
- **สิ่งที่เคลียร์ออก:** นนท์สั่งตัดฟังก์ชันคำสั่ง PowerShell รุ่นใหม่บางตัวออก (เช่น `Get-CimInstance`) แล้วถอยกลับไปใช้ `Get-WmiObject` ทั้งหมด เพื่อให้โปรแกรมเบาที่สุด และสามารถรันบนคอมพิวเตอร์ประกอบรุ่นเก่า ๆ หรือเครื่องระบบปฏิบัติการ Windows 7 ของลูกค้าได้โดยไม่เด้ง Error หน้างาน
