// Site-wide constants and helpers.
import taxonomy from "../../data/taxonomy.json" with { type: "json" };

export const SITE = {
  name: "יהודית מיכאלי · שפית",
  shortName: "יהודית מיכאלי",
  tagline: "המטבח הכפרי-צרפתי של מסעדת מיכאלי, רשפון",
  description:
    "ארכיון המתכונים של השפית יהודית מיכאלי ממסעדת ״מיכאלי – מטבח כפרי״ ברשפון: אלפי מתכונים מסודרים, תפריטי המסעדה, וסיפור של מטבח כפרי-צרפתי.",
  url: "https://yehudit-michaeli.vercel.app",
  locale: "he_IL",
  // Contact for accessibility & privacy requests (Israeli reg. 35 / Privacy Protection Law).
  contactName: "רוני מיכאלי",
  contactEmail: "ronimichaeli.work@gmail.com",
  accessibilityReviewed: "2026-10-11",
  policyUpdated: "2026-10-11",
  repo: "https://github.com/roni5604/yehudit-michaeli",
};

export const NAV = [
  { href: "/recipes", label: "כל המתכונים" },
  { href: "/categories", label: "קטגוריות" },
  { href: "/restaurant", label: "המסעדה" },
  { href: "/menus", label: "תפריטים" },
  { href: "/kitchen", label: "מחברת המטבח" },
  { href: "/about", label: "על יהודית" },
];

export const LEGAL = [
  { href: "/accessibility", label: "הצהרת נגישות" },
  { href: "/privacy", label: "מדיניות פרטיות" },
  { href: "/cookies", label: "מדיניות עוגיות" },
  { href: "/terms", label: "תנאי שימוש" },
  { href: "/credits", label: "קרדיטים וזכויות" },
];

export const categories = taxonomy.categories;
export const holidays = taxonomy.holidays;
export const cuisines = taxonomy.cuisines;
export const diets = taxonomy.diets;
export const kashrutMap = Object.fromEntries(taxonomy.kashrut.map((k) => [k.slug, k.he])) as Record<string, string>;

export const catBySlug = Object.fromEntries(categories.map((c) => [c.slug, c]));
export const subBySlug = Object.fromEntries(categories.flatMap((c) => c.subs.map((s) => [s.slug, { ...s, parent: c.slug }])));
export const holidayBySlug = Object.fromEntries(holidays.map((h) => [h.slug, h]));
export const cuisineBySlug = Object.fromEntries(cuisines.map((c) => [c.slug, c]));
export const dietBySlug = Object.fromEntries(diets.map((d) => [d.slug, d]));

export const difficultyLabel = { 1: "קל", 2: "בינוני", 3: "מאתגר" } as const;

export function formatMinutes(min: number | null | undefined): string | null {
  if (!min) return null;
  if (min < 60) return `${min} דק׳`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  const hs = h === 1 ? "שעה" : h === 2 ? "שעתיים" : `${h} שעות`;
  return m ? `${hs} ו-${m} דק׳` : hs;
}

/** ISO 8601 duration for JSON-LD */
export function isoDuration(min: number | null | undefined): string | undefined {
  if (!min) return undefined;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `PT${h ? `${h}H` : ""}${m ? `${m}M` : ""}` || undefined;
}

export const recipeUrl = (slug: string) => `/recipes/${slug}`;
export const recipeImage = (slug: string, w: 640 | 1280 = 640) => `/images/recipes/${slug}-${w}.avif`;
