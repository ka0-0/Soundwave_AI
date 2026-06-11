import os
import re

backend_dir = r"c:\Users\jitar\Downloads\soundwave_ai\backend"
patterns = [r"sleep", r"delay", r"bcrypt"]

for root, _, files in os.walk(backend_dir):
    if ".venv" in root or "__pycache__" in root:
        continue
    for file in files:
        if file.endswith(".py"):
            path = os.path.join(root, file)
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                for idx, line in enumerate(f, 1):
                    for pattern in patterns:
                        if re.search(pattern, line):
                            print(f"{path}:{idx}: {line.strip()}")
