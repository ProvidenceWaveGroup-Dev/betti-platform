@echo off
echo ========================================
echo   Betti Smart Mirror Hub - Starting
echo   (with ngrok for external access)
echo ========================================
echo.

:: Check if node is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    pause
    exit /b 1
)

:: Check if ngrok is installed
where ngrok >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: ngrok is not installed or not in PATH
    echo Download from: https://ngrok.com/download
    pause
    exit /b 1
)

echo Starting all Betti services with ngrok...
echo   - Frontend (port 5173)
echo   - Backend API (port 3001)
echo   - Video Chat Server (port 8080)
echo   - ngrok tunnel (external access)
echo.
echo NOTE: HMR is disabled in ngrok mode to reduce bandwidth usage.
echo.

:: Start the development servers with ngrok mode
npm run dev:ngrok

pause
