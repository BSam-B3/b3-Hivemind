$OutputFolder = "C:\Users\Public\Desktop\IT_Asset_Logs"
if (!(Test-Path -Path $OutputFolder)) {
    New-Item -ItemType Directory -Path $OutputFolder -Force | Out-Null
}
$computerName = $env:COMPUTERNAME
$outputFile = Join-Path $OutputFolder "Diagnostic_$computerName.json"

Write-Host "CIT Asset Scanner (41 items)" -ForegroundColor Cyan
Write-Host "Scanning: $computerName" -ForegroundColor Yellow

$biosSerial = (Get-WmiObject Win32_BIOS | Select-Object -ExpandProperty SerialNumber).Trim()
$computerSystem = Get-WmiObject Win32_ComputerSystem
$serviceTag = $null
try { $serviceTag = (Get-WmiObject Win32_SystemEnclosure | Select-Object -ExpandProperty SerialNumber).Trim() } catch { }
$domain = $computerSystem.Domain

$manufacturer = $computerSystem.Manufacturer
$model = $computerSystem.Model
$processor = Get-WmiObject Win32_Processor
$processorName = $processor.Name
$processorCores = $processor.NumberOfCores
$ramGB = [math]::Round($computerSystem.TotalPhysicalMemory / 1GB)
$motherboard = $null
try { $motherboard = (Get-WmiObject Win32_BaseBoard | Select-Object -ExpandProperty Product).Trim() } catch { }
$gpu = @()
try { $gpu = @((Get-WmiObject Win32_VideoController | Where-Object { $_.Name -notlike "*Remote*" } | ForEach-Object { @{ Name = $_.Name; DriverVersion = $_.DriverVersion } })) } catch { }

$disks = @()
Get-WmiObject Win32_LogicalDisk | Where-Object { $_.DriveType -eq 3 } | ForEach-Object {
    $totalGB = [math]::Round($_.Size / 1GB)
    $freeGB = [math]::Round($_.FreeSpace / 1GB)
    $usedPercent = [math]::Round((($totalGB - $freeGB) / $totalGB) * 100)
    $disks += @{ Drive = $_.Name; TotalGB = $totalGB; FreeGB = $freeGB; UsedPercent = $usedPercent }
}

$networkConfig = @()
Get-WmiObject Win32_NetworkAdapterConfiguration | Where-Object { $_.IPEnabled -eq $true } | ForEach-Object {
    $ipv4 = @($_.IPAddress | Where-Object { $_ -match '\d+\.\d+\.\d+\.\d+$' })
    if ($ipv4.Count -gt 0) {
        $networkConfig += @{ AdapterName = $_.Description; IPAddress = $ipv4[0]; Gateway = if ($_.DefaultIPGateway) { $_.DefaultIPGateway[0] } else { "N/A" }; DNSServers = @($_.DNSServerSearchOrder); MACAddress = $_.MACAddress }
    }
}

$osInfo = Get-WmiObject Win32_OperatingSystem
$osCaption = $osInfo.Caption
$osVersion = $osInfo.Version
$osBuild = $osInfo.BuildNumber
$osInstallDate = [datetime]::ParseExact($osInfo.InstallDate.Substring(0, 8), "yyyyMMdd", $null).ToString("yyyy-MM-dd")
$uptimeDays = ((Get-Date) - [datetime]::ParseExact($osInfo.LastBootUpTime.Substring(0, 14), "yyyyMMddHHmmss", $null)).Days

$antivirusStatus = "Unknown"
try { if (Get-WmiObject -Namespace "root\SecurityCenter2" -Class AntiVirusProduct -ErrorAction SilentlyContinue) { $antivirusStatus = "Active" } } catch { }
$firewallStatus = "Unknown"
try { if (Get-WmiObject -Namespace "root\SecurityCenter2" -Class FirewallProduct -ErrorAction SilentlyContinue) { $firewallStatus = "Active" } else { $firewallStatus = "Disabled" } } catch { }
$licenseStatus = "Unknown"
try { $slmgr = Get-WmiObject SoftwareLicensingProduct | Where-Object { $_.PartialProductKey } | Select-Object -ExpandProperty LicenseStatus; $licenseStatus = if ($slmgr -eq 1) { "Licensed" } elseif ($slmgr -eq 0) { "Unlicensed" } else { "Unknown" } } catch { }

