// Single source of truth for recipe / menu / note data.
// Used by Astro content collections (src/content.config.ts) and by the
// pipeline validator (pipeline/05_validate.ts, run with plain `node`).
import { z } from "astro/zod";
import taxonomy from "../../data/taxonomy.json" with { type: "json" };

const catSlugs = taxonomy.categories.map((c) => c.slug) as [string, ...string[]];
const subSlugs = taxonomy.categories.flatMap((c) => c.subs.map((s) => s.slug));
const holidaySlugs = taxonomy.holidays.map((h) => h.slug) as [string, ...string[]];
const cuisineSlugs = taxonomy.cuisines.map((c) => c.slug) as [string, ...string[]];
const dietSlugs = taxonomy.diets.map((d) => d.slug) as [string, ...string[]];

export const slugRe = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const ingredientSchema = z.object({
  qty: z.number().positive().nullable(), // numeric amount for scaling (1½ → 1.5)
  qtyMax: z.number().positive().nullable().optional(), // ranges: "2-3 ביצים"
  unit: z.string().min(1).nullable(), // normalised Hebrew unit: כוס, כף, כפית, גרם…
  item: z.string().min(1), // ingredient name
  note: z.string().nullable().optional(), // "קצוץ דק", "בטמפרטורת החדר"
  raw: z.string().min(1), // display line exactly as it should read
});

export const recipeSchema = z.object({
  slug: z.string().regex(slugRe).max(80),
  title: z.string().min(2).max(90),
  titleEn: z.string().min(2).max(120),
  description: z.string().min(10).max(320),
  category: z.enum(catSlugs),
  subcategory: z.string().nullable().refine((s) => s === null || subSlugs.includes(s), "unknown subcategory"),
  cuisine: z.enum(cuisineSlugs).nullable(),
  holidays: z.array(z.enum(holidaySlugs)).default([]),
  kashrut: z.enum(["dairy", "meat", "parve", "mixed"]).nullable(),
  diet: z.array(z.enum(dietSlugs)).default([]),
  tags: z.array(z.string()).default([]),
  servings: z.number().int().positive().max(500).nullable(),
  yield: z.string().nullable(), // "30 סופגניות קטנות"
  pan: z.string().nullable(), // "תבנית עגולה בקוטר 24 ס״מ"
  prepMin: z.number().int().nonnegative().nullable(),
  cookMin: z.number().int().nonnegative().nullable(),
  totalMin: z.number().int().positive().nullable(),
  timesEstimated: z.boolean().default(true),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  ingredients: z
    .array(z.object({ group: z.string().nullable(), items: z.array(ingredientSchema).min(1) }))
    .min(1),
  steps: z
    .array(
      z.object({
        group: z.string().nullable(),
        items: z.array(z.object({ text: z.string().min(2), timerMin: z.number().positive().nullable().optional() })).min(1),
      }),
    )
    .min(1),
  tips: z.array(z.string()).default([]),
  story: z.string().nullable().default(null), // Yehudit's own note, verbatim
  source: z.object({
    type: z.enum(["family", "friend", "restaurant", "course", "chef", "magazine", "web", "book", "brand", "unknown"]),
    credit: z.string().nullable(), // "רות סירקיס", "שלום שטרית", "אניטה"
    rewritten: z.boolean(), // method re-written in our own words
  }),
  imagePrompt: z.string().min(10).max(400), // English description of the plated dish
  alt: z.string().min(5).max(200), // Hebrew alt text for the photo
  originals: z.array(z.object({ file: z.string(), driveId: z.string() })).min(1),
});

export type Recipe = z.infer<typeof recipeSchema>;

export const noteSchema = z.object({
  slug: z.string().regex(slugRe),
  title: z.string().min(2),
  kind: z.enum(["tip", "technique", "guide", "article"]),
  summary: z.string().min(10).max(300),
  body: z.string().min(20), // markdown
  source: z.object({ type: z.string(), credit: z.string().nullable(), rewritten: z.boolean() }),
  originals: z.array(z.object({ file: z.string(), driveId: z.string() })),
});

export const menuSchema = z.object({
  slug: z.string().regex(slugRe),
  title: z.string().min(2), // "תפריט חורף 2004"
  titleEn: z.string().nullable(),
  date: z.string().nullable(), // ISO "2004-11" or "2005"
  season: z.enum(["winter", "spring", "summer", "autumn"]).nullable(),
  occasion: z.string().nullable(), // "סילבסטר", "ולנטיין", "אירוע פרטי", "תפריט טעימות"
  kind: z.enum(["a-la-carte", "tasting", "event", "holiday", "drinks", "press"]),
  language: z.enum(["he", "en", "he-en"]),
  intro: z.string().nullable(),
  sections: z
    .array(
      z.object({
        name: z.string(),
        items: z.array(
          z.object({
            name: z.string(),
            nameEn: z.string().nullable().optional(),
            desc: z.string().nullable().optional(),
            price: z.string().nullable().optional(), // keep as printed: "50 ₪"
            recipeSlug: z.string().nullable().optional(),
          }),
        ),
      }),
    )
    .default([]),
  body: z.string().nullable().optional(), // for press releases / free text
  originals: z.array(z.object({ file: z.string(), driveId: z.string() })),
});

export type Menu = z.infer<typeof menuSchema>;
export { taxonomy };
