#!/usr/bin/env python3
"""Builds the "יהודית מיכאלי · שפית" identity as pure-path SVGs.

All lettering is shaped with HarfBuzz and converted to outlines, so the logo
renders identically everywhere (favicons, OG images, print) with no font
dependency. Outputs go to public/brand/ and public/ (favicon).

Usage: .venv/bin/python -I pipeline/logo.py
"""
from __future__ import annotations

import io
import math
from pathlib import Path

import uharfbuzz as hb
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parent.parent
NM = ROOT / "node_modules"
OUT = ROOT / "public/brand"

BORDEAUX = "#6B1E2B"
COPPER = "#B4693E"
INK = "#2A2522"
CREAM = "#F6EFE4"


class Face:
    def __init__(self, path: Path, wght: int | None = None):
        font = TTFont(path)
        if wght is not None and "fvar" in font:
            font = instantiateVariableFont(font, {"wght": wght})
        buf = io.BytesIO()
        font.flavor = None
        font.save(buf)
        self.blob = buf.getvalue()
        self.tt = TTFont(io.BytesIO(self.blob))
        self.upem = self.tt["head"].unitsPerEm
        self.glyphset = self.tt.getGlyphSet()
        self.order = self.tt.getGlyphOrder()
        self.hbfont = hb.Font(hb.Face(self.blob))

    def shape(self, text: str):
        buf = hb.Buffer()
        buf.add_str(text)
        buf.guess_segment_properties()
        hb.shape(self.hbfont, buf, {"kern": True, "liga": True})
        return buf.glyph_infos, buf.glyph_positions

    def width(self, text: str, size: float, tracking: float = 0) -> float:
        _, pos = self.shape(text)
        return sum(p.x_advance for p in pos) * size / self.upem + tracking * size * max(0, len(pos) - 1)

    def path(self, text: str, size: float, x: float, y: float, anchor: str = "start", tracking: float = 0) -> str:
        """SVG path data for `text`, baseline at y. anchor: start(left)/middle/end(right)."""
        infos, pos = self.shape(text)
        s = size / self.upem
        total = self.width(text, size, tracking)
        x0 = {"start": x, "middle": x - total / 2, "end": x - total}[anchor]
        pen = SVGPathPen(self.glyphset)
        cx = 0.0
        for info, p in zip(infos, pos):
            name = self.order[info.codepoint]
            tp = TransformPen(pen, (s, 0, 0, -s, x0 + (cx + p.x_offset) * s, y - p.y_offset * s))
            self.glyphset[name].draw(tp)
            cx += p.x_advance + tracking * self.upem
        return pen.getCommands()


def f(v: float) -> str:
    return f"{v:.2f}".rstrip("0").rstrip(".")


def leaf(cx: float, cy: float, angle: float, length: float, width: float) -> str:
    """Olive leaf: pointed ellipse along `angle` (radians), base at (cx, cy)."""
    ca, sa = math.cos(angle), math.sin(angle)
    def P(u, v):
        return f(cx + u * ca - v * sa) + "," + f(cy + u * sa + v * ca)
    L, W = length, width
    return (f"M{P(0,0)} C{P(L*0.30, W)} {P(L*0.75, W*0.9)} {P(L,0)} "
            f"C{P(L*0.75, -W*0.9)} {P(L*0.30, -W)} {P(0,0)}Z")


