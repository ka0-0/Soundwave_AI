@echo off
echo ========================================
echo Starting Soundwave AI with Docker
echo ========================================
echo.

REM Check if Docker is running
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not running
    echo Please start Docker Desktop and try again
    pause
    exit /b 1
)

REM Check if .env exists for backend
if not exist "backend\.env" (
    echo Creating backend .env from example...
    copy backend\.env.example backend\.env
    echo Please edit backend\.env with your configuration if needed
)

REM Check if .env exists for frontend
if not exist "frontend\.env" (
    echo Creating frontend .env from example...
    copy frontend\.env.example frontend\.env
    echo Please edit frontend\.env with your configuration if needed
)

echo.
echo Starting all services with Docker Compose...
echo This may take a few minutes on first run...
echo.

docker-compose up -d

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo Docker Services Started Successfully!
    echo ========================================
    echo.
    echo Frontend: http://localhost:5173
    echo Backend:  http://localhost:8000
    echo API Docs: http://localhost:8000/docs
    echo MongoDB:  localhost:27017
    echo Redis:    localhost:6379
    echo.
    echo To view logs: docker-compose logs -f
    echo To stop: docker-compose down
    echo.
) else (
    echo.
    echo ERROR: Failed to start Docker services
    echo Check the error messages above
    echo.
)

pause
