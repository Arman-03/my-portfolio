"""Render a dumped world JSON to a PNG preview.
Usage: node tools/dump-map.ts > map.json && python3 tools/render_map.py map.json out.png [scale]"""
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
T, COLS = 16, 12
sheets = [Image.open(ROOT / f"public/assets/{n}.png").convert("RGBA") for n in ("town", "dungeon", "custom")]
FIRST = [1, 133, 265]

def tile(gid):
    for k in (2, 1, 0):
        if gid >= FIRST[k]:
            i = gid - FIRST[k]; s = sheets[k]
            return s.crop(((i % COLS) * T, (i // COLS) * T, (i % COLS) * T + T, (i // COLS) * T + T))

m = json.load(open(sys.argv[1])); scale = int(sys.argv[3]) if len(sys.argv) > 3 else 2
W, H = m["width"], m["height"]
im = Image.new("RGBA", (W * T, H * T), (20, 20, 30, 255))
for layer in ("ground", "decor", "objects", "above"):
    for y in range(H):
        for x in range(W):
            g = m[layer][y][x]
            if g >= 0:
                t = tile(g); im.paste(t, (x * T, y * T), t)
d = ImageDraw.Draw(im)
dsheet = sheets[1]
for n in m["npcs"]:
    i = n["frame"]; t = dsheet.crop(((i % COLS) * T, (i // COLS) * T, (i % COLS) * T + T, (i // COLS) * T + T))
    im.paste(t, (n["tx"] * T, n["ty"] * T), t)
if "--debug" in sys.argv:
    for it in m["interactables"]:
        d.rectangle((it["tx"] * T, it["ty"] * T, (it["tx"] + it["w"]) * T - 1, (it["ty"] + it["h"]) * T - 1), outline=(255, 0, 255, 255))
    s = m["spawn"]; d.rectangle((s["tx"] * T, s["ty"] * T, s["tx"] * T + 15, s["ty"] * T + 15), outline=(255, 255, 0, 255))
im = im.resize((im.width * scale // 2, im.height * scale // 2), Image.NEAREST)
im.save(sys.argv[2])
print("saved", im.size)
