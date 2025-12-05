@echo off
echo Killing all Betti node.exe processes...
powershell -Command "Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force"
echo.
echo Checking if any node processes remain...
tasklist | findstr node.exe
if %errorlevel% equ 0 (
    echo WARNING: Some node.exe processes are still running
) else (
    echo SUCCESS: All node.exe processes killed
)
echo.
echo You can now run start-with-ngrok.bat
pause
