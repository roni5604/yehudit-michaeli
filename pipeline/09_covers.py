#!/usr/bin/env python3
"""Step 9 — curated cover photos for every category, sub-category, holiday and cuisine.

Writes public/images/covers/<kind>-<slug>-{640,1280}.avif and data/covers.json.
Usage: .venv/bin/python -I pipeline/09_covers.py
"""
import base64
import concurrent.futures as cf
import io
import json
import os
import sys
import urllib.request
from pathlib import Path

from PIL import Image
import pillow_avif  # noqa: F401

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public/images/covers"
MAN = ROOT / "data/covers.json"
sys.path.insert(0, str(ROOT / "pipeline"))

STYLE = ("Editorial cookbook cover photograph, abundant and inviting, rustic French country kitchen table, warm side window light, "
         "linen, copper pots, ceramic plates, herbs, shallow depth of field, rich natural colours, no people, no text, no logos, landscape.")

DESC = {
    # categories
    "breakfast": "an abundant breakfast spread: croissants, eggs, jams, fresh bread, coffee, fruit",
    "starters": "elegant French bistro starters: terrine, small tart, green salad with edible flowers",
    "appetizers": "assorted finger food and appetizers on a wooden board: bruschetta, olives, small pastries",
    "spreads": "bowls of colourful dips and spreads with pita and bread: hummus, eggplant, tapenade",
    "salads": "several vibrant fresh salads in rustic bowls with herbs and vinaigrette",
    "soups": "steaming pots and bowls of hearty soups: lentil, vegetable, creamy orange soup",
    "vegetables": "roasted and stuffed vegetables in a copper pan: eggplant, peppers, zucchini",
    "vegetarian": "colourful vegetarian main dishes: vegetable gratin, gnocchi, stuffed vegetables",
    "pasta": "plates of homemade pasta: tagliatelle, lasagna, gnocchi with tomato and herbs",
    "sides": "side dishes: rice pilaf, roasted potatoes, couscous, glazed carrots in ceramic dishes",
    "savory-pastries": "golden savory bakes: quiche lorraine, burekas, savory pies",
    "breads": "freshly baked artisan breads: challah, baguettes, rustic loaves on a floured board",
    "fish": "fish and seafood: whole baked fish, bouillabaisse, shrimp in butter, lemons",
    "chicken": "roast chicken and duck dishes in a copper casserole with herbs",
    "meat": "slow-cooked meat dishes: beef bourguignon, lamb shank, braised beef in a cast iron pot",
    "sauces": "small pots of classic sauces: béchamel, tomato sauce, pesto, aioli",
    "pickles": "glass jars of homemade pickles: cucumbers, peppers, olives, preserved lemons",
    "jams": "jars of homemade jams and preserves with fresh fruit, spoons and bread",
    "cheese": "homemade cheeses and cheese dishes, cheese board with fruit and nuts",
    "cakes": "an array of homemade cakes: chocolate cake, cheesecake, apple cake on cake stands",
    "cookies": "plates and tins of homemade cookies: butter cookies, biscotti, rugelach",
    "desserts": "elegant French desserts: crème brûlée, tarte tatin, chocolate mousse",
    "sweets": "chocolate truffles, pralines and homemade confections on a marble slab",
    "drinks": "homemade drinks: lemonade, iced tea, liqueurs in glass bottles",
    "cocktails": "colourful cocktails in elegant glasses with citrus garnish on a wooden bar",
    "uncategorized": "an open handwritten family recipe notebook surrounded by ingredients",
    # sub-categories
    "muffins": "freshly baked muffins with berries and chocolate chips", "afternoon-tea": "afternoon tea with scones, jam, cream and small sandwiches",
    "antipasti": "Italian antipasti platter with grilled vegetables, cured meats and olives", "cold-soups": "chilled gazpacho and cold soups in glass bowls",
    "cauliflower": "roasted whole cauliflower and cauliflower dishes", "vegan": "colourful vegan bowls with grains, vegetables and tahini",
    "tofu": "crispy tofu dishes with vegetables and sesame", "noodles": "Asian noodle dishes in bowls with chopsticks",
    "potato-bakes": "golden potato gratin and potato kugel", "savory-multicake": "savory pies baked in a round pan",
    "patties": "pan-fried meat patties and kofta with tomato sauce", "cheesecakes": "several cheesecakes: baked New York cheesecake, crumble cheesecake",
    "chocolate-cakes": "rich chocolate cakes and brownies", "poppy-seed-cakes": "poppy seed cakes and rolls", "apple-cakes": "apple cakes and apple pies with cinnamon",
    "honey-cakes": "honey cakes for Rosh Hashana with honey jar", "plum-cakes": "plum cakes and plum tarts", "vanilla-cakes": "vanilla sponge cakes and pound cakes",
    "sugar-free-cakes": "light healthy cakes with fruit and nuts", "cupcakes": "decorated cupcakes", "multicake": "cakes baked in a round multicake pan",
    "tarts": "French fruit tarts and pies", "yeast-cakes": "braided yeast cakes and babka", "crackers": "homemade crackers and breadsticks",
    # holidays
    "rosh-hashana": "Rosh Hashana table: apples and honey, pomegranates, round challah, honey cake",
    "hanukkah": "Hanukkah treats: sufganiyot doughnuts with powdered sugar and golden latkes, candles",
    "tu-bishvat": "Tu BiShvat dried fruits and nuts: figs, dates, almonds, carob",
    "purim": "Purim hamantaschen cookies filled with poppy seed and jam, festive",
    "passover": "Passover table: matzah, charoset, festive dishes",
    "shavuot": "Shavuot dairy feast: cheesecake, blintzes, cheeses, fresh flowers",
    "shabbat": "Shabbat dinner table: braided challah, wine, candles, festive dishes",
    # cuisines
    "french": "French country cuisine: coq au vin, ratatouille, baguette, red wine",
    "italian": "Italian cuisine: pasta, risotto, focaccia, tomatoes and basil",
    "romanian": "Romanian cuisine: mamaliga polenta, sarmale stuffed cabbage, mititei",
    "hungarian": "Hungarian cuisine: goulash with paprika, chicken paprikash, dumplings",
    "indian": "Indian cuisine: curries, dal, rice and naan in copper bowls",
    "japanese": "Japanese cuisine: sushi, miso soup, tempura, on ceramic plates",
    "chinese": "Chinese cuisine: stir-fry in a wok, dumplings, rice",
    "thai": "Thai cuisine: pad thai, green curry, fresh herbs and lime",
    "greek": "Greek cuisine: moussaka, Greek salad with feta, olives",
    "iraqi": "Iraqi cuisine: kubbeh, amba, rice with nuts",
    "persian": "Persian cuisine: jeweled rice with saffron and herbs, stews",
    "arab": "Middle Eastern cuisine: hummus, falafel, knafeh, salads",
    "russian": "Russian cuisine: borscht, blini with caviar, pelmeni",
    "mexican": "Mexican cuisine: tacos, guacamole, salsa",
    "argentinian": "Argentinian cuisine: grilled steak, chimichurri, empanadas",
    "moroccan": "Moroccan cuisine: tagine, couscous, preserved lemons",
    "spanish": "Spanish cuisine: paella and tapas",
    "polish-ashkenazi": "Ashkenazi Jewish cuisine: gefilte fish, chopped liver, chicken soup",
    "british": "British cuisine: Christmas pudding, scones, roast",
    "american": "American cuisine: brownies, cheesecake, burgers",
    "israeli": "Israeli cuisine: shakshuka, Israeli salad, pita",
}


