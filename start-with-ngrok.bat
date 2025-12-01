@echo off
echo ========================================
echo   Betti Platform - Ngrok Public Access
echo ========================================
echo.

cd /d "C:\Users\AMI Server\Documents\betti-platform"

echo Starting backend services...
echo.

echo [1/5] Starting Backend API (port 3001)...
start "Betti Backend" cmd /k "npm run dev:backend"
timeout /t 2 /nobreak >nul

echo [2/5] Starting Nutrition API (port 3002)...
start "Betti Nutrition" cmd /k "npm run dev:nutrition"
timeout /t 2 /nobreak >nul

echo [3/5] Starting Video Chat Server - ngrok mode (port 8080)...
start "Betti Video (ngrok)" cmd /k "npm run dev:video:ngrok"
timeout /t 2 /nobreak >nul

echo [4/5] Starting Ngrok tunnel...
start "Ngrok Tunnel" cmd /k "ngrok http --url=halibut-saved-gannet.ngrok-free.app 5173"
timeout /t 5 /nobreak >nul

echo [5/5] Starting Frontend - HTTP mode for ngrok (port 5173)...
start "Betti Frontend" cmd /k "npm run dev:frontend:ngrok"
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo   All services started!
echo ========================================
echo.
echo   LOCAL ACCESS:
echo   - Frontend: http://localhost:5173
echo   - Backend:  http://localhost:3001
echo   - Nutrition: http://localhost:3002
echo   - Video Chat: http://localhost:8080
echo.
echo   PUBLIC ACCESS (via ngrok):
echo   - https://halibut-saved-gannet.ngrok-free.app
echo.
echo   The ngrok URL provides HTTPS, so WebRTC
echo   camera access will work on remote devices.
echo.
echo ========================================
echo   Press any key to exit this window...
echo   (Services will continue running)
echo ========================================
pause >nul
