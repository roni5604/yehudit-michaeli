// Build-time data access: recipes, menus, notes + derived indexes.
import { getCollection, type CollectionEntry } from "astro:content";
import { thumbHashToDataURL } from "thumbhash";
import images from "../../data/images.json" with { type: "json" };
import { catBySlug, subBySlug, holidayBySlug, cuisineBySlug, kashrutMap } from "./site";
import { normalize } from "./hebrew";

export type RecipeEntry = CollectionEntry<"recipes">;
export type Recipe = RecipeEntry["data"];

const collator = new Intl.Collator("he");
let _recipes: Recipe[] | null = null;

export async function getRecipes(): Promise<Recipe[]> {
  if (_recipes) return _recipes;
  const all = await getCollection("recipes");
  _recipes = all.map((e) => e.data).sort((a, b) => collator.compare(a.title, b.title));
  return _recipes;
}

export async function getMenus() {
  const all = await getCollection("menus");
  return all.map((e) => e.data).sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999"));
}

export async function getNotes() {
  const all = await getCollection("notes");
  return all.map((e) => e.data).sort((a, b) => collator.compare(a.title, b.title));
}

// ───────────── images ─────────────
type ImgMeta = { w: number; h: number; hash: string; featured?: boolean };
const imgs = images as Record<string, ImgMeta>;
const placeholderCache = new Map<string, string>();

export function imageFor(slug: string) {
  const m = imgs[slug];
  if (!m) return null;
  let ph = placeholderCache.get(slug);
  if (!ph) {
    try {
      ph = thumbHashToDataURL(Uint8Array.from(atob(m.hash), (c) => c.charCodeAt(0)));
    } catch {
      ph = "";
    }
    placeholderCache.set(slug, ph);
  }
  return {
    src640: `/images/recipes/${slug}-640.avif`,
    src1280: `/images/recipes/${slug}-1280.avif`,
    og: `/images/og/${slug}.jpg`,
    w: m.w,
    h: m.h,
    placeholder: ph,
  };
}

// ───────────── labels ─────────────
export const categoryLabel = (r: Recipe) => catBySlug[r.category]?.he ?? r.category;
export const subLabel = (r: Recipe) => (r.subcategory ? subBySlug[r.subcategory]?.he ?? null : null);
export const holidayLabel = (s: string) => holidayBySlug[s]?.he ?? s;
export const cuisineLabel = (s: string | null) => (s ? cuisineBySlug[s]?.he ?? s : null);
export const kashrutLabel = (k: string | null) => (k ? kashrutMap[k] : null);

// ───────────── related recipes ─────────────
const STOP = new Set(["מלח", "פלפל", "שמן", "מים", "סוכר", "קמח", "ביצים", "ביצה", "שמן זית", "פלפל שחור", "חמאה", "אבקת אפייה"]);
function keyIngredients(r: Recipe): Set<string> {
  const s = new Set<string>();
  for (const g of r.ingredients)
    for (const it of g.items) {
      const k = normalize(it.item).split(" ").slice(0, 2).join(" ");
      if (k && !STOP.has(it.item.trim())) s.add(k);
    }
  return s;
}
const ingCache = new Map<string, Set<string>>();

export function related(r: Recipe, all: Recipe[], n = 6): Recipe[] {
  const mine = ingCache.get(r.slug) ?? keyIngredients(r);
  ingCache.set(r.slug, mine);
  const scored: [number, Recipe][] = [];
  for (const o of all) {
    if (o.slug === r.slug) continue;
    let s = 0;
    if (o.category === r.category) s += 3;
    if (o.subcategory && o.subcategory === r.subcategory) s += 3;
    if (o.cuisine && o.cuisine === r.cuisine) s += 2;
    for (const h of o.holidays) if (r.holidays.includes(h)) s += 1.5;
    if (s < 3) continue; // cheap pre-filter
    let theirs = ingCache.get(o.slug);
    if (!theirs) { theirs = keyIngredients(o); ingCache.set(o.slug, theirs); }
    let shared = 0;
    for (const k of theirs) if (mine.has(k)) shared++;
    s += Math.min(shared, 5) * 1.2;
    if (imgs[o.slug]) s += 0.5;
    scored.push([s, o]);
  }
  return scored.sort((a, b) => b[0] - a[0]).slice(0, n).map(([, o]) => o);
}

// ───────────── grouping ─────────────
export function countBy<T extends string>(rs: Recipe[], key: (r: Recipe) => T | T[] | null | undefined) {
  const m = new Map<T, number>();
  for (const r of rs) {
    const k = key(r);
    for (const v of Array.isArray(k) ? k : k ? [k] : []) m.set(v, (m.get(v) ?? 0) + 1);
  }
  return m;
}

/** Deterministic "pick of the day" so the home page rotates without JS. */
export function pickDaily<T>(arr: T[], n: number, salt = 0): T[] {
  if (!arr.length) return [];
  const day = Math.floor(Date.now() / 86_400_000) + salt;
  const out: T[] = [];
  const used = new Set<number>();
  let x = day;
  while (out.length < Math.min(n, arr.length)) {
    x = (x * 1103515245 + 12345) % 2147483648;
    const i = x % arr.length;
    if (!used.has(i)) { used.add(i); out.push(arr[i]); }
  }
  return out;
}

// ───────────── full catalogue (Drive file names only) ─────────────
import catalogRaw from "../../data/catalog.json" with { type: "json" };
export type Entry = { id: string; t: string; c: string; sc: string | null; h: string | null; cu: string | null; f: string; u: string; v: string[]; s: string | null };
export const catalog = catalogRaw as Entry[];
export const entryHref = (e: Entry) => (e.s ? `/recipes/${e.s}` : e.u);
