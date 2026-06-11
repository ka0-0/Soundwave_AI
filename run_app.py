import subprocess
import sys
import os
import time
import requests
from pathlib import Path

def check_backend(url="http://localhost:8000/api/v1/health"):
    try:
        res = requests.get(url, timeout=2)
        return res.status_code == 200
    except:
        return False

def start_backend():
    print("Starting backend...")
    backend_dir = Path(__file__).resolve().parent / "backend"
    # Use the venv python if it exists
    venv_python = backend_dir / ".venv" / "Scripts" / "python.exe"
    if not venv_python.exists():
        venv_python = "python"
    
    return subprocess.Popen(
        [str(venv_python), "-m", "uvicorn", "app.main:app", "--reload", "--reload-dir", "app", "--port", "8000"],
        cwd=str(backend_dir)
    )

def start_frontend():
    print("Starting frontend...")
    frontend_dir = Path(__file__).resolve().parent / "frontend"
    return subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=str(frontend_dir),
        shell=True
    )

def main():
    backend_proc = None
    frontend_proc = None
    try:
        backend_proc = start_backend()
        print("Waiting for backend to be ready...")
        retries = 10
        while retries > 0:
            if check_backend():
                print("[OK] Backend is ready!")
                break
            time.sleep(2)
            retries -= 1
        else:
            print("! Warning: Backend is taking too long to start.")

        frontend_proc = start_frontend()
        print("[OK] Frontend started!")
        
        print("\n" + "="*40)
        print("SOUNDWAVE AI IS RUNNING")
        print("Frontend: http://localhost:5173")
        print("Backend:  http://localhost:8000")
        print("="*40 + "\n")
        
        # Keep the script running
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nShutting down...")
    finally:
        if backend_proc: backend_proc.terminate()
        if frontend_proc: frontend_proc.terminate()

if __name__ == "__main__":
    main()
