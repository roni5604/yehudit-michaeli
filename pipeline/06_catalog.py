#!/usr/bin/env python3
"""Step 6 — the full recipe catalogue, built from Drive *file names and folders only*.

No recipe content is read. Each cluster (duplicates grouped by step 3) becomes one
catalogue entry that links to the original document in Google Drive. Entries that
were fully structured earlier (data/recipes) also point to their on-site page.

Output: data/catalog.json
Usage:  .venv/bin/python -I pipeline/06_catalog.py
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WORK = ROOT / "work"
tax = json.loads((ROOT / "data/taxonomy.json").read_text())
index = {r["id"]: r for r in json.loads((WORK / "text_index.json").read_text())}
clusters = json.loads((WORK / "clusters.json").read_text())

folder_cat, folder_sub = {}, {}
for c in tax["categories"]:
    for f in c["folders"]:
        folder_cat.setdefault(f, c["slug"])
    for s in c["subs"]:
        for f in s["folders"]:
            folder_sub[f] = (c["slug"], s["slug"])
folder_hol = {f: h["slug"] for h in tax["holidays"] for f in h["folders"]}
folder_cui = {f: c["slug"] for c in tax["cuisines"] for f in c["folders"]}

# keyword fallback for unsorted root files and holiday/ethnic folders
KEYWORDS = [
    (r"אזני המן|אוזני המן|המנטש", "cookies", None), (r"סופגני", "desserts", None), (r"לביבו|לטקס", "sides", None),
    (r"טופו|טבעונ|צמחונ", "vegetarian", None), (r"ארטישוק|אפונה|כרוב|תרד|עלי גפן|ממולא", "vegetables", None),
    (r"אגס|תפוח|פירות|תות|אננס|מנגו|בננ", "desserts", None), (r"קבב|כבד|שוק|סטייק|פילה בקר|מקלובה|באחש", "meat", None),
    (r"שקשוק|ביצ|חביתה|פנקייק|וופל|קרפ|בלינצ", "breakfast", None), (r"מתאבנ|ארנצ'יני|איקרה|אנטי ?פסטי|ברוסקט", "appetizers", None),
    (r"עוגת גבינה|עוגות גבינה|צ'יזקייק|צ׳יזקייק", "cakes", "cheesecakes"), (r"עוגת שוקולד|בראוני", "cakes", "chocolate-cakes"),
    (r"עוג(ה|ת|ות)|טארט|פאי|שטרודל|בבקה|קראנץ", "cakes", None), (r"עוגי|ביסקוט|מקרון|רוגלך|אוזני המן", "cookies", None),
    (r"מאפינס|מאפין", "breakfast", "muffins"), (r"לחם|חלה|לחמני|פוקאצ|פיתה|בייגל", "breads", None),
    (r"מרק", "soups", None), (r"סלט", "salads", None), (r"רוטב|רטבים|איולי|פסטו|ויניגרט", "sauces", None),
    (r"ריבה|ריבת|קונפיטורה", "jams", None), (r"חמוצ|כבוש", "pickles", None), (r"ממרח|מטבל|חומוס|טחינה|פטה", "spreads", None),
    (r"עוף|פרגית|כנפיים|שניצל|הודו|ברווז|אווז", "chicken", None), (r"דג|סלמון|טונה|לברק|דניס|שרימפס|קלמרי|פירות ים", "fish", None),
    (r"בשר|בקר|טלה|כבש|אנטריקוט|צלי|קציצ|המבורגר|אוסובוקו|סטייק|בורגיניון", "meat", None),
    (r"פסטה|ספגטי|לזניה|ניוקי|נודלס|אטריות|רביולי", "pasta", None), (r"קיש|פשטיד|בורקס|מאפה|פריטטה|סופלה", "savory-pastries", None),
    (r"קינוח|מוס|פנקוטה|קרם|גלידה|סורבה|פודינג|טירמיסו|פבלובה", "desserts", None), (r"שוקולד|טראפל|פרלינ|ממתק|נוגט", "sweets", None),
    (r"קוקטייל|קוקטיל|ליקר|סנגריה|מרגריטה", "cocktails", None), (r"משקה|לימונדה|שייק|תה |קפה", "drinks", None),
    (r"חציל|כרובית|ברוקולי|קישוא|פטריות|ירקות|תפוחי אדמה|בטטה|דלעת|גזר", "vegetables", None),
    (r"אורז|קוסקוס|פתיתים|בורגול|קינואה|תוספת", "sides", None), (r"גבינ", "cheese", None),
]
JUNK = re.compile(r"^(new folder|תיקיה חדשה|untitled|document\d*|מסמך\d*)$", re.I)


def clean_title(name: str) -> str:
    t = re.sub(r"\.(docx?|rtf|html?|mht|pdf|txt|jpe?g|png|webp)$", "", name, flags=re.I)
    t = re.sub(r"\.(docx?|jpe?g)$", "", t, flags=re.I)
    t = re.sub(r"^(\d+|~\$)\s*", "", t)
    t = re.sub(r"^[\w.-]+\.(com|co\.il|net|org)\s*-\s*", "", t, flags=re.I)  # "site.co.il-מתכון"
    t = re.sub(r"^\d*main ?mag\s*\d+.*$", "מתכונים מגזין עיתון", t, flags=re.I)
    t = re.sub(r"[_]+", " ", t)
    t = re.sub(r"\s*\(\d+\)$|\s+\d+$|\s*-\s*עותק$", "", t)
    t = re.sub(r"^(מתכון ל|מתכון:\s*|מתכון )", "", t)
    t = re.sub(r"\s+", " ", t).strip(" -–.,")
    return t


def classify(folders, title):
    cat = sub = hol = cui = None
    for f in folders:
        if f in folder_sub:
            cat, sub = folder_sub[f]
        elif f in folder_cat and not sub:
            cat = folder_cat[f]
        if f in folder_hol:
            hol = folder_hol[f]
        if f in folder_cui:
            cui = folder_cui[f]
    if not cat:
        for rx, c, s in KEYWORDS:
            if re.search(rx, title):
                cat, sub = c, s
                break
    return cat or "uncategorized", sub, hol, cui


structured = {}
for f in (ROOT / "data/recipes").glob("*.json"):
    d = json.loads(f.read_text())
    for o in d.get("originals", []):
        structured.setdefault(o["driveId"], d["slug"])

items, seen = [], set()
for c in clusters:
    docs = [index[i] for i in c["docs"] if i in index]
    docs = [d for d in docs if d["kind"] in ("text", "image")]
    if not docs:
        continue
    docs.sort(key=lambda d: (-d["chars"], d["file"]))  # most complete version first
    main = docs[0]
    title = clean_title(main["file"])
    if len(title) < 2 or JUNK.match(title):
        continue
    folders = [f for f in main["folders"] if f not in ("מתכונים", "ספר מתכונים")]
    cat, sub, hol, cui = classify(folders, title)
    slug = next((structured[d["id"]] for d in docs if d["id"] in structured), None)
    key = (title, cat)
    if key in seen and not slug:
        continue
    seen.add(key)
    items.append({
        "id": c["cluster"],
        "t": title,
        "c": cat,
        "sc": sub,
        "h": hol,
        "cu": cui,
        "f": " / ".join(folders),
        "u": f"https://drive.google.com/file/d/{main['id']}/view",
        "v": [f"https://drive.google.com/file/d/{d['id']}/view" for d in docs[1:4]],
        "s": slug,
    })

items.sort(key=lambda x: x["t"])
(ROOT / "data/catalog.json").write_text(json.dumps(items, ensure_ascii=False, separators=(",", ":")))
from collections import Counter
print(len(items), "catalogue entries ·", sum(1 for i in items if i["s"]), "with full pages")
print(Counter(i["c"] for i in items).most_common())
