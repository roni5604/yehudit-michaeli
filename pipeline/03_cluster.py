#!/usr/bin/env python3
"""Step 3 — group duplicate documents and pack them into agent batches.

Documents are clustered when they share a normalised title OR their text is
near-identical (character-shingle Jaccard ≥ 0.80). Each cluster is handed to
exactly one structuring agent, so no recipe is produced twice.

Outputs:
  work/clusters.json          cluster id → member docs
  work/batches/NNN.md         self-contained agent input (≈ 40k chars each)
  work/batches/index.json     batch → cluster ids
Usage: .venv/bin/python -I pipeline/03_cluster.py
"""
from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WORK = ROOT / "work"
TEXT = WORK / "text"
BATCH_DIR = WORK / "batches"
MAX_CHARS = 56_000
MAX_CLUSTERS = 40
DOC_CAP = 14_000  # very long docs (course notes, collections) are split below

NIQQUD = re.compile(r"[֑-ׇ]")
FINALS = str.maketrans("ךםןףץ", "כמנפצ")


def norm_title(name: str) -> str:
    t = name.rsplit(".", 1)[0]
    t = NIQQUD.sub("", t).translate(FINALS)
    t = re.sub(r"\b(מתכון|מתכונים|של|ה?טעים|ה?מושלמ\w*|ה?קלה?|חדש)\b", " ", t)
    t = re.sub(r"[\d\W_]+", "", t)
    return t


def shingles(text: str, k: int = 7) -> set[int]:
    s = re.sub(r"\s+", " ", NIQQUD.sub("", text)).strip()
    return {hash(s[i:i + k]) for i in range(0, max(1, len(s) - k), 3)}


class DSU:
    def __init__(self, n: int):
        self.p = list(range(n))

    def find(self, x: int) -> int:
        while self.p[x] != x:
            self.p[x] = self.p[self.p[x]]
            x = self.p[x]
        return x

    def union(self, a: int, b: int) -> None:
        self.p[self.find(a)] = self.find(b)


def main() -> None:
    index = json.loads((WORK / "text_index.json").read_text())
    docs = [r for r in index if r["kind"] in ("text", "image") and (r["kind"] == "image" or r["chars"] >= 30)]
    menus = [r for r in docs if r["folders"][:1] == ["תפריטים"]]
    docs = [r for r in docs if r["folders"][:1] != ["תפריטים"]]
    texts = {r["id"]: json.loads((TEXT / f"{r['id']}.json").read_text())["text"] for r in docs}

    dsu = DSU(len(docs))
    by_title: dict[str, int] = {}
    for i, r in enumerate(docs):
        t = norm_title(r["file"])
        if len(t) >= 3:
            if t in by_title:
                dsu.union(i, by_title[t])
            else:
                by_title[t] = i
    # near-duplicate text: LSH-ish bucketing on a few shingle minima
    sh = [shingles(texts[r["id"]]) if r["kind"] == "text" else set() for r in docs]
    buckets: dict[tuple, list[int]] = defaultdict(list)
    for i, s in enumerate(sh):
        if len(s) < 20:
            continue
        srt = sorted(s)
        for band in range(4):
            buckets[(band, tuple(srt[band * 3: band * 3 + 3]))].append(i)
    for members in buckets.values():
        if len(members) > 40:
            continue
        for a in range(len(members)):
            for b in range(a + 1, len(members)):
                i, j = members[a], members[b]
                if dsu.find(i) == dsu.find(j):
                    continue
                inter = len(sh[i] & sh[j])
                if inter / max(1, len(sh[i] | sh[j])) >= 0.80:
                    dsu.union(i, j)

    groups: dict[int, list[int]] = defaultdict(list)
    for i in range(len(docs)):
        groups[dsu.find(i)].append(i)
    clusters = []
    for n, members in enumerate(sorted(groups.values(), key=lambda m: docs[m[0]]["rel"])):
        clusters.append({"cluster": f"c{n:04d}", "docs": [docs[i]["id"] for i in members]})
    (WORK / "clusters.json").write_text(json.dumps(clusters, ensure_ascii=False, indent=1))

    meta = {r["id"]: r for r in docs}
    BATCH_DIR.mkdir(parents=True, exist_ok=True)
    for old in BATCH_DIR.glob("*"):
        old.unlink()
    batches: list[list[dict]] = [[]]
    size = 0

    def render(c: dict) -> str:
        parts = []
        for k, did in enumerate(c["docs"], 1):
            r = meta[did]
            folder = " / ".join(f for f in r["folders"] if f not in ("מתכונים", "ספר מתכונים")) or "(ללא תיקייה)"
            head = f"--- doc {k} | file: {r['file']} | folder: {folder} | driveId: {did}"
            if r["kind"] == "image":
                parts.append(f"{head}\n[IMAGE — open it with the Read tool: {ROOT / r['path']}]")
            else:
                body = texts[did]
                if len(body) > DOC_CAP and len(c["docs"]) == 1:
                    parts.append(f"{head}\n{body}")  # long single doc: keep whole (may hold many recipes)
                else:
                    parts.append(f"{head}\n{body[:DOC_CAP]}")
        return f"\n### CLUSTER {c['cluster']} ({len(c['docs'])} doc{'s' if len(c['docs']) > 1 else ''})\n" + "\n\n".join(parts) + "\n"

    for c in clusters:
        block = render(c)
        if batches[-1] and (size + len(block) > MAX_CHARS or len(batches[-1]) >= MAX_CLUSTERS):
            batches.append([])
            size = 0
        batches[-1].append({"cluster": c["cluster"], "block": block})
        size += len(block)
    bindex = {}
    for n, b in enumerate(batches, 1):
        name = f"{n:03d}"
        (BATCH_DIR / f"{name}.md").write_text(f"# Batch {name} — {len(b)} clusters\n" + "".join(x["block"] for x in b))
        bindex[name] = [x["cluster"] for x in b]
    (BATCH_DIR / "index.json").write_text(json.dumps(bindex, indent=1))
    # menus get their own batches
    mtexts = []
    for r in menus:
        body = json.loads((TEXT / f"{r['id']}.json").read_text())["text"]
        mtexts.append(f"\n### MENU {r['file']} | driveId: {r['id']}\n{body[:9000]}\n")
    mb, cur = [], ""
    for t in mtexts:
        if len(cur) + len(t) > MAX_CHARS and cur:
            mb.append(cur)
            cur = ""
        cur += t
    if cur:
        mb.append(cur)
    for n, body in enumerate(mb, 1):
        (BATCH_DIR / f"menus-{n:02d}.md").write_text(f"# Menus batch {n}\n{body}")
    multi = sum(1 for c in clusters if len(c["docs"]) > 1)
    print(f"{len(docs)} recipe docs → {len(clusters)} clusters ({multi} with duplicates) → {len(batches)} batches; "
          f"{len(menus)} menus → {len(mb)} menu batches")


if __name__ == "__main__":
    main()
