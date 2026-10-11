# Brief: digitising the menus of "מיכאלי – מטבח כפרי" (Rishpon)

These are Word documents from the archive of chef **Yehudit Michaeli**'s French country restaurant
in Rishpon, Israel (c. 2002–2009): seasonal à-la-carte menus, tasting menus, holiday and event
menus, English menus, drinks lists and a press release. They will become an elegant public
"menu archive" on her memorial website.

Project root: `/Users/michaeli/yehudit-michaeli`. Read `src/lib/schema.ts` (`menuSchema`) first.

## Output
Write one JSON file per menu to `data/menus/<slug>.json` with the Write tool, then validate:
`node --no-warnings pipeline/05_validate.ts data/menus/<slug>.json …`. Fix every error until all
pass.

## Rules
- `slug`: ASCII kebab-case, descriptive. Examples: `menu-winter-2004`, `tasting-menu-nov-2005`,
  `valentines-2006`, `silvester-2007-en`, `press-release-2004-11`. Append `-2` etc. if a file
  already exists.
- `title`: a clean Hebrew title, e.g. "תפריט החורף · נובמבר 2004", "תפריט טעימות · נובמבר–דצמבר
  2005", "ערב ולנטיין 2006".
- `titleEn`: an English title when useful.
- `date`: ISO year or year-month (`2004-11`) from the file name or text, else null. `season`
  where obvious.
- `kind`: one of a-la-carte, tasting, event, holiday, drinks, press.
- `language`: he, en or he-en.
- `sections`: keep the original course structure: ראשונות / עיקריות / קינוחים / Starters…
  - Each item has `name`, plus optional `nameEn`, `desc` and `price`. Keep prices exactly as
    printed ("50 ₪", "£7.50").
  - `recipeSlug` stays null; linking happens later.
- `intro`: a short line if the menu has one. `body` is free text for press releases.

## Privacy (strict)
- Many event menus were prepared for **private clients**: individuals, families and companies.
  Never put a private person's name in any field. Replace it with a neutral description: "תפריט
  לאירוע פרטי", "ארוחה משפחתית", "אירוע חברה".
- Company and organisation names are also removed ("אירוע חברה", "ארוחה עסקית").
- Remove phone numbers, addresses, fax lines, emails, prices per guest that reveal a deal, and
  any internal notes about a client.
- Keep the **restaurant's own** name and public info (מיכאלי – מטבח כפרי, רשפון).

## Skip
- Documents that are not menus: logo drafts, templates, empty docs, internal lists.
- Menus from **other restaurants** (e.g. a London Marco Pierre White menu kept as inspiration).
  Skip these, but mention them in your report, since they can be referenced as "inspiration"
  without copying.
- Near-duplicates (the same menu saved twice). Keep the most complete one.

## Finish
Reply with a short report:
- menus written
- menus skipped, with reasons
- any interesting facts for the restaurant's story page (years active, signature dishes,
  events, press quotes)
Do not paste the JSON in your reply.