def env():
    p = ROOT / ".env.local"
    for line in p.read_text().splitlines():
        if "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())


def save(img, key):
    OUT.mkdir(parents=True, exist_ok=True)
    img = img.convert("RGB")
    w, h = img.size
    tw, th = (w, int(w / 1.5)) if w / h < 1.5 else (int(h * 1.5), h)
    img = img.crop(((w - tw) // 2, (h - th) // 2, (w - tw) // 2 + tw, (h - th) // 2 + th))
    for size in (640, 1280):
        s = min(size, img.width)
        img.resize((s, int(s / 1.5)), Image.LANCZOS).save(OUT / f"{key}-{size}.avif", quality=60)


def main():
    env()
    tax = json.loads((ROOT / "data/taxonomy.json").read_text())
    jobs = [("cat", c["slug"]) for c in tax["categories"]] + [("sub", s["slug"]) for c in tax["categories"] for s in c["subs"]] \
        + [("hol", h["slug"]) for h in tax["holidays"]] + [("cui", c["slug"]) for c in tax["cuisines"]]
    man = json.loads(MAN.read_text()) if MAN.exists() else {}
    todo = [(k, s) for k, s in jobs if f"{k}-{s}" not in man and s in DESC]
    print("covers to make:", len(todo), flush=True)
    key = os.environ["OPENAI_API_KEY"]

    def work(job):
        k, s = job
        body = json.dumps({"model": "gpt-image-1-mini", "prompt": f"{DESC[s]}. {STYLE}", "size": "1536x1024", "quality": "medium", "n": 1}).encode()
        req = urllib.request.Request("https://api.openai.com/v1/images/generations", data=body,
                                     headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"})
        for _ in range(4):
            try:
                with urllib.request.urlopen(req, timeout=300) as r:
                    return job, base64.b64decode(json.loads(r.read())["data"][0]["b64_json"])
            except Exception as ex:  # noqa: BLE001
                print("retry", s, ex, file=sys.stderr)
        return job, None

    with cf.ThreadPoolExecutor(max_workers=4) as ex:
        for (k, s), data in ex.map(work, todo):
            if data:
                save(Image.open(io.BytesIO(data)), f"{k}-{s}")
                man[f"{k}-{s}"] = f"/images/covers/{k}-{s}"
                MAN.write_text(json.dumps(man, indent=0))
    print("covers total:", len(man))


if __name__ == "__main__":
    main()
