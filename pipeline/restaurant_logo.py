#!/usr/bin/env python3
"""Turns the original Michaeli restaurant logo (white background) into web assets:
transparent light/dark versions, a 3x upscale, and square marks for favicons/icons."""
from pathlib import Path
from PIL import Image, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parent.parent
src = Image.open(ROOT / "work/michaeli-logo-original.png").convert("RGB")
OUT = ROOT / "public/brand"

# 1) upscale 3x (Lanczos) then soften jaggies slightly
big = src.resize((src.width * 3, src.height * 3), Image.LANCZOS).filter(ImageFilter.SMOOTH_MORE)

# 2) alpha from "distance to white": white → transparent, ink → opaque, keeps anti-aliasing
px = big.load()
alpha = Image.new("L", big.size)
ap = alpha.load()
out = Image.new("RGBA", big.size)
op = out.load()
for y in range(big.height):
    for x in range(big.width):
        r, g, b = px[x, y]
        m = min(r, g, b)
        a = max(0, min(255, int((255 - m) * 1.6)))  # how far from white
        if a < 14:
            op[x, y] = (0, 0, 0, 0)
            continue
        # un-premultiply against white so edges keep their true colour
        k = a / 255
        op[x, y] = (
            max(0, min(255, int((r - 255 * (1 - k)) / k))),
            max(0, min(255, int((g - 255 * (1 - k)) / k))),
            max(0, min(255, int((b - 255 * (1 - k)) / k))),
            a,
        )
bbox = out.getbbox()
out = out.crop(bbox)
out.save(OUT / "michaeli-logo.png", optimize=True)
out.save(OUT / "michaeli-logo.webp", quality=92, method=6)

# 3) dark-mode version: bordeaux ink → cream, greens → lighter sage
d = out.copy()
dp = d.load()
for y in range(d.height):
    for x in range(d.width):
        r, g, b, a = dp[x, y]
        if a == 0:
            continue
        if g > r:  # green leaf
            dp[x, y] = (min(255, int(r * .6 + 120)), min(255, int(g * .6 + 110)), min(255, int(b * .6 + 90)), a)
        else:      # bordeaux lettering
            dp[x, y] = (246, 232, 214, a)
d.save(OUT / "michaeli-logo-dark.png", optimize=True)
d.save(OUT / "michaeli-logo-dark.webp", quality=92, method=6)

# 4) square mark (leaf + the initial מ) on cream disc for favicon / app icons
w, h = out.size
# keep only green (leaf) pixels
leaf = out.copy()
lp = leaf.load()
for y in range(h):
    for x in range(w):
        r, g, b, a = lp[x, y]
        if not (a > 90 and g > r + 25):
            lp[x, y] = (0, 0, 0, 0)
leaf = leaf.crop(leaf.getbbox())
S = 512
icon = Image.new("RGBA", (S, S), (0, 0, 0, 0))
disc = Image.new("L", (S, S), 0)
from PIL import ImageDraw
ImageDraw.Draw(disc).ellipse((8, 8, S - 8, S - 8), fill=255)
bg = Image.new("RGBA", (S, S), (246, 239, 228, 255))
icon.paste(bg, (0, 0), disc)
ImageDraw.Draw(icon).ellipse((14, 14, S - 14, S - 14), outline=(107, 30, 43, 255), width=10)
scale = (S * 0.78) / max(leaf.size)
lf = leaf.resize((int(leaf.width * scale), int(leaf.height * scale)), Image.LANCZOS)
icon.alpha_composite(lf, ((S - lf.width) // 2, (S - lf.height) // 2))
icon.save(OUT / "michaeli-mark.png", optimize=True)
print("logo", out.size, "mark ok")
