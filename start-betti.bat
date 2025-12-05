@echo off
echo ========================================
echo   Betti Smart Mirror Hub - Starting
echo ========================================
echo.

:: Check if node is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    pause
    exit /b 1
)

echo Starting all Betti services...
echo   - Frontend (port 5173)
echo   - Backend API (port 3001)
echo   - Video Chat Server (port 8080)
echo.

:: Start the development servers
npm run dev

pause
