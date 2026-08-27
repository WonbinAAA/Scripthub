@echo off
setlocal

:: ปิด Chrome ก่อน
taskkill /F /IM chrome.exe

:: ลบไฟล์ประวัติการเข้าชม (History) และ Cache
del /F /Q "%LOCALAPPDATA%\Google\Chrome\User Data\Default\History"
del /F /Q "%LOCALAPPDATA%\Google\Chrome\User Data\Default\History Provider Cache"
del /F /Q "%LOCALAPPDATA%\Google\Chrome\User Data\Default\Visited Links"
del /F /Q "%LOCALAPPDATA%\Google\Chrome\User Data\Default\Top Sites"
del /F /Q "%LOCALAPPDATA%\Google\Chrome\User Data\Default\Cache\*.*"
del /F /Q "%LOCALAPPDATA%\Google\Chrome\User Data\Default\Code Cache\*.*"
del /F /Q "%LOCALAPPDATA%\Google\Chrome\User Data\Default\Media Cache\*.*"

:: ไม่แตะต้อง Login Data หรือ Web Data
echo ประวัติถูกลบเรียบร้อย โดยไม่กระทบรหัสผ่านที่บันทึกไว้

endlocal
pause
