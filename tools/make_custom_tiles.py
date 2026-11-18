"""Generate public/assets/custom.png — extra 16x16 tiles that Kenney's Tiny Town
pack doesn't include (water, lily pads, dock, terminal kiosk, Vayu flag).

Water tiles are derived from the pack's own dirt-patch 9-slice so the shoreline
shape and outline match the original art exactly.

Run from the repo root:  python3 tools/make_custom_tiles.py
Tile index layout is mirrored in src/world/tiles.ts (CUSTOM).
"""
from pathlib import Path
import random
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
TOWN = Image.open(ROOT / "public/assets/town.png").convert("RGBA")
DUNGEON = Image.open(ROOT / "public/assets/dungeon.png").convert("RGBA")
T, COLS = 16, 12

OUT = (63, 38, 49, 255)
WOOD_D = (118, 59, 54, 255)
WOOD = (189, 108, 74, 255)
WOOD_L = (234, 165, 108, 255)
DIRT = (234, 165, 108, 255)
DIRT_D = (207, 130, 84, 255)
DIRT_L = (254, 201, 156, 255)
WATER = (18, 152, 218, 255)
WATER_D = (12, 124, 194, 255)
WATER_L = (128, 212, 246, 255)
LEAF = (71, 159, 74, 255)
LEAF_L = (132, 198, 105, 255)
PINK = (255, 137, 184, 255)
CLEAR = (0, 0, 0, 0)


def tile(sheet, i):
    x, y = (i % COLS) * T, (i // COLS) * T
    return sheet.crop((x, y, x + T, y + T))


def water_from_dirt(i, frame):
    t = tile(TOWN, i).copy()
    px = t.load()
    water_cells = []
    for y in range(T):
        for x in range(T):
            if px[x, y] in (DIRT, DIRT_D, DIRT_L):
                px[x, y] = WATER
                water_cells.append((x, y))
    cells = set(water_cells)
    # Small horizontal wave glints; positions differ per frame for a gentle shimmer.
    rng = random.Random(i * 31 + frame * 997)
    for _ in range(3):
        if not water_cells:
            break
        x, y = rng.choice(water_cells)
        if all((x + d, y) in cells for d in range(3)) and (x + 1, y + 1) in cells:
            for d in range(3):
                px[x + d, y] = WATER_L
            px[x + 1, y + 1] = WATER_D
    return t


def from_ascii(rows, palette):
    t = Image.new("RGBA", (T, T), CLEAR)
    px = t.load()
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch != ".":
                px[x, y] = palette[ch]
    return t


LILY = [
    "................",
    "................",
    "................",
    "................",
    "....OOOOO.......",
    "...OLLLLLO......",
    "..OLLlLLL.O.....",
    "..OLlLLLLLO.....",
    "..OLLLLLLLO.....",
    "...OLLLLLO......",
    "....OOOOO.......",
    "................",
    "........OOO.....",
    ".......OLLLO....",
    "........OOO.....",
    "................",
]
LILY_FLOWER = [
    "................",
    "................",
    ".........OOO....",
    "....OOOOOPPPO...",
    "...OLLLLOPpPO...",
    "..OLLlLLLOPO....",
    "..OLlLLLLLOO....",
    "..OLLLLLLLO.....",
    "...OLLLLLO......",
    "....OOOOO.......",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
]
DOCK = [
    "OwWWWwOwWWWwOwWW",
    "OwWWWwOwWWWwOwWW",
    "OwWkWwOwWWWwOwWk",
    "OwWWWwOwWkWwOwWW",
    "OwWWWwOwWWWwOwWW",
    "OwWWWwOwWWWwOwWW",
    "OwWWkwOwWWWwOwWW",
    "OwWWWwOwWWWwOwWW",
    "OwWWWwOwWWkwOwWW",
    "OwWWWwOwWWWwOwWW",
    "OwkWWwOwWWWwOwWW",
    "OwWWWwOwWWWwOwkW",
    "OwWWWwOwWWWwOwWW",
    "OwWWWwOkWWWwOwWW",
    "OwWWWwOwWWWwOwWW",
    "OwWWWwOwWWWwOwWW",
]
TERMINAL = [
    "................",
    "..OOOOOOOOOOOO..",
    ".OSSSSSSSSSSSSO.",
    ".OSOOOOOOOOOOSO.",
    ".OSOggggggggOSO.",
    ".OSOgGGgggggOSO.",
    ".OSOggggggggOSO.",
    ".OSOgGGGGgggOSO.",
    ".OSOggggggggOSO.",
    ".OSOOOOOOOOOOSO.",
    ".OSSSSSSSSSSsSO.",
    "..OOOOOOOOOOOO..",
    ".....OSSSSO.....",
    "...OOSSSSSSOO...",
    "..OssssssssssO..",
    "...OOOOOOOOOO...",
]
FLAG_A = [
    ".OO.............",
    "OwwOOOOOOOOOOO..",
    "OwOBBBBBBBBBBBO.",
    "OwOBBBBhhBBBBBBO",
    "OwOBBBhBBhBBBBO.",
    "OwOBBhBBBBhBBBBO",
    "OwOBBBBBBBBBBBO.",
    "OwOOOOOOOOOOOO..",
    "OwO.............",
    "OwO.............",
    "OwO.............",
    "OwO.............",
    "OwO.............",
    "OwO.............",
    "OOOO............",
    "OOOO............",
]
FLAG_B = [
    ".OO.............",
    "OwwOOOOOOOOOOOO.",
    "OwOBBBBBBBBBBBBO",
    "OwOBBBBhhBBBBBO.",
    "OwOBBBhBBhBBBBBO",
    "OwOBBhBBBBhBBBO.",
    "OwOBBBBBBBBBBBBO",
    "OwOOOOOOOOOOOOO.",
    "OwO.............",
    "OwO.............",
    "OwO.............",
    "OwO.............",
    "OwO.............",
    "OwO.............",
    "OOOO............",
    "OOOO............",
]
PAL = {
    "O": OUT,
    "L": LEAF,
    "l": LEAF_L,
    "P": PINK,
    "p": (255, 220, 236, 255),
    "W": WOOD,
    "k": WOOD_L,
    "w": WOOD_D,
    "S": (140, 156, 181, 255),
    "s": (192, 203, 220, 255),
    "g": (24, 60, 40, 255),
    "G": (80, 250, 123, 255),
    "B": (90, 170, 245, 255),
    "h": (240, 250, 255, 255),
}

SLICE = [12, 13, 14, 24, 25, 26, 36, 37, 38]
INNER = [39, 40, 41, 42]

tiles = []
for frame in (0, 1):  # 0-12 frame A, 13-25 frame B
    tiles += [water_from_dirt(i, frame) for i in SLICE + INNER]
tiles += [
    from_ascii(LILY, PAL),          # 26
    from_ascii(LILY_FLOWER, PAL),   # 27
    from_ascii(DOCK, PAL),          # 28
    from_ascii(TERMINAL, PAL),      # 29
    from_ascii(FLAG_A, PAL),        # 30
    from_ascii(FLAG_B, PAL),        # 31
]

rows = (len(tiles) + COLS - 1) // COLS
sheet = Image.new("RGBA", (COLS * T, rows * T), CLEAR)
for n, t in enumerate(tiles):
    sheet.paste(t, ((n % COLS) * T, (n // COLS) * T))
sheet.save(ROOT / "public/assets/custom.png")
print(f"wrote custom.png with {len(tiles)} tiles")
