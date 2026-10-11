#!/usr/bin/env python3
"""Step 8 — dish photos for the catalogue.

  • ~500 featured entries → AI food photo (OpenAI gpt-image-1-mini), labelled "להמחשה"
  • all other entries     → free-licence photo from Pexels (photographer credited)

Resumable; writes public/images/recipes/<id>-{640,1280}.avif and data/images.json.
Usage:
  .venv/bin/python -I pipeline/08_images.py ai [--limit N]
  .venv/bin/python -I pipeline/08_images.py stock [--limit N]
Env (.env.local): OPENAI_API_KEY, PEXELS_API_KEY, YM_IMAGE_MODEL (default gpt-image-1-mini),
                  YM_IMAGE_QUALITY (default medium), YM_FEATURED (default 500)
"""
import base64
import io
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image
import pillow_avif  # noqa: F401  (registers AVIF)

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / "public/images/recipes"
MANIFEST = ROOT / "data/images.json"
TITLES = ROOT / "work/titles_en.json"
STYLE = (
    "Professional editorial food photography, appetizing, realistic. Served on a rustic French country table: "
    "warm natural window light from the side, linen napkin, ceramic or copper cookware, shallow depth of field, "
    "3:2 landscape, no people, no hands, no text, no logos."
)


def env():
    p = ROOT / ".env.local"
    if p.exists():
        for line in p.read_text().splitlines():
            if "=" in line and not line.strip().startswith("#"):
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def load(p, d):
    return json.loads(p.read_text()) if p.exists() else d


