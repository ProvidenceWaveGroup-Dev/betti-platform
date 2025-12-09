@echo off
echo ========================================
echo   Betti Smart Mirror Hub - Tunnel Mode
echo ========================================
echo.

:: Check if node is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    pause
    exit /b 1
)

:: Check if cloudflared is installed
where cloudflared >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: cloudflared is not installed or not in PATH
    echo Install from: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
    pause
    exit /b 1
)

echo Starting all Betti services...
echo   - Frontend (port 5173)
echo   - Backend API (port 3001)
echo   - Video Chat Server (port 8080)
echo   - Cloudflare Tunnel (external access)
echo.

:: Start npm run dev in a new minimized window
start "Betti Servers" /min cmd /c "npm run dev"

:: Wait for servers to start
echo Waiting for servers to start...
timeout /t 5 /nobreak >nul

:: Start cloudflared tunnel (this will display the public URL)
echo.
echo ========================================
echo   Cloudflare Tunnel Starting...
echo   Look for the public URL below
echo ========================================
echo.

cloudflared tunnel --url https://localhost:5173 --no-tls-verify

:: When cloudflared exits (Ctrl+C), kill the server window
echo.
echo Shutting down Betti servers...
taskkill /FI "WINDOWTITLE eq Betti Servers" /F >nul 2>nul
taskkill /F /IM node.exe >nul 2>nul

echo Done.
pause
