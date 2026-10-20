@echo off
title MarketMind AI Launcher

:: Force current working directory to the directory containing this batch file
cd /d "%~dp0"
set "APP_DIR=%~dp0"

echo ==============================================================================
echo                      MarketMind AI - Smart Mandi ERP                          
echo ==============================================================================
echo [INFO] Location: "%APP_DIR%"
echo.

:: 1. Verify Node.js is installed and in PATH
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not found in your system PATH!
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: 2. Verify dependencies and install if missing
if not exist "%APP_DIR%server\node_modules" (
    echo [INFO] Installing server dependencies...
    call npm install --prefix server
)
if not exist "%APP_DIR%client\node_modules" (
    echo [INFO] Installing client dependencies...
    call npm install --prefix client
)

:: 3. Launch Backend API Server (Port 5000)
echo [INFO] Starting Backend Express API on port 5000...
start "MarketMind AI - Backend Server" cmd /k "cd /d "%APP_DIR%" && node server/server.js"

:: 4. Launch Frontend Client Server (Port 5173)
echo [INFO] Starting Frontend Vite Client on port 5173...
start "MarketMind AI - Frontend Client" cmd /k "cd /d "%APP_DIR%" && npm run dev --prefix client"

:: 5. Wait for servers to initialize, then open browser
echo [INFO] Initializing application services...
ping 127.0.0.1 -n 5 >nul

echo [INFO] Opening MarketMind AI in your web browser...
start "" "http://localhost:5173"

echo.
echo ==============================================================================
echo [SUCCESS] MarketMind AI is up and running!
echo.
echo   - Web Application: http://localhost:5173
echo   - Backend Health:  http://localhost:5000/api/health
echo.
echo Both the backend and frontend are running in their own windows.
echo To stop the application at any time, simply close the server windows.
echo ==============================================================================
echo.
pause
