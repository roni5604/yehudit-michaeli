#!/usr/bin/env python3
"""Step 1 — mirror the public Drive folder into raw/ (gitignored).

Walks the folder tree through Drive's public `embeddedfolderview` page and
downloads each allowed file through `uc?export=download`. Private documents
that happen to live in the folder (IDs, licences, cheques, medical papers…)
are matched by a filename blocklist and are NEVER downloaded.

Usage:  python3 pipeline/01_fetch.py [--dry-run]
"""
from __future__ import annotations

import concurrent.futures as cf
import hashlib
import html
import json
import re
import sys
import time
import urllib.request
from pathlib import Path

import os

# The Drive folder ID is private: set it in .env.local / the shell, never commit it.
ROOT_ID = os.environ.get("YM_DRIVE_FOLDER_ID", "")
PROJECT = Path(__file__).resolve().parent.parent
RAW = PROJECT / "raw"
WORK = PROJECT / "work"

ALLOWED_EXT = {"doc", "docx", "rtf", "htm", "html", "mht", "pdf", "txt", "jpg", "jpeg", "png", "webp"}

# Personal / non-recipe material. Matched against the file name (not folders).
BLOCK_NAME = re.compile(
    r"(טופס\s*161|יפוי\s*כח|ייפוי\s*כוח|סיכום\s*רפואי|אולטרסאונד|\bתז\b|ת\.ז|רשיון|רישיון|"
    r"צ'ק\b|תביעת|בטוח\b|ביטוח|תשריט|\bספח\b|"
    r"Cio Reach|SOP Annual Review|רשימת מכולת)",
    re.IGNORECASE,
)
BLOCK_PREFIX = ("~$", "~WRL")


def http_get(url: str, tries: int = 5) -> bytes:
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (recipe-archive)"})
            with urllib.request.urlopen(req, timeout=90) as r:
                return r.read()
        except Exception:  # noqa: BLE001 — network flakiness, back off and retry
            if i == tries - 1:
                raise
            time.sleep(2 ** i)
    raise RuntimeError("unreachable")


def list_folder(fid: str) -> list[tuple[str, str]]:
    s = http_get(f"https://drive.google.com/embeddedfolderview?id={fid}").decode()
    return [
        (html.unescape(m.group(2)), m.group(1))
        for m in re.finditer(r'<a href="([^"]+)"[^>]*>.*?<div class="flip-entry-title">(.*?)</div>', s, re.S)
    ]


def walk(fid: str, rel: Path, out: list[dict]) -> None:
    for name, url in list_folder(fid):
        if "/folders/" in url:
            sub = url.split("/folders/")[1].split("?")[0]
            walk(sub, rel / name, out)
        else:
            out.append({"name": name, "rel": str(rel / name), "id": url.split("/file/d/")[1].split("/")[0]})


def classify(item: dict) -> str | None:
    """Return a reason string if the file must be skipped, else None."""
    name, rel = item["name"], item["rel"]
    ext = name.rsplit(".", 1)[-1].lower() if "." in name else ""
    if name.startswith(BLOCK_PREFIX):
        return "lockfile"
    if BLOCK_NAME.search(name):
        return "private"
    if "_files/" in rel:
        return "web-assets"
    if ext not in ALLOWED_EXT:
        return f"ext:{ext or 'none'}"
    return None


def safe_rel(rel: str) -> Path:
    # keep Hebrew names, but strip characters that are awkward on disk
    parts = [re.sub(r'[\\:*?"<>|‏‎]', "", p).strip() or "_" for p in rel.split("/")]
    return Path(*parts)


def download(item: dict) -> dict:
    dest = RAW / safe_rel(item["rel"])
    if dest.exists() and dest.stat().st_size > 0:
        data = dest.read_bytes()
    else:
        data = http_get(f"https://drive.google.com/uc?export=download&id={item['id']}")
        if data[:15].lower().startswith(b"<!doctype html") and b"virus scan" in data.lower():
            raise RuntimeError("drive interstitial (file too large)")
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
    return {**item, "path": str(dest.relative_to(PROJECT)), "size": len(data), "sha1": hashlib.sha1(data).hexdigest()}


def main() -> None:
    if not ROOT_ID:
        sys.exit("Set YM_DRIVE_FOLDER_ID to the Drive folder id")
    dry = "--dry-run" in sys.argv
    items: list[dict] = []
    walk(ROOT_ID, Path(""), items)
    keep, skipped = [], []
    for it in items:
        reason = classify(it)
        (skipped if reason else keep).append({**it, "skip": reason} if reason else it)
    print(f"listed {len(items)} files → keep {len(keep)}, skip {len(skipped)}")
    for s in skipped:
        if s["skip"] == "private":
            print("  [private, not downloaded]", s["rel"])
    WORK.mkdir(exist_ok=True)
    (WORK / "skipped.json").write_text(json.dumps(skipped, ensure_ascii=False, indent=1))
    if dry:
        return
    done, failed = [], []
    with cf.ThreadPoolExecutor(max_workers=4) as ex:
        futs = {ex.submit(download, it): it for it in keep}
        for i, f in enumerate(cf.as_completed(futs), 1):
            try:
                done.append(f.result())
            except Exception as e:  # noqa: BLE001
                failed.append({**futs[f], "error": repr(e)})
            if i % 200 == 0:
                print(f"  {i}/{len(keep)}", flush=True)
    done.sort(key=lambda d: d["rel"])
    (WORK / "manifest.json").write_text(json.dumps(done, ensure_ascii=False, indent=1))
    (WORK / "failed.json").write_text(json.dumps(failed, ensure_ascii=False, indent=1))
    # safety audit: nothing private on disk
    leaked = [p for p in RAW.rglob("*") if p.is_file() and BLOCK_NAME.search(p.name)]
    print(f"downloaded {len(done)}, failed {len(failed)}, private-on-disk {len(leaked)}")
    if leaked:
        sys.exit("ABORT: private files found on disk: " + ", ".join(map(str, leaked)))


if __name__ == "__main__":
    main()
