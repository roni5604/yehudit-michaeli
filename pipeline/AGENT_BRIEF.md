# Brief: structuring Yehudit Michaeli's recipe archive

You are converting raw recipe documents from the private archive of **chef Yehudit Michaeli**
(French country-kitchen restaurant "מיכאלי – מטבח כפרי", Rishpon, Israel) into clean,
structured JSON for her memorial recipe website. Hebrew is the site language. Quality,
faithfulness and warmth matter more than speed.

Project root: `/Users/michaeli/yehudit-michaeli`. Read these files first:
- `src/lib/schema.ts`: the exact zod schema (authoritative)
- `data/taxonomy.json`: allowed category / subcategory / cuisine / holiday / diet slugs
- `pipeline/examples/paprikash-off.json`: a perfect reference output. Match its style.

## Input
Your batch file (path given in your task) contains `### CLUSTER cNNNN` blocks. Each cluster contains
one or more documents (`--- doc k | file | folder | driveId`). Documents in one cluster are usually
**versions of the same recipe**. Text is raw extraction from Word, so expect noise.
`[IMAGE — open it with the Read tool: …]` means the recipe is a photo: open and transcribe it.

## Output, per recipe
Write **one file per recipe** to `data/recipes/<slug>.json` with the Write tool. JSON must satisfy
`recipeSchema` exactly; every field is required and should be `null` or `[]` when unknown.
After writing all files of the batch, run
`node --no-warnings pipeline/05_validate.ts data/recipes/<slug1>.json data/recipes/<slug2>.json …`
and fix every error until all pass.

Before writing, check if `data/recipes/<slug>.json` already exists (`ls`). If it does, another
batch already produced that slug. Append a distinguishing suffix (e.g. `-2`, or better a word
such as `-im-tapuzim`). Never overwrite another file.

Non-recipe documents with useful kitchen knowledge (storage tips, techniques, guides, course
notes on theory) go to `data/notes/<slug>.json` per `noteSchema`, with a markdown `body`. Use this
sparingly. Skip entirely: empty, garbled or non-food documents, shopping lists, personal
correspondence, anything with personal data (phone numbers, addresses, IDs, emails, full names
of private people).

## Cluster rules
- **Duplicates:** if the docs are the same recipe, produce **one** recipe from the most complete
  version. Mention meaningful variations from the other versions in `tips` (e.g. "בגרסה אחרת:
  מוסיפים 100 גרם שוקולד צ׳יפס"). List **all** docs of the cluster in `originals`.
- **Different recipes that share a name** (two unrelated "עוגת שוקולד"): produce separate recipes
  and give each a distinguishing title ("עוגת שוקולד בחושה", "עוגת שוקולד ללא קמח").
- **One doc with several recipes** (collections, "אוסף מרקי חורף", course notes): split it into
  separate recipes. Every one of them lists that doc in `originals`.

## Field guidance
- `slug`: ASCII kebab-case **transliteration** of the Hebrew title, ≤ 60 chars, no "matkon".
  Examples: `ugat-gvina-afuya`, `paprikash-off`, `tarte-tatin`, `marak-agvaniyot-kalui`.
  For French or international dish names use the familiar Latin spelling (`bourguignon`,
  `creme-brulee`, `bouillabaisse`).
- `title`: clean Hebrew dish name, Title-free of noise ("מתכון ל…", "המושלם", "!!!").
  - Keep warm family attributions: "העוגה של אניטה", "הקציצות של אמא".
  - **Move chef, brand and site names out of the title into `source.credit`**: "בויאבז של שטרית"
    becomes the title "בויאבז מרסיי" with credit "שלום שטרית".
- `titleEn`: natural English dish name.
- `description`: 1–2 warm, appetising Hebrew sentences that you write fresh. No hype or emojis,
  and do not invent facts.
- `category` / `subcategory`: start from the document's folder using the taxonomy's `folders`
  mapping. Root-level files ("(ללא תיקייה)") and holiday folders: choose by dish type.
  Cake sub-types: tarts, pies and galettes → `tarts`; yeasted cakes and babkas → `yeast-cakes`.
- `holidays`: from holiday folders, plus obvious cases (סופגניות/לביבות → hanukkah,
  אוזני המן → purim, כשר לפסח/מצות → passover, cheesecakes and dairy blintzes → shavuot,
  honey and apple dishes for the new year → rosh-hashana, חמין/חלה → shabbat).
- `cuisine`: from ethnic folders. Classic French dishes get `french` (bourguignon, confit,
  quiche lorraine, tarte tatin, crème brûlée, bouillabaisse, gratin, soufflé, crêpes…). `null`
  if unclear. Do not tag everything.
- `kashrut`: dairy (butter, milk, cream, cheese), meat (meat or poultry), parve (neither),
  mixed (meat + dairy together). Fish with dairy counts as `dairy`. `null` only if truly
  impossible to tell.
- `diet`: only when certain. `vegetarian` means no meat, poultry or fish. `vegan` also means no
  dairy, eggs or honey. `gluten-free` only if no flour, bread or pasta and the recipe is clearly
  GF. `kosher-for-passover` only if stated or obviously made for Passover.
- `servings` / `yield` / `pan`: from the text. `servings` is an integer number of people.
  `yield` covers counts like "30 עוגיות". `pan` is the pan or tin size.
- Times (minutes): take them from the text when given, otherwise estimate realistically and
  set `timesEstimated: true`. `totalMin` includes resting, rising and chilling.
- `difficulty`: 1 easy, 2 medium, 3 challenging (laminated dough, multi-component patisserie…).
- **Ingredients**
  - Use groups as in the original ("לבצק", "למילוי", "לרוטב"), with `group: null` for the
    main or only group.
  - Parse `qty` as a number: "1/2 1" and "11/2" (RTL artifacts) mean 1.5; "½" means 0.5;
    "¾" means 0.75; "1/4 1" means 1.25; "2-3" means qty 2, qtyMax 3.
  - "קורט", "לפי הטעם", "מעט" get `qty: null`.
  - Normalise units to Hebrew: כוס/כוסות, כף/כפות, כפית/כפיות, גרם, ק״ג, מ״ל, ליטר, יחידה (or
    null for countable items), גביע/גביעים, חבילה, שקית, צרור, שן/שיני, קורט, פרוסה, ענף.
    Write "גר'" as "גרם".
  - `raw` is the clean display line in natural Hebrew, with fractions written as ½ ¼ ¾ ⅓ ⅔
    ("1½ כוסות קמח").
- **Steps**
  - Split long paragraphs into clear single actions.
  - Group with headings when the original has stages ("הכנת הסירופ", "הרכבה").
  - `timerMin` goes on steps that contain an explicit wait or bake time ("אופים 40 דקות" → 40;
    "שעה" → 60; for ranges use the lower bound).
- `tips`: serving suggestions, storage, variations, chef's secrets found in the text.
- `story`: **only** a personal note that is clearly Yehudit's own voice (a memory, who taught
  her, when she served it). Keep it verbatim. Otherwise null. Never invent stories.