def save_variants(img: Image.Image, key: str) -> tuple[int, int]:
    IMG.mkdir(parents=True, exist_ok=True)
    img = img.convert("RGB")
    w, h = img.size
    # centre-crop to 3:2 (square sources lose a little top/bottom)
    tw, th = (w, int(w / 1.5)) if w / h < 1.5 else (int(h * 1.5), h)
    img = img.crop(((w - tw) // 2, (h - th) // 2, (w - tw) // 2 + tw, (h - th) // 2 + th))
    for size in (640, 1280):
        tw2 = min(size, img.width)  # never upscale
        v = img.resize((tw2, int(tw2 / 1.5)), Image.LANCZOS)
        v.save(IMG / f"{key}-{size}.avif", quality=58 if size == 1280 else 55)
    return 1280, 853


def featured(cat):
    """Full recipes first, then a balanced pick per category (titles that look like real dishes)."""
    n = int(os.environ.get("YM_FEATURED", "500"))
    picked = [e for e in cat if e["s"]]
    by = {}
    for e in cat:
        if not e["s"] and e["c"] != "uncategorized" and not re.search(r"אוסף|מתכונים|שונים|טיפים|איך|מדריך|עקרונות", e["t"]):
            by.setdefault(e["c"], []).append(e)
    i = 0
    while len(picked) < n and any(by.values()):
        for c in list(by):
            if by[c] and len(picked) < n:
                picked.append(by[c].pop(i % max(1, len(by[c]))))
        i += 7
    return picked


def _gen(e, prompt, key, model, quality, size):
    body = json.dumps({"model": model, "prompt": prompt, "size": size, "quality": quality, "n": 1}).encode()
    req = urllib.request.Request("https://api.openai.com/v1/images/generations", data=body,
                                 headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"})
    for t in range(6):
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                return base64.b64decode(json.loads(r.read())["data"][0]["b64_json"])
        except urllib.error.HTTPError as ex:
            msg = ex.read()[:300].decode("utf8", "replace")
            if ex.code in (400, 401, 403) and "billing" in msg.lower() or "insufficient_quota" in msg:
                raise SystemExit(f"OpenAI quota/billing stop: {msg}")
            if ex.code == 400:
                print("  rejected prompt", e["id"], msg, file=sys.stderr)
                return None
            time.sleep(min(120, 15 * (t + 1)))
        except Exception as ex:  # noqa: BLE001
            print("  retry", e["id"], ex, file=sys.stderr)
            time.sleep(10 * (t + 1))
    return None


def ai(limit, rest=False):
    """featured (medium) or rest (low). Parallel, resumable."""
    import concurrent.futures as cf
    import threading
    key = os.environ.get("OPENAI_API_KEY") or sys.exit("OPENAI_API_KEY missing")
    model = os.environ.get("YM_IMAGE_MODEL", "gpt-image-1-mini")
    quality = "low" if rest else os.environ.get("YM_IMAGE_QUALITY", "medium")
    size = os.environ.get("YM_IMAGE_SIZE", "1024x1024")
    workers = int(os.environ.get("YM_WORKERS", "6"))
    cat = json.loads((ROOT / "data/catalog.json").read_text())
    titles, man = load(TITLES, {}), load(MANIFEST, {})
    feat_ids = {e["id"] for e in featured(cat)}
    pool = [e for e in cat if (e["id"] not in feat_ids) == rest]
    todo = [e for e in pool if e["id"] not in man and e["id"] in titles][:limit]
    print(f"{'rest' if rest else 'featured'} AI images to make: {len(todo)} ({quality}, {size})", flush=True)
    lock = threading.Lock()
    done = 0

    def work(e):
        nonlocal done
        prompt = f"{titles[e['id']]['dish']}. {STYLE} Wide composition with the dish centred and space around it."
        data = _gen(e, prompt, key, model, quality, size)
        if not data:
            return
        w, h = save_variants(Image.open(io.BytesIO(data)), e["id"])
        with lock:
            man[e["id"]] = {"w": w, "h": h, "src": "ai", "k": e["id"]}
            if e["s"]:
                man[e["s"]] = man[e["id"]]
            done += 1
            if done % 10 == 0 or done == len(todo):
                MANIFEST.write_text(json.dumps(man, ensure_ascii=False, indent=0))
                print(f"  {done}/{len(todo)}", flush=True)

    with cf.ThreadPoolExecutor(max_workers=workers) as ex:
        list(ex.map(work, todo))
    MANIFEST.write_text(json.dumps(man, ensure_ascii=False, indent=0))


def stock(limit):
    key = os.environ.get("PEXELS_API_KEY") or sys.exit("PEXELS_API_KEY missing")
    cat = json.loads((ROOT / "data/catalog.json").read_text())
    titles, man = load(TITLES, {}), load(MANIFEST, {})
    cache_p = ROOT / "work/pexels_cache.json"
    cache = load(cache_p, {})
    todo = [e for e in cat if e["id"] not in man and e["id"] in titles][:limit]
    print(f"stock photos to fetch: {len(todo)} (unique queries cached: {len(cache)})")
    used: dict[str, int] = {}
    for n, e in enumerate(todo, 1):
        q = titles[e["id"]]["query"].lower().strip()
        if q not in cache:
            url = "https://api.pexels.com/v1/search?" + urllib.parse.urlencode({"query": q, "per_page": 15, "orientation": "landscape"})
            req = urllib.request.Request(url, headers={"Authorization": key, "User-Agent": "yehudit-michaeli-site"})
            try:
                with urllib.request.urlopen(req, timeout=60) as r:
                    remaining = r.headers.get("X-Ratelimit-Remaining")
                    photos = json.loads(r.read()).get("photos", [])
            except urllib.error.HTTPError as ex:
                if ex.code == 429:
                    print("  rate limited — sleeping 15 min", flush=True)
                    time.sleep(900)
                    continue
                photos, remaining = [], None
            cache[q] = [{"id": p["id"], "src": p["src"]["large2x"], "by": p["photographer"], "url": p["url"]} for p in photos]
            cache_p.write_text(json.dumps(cache, ensure_ascii=False))
            if remaining is not None and int(remaining) < 3:
                print("  hourly quota used — sleeping 61 min", flush=True)
                time.sleep(3660)
        options = cache.get(q) or []
        if not options:
            continue
        # spread identical queries over different photos so cards don't repeat
        k = used.get(q, 0)
        used[q] = k + 1
        p = options[k % len(options)]
        try:
            with urllib.request.urlopen(urllib.request.Request(p["src"], headers={"User-Agent": "Mozilla/5.0"}), timeout=60) as r:
                img = Image.open(io.BytesIO(r.read()))
        except Exception as ex:  # noqa: BLE001
            print("  download failed", ex, file=sys.stderr)
            continue
        w, h = save_variants(img, e["id"])
        man[e["id"]] = {"w": w, "h": h, "src": "pexels", "by": p["by"], "url": p["url"], "k": e["id"]}
        if n % 25 == 0:
            MANIFEST.write_text(json.dumps(man, ensure_ascii=False, indent=0))
            print(f"  {n}/{len(todo)}", flush=True)
    MANIFEST.write_text(json.dumps(man, ensure_ascii=False, indent=0))


if __name__ == "__main__":
    env()
    mode = sys.argv[1] if len(sys.argv) > 1 else ""
    lim = int(sys.argv[sys.argv.index("--limit") + 1]) if "--limit" in sys.argv else 10**9
    {"ai": ai, "rest": lambda n: ai(n, rest=True), "stock": stock}.get(mode, lambda _: sys.exit(__doc__))(lim)
