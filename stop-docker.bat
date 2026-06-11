@echo off
echo ========================================
echo Stopping Soundwave AI Docker Services
echo ========================================
echo.

docker-compose down

if %errorlevel% equ 0 (
    echo.
    echo All Docker services stopped successfully!
    echo.
) else (
    echo.
    echo ERROR: Failed to stop Docker services
    echo.
)

pause