- `tags`: 0–5 short Hebrew tags (e.g. "אירוח", "מהיר", "ילדים", "שבת", "קלאסיקה צרפתית",
  "מנת מסעדה").
- `imagePrompt`: English. Describe the finished, plated dish as it would really look: main
  components, colour, texture, vessel, garnish. One or two sentences. No people, hands or text.
  Do not describe lighting or style; a global art direction is added later.
- `alt`: Hebrew alt text describing the photo (what is on the plate), ≤ 200 chars.
- `originals`: `[{file, driveId}]` for every source doc used.

## Sources and copyright (important, legally required)
Set `source`:
- `family`: written by Yehudit, family recipes, no outside attribution. This is the default
  when nothing indicates otherwise.
- `friend`: a first name of a friend or relative ("של אניטה", "המתכון של רחל"). Credit uses
  the first name only.
- `restaurant`: dishes clearly from the Michaeli restaurant menu or kitchen notes.
- `course`: Tadmor cooking/pastry course material ("קורס בישול וקונדיטוריה תדמור").
- `chef` (a named professional chef), `magazine` ("הודפס מתוך…", "מגזין", "4MainMag",
  "רות סירקיס"), `web` (URLs, "מתוך האתר", forum or blog posts, mako, ynet, SEO-style copy such
  as "מה צריך בשביל…? איך מכינים…?"), `book` (a named cookbook), `brand` (a company such as
  שמרית or תלמה).
- `credit`: the name as people know it ("רות סירקיס", "שלום שטרית", "מיקי ניר", "חברת שמרית",
  "mako אוכל"). `null` if unknown.

**For `chef`, `magazine`, `web`, `book` and `brand`:**
- Keep the ingredient list.
- **Rewrite every step completely in your own words**: same technique and quantities, new
  phrasing and sentence structure, clearer and concise.
- Do not copy the source's intro, stories or jokes.
- Set `rewritten: true`.
- Remove copyright notices, "הודפס מתוך", page numbers and URLs from the text fields.

**For `family`, `friend`, `restaurant` and `course`:** keep Yehudit's wording. Only fix
obvious typos, broken line wraps and formatting, and set `rewritten: false`. Her voice is the
heart of this site.

## Hebrew style
Natural modern Hebrew, without niqqud. Use the recipe voice of the original (usually
present-plural: "מערבבים", "אופים"). Use Hebrew gershayim (״) and geresh (׳) in abbreviations:
ק״ג, מ״ל, צ׳יפס. Keep French and Italian dish names recognisable (בורגיניון, טארט טאטן).

## Finish
When done, reply with a short report:
- recipes written (count)
- notes written
- clusters skipped, with reasons
- any doubts
Do not paste the JSON in your reply.
