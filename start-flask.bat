@echo off
echo ========================================
echo Starting Soundwave Flask Web App
echo ========================================
echo.

cd /d "%~dp0backend"
if not exist ".venv" (
    echo Creating Python virtual environment...
    python -m venv .venv
)
call .venv\Scripts\activate
echo Installing backend dependencies...
pip install -r requirements.txt -q
echo Starting Flask server on port 5000...
start "Soundwave Flask" cmd /k "python flask_app.py"

echo.
echo Flask app: http://localhost:5000
echo Login:     http://localhost:5000/login
echo Search:    http://localhost:5000/search
echo.
pause
