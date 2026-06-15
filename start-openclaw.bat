@echo off
:: B3 OpenClaw Auto-Start
:: วางไว้ใน Windows Startup folder เพื่อให้รันอัตโนมัติตอน boot
:: Shell+R → shell:startup → วาง shortcut ของไฟล์นี้

cd /d "%~dp0"
echo [%date% %time%] Starting OpenClaw Watchdog... >> logs\startup.log 2>&1
start "" /B node scripts\openclaw-watchdog.js >> logs\startup.log 2>&1
echo [%date% %time%] Watchdog launched. >> logs\startup.log 2>&1
