// Menu helpers: link menu items to recipes, and derive restaurant statistics.
import type { Menu } from "./schema";
import type { Recipe } from "./data";
import { normalize, tokenize } from "./hebrew";

const STOP = new Set(["עם", "של", "ב", "על", "מצע", "רוטב", "ברוטב", "מוגש", "מוגשת", "בנוסח", "א-לה", "לה", "ו", "או"]);
const toks = (s: string) => new Set(tokenize(normalize(s)).filter((t) => t.length > 1 && !STOP.has(t)));

/** Best recipe for a menu item name (token overlap), or null. */
export function matchRecipe(name: string, recipes: Recipe[], index?: Map<string, Set<string>>): Recipe | null {
  const a = toks(name);
  if (a.size === 0) return null;
  let best: Recipe | null = null;
  let bestScore = 0;
  for (const r of recipes) {
    const b = index?.get(r.slug) ?? toks(`${r.title} ${r.titleEn}`);
    let inter = 0;
    for (const t of a) if (b.has(t)) inter++;
    const score = inter / Math.min(a.size, b.size || 1);
    if (inter >= 1 && score > bestScore && (inter >= 2 || a.size === 1 || score >= 0.99)) {
      best = r;
      bestScore = score;
    }
  }
  return bestScore >= 0.66 ? best : null;
}

export function buildTitleIndex(recipes: Recipe[]) {
  return new Map(recipes.map((r) => [r.slug, toks(`${r.title} ${r.titleEn}`)]));
}

/** How often each dish appears across menus (Hebrew menus, food sections only). */
export function dishFrequency(menus: Menu[]) {
  const counts = new Map<string, { name: string; n: number; years: Set<string>; prices: string[] }>();
  for (const m of menus) {
    if (m.kind === "drinks" || m.kind === "press") continue;
    for (const s of m.sections)
      for (const it of s.items) {
        const key = normalize(it.name).replace(/\s+/g, " ").trim();
        if (key.length < 3) continue;
        const e = counts.get(key) ?? { name: it.name, n: 0, years: new Set<string>(), prices: [] };
        e.n++;
        if (m.date) e.years.add(m.date.slice(0, 4));
        if (it.price) e.prices.push(`${it.price}${m.date ? ` (${m.date.slice(0, 4)})` : ""}`);
        counts.set(key, e);
      }
  }
  return [...counts.values()].sort((a, b) => b.n - a.n);
}

export const kindLabel: Record<string, string> = {
  "a-la-carte": "תפריט עונתי",
  tasting: "תפריט טעימות",
  event: "אירוע",
  holiday: "חג ומועד",
  drinks: "משקאות",
  press: "הודעה לעיתונות",
};
