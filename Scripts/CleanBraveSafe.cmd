@echo off
setlocal

:: ปิด Brave ก่อน
taskkill /F /IM brave.exe

:: ลบไฟล์ประวัติการเข้าชมและ cache
del /F /Q "%LOCALAPPDATA%\BraveSoftware\Brave-Browser\User Data\Default\History"
del /F /Q "%LOCALAPPDATA%\BraveSoftware\Brave-Browser\User Data\Default\History Provider Cache"
del /F /Q "%LOCALAPPDATA%\BraveSoftware\Brave-Browser\User Data\Default\Visited Links"
del /F /Q "%LOCALAPPDATA%\BraveSoftware\Brave-Browser\User Data\Default\Top Sites"
del /F /Q "%LOCALAPPDATA%\BraveSoftware\Brave-Browser\User Data\Default\Cache\*.*"
del /F /Q "%LOCALAPPDATA%\BraveSoftware\Brave-Browser\User Data\Default\Code Cache\*.*"
del /F /Q "%LOCALAPPDATA%\BraveSoftware\Brave-Browser\User Data\Default\Media Cache\*.*"

:: ไม่แตะต้อง Login Data หรือ Web Data
echo ลบประวัติ Brave เรียบร้อย โดยไม่กระทบรหัสผ่านหรือบัญชีที่ล็อกอินไว้

endlocal
pause