def wreath(cx: float, cy: float, r: float, side: int) -> tuple[str, str, str]:
    """Classic laurel/olive branch rising from the bottom, open at the top.

    side=+1 → right branch, -1 → left. Angles are SVG-style (clockwise from +x,
    90° = straight down). Returns (stem path, leaves path, olive circles).
    """
    th0, th1 = math.radians(84), math.radians(-38)  # right branch: bottom → upper-right
    n = 60
    pts = []
    for i in range(n + 1):
        t = i / n
        th = th0 + (th1 - th0) * t
        if side < 0:
            th = math.pi - th
        rr = r * (1 - 0.05 * t)
        pts.append((cx + rr * math.cos(th), cy + rr * math.sin(th)))
    stem = "M" + " L".join(f"{f(x)},{f(y)}" for x, y in pts)
    leaves, olives = [], []
    k = 0
    for i in range(5, n, 5):
        (x0, y0), (x1, y1) = pts[i - 1], pts[i]
        tang = math.atan2(y1 - y0, x1 - x0)
        t = i / n
        size = 1.0 - 0.42 * t
        outer = side  # +1: rotate clockwise is outward for right branch
        for j, off in enumerate((1, -1)):
            ang = tang + off * math.radians(34)
            is_outer = (off == outer) if side > 0 else (off == -outer)
            L = (17 if is_outer else 13) * size
            W = (5.0 if is_outer else 4.0) * size
            # alternate base positions slightly along the stem
            bx, by = pts[i - (1 if j else 0)]
            leaves.append(leaf(bx, by, ang, L, W))
        if k in (1, 4, 7):
            nx, ny = -math.sin(tang), math.cos(tang)
            sgn = 1 if side > 0 else -1
            olives.append((x1 - nx * 6 * sgn, y1 - ny * 6 * sgn, 2.7 * size + 0.5))
        k += 1
    (xp, yp), (xe, ye) = pts[-3], pts[-1]
    leaves.append(leaf(xe, ye, math.atan2(ye - yp, xe - xp), 12, 3.6))
    return stem, " ".join(leaves), "".join(f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(rr)}"/>' for x, y, rr in olives)


def toque(cx: float, top: float, w: float) -> str:
    """Minimal chef's toque: three puffs + band, as one path (even-odd band line)."""
    h = w * 0.78
    band_h = w * 0.22
    by = top + h - band_h
    r1, r2 = w * 0.30, w * 0.36
    return (
        f'<g>'
        f'<circle cx="{f(cx - w*0.28)}" cy="{f(top + r1 + w*0.12)}" r="{f(r1)}"/>'
        f'<circle cx="{f(cx + w*0.28)}" cy="{f(top + r1 + w*0.12)}" r="{f(r1)}"/>'
        f'<circle cx="{f(cx)}" cy="{f(top + r2)}" r="{f(r2)}"/>'
        f'<rect x="{f(cx - w*0.36)}" y="{f(top + r2)}" width="{f(w*0.72)}" height="{f(by - top - r2 + band_h)}" rx="{f(w*0.05)}"/>'
        f'</g>'
    )


def mark_svg(serif: Face, color_main: str, color_accent: str, bg: str | None = None, size: int = 200) -> str:
    c = 100
    stemL, leavesL, olivesL = wreath(c, c, 78, -1)
    stemR, leavesR, olivesR = wreath(c, c, 78, +1)
    gap = 15
    wy, wm = serif.width("י", 66), serif.width("מ", 66)
    total = wm + gap + wy
    left = c - total / 2
    mono = serif.path("מ", 66, left, 130, "start") + serif.path("י", 66, left + wm + gap, 130, "start")
    dot = f'<circle cx="{f(left + wm + gap / 2)}" cy="112" r="3.4" fill="{color_accent}"/>'
    rings = (f'<circle cx="{c}" cy="{c}" r="96" fill="none" stroke="{color_main}" stroke-width="2.2"/>'
             f'<circle cx="{c}" cy="{c}" r="90.5" fill="none" stroke="{color_accent}" stroke-width="0.9"/>')
    bgc = f'<circle cx="{c}" cy="{c}" r="97.2" fill="{bg}"/>' if bg else ""
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="{size}" height="{size}" role="img" aria-label="יהודית מיכאלי · שפית">'
        f'{bgc}{rings}'
        f'<g fill="none" stroke="{color_accent}" stroke-width="1.4" stroke-linecap="round"><path d="{stemL}"/><path d="{stemR}"/></g>'
        f'<g fill="{color_accent}"><path d="{leavesL} {leavesR}"/>{olivesL}{olivesR}</g>'
        f'<g fill="{color_main}">{toque(c, 44, 34)}</g>'
        f'<rect x="{c-17}" y="{44+34*0.78-34*0.22+2.2}" width="34" height="1.6" fill="{bg or CREAM}"/>'
        f'<path fill="{color_main}" d="{mono}"/>{dot}'
        f'</svg>'
    )


