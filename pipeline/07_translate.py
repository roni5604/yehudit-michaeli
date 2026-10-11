#!/usr/bin/env python3
"""Step 7 — translate catalogue titles (Hebrew file names) into English dish
descriptions + a short stock-photo search query. Titles only; no recipe content.

Writes work/titles_en.json  {entryId: {"dish": "...", "query": "..."}}  (resumable)
Needs OPENAI_API_KEY (in .env.local). Model via YM_TEXT_MODEL (default gpt-5-nano).
"""
import json
import os
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "work/titles_en.json"


def env():
    p = ROOT / ".env.local"
    if p.exists():
        for line in p.read_text().splitlines():
            if "=" in line and not line.strip().startswith("#"):
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def chat(messages, model):
    req = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=json.dumps({"model": model, "messages": messages, "response_format": {"type": "json_object"}}).encode(),
        headers={"Authorization": f"Bearer {os.environ['OPENAI_API_KEY']}", "Content-Type": "application/json"},
    )
    for i in range(5):
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                return json.loads(json.loads(r.read())["choices"][0]["message"]["content"])
        except Exception as e:  # noqa: BLE001
            if i == 4:
                raise
            print("retry:", e, file=sys.stderr)
            time.sleep(5 * (i + 1))


SYSTEM = (
    "You receive Hebrew recipe titles (file names from a family cookbook, Israeli/French/Romanian home cooking). "
    "For each id return {\"dish\": short natural English dish description for a food photo (what it looks like, max 14 words), "
    "\"query\": 2-4 word generic English stock-photo search query for that kind of dish}. "
    "If a title is a collection or not a dish, describe the most likely food category. "
    "Reply as JSON: {\"items\": {\"<id>\": {\"dish\": ..., \"query\": ...}}}."
)


def main():
    env()
    if not os.environ.get("OPENAI_API_KEY"):
        sys.exit("OPENAI_API_KEY missing in .env.local")
    model = os.environ.get("YM_TEXT_MODEL", "gpt-4.1-nano")
    cat = json.loads((ROOT / "data/catalog.json").read_text())
    done = json.loads(OUT.read_text()) if OUT.exists() else {}
    todo = [e for e in cat if e["id"] not in done]
    print(f"{len(todo)} titles to translate")
    import concurrent.futures as cf
    import threading
    lock = threading.Lock()
    chunks = [todo[i:i + 60] for i in range(0, len(todo), 60)]

    def work(chunk):
        payload = {e["id"]: f"{e['t']} (folder: {e['f'] or e['c']})" for e in chunk}
        res = chat([{"role": "system", "content": SYSTEM}, {"role": "user", "content": json.dumps(payload, ensure_ascii=False)}], model)
        with lock:
            done.update({k: v for k, v in res.get("items", {}).items() if k in payload and isinstance(v, dict) and v.get("dish")})
            OUT.write_text(json.dumps(done, ensure_ascii=False, indent=0))
            print(f"  {len(done)}/{len(cat)}", flush=True)

    with cf.ThreadPoolExecutor(max_workers=8) as ex:
        list(ex.map(work, chunks))

if __name__ == "__main__":
    main()
