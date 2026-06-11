# Soundwave AI - Quick Start Guide

## One-Time Setup (First Time Only)

1. **Install nvm (Node Version Manager) for Windows**
   - Download: https://github.com/coreybutler/nvm-windows/releases
   - Install `nvm-setup.exe`
   - Run: `nvm install 20` and `nvm use 20`

2. **Install Python 3.11+**
   - Download: https://www.python.org/downloads/
   - **Important:** Check "Add Python to PATH" during installation

3. **Install Docker Desktop (Optional but Recommended)**
   - Download: https://www.docker.com/products/docker-desktop/
   - This is the easiest way to run MongoDB and Redis

4. **Setup Environment Files**
   ```powershell
   cd "c:\Users\YASH JAIN\Downloads\music_anaylsis\music_anaylsis\soundwave-ai"
   copy backend\.env.example backend\.env
   copy frontend\.env.example frontend\.env
   ```

## Running the Application

### Option 1: Using Docker (Easiest - Recommended)

**Start:**
```powershell
cd "c:\Users\YASH JAIN\Downloads\music_anaylsis\music_anaylsis\soundwave-ai"
.\start-docker.bat
```

**Stop:**
```powershell
.\stop-docker.bat
```

### Option 2: Manual Start (Without Docker)

**Start:**
```powershell
cd "c:\Users\YASH JAIN\Downloads\music_anaylsis\music_anaylsis\soundwave-ai"
.\start.bat
```

**Stop:**
```powershell
.\stop.bat
```

## Access Points

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000
- **API Documentation:** http://localhost:8000/docs

## Seed Initial Data (Optional)

```powershell
cd backend
.venv\Scripts\activate
python seed_data.py
```

## Troubleshooting

**Node.js not found?**
```powershell
nvm use 20
```

**Python not found?**
- Reinstall Python and check "Add to PATH"

**Docker not running?**
- Start Docker Desktop and wait for it to be ready

**Port already in use?**
- Change ports in .env files or kill the process using the port

## For Detailed Setup Instructions

See `SETUP_GUIDE.md` for comprehensive installation and troubleshooting details.
