// Quantity formatting & approximate volume→weight conversion for Hebrew recipes.

const FRACS: [number, string][] = [
  [0, ""], [1 / 8, "⅛"], [1 / 4, "¼"], [1 / 3, "⅓"], [1 / 2, "½"], [2 / 3, "⅔"], [3 / 4, "¾"], [7 / 8, "⅞"], [1, ""],
];

export function formatQty(n: number, unit?: string | null): string {
  if (!isFinite(n) || n <= 0) return "";
  const metric = unit && /גרם|מ״ל|מ"ל|ml|g\b/.test(unit);
  if (metric) {
    const step = n >= 500 ? 25 : n >= 100 ? 10 : n >= 20 ? 5 : 1;
    return String(Math.max(step, Math.round(n / step) * step));
  }
  if (n >= 10) return String(Math.round(n));
  let whole = Math.floor(n);
  const rest = n - whole;
  let best = FRACS[0];
  for (const f of FRACS) if (Math.abs(f[0] - rest) < Math.abs(best[0] - rest)) best = f;
  if (best[0] === 1) { whole += 1; best = FRACS[0]; }
  if (!whole) return best[1] || "קורט";
  return `${whole}${best[1]}`;
}

const PLURAL: Record<string, string> = {
  כוס: "כוסות", כף: "כפות", כפית: "כפיות", גביע: "גביעים", חבילה: "חבילות", שקית: "שקיות",
  צרור: "צרורות", שן: "שיני", פרוסה: "פרוסות", ענף: "ענפים", יחידה: "יחידות", קופסה: "קופסאות",
  פחית: "פחיות", מקל: "מקלות", עלה: "עלים", קורט: "קורט", חופן: "חופנים", בקבוק: "בקבוקים",
};
const SINGULAR = Object.fromEntries(Object.entries(PLURAL).map(([s, p]) => [p, s]));

export function unitFor(unit: string | null, qty: number): string {
  if (!unit) return "";
  if (qty > 1) return PLURAL[unit] ?? unit;
  if (qty <= 1) return SINGULAR[unit] ?? unit;
  return unit;
}

// grams per cup (≈240 ml) for common ingredients — approximations for convenience.
const CUP_GRAMS: [RegExp, number][] = [
  [/קמח (תירס|אורז)/, 130], [/קמח/, 140], [/אבקת סוכר/, 120], [/סוכר חום|סוכר דמררה/, 200], [/סוכר/, 200],
  [/חמאה|מרגרינה/, 225], [/שמן/, 220], [/חלב|מים|מיץ|יין|שמנת|ציר|מרק|יוגורט|לבן|רוטב/, 240],
  [/אורז/, 200], [/סולת/, 170], [/קקאו/, 100], [/שיבולת שועל|קוואקר/, 90], [/פירורי לחם|פרורי לחם/, 110],
  [/שקדים טחונים|אגוזים טחונים|קוקוס/, 95], [/אגוז|שקד|פקאן|לוז|פיסטוק/, 120], [/דבש|סילאן|סירופ/, 340],
  [/צימוקים/, 150], [/קורנפלור|עמילן/, 130], [/גבינה לבנה|ריקוטה|קוטג/, 240], [/גבינה מגורדת|פרמזן/, 100],
  [/פרג/, 140], [/עדשים|גרגירי חומוס|שעועית/, 190], [/קינואה|בורגול|כוסמת|פתיתים/, 180], [/שוקולד צ'יפס|שוקולד צ׳יפס/, 170],
];

export function toGrams(qty: number, unit: string | null, item: string): number | null {
  if (!unit) return null;
  let cups: number | null = null;
  if (/^כוס/.test(unit)) cups = qty;
  else if (/^כפית|^כפיות/.test(unit)) cups = qty / 48;
  else if (/^כף|^כפות/.test(unit)) cups = qty / 16;
  if (cups === null) return null;
  for (const [re, g] of CUP_GRAMS) if (re.test(item)) return cups * g;
  return null;
}

/** "40 דקות" / "שעה" / "שעתיים" detection — returns minutes or null */
export function detectMinutes(text: string): number | null {
  const m = text.match(/(\d+(?:[.,]\d+)?)\s*(?:-|עד)?\s*\d*\s*(דקות|דק׳|דק'|דקה|שעות|שעה)/);
  if (m) {
    const n = parseFloat(m[1].replace(",", "."));
    return /שע/.test(m[2]) ? Math.round(n * 60) : Math.round(n);
  }
  if (/שעתיים/.test(text)) return 120;
  if (/חצי שעה/.test(text)) return 30;
  if (/רבע שעה/.test(text)) return 15;
  return null;
}
