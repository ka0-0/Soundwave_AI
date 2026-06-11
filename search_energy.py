with open(r"c:\Users\jitar\Downloads\soundwave_ai\frontend\src\components\player\AmbientSongPlayer.jsx", "r", encoding="utf-8") as f:
    for idx, line in enumerate(f, 1):
        if "energy" in line:
            print(f"{idx}: {line.strip()}")
