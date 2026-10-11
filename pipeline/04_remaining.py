#!/usr/bin/env python3
"""Rebuild agent batches containing only clusters not yet covered by data/recipes or data/notes.
A cluster counts as done when any of its driveIds appears in some output's `originals`.
Usage: .venv/bin/python -I pipeline/04_remaining.py [max_chars]"""
import json, re, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
W = ROOT / "work"
done = set()
for d in ("data/recipes", "data/notes"):
    for f in (ROOT / d).glob("*.json"):
        try:
            for o in json.loads(f.read_text()).get("originals", []): done.add(o.get("driveId"))
        except Exception: pass
blocks = []
for f in sorted((W / "batches").glob("[0-9]*.md")):
    blocks += re.split(r"(?=\n### CLUSTER )", f.read_text())[1:]
todo = [b for b in blocks if not (set(re.findall(r"driveId: (\S+)", b)) & done)]
out = W / "remaining"; out.mkdir(exist_ok=True)
for o in out.glob("*.md"): o.unlink()
cap = int(sys.argv[1]) if len(sys.argv) > 1 else 30000
batches, cur = [], ""
for b in todo:
    if cur and len(cur) + len(b) > cap: batches.append(cur); cur = ""
    cur += b
if cur: batches.append(cur)
for i, b in enumerate(batches, 1):
    (out / f"r{i:03d}.md").write_text(f"# Remaining batch r{i:03d}\n{b}")
print(f"done clusters: {len(blocks)-len(todo)}/{len(blocks)} · remaining batches: {len(batches)}")
