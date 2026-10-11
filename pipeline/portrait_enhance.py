#!/usr/bin/env python3
"""Enhance Yehudit's portrait without altering her face.

Non-generative only: the subject is kept pixel-faithful (resampled, gently
denoised, colour-graded); only the background is replaced. Produces:
  public/brand/yehudit-portrait.{avif,webp,jpg}   — warm studio backdrop
  public/brand/yehudit-portrait-bokeh.{...}       — softened original scene
  public/brand/yehudit-engraving.png              — duotone illustration

Usage: python3 pipeline/portrait_enhance.py  (expects work/yehudit-original.jpg
       and work/yehudit-mask.png from portrait_mask.swift)
"""
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "work/yehudit-original.jpg"
MASK = ROOT / "work/yehudit-mask.png"
OUT = ROOT / "public/brand"
SCALE = 3  # 472x876 → 1416x2628

CREAM = (246, 239, 228)
COPPER = (180, 105, 62)
WALNUT = (58, 40, 30)


def clean_mask(mask: Image.Image) -> Image.Image:
    """Keep only the component connected to the body centre (drops pole / neighbours)."""
    w, h = mask.size
    hard = mask.point(lambda v: 255 if v > 90 else 0)
    ImageDraw.floodfill(hard, (w // 2, int(h * 0.55)), 128)
    gate = hard.point(lambda v: 255 if v == 128 else 0).filter(ImageFilter.MaxFilter(3))
    # hand-traced cuts (mask coordinates of the 472x876 source):
    d = ImageDraw.Draw(gate)
    d.polygon([(280, 0), (372, 0), (372, 112), (330, 100), (318, 93), (308, 84), (295, 73), (284, 63), (280, 58)], fill=0)  # metal pole behind hair
    d.rectangle([(0, 380), (17, h)], fill=0)  # neighbour's sleeve at the left edge
    d.rectangle([(0, 612), (25, 700)], fill=0)  # neighbour's hand beside her wrist
    soft = mask.point(lambda v: max(0, min(255, int((v - 35) * 1.25))))
    return ImageChops.multiply(soft, gate)


def radial_backdrop(size, inner, outer, center=(0.5, 0.32), power=1.6) -> Image.Image:
    w, h = size
    small = Image.new("RGB", (w // 8, h // 8))
    px = small.load()
    sw, sh = small.size
    cx, cy = center[0] * sw, center[1] * sh
    maxd = ((max(cx, sw - cx)) ** 2 + (max(cy, sh - cy)) ** 2) ** 0.5
    for y in range(sh):
        for x in range(sw):
            t = min(1.0, (((x - cx) ** 2 + (y - cy) ** 2) ** 0.5 / maxd)) ** power
            px[x, y] = tuple(int(inner[i] * (1 - t) + outer[i] * t) for i in range(3))
    return small.resize(size, Image.LANCZOS).filter(ImageFilter.GaussianBlur(6))


def grade(img: Image.Image) -> Image.Image:
    # mild denoise on chroma, keep luminance detail
    ycc = img.convert("YCbCr")
    y, cb, cr = ycc.split()
    cb, cr = (c.filter(ImageFilter.GaussianBlur(1.2)) for c in (cb, cr))
    y = y.filter(ImageFilter.UnsharpMask(radius=2.2, percent=55, threshold=2))
    img = Image.merge("YCbCr", (y, cb, cr)).convert("RGB")
    img = ImageEnhance.Contrast(img).enhance(1.06)
    img = ImageEnhance.Color(img).enhance(1.04)
    # warm the highlights a touch
    r, g, b = img.split()
    r = r.point(lambda v: min(255, int(v * 1.025 + 2)))
    b = b.point(lambda v: int(v * 0.97))
    return Image.merge("RGB", (r, g, b))


def save_all(img: Image.Image, stem: str) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    img.save(OUT / f"{stem}.jpg", quality=90, optimize=True, progressive=True)
    img.save(OUT / f"{stem}.webp", quality=88, method=6)
    try:
        img.save(OUT / f"{stem}.avif", quality=70)
    except Exception as e:  # noqa: BLE001 — AVIF plugin optional
        print("avif skipped:", e)


def main() -> None:
    src = Image.open(SRC).convert("RGB")
    mask = clean_mask(Image.open(MASK).convert("L"))
    w, h = src.size
    big = (w * SCALE, h * SCALE)
    subj = grade(src.resize(big, Image.LANCZOS))
    m = mask.resize(big, Image.LANCZOS).filter(ImageFilter.GaussianBlur(1.6))
    # crop: head-room above hair, stop below the hands (drops table clutter at the bottom)
    box = (0, int(0.02 * big[1]), big[0], int(0.83 * big[1]))

    studio = radial_backdrop(big, (250, 244, 234), (214, 190, 160))
    # soft copper glow behind the shoulders
    glow = radial_backdrop(big, (236, 200, 165), (214, 190, 160), center=(0.5, 0.45), power=0.9)
    studio = Image.blend(studio, glow, 0.35)
    a = Image.composite(subj, studio, m).crop(box)
    save_all(a, "yehudit-portrait")

    bokeh_bg = src.resize(big, Image.LANCZOS).filter(ImageFilter.GaussianBlur(28))
    bokeh_bg = Image.blend(ImageEnhance.Color(bokeh_bg).enhance(0.55), studio, 0.45)
    b = Image.composite(subj, bokeh_bg, m).crop(box)
    save_all(b, "yehudit-portrait-bokeh")

    # duotone "engraving" illustration (ink on cream), transparent outside subject
    g = ImageOps.autocontrast(subj.convert("L"), cutoff=1).filter(ImageFilter.UnsharpMask(3, 120, 0))
    duo = ImageOps.colorize(g, black=(34, 26, 22), white=CREAM, mid=(132, 98, 74))
    duo.putalpha(m)
    duo = duo.crop(box)
    duo.save(OUT / "yehudit-engraving.webp", quality=86, method=6)
    duo.resize((duo.width // 2, duo.height // 2), Image.LANCZOS).save(OUT / "yehudit-engraving.png", optimize=True)
    print("portrait outputs written to", OUT)


if __name__ == "__main__":
    main()
