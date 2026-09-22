from collections import deque
from pathlib import Path
from PIL import Image

SOURCE = Path('/home/ubuntu/upload/Screenshot2026-09-22at1.48.14PM.png')
OUT_DIR = Path('/home/ubuntu/webdev-static-assets')
OUT = OUT_DIR / 'cannery-marketplace-logo-brand.png'
OUT_DIR.mkdir(parents=True, exist_ok=True)

img = Image.open(SOURCE).convert('RGBA')
pixels = img.load()
w, h = img.size
seen = set()
queue = deque()
for x in range(w):
    queue.append((x, 0)); queue.append((x, h - 1))
for y in range(h):
    queue.append((0, y)); queue.append((w - 1, y))

def is_background(px):
    r, g, b, a = px
    return a > 0 and r > 238 and g > 238 and b > 238

while queue:
    x, y = queue.popleft()
    if (x, y) in seen or not (0 <= x < w and 0 <= y < h):
        continue
    seen.add((x, y))
    if not is_background(pixels[x, y]):
        continue
    pixels[x, y] = (255, 255, 255, 0)
    queue.extend(((x+1,y),(x-1,y),(x,y+1),(x,y-1)))

for y in range(h):
    for x in range(w):
        r, g, b, a = pixels[x, y]
        if a == 0:
            continue
        mx, mn = max(r, g, b), min(r, g, b)
        if mx < 70:
            pixels[x, y] = (32, 36, 29, a)
        elif r > b * 1.15 and g > b * 1.05 and r > 85 and (mx - mn) > 25:
            luminance = (r + g + b) / 3
            if luminance > 175:
                pixels[x, y] = (223, 199, 142, a)
            else:
                pixels[x, y] = (168, 120, 22, a)

bbox = img.getbbox()
if bbox:
    img = img.crop(bbox)
if img.width > 1200:
    ratio = 1200 / img.width
    img = img.resize((1200, round(img.height * ratio)), Image.Resampling.LANCZOS)
img.save(OUT, optimize=True)
print(OUT)