def full_svg(serif: Face, sans: Face, latin: Face, color_main: str, color_accent: str, color_ink: str) -> str:
    """Horizontal RTL lockup: emblem on the right, wordmark to its left."""
    W, H = 760, 200
    name = serif.path("יהודית מיכאלי", 70, 548, 104, "end")
    t1, t2 = "שפית", "מטבח כפרי צרפתי"
    w1 = sans.width(t1, 23, 0.06)
    title = sans.path(t1, 23, 548, 146, "end", tracking=0.06) + sans.path(t2, 23, 548 - w1 - 26, 146, "end", tracking=0.06)
    title_dot = f'<circle cx="{f(548 - w1 - 13)}" cy="138.5" r="2.6" fill="{color_accent}"/>'
    fr = latin.path("Rishpon · Cuisine de campagne", 22, 548, 182, "end", tracking=0.02)
    nw = serif.width("יהודית מיכאלי", 70)
    rule_y = 120
    emblem = mark_svg(serif, color_main, color_accent).split(">", 1)[1].rsplit("</svg>", 1)[0]
    fw = latin.width("Rishpon · Cuisine de campagne", 22, 0.02)
    x0 = int(548 - max(nw, fw, sans.width("שפית  מטבח כפרי צרפתי", 23, 0.06) + 26)) - 6
    W -= x0
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0} 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="יהודית מיכאלי · שפית · מטבח כפרי צרפתי">'
        f'<g transform="translate(560 0)">{emblem}</g>'
        f'<path fill="{color_main}" d="{name}"/>'
        f'<rect x="{f(548 - nw)}" y="{rule_y}" width="{f(nw)}" height="1.2" fill="{color_accent}"/>'
        f'<path fill="{color_accent}" d="{title}"/>{title_dot}'
        f'<path fill="{color_ink}" opacity="0.8" d="{fr}"/>'
        f'</svg>'
    )


def wordmark_svg(serif: Face, sans: Face, color_main: str, color_accent: str) -> str:
    """Compact two-line wordmark for the site header (no emblem)."""
    nw = serif.width("יהודית מיכאלי", 64)
    W = int(nw + 8)
    name = serif.path("יהודית מיכאלי", 64, W - 4, 64, "end")
    w1 = sans.width("שפית", 21, 0.08)
    sub = sans.path("שפית", 21, W - 4, 100, "end", tracking=0.08) + sans.path("מטבח כפרי צרפתי", 21, W - 4 - w1 - 22, 100, "end", tracking=0.08)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} 112" role="img" aria-label="יהודית מיכאלי · שפית">'
            f'<path fill="{color_main}" d="{name}"/><path fill="{color_accent}" d="{sub}"/>'
            f'<circle cx="{f(W - 4 - w1 - 11)}" cy="93.5" r="2.4" fill="{color_accent}"/></svg>')


def favicon_svg(serif: Face) -> str:
    body = mark_svg(serif, BORDEAUX, COPPER, bg=CREAM).split(">", 1)[1].rsplit("</svg>", 1)[0]
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">{body}</svg>'


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    serif = Face(NM / "@fontsource-variable/frank-ruhl-libre/files/frank-ruhl-libre-hebrew-wght-normal.woff2", 700)
    serif_mid = Face(NM / "@fontsource-variable/frank-ruhl-libre/files/frank-ruhl-libre-hebrew-wght-normal.woff2", 800)
    sans = Face(NM / "@fontsource-variable/assistant/files/assistant-hebrew-wght-normal.woff2", 600)
    latin = Face(NM / "@fontsource/cormorant-garamond/files/cormorant-garamond-latin-500-italic.woff2")

    files = {
        "logo-mark.svg": mark_svg(serif_mid, BORDEAUX, COPPER),
        "logo-mark-cream.svg": mark_svg(serif_mid, BORDEAUX, COPPER, bg=CREAM),
        "logo-mark-mono.svg": mark_svg(serif_mid, "currentColor", "currentColor"),
        "logo-full.svg": full_svg(serif, sans, latin, BORDEAUX, COPPER, INK),
        "logo-full-dark.svg": full_svg(serif, sans, latin, CREAM, "#D9A273", CREAM),
        "logo-wordmark.svg": wordmark_svg(serif, sans, BORDEAUX, COPPER),
    }
    for name, svg in files.items():
        (OUT / name).write_text(svg)
    (ROOT / "public/favicon.svg").write_text(favicon_svg(serif_mid))
    print("wrote", ", ".join(files), "+ favicon.svg")


if __name__ == "__main__":
    main()
