#!/usr/bin/env python3
"""Step 2 — turn every downloaded file into clean plain text.

  .docx           → python-docx (paragraph order, tables, line breaks); textutil fallback
  .doc .rtf .htm  → macOS `textutil`
  .mht            → MIME html part → textutil
  .pdf            → PDFKit via work/ocr (compiled from pipeline/ocr.swift)
  images          → flagged for visual transcription (no Hebrew OCR on macOS)

Writes work/text/<driveId>.json and work/text_index.json.
Usage: .venv/bin/python -I pipeline/02_extract.py
"""
from __future__ import annotations

import concurrent.futures as cf
import email
import json
import re
import subprocess
from email import policy
from pathlib import Path

import docx  # python-docx

ROOT = Path(__file__).resolve().parent.parent
WORK = ROOT / "work"
OUT = WORK / "text"
IMAGE_EXT = {"jpg", "jpeg", "png", "webp"}

BIDI = re.compile(r"[​-‏‪-‮⁦-⁩﻿]")
FIELD = re.compile(r"(DATE \\@ \"[^\"]*\"|PAGE \\\* MERGEFORMAT|-\s*PAGE\s*\d*\s*-|HYPERLINK \"[^\"]*\")")


def textutil(path: Path, fmt: str | None = None) -> str:
    cmd = ["textutil", "-convert", "txt", "-stdout", "-encoding", "UTF-8"]
    if fmt:
        cmd += ["-format", fmt]
    cmd.append(str(path))
    r = subprocess.run(cmd, capture_output=True, timeout=120)
    return r.stdout.decode("utf-8", "replace")


def from_docx(path: Path) -> str:
    try:
        d = docx.Document(str(path))
    except Exception:  # noqa: BLE001 — corrupt / mislabeled file
        return textutil(path)
    out: list[str] = []
    body = d.element.body
    for child in body.iterchildren():
        tag = child.tag.rsplit("}", 1)[-1]
        if tag == "p":
            out.append(docx.text.paragraph.Paragraph(child, d).text)
        elif tag == "tbl":
            tbl = docx.table.Table(child, d)
            for row in tbl.rows:
                cells = []
                for c in row.cells:
                    t = c.text.strip()
                    if t and (not cells or cells[-1] != t):
                        cells.append(t)
                out.append(" | ".join(cells))
    text = "\n".join(out)
    if len(text.strip()) < 40:  # text boxes / odd structure: let textutil try
        alt = textutil(path)
        if len(alt.strip()) > len(text.strip()):
            text = alt
    return text


def from_mht(path: Path) -> str:
    msg = email.message_from_bytes(path.read_bytes(), policy=policy.default)
    for part in msg.walk():
        if part.get_content_type() == "text/html":
            html = part.get_content()
            r = subprocess.run(["textutil", "-convert", "txt", "-stdout", "-format", "html", "-stdin"],
                               input=html.encode("utf-8"), capture_output=True, timeout=120)
            return r.stdout.decode("utf-8", "replace")
    return ""


def clean(text: str) -> str:
    text = BIDI.sub("", text).replace("\r", "\n").replace(" ", " ").replace("\x07", "")
    text = FIELD.sub("", text)
    lines = [re.sub(r"[ \t]+", " ", ln).strip() for ln in text.split("\n")]
    text = "\n".join(lines)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def extract(item: dict) -> dict:
    p = ROOT / item["path"]
    ext = p.suffix.lower().lstrip(".")
    kind = "text"
    try:
        if ext == "docx":
            raw = from_docx(p)
        elif ext in ("doc", "rtf"):
            raw = textutil(p)
            if not raw.strip() and ext == "doc":  # some .doc are actually docx/rtf/html
                raw = from_docx(p) if p.read_bytes()[:2] == b"PK" else textutil(p, "html")
        elif ext in ("htm", "html"):
            raw = textutil(p, "html")
        elif ext == "mht":
            raw = from_mht(p)
        elif ext == "pdf":
            raw = subprocess.run([str(WORK / "ocr"), "pdf", str(p)], capture_output=True, timeout=120).stdout.decode("utf-8", "replace")
        elif ext == "txt":
            raw = p.read_text("utf-8", "replace")
        elif ext in IMAGE_EXT:
            raw, kind = "", "image"
        else:
            raw, kind = "", "skip"
        err = None
    except Exception as e:  # noqa: BLE001
        raw, err = "", repr(e)
    text = clean(raw)
    parts = item["rel"].split("/")
    rec = {
        "id": item["id"],
        "rel": item["rel"],
        "path": item["path"],
        "file": parts[-1],
        "folders": parts[:-1],
        "ext": ext,
        "kind": kind,
        "chars": len(text),
        "text": text,
        "error": err,
    }
    (OUT / f"{item['id']}.json").write_text(json.dumps(rec, ensure_ascii=False, indent=1))
    return {k: v for k, v in rec.items() if k != "text"}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = json.loads((WORK / "manifest.json").read_text()) if (WORK / "manifest.json").exists() else None
    if manifest is None:  # download still running: index what is on disk
        manifest = []
        for p in (ROOT / "raw").rglob("*"):
            if p.is_file():
                rel = str(p.relative_to(ROOT / "raw"))
                manifest.append({"id": "local-" + str(abs(hash(rel))), "rel": rel, "path": str(p.relative_to(ROOT))})
    with cf.ThreadPoolExecutor(max_workers=8) as ex:
        index = list(ex.map(extract, manifest))
    index.sort(key=lambda r: r["rel"])
    (WORK / "text_index.json").write_text(json.dumps(index, ensure_ascii=False, indent=1))
    empty = [r for r in index if r["kind"] == "text" and r["chars"] < 30]
    print(f"extracted {len(index)} files · images {sum(r['kind']=='image' for r in index)} · "
          f"near-empty {len(empty)} · errors {sum(bool(r['error']) for r in index)}")


if __name__ == "__main__":
    main()
