import os
import re

frontend_dir = r"c:\Users\jitar\Downloads\soundwave_ai\frontend\src"
patterns = [r"useAnalyserStore"]

for root, _, files in os.walk(frontend_dir):
    if "node_modules" in root or "dist" in root:
        continue
    for file in files:
        if file.endswith((".js", ".jsx", ".ts", ".tsx")):
            path = os.path.join(root, file)
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                for idx, line in enumerate(f, 1):
                    for pattern in patterns:
                        if re.search(pattern, line):
                            print(f"{path}:{idx}: {line.strip()}")
