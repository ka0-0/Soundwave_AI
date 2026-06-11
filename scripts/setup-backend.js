const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const backendDir = path.join(__dirname, '..', 'backend');
const venvDir = path.join(backendDir, '.venv');

console.log('========================================');
console.log('Setting up Python Backend Environment...');
console.log('========================================');

// 1. Create virtual environment if it doesn't exist
if (!fs.existsSync(venvDir)) {
  console.log('Creating Python virtual environment (.venv)...');
  try {
    execSync('python -m venv .venv', { cwd: backendDir, stdio: 'inherit' });
  } catch (error) {
    console.warn('Failed to create virtual environment using "python". Trying "python3"...');
    try {
      execSync('python3 -m venv .venv', { cwd: backendDir, stdio: 'inherit' });
    } catch (err) {
      console.error('ERROR: Could not find Python or create venv. Please ensure Python is in your PATH.');
      process.exit(1);
    }
  }
} else {
  console.log('Python virtual environment (.venv) already exists.');
}

// 2. Determine correct python executable path
let pythonExec = 'python';
const winPython = path.join(venvDir, 'Scripts', 'python.exe');
const unixPython = path.join(venvDir, 'bin', 'python');

if (fs.existsSync(winPython)) {
  pythonExec = winPython;
} else if (fs.existsSync(unixPython)) {
  pythonExec = unixPython;
}

console.log(`Using Python executable: ${pythonExec}`);

// 3. Install requirements
console.log('Installing backend dependencies from requirements.txt...');
try {
  execSync(`"${pythonExec}" -m pip install -r requirements.txt`, {
    cwd: backendDir,
    stdio: 'inherit'
  });
  console.log('✓ Backend dependencies installed successfully!');
} catch (error) {
  console.error('ERROR: Failed to install requirements.txt backend dependencies.');
  process.exit(1);
}

console.log('Setup complete.\n');
