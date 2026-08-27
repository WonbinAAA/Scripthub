@echo off
setlocal EnableDelayedExpansion

:: =======================================================
:: [1] ย้ายไปยัง Directory ที่สคริปต์รันอยู่ทันที
:: =======================================================
cd /d "%~dp0"
set "USB_DRIVE=%~d0"

:: =======================================================
:: [2] ตรวจสอบและยกระดับสิทธิ์เป็น Admin อัตโนมัติ
:: =======================================================
openfiles >nul 2>&1
if %errorlevel% neq 0 (
    echo Requesting Administrative Privileges...
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
    echo UAC.ShellExecute "%~f0", "", "%~dp0", "runas", 1 >> "%temp%\getadmin.vbs"
    "%temp%\getadmin.vbs"
    del "%temp%\getadmin.vbs"
    exit /b
)

:: =======================================================
:: [3] ตั้งค่ารหัสสี ANSI และแสดงหน้าต่างหลัก
:: =======================================================
for /f "tokens=1,2 delims=#" %%a in ('"prompt #$H#$E# & echo on & for %%b in (1) do rem"') do set "ESC=%%b"
set "GREEN=%ESC%[92m"
set "RED=%ESC%[91m"
set "RESET=%ESC%[0m"

cls
echo ===================================================
echo   Auto Boot Setup (No F12)
echo   Flashdrive Target: %USB_DRIVE%
echo ===================================================
echo.

:: =======================================================
:: [4] ตรวจสอบตำแหน่งไฟล์ WIM
:: =======================================================
set WIM_PATH=

if exist "%USB_DRIVE%\sources\boot.wim" set WIM_PATH=\sources\boot.wim
if "%WIM_PATH%"=="" if exist "%USB_DRIVE%\boot.wim" set WIM_PATH=\boot.wim

if "%WIM_PATH%"=="" (
    if exist "%USB_DRIVE%\SSTR\strelec10x64.wim" set "WIM_PATH=\SSTR\strelec10x64.wim"
    if "!WIM_PATH!"=="" if exist "%USB_DRIVE%\SSTR\strelec11x64.wim" set "WIM_PATH=\SSTR\strelec11x64.wim"
    if "!WIM_PATH!"=="" if exist "%USB_DRIVE%\SSTR\strelec10x86.wim" set "WIM_PATH=\SSTR\strelec10x86.wim"
    if "!WIM_PATH!"=="" if exist "%USB_DRIVE%\SSTR\strelec10x64Eng.wim" set "WIM_PATH=\SSTR\strelec10x64Eng.wim"
)

if "%WIM_PATH%"=="" (
    echo %RED%[ERROR] No valid Boot WIM found on %USB_DRIVE%!%RESET%
    echo Please check your USB drive structure.
    pause
    exit /b
)

:: =======================================================
:: [5] ตรวจสอบตำแหน่งไฟล์ boot.sdi
:: =======================================================
set SDI_PATH=
if exist "%USB_DRIVE%\SSTR\boot.sdi" set SDI_PATH=\SSTR\boot.sdi
if "%SDI_PATH%"=="" if exist "%USB_DRIVE%\boot\boot.sdi" set SDI_PATH=\boot\boot.sdi
if "%SDI_PATH%"=="" if exist "%USB_DRIVE%\boot.sdi" set SDI_PATH=\boot.sdi

if "%SDI_PATH%"=="" (
    echo %RED%[ERROR] boot.sdi not found in \SSTR\, \boot\, or Root directory!%RESET%
    echo Please check your USB drive structure.
    pause
    exit /b
)

echo Found Boot Image : %WIM_PATH%
echo Found SDI File   : %SDI_PATH%
echo.

:: =======================================================
:: [6] สร้าง BCD Entry และตั้งค่าเมนูบูทชั่วคราว
:: =======================================================
echo [1/4] Configuring Ramdisk Options...
bcdedit /create {ramdiskoptions} /d "USB Boot Setup" >nul 2>&1
bcdedit /set {ramdiskoptions} ramdisksdidevice partition=%USB_DRIVE% >nul
bcdedit /set {ramdiskoptions} ramdisksdipath %SDI_PATH% >nul

echo [2/4] Creating New OS Loader Entry...
for /f "tokens=2 delims={}" %%i in ('bcdedit /create /d "Boot to USB Environment" /application osloader') do set GUID={%%i}

echo [3/4] Linking Entry to Boot WIM...
bcdedit /set %GUID% device ramdisk=[%USB_DRIVE%]%WIM_PATH%,{ramdiskoptions} >nul
bcdedit /set %GUID% osdevice ramdisk=[%USB_DRIVE%]%WIM_PATH%,{ramdiskoptions} >nul
bcdedit /set %GUID% path \windows\system32\boot\winload.efi >nul
bcdedit /set %GUID% systemroot \windows >nul
bcdedit /set %GUID% winloadtype Standard >nul
bcdedit /set %GUID% detecthal Yes >nul
bcdedit /set %GUID% winpe Yes >nul

echo [4/4] Setting Next Boot Target...
bcdedit /bootsequence %GUID%

:: =======================================================
:: [7] แสดงข้อความสำเร็จแล้วสั่ง Restart
:: =======================================================
echo.
echo %GREEN%===================================================%RESET%
echo %GREEN%  [SUCCESS] Setup Completed!%RESET%
echo %GREEN%  Rebooting into USB in 3 seconds...%RESET%
echo %GREEN%===================================================%RESET%
timeout /t 3

shutdown /r /t 0