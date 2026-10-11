// Hebrew-aware text normalisation for search.
const NIQQUD = /[֑-ׇ]/g;
const FINALS: Record<string, string> = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" };
const PREFIX = new Set(["ו", "ה", "ב", "ל", "מ", "ש", "כ"]);

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(NIQQUD, "")
    .replace(/[״"׳'`]/g, "")
    .replace(/[ךםןףץ]/g, (c) => FINALS[c]);
}

/** A token plus its prefix-stripped variants: "והקמח" → ["והקמח", "הקמח", "קמח"]. */
export function variants(token: string): string[] {
  const t = normalize(token);
  const out = [t];
  if (/^[א-ת]+$/.test(t)) {
    if (t.length >= 4 && PREFIX.has(t[0])) out.push(t.slice(1));
    if (t.length >= 5 && PREFIX.has(t[0]) && PREFIX.has(t[1])) out.push(t.slice(2));
    if (t.length >= 6 && PREFIX.has(t[0]) && PREFIX.has(t[1]) && PREFIX.has(t[2])) out.push(t.slice(3));
  }
  return out;
}

export const tokenize = (s: string) => s.split(/[\s,.;:!?()[\]{}"׳״\-–—/\\|+*&]+/u).filter(Boolean);
