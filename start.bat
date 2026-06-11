@echo off
echo ========================================
echo Starting Soundwave AI Application
echo ========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js 20+ and add it to PATH
    pause
    exit /b 1
)

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.11+ and add it to PATH
    pause
    exit /b 1
)

echo [1/4] Starting MongoDB...
REM Try to start MongoDB service or use Docker
net start MongoDB >nul 2>&1
if %errorlevel% neq 0 (
    echo MongoDB service not found, checking Docker...
    docker ps >nul 2>&1
    if %errorlevel% equ 0 (
        echo Starting MongoDB via Docker...
        docker-compose up -d mongodb
    ) else (
        echo WARNING: MongoDB may not be running
        echo Please ensure MongoDB is installed and running
    )
) else (
    echo MongoDB service started
)

echo.
echo [2/4] Starting Redis...
REM Try to start Redis service or use Docker
net start Redis >nul 2>&1
if %errorlevel% neq 0 (
    echo Redis service not found, checking Docker...
    docker ps >nul 2>&1
    if %errorlevel% equ 0 (
        echo Starting Redis via Docker...
        docker-compose up -d redis
    ) else (
        echo WARNING: Redis may not be running
        echo Please ensure Redis is installed and running
    )
) else (
    echo Redis service started
)

echo.
echo [3/4] Starting Backend Server...
cd /d "%~dp0backend"
if not exist ".venv" (
    echo Creating Python virtual environment...
    python -m venv .venv
)
call .venv\Scripts\activate
echo Installing backend dependencies...
pip install -r requirements.txt -q
echo Starting FastAPI server on port 8000...
start "Soundwave Backend" cmd /k "uvicorn app.main:app --reload --reload-dir app --port 8000"

echo.
echo [4/4] Starting Frontend Server...
cd /d "%~dp0frontend"
if not exist "node_modules" (
    echo Installing frontend dependencies...
    call npm install
)
echo Starting Vite dev server on port 5173...
start "Soundwave Frontend" cmd /k "npm run dev"

echo.
echo ========================================
echo Application Started Successfully!
echo ========================================
echo.
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo.
echo Press any key to close this window (servers will continue running)...
pause >nul