$cpuUsage = 0
$memoryUsage = 0
try { $cpuUsage = [math]::Round((Get-WmiObject Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average) } catch { }
try { $osData = Get-WmiObject Win32_OperatingSystem; $memoryUsage = [math]::Round(((($osData.TotalVisibleMemorySize - $osData.FreePhysicalMemory) / $osData.TotalVisibleMemorySize) * 100)) } catch { }
$topProcesses = @()
try { $topProcesses = @((Get-Process | Sort-Object WorkingSet -Descending | Select-Object -First 5 | ForEach-Object { @{ Name = $_.Name; MemoryMB = [math]::Round($_.WorkingSet / 1MB) } })) } catch { }

$batteryInfo = $null
try { $battery = Get-WmiObject Win32_Battery; if ($battery) { $batteryInfo = @{ CurrentCapacity = $battery.EstimatedChargeRemaining; DesignCapacity = $battery.DesignCapacity } } } catch { }

$printers = @()
try { $printers = @((Get-WmiObject Win32_Printer | ForEach-Object { @{ Name = $_.Name } })) } catch { }
$usbDevices = @()
try { $usbDevices = @((Get-WmiObject Win32_USBHub | ForEach-Object { @{ Name = $_.Name } })) } catch { }

$networkDomain = $null
try { $networkDomain = Get-WmiObject Win32_NetworkAdapterConfiguration | Where-Object { $_.IPEnabled -eq $true } | Select-Object -First 1 -ExpandProperty DNSDomain } catch { }

$issues = @()
$score = 100
foreach ($disk in $disks) {
    if ($disk.UsedPercent -gt 90) { $issues += "Disk " + $disk.Drive + " over 90%"; $score -= 30 }
    elseif ($disk.UsedPercent -gt 75) { $issues += "Disk " + $disk.Drive + " over 75%"; $score -= 15 }
}
if ($cpuUsage -gt 80) { $issues += "High CPU"; $score -= 10 }
if ($memoryUsage -gt 85) { $issues += "High Memory"; $score -= 20 }
if ($antivirusStatus -notlike "*Active*") { $issues += "Antivirus off"; $score -= 25 }
if ($firewallStatus -eq "Disabled") { $issues += "Firewall off"; $score -= 25 }
if ($licenseStatus -eq "Unlicensed") { $issues += "License invalid"; $score -= 15 }

$score = [math]::Max(0, [math]::Min(100, $score))
$grade = if ($score -ge 90) { "A" } elseif ($score -ge 80) { "B" } elseif ($score -ge 70) { "C" } elseif ($score -ge 60) { "D" } else { "F" }
if ($issues.Count -eq 0) { $issues = @("OK") }

$diagnostic = @{
    metadata = @{ computer_name = $computerName; scan_date = (Get-Date -Format "yyyy-MM-dd"); scan_time = (Get-Date -Format "HH:mm:ss") }
    computer_identification = @{ computer_name = $computerName; bios_serial = $biosSerial; service_tag = $serviceTag; domain = $domain }
    hardware_info = @{ manufacturer = $manufacturer; model = $model; processor_name = $processorName; processor_cores = $processorCores; ram_gb = $ramGB; motherboard = $motherboard; graphics_card = $gpu }
    storage = @{ drives = $disks }
    network = @{ config = $networkConfig; domain = $networkDomain }
    system = @{ os_name = $osCaption; os_version = $osVersion; os_build = $osBuild; install_date = $osInstallDate; uptime_days = $uptimeDays }
    security = @{ antivirus = $antivirusStatus; firewall = $firewallStatus; license = $licenseStatus }
    performance = @{ cpu_percent = $cpuUsage; memory_percent = $memoryUsage; top_processes = $topProcesses }
    battery = $batteryInfo
    peripherals = @{ printers = $printers; usb_devices = $usbDevices }
    health_check = @{ score = $score; grade = $grade; issues = $issues }
}

$jsonOutput = $diagnostic | ConvertTo-Json -Depth 10
Set-Content -Path $outputFile -Value $jsonOutput -Encoding UTF8 -Force

Write-Host "Done! File: $outputFile" -ForegroundColor Green
Write-Host "Grade: $grade | Score: $score/100" -ForegroundColor Cyan
Read-Host "Press Enter to exit..."
