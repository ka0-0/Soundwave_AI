const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const backendDir = path.join(__dirname, '..', 'backend');

// Find the correct python executable inside the virtual environment
let pythonExec = 'python';
const winPython = path.join(backendDir, '.venv', 'Scripts', 'python.exe');
const unixPython = path.join(backendDir, '.venv', 'bin', 'python');

if (fs.existsSync(winPython)) {
  pythonExec = winPython;
} else if (fs.existsSync(unixPython)) {
  pythonExec = unixPython;
}

console.log(`[Backend] Starting FastAPI using: ${pythonExec}`);

const child = spawn(
  pythonExec,
  ['-m', 'uvicorn', 'app.main:app', '--port', '8000'],
  {
    cwd: backendDir,
    stdio: 'inherit',
    shell: false
  }
);

child.on('close', (code) => {
  process.exit(code || 0);
});
