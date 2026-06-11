# Soundwave AI - Windows One-Time Setup Guide

This guide will help you set up Soundwave AI on your Windows PC for easy, repeated access.

## Prerequisites Installation (One-Time)

### 1. Install Node Version Manager (nvm) for Windows

nvm allows you to manage multiple Node.js versions easily.

**Download and Install:**
- Visit: https://github.com/coreybutler/nvm-windows/releases
- Download the latest `nvm-setup.exe`
- Run the installer with default settings
- Restart your terminal/command prompt after installation

**Install Node.js 20:**
```powershell
nvm install 20
nvm use 20
```

**Verify installation:**
```powershell
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x or higher
```

### 2. Install Python 3.11+

**Download and Install:**
- Visit: https://www.python.org/downloads/
- Download Python 3.11 or 3.12
- **IMPORTANT:** Check "Add Python to PATH" during installation
- Run the installer

**Verify installation:**
```powershell
python --version  # Should show Python 3.11.x or 3.12.x
pip --version     # Should show pip version
```

### 3. Install MongoDB (Option A - Local)

**Download and Install:**
- Visit: https://www.mongodb.com/try/download/community
- Download MongoDB Community Server for Windows
- Run the installer with default settings
- MongoDB will run as a Windows service

**Verify installation:**
```powershell
mongod --version
```

### 4. Install Redis (Option A - Local)

**Download and Install:**
- Visit: https://github.com/microsoftarchive/redis/releases
- Download Redis-x64-3.x.x.msi
- Run the installer with default settings
- Redis will run as a Windows service

**Verify installation:**
```powershell
redis-cli ping  # Should return PONG
```

### Alternative: Use Docker for MongoDB & Redis (Option B - Recommended)

If you prefer Docker, skip steps 3-4 and use Docker instead:

**Install Docker Desktop:**
- Visit: https://www.docker.com/products/docker-desktop/
- Download and install Docker Desktop for Windows
- Start Docker Desktop after installation

**Run MongoDB and Redis with Docker:**
```powershell
cd "c:\Users\YASH JAIN\Downloads\music_anaylsis\music_anaylsis\soundwave-ai"
docker-compose up -d mongodb redis
```

## Project Setup (One-Time)

### 1. Navigate to Project Directory
```powershell
cd "c:\Users\YASH JAIN\Downloads\music_anaylsis\music_anaylsis\soundwave-ai"
```

### 2. Setup Frontend
```powershell
cd frontend
npm install
```

### 3. Setup Backend
```powershell
cd ..\backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Configure Environment Variables

**Frontend (.env):**
```powershell
cd ..\frontend
copy .env.example .env
# Edit .env with your settings
```

**Backend (.env):**
```powershell
cd ..\backend
copy .env.example .env
# Edit .env with your settings
```

### 5. Seed Initial Data (Optional)
```powershell
cd backend
.venv\Scripts\activate
python seed_data.py
```

## Running the Application

### Option 1: Using Helper Scripts (Recommended)

**Start everything:**
```powershell
cd "c:\Users\YASH JAIN\Downloads\music_anaylsis\music_anaylsis\soundwave-ai"
.\start.bat
```

**Stop everything:**
```powershell
.\stop.bat
```

### Option 2: Manual Start

**Terminal 1 - Backend:**
```powershell
cd "c:\Users\YASH JAIN\Downloads\music_anaylsis\music_anaylsis\soundwave-ai\backend"
.venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```powershell
cd "c:\Users\YASH JAIN\Downloads\music_anaylsis\music_anaylsis\soundwave-ai\frontend"
npm run dev
```

### Option 3: Docker (Easiest)

```powershell
cd "c:\Users\YASH JAIN\Downloads\music_anaylsis\music_anaylsis\soundwave-ai"
docker-compose up
```

## Access Points

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs

## Quick Reference

**To start the app:**
```powershell
cd "c:\Users\YASH JAIN\Downloads\music_anaylsis\music_anaylsis\soundwave-ai"
.\start.bat
```

**To stop the app:**
```powershell
.\stop.bat
```

**To update dependencies:**
```powershell
# Frontend
cd frontend
npm update

# Backend
cd backend
.venv\Scripts\activate
pip install --upgrade -r requirements.txt
```

## Troubleshooting

**Node.js not found:**
```powershell
nvm use 20
```

**Python not found:**
- Ensure Python was added to PATH during installation
- Reinstall Python if needed, checking "Add to PATH"

**MongoDB connection error:**
- Ensure MongoDB service is running
- Check MongoDB is listening on port 27017

**Redis connection error:**
- Ensure Redis service is running
- Check Redis is listening on port 6379

**Port already in use:**
- Change ports in .env files
- Or kill the process using the port:
```powershell
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

## Environment Variables Reference

### Frontend (.env)
```
VITE_API_BASE_URL=http://localhost:8000
VITE_APP_NAME=Soundwave AI
```

### Backend (.env)
```
APP_NAME=Soundwave AI
ENV=development
API_V1_PREFIX=/api/v1
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
MONGO_URI=mongodb://localhost:27017
MONGO_DB=soundwave_ai
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key-change-this
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=60
```
