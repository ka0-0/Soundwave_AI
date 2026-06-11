@echo off
echo ========================================
echo Stopping Soundwave AI Application
echo ========================================
echo.

echo Stopping Backend server...
taskkill /FI "WINDOWTITLE eq Soundwave Backend*" /F >nul 2>&1
taskkill /FI "IMAGENAME eq python.exe" /FI "WINDOWTITLE eq Soundwave Backend*" /F >nul 2>&1

echo Stopping Frontend server...
taskkill /FI "WINDOWTITLE eq Soundwave Frontend*" /F >nul 2>&1
taskkill /FI "IMAGENAME eq node.exe" /FI "WINDOWTITLE eq Soundwave Frontend*" /F >nul 2>&1

echo.
echo Stopping Docker containers (if running)...
docker-compose down >nul 2>&1

echo.
echo ========================================
echo Application Stopped Successfully!
echo ========================================
echo.
echo All servers have been stopped.
echo.
timeout /t 2 >nul
