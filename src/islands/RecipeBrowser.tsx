// Client-side catalogue browser: category rail, holiday/cuisine filters, Hebrew-aware text filter,
// A–Z / random sort, URL-synced. Full recipes open on-site; the rest open the Drive original.
import { useEffect, useMemo, useState } from "react";
import { normalize, variants, tokenize } from "../lib/hebrew";
import { getFavs, toggleFav } from "../scripts/store";
import { artSvg } from "../lib/art";
import "./browser.css";

type Row = { id: string; t: string; c: string; sc: string | null; h: string | null; cu: string | null; f: string; u: string; s: string | null; ic: string; im: 0 | 1 };
type Opt = { slug: string; he: string; count?: number };
interface Props { categories: Opt[]; cuisines: Opt[]; holidays: Opt[]; subs: Record<string, Opt[]>; total: number }

const PAGE = 60;
type F = { q: string; c: string; sc: string; h: string; cu: string; full: string; sort: string };
const EMPTY: F = { q: "", c: "", sc: "", h: "", cu: "", full: "", sort: "az" };
const read = (): F => { const p = new URLSearchParams(location.search); return Object.fromEntries(Object.keys(EMPTY).map((k) => [k, p.get(k) ?? (EMPTY as any)[k]])) as F; };
function hash(s: string, seed: number) { let h = seed; for (const c of s) h = (h * 33 + c.charCodeAt(0)) >>> 0; return h; }
const artCache = new Map<string, string>();
const art = (icon: string, seed: string) => { const k = icon + seed.length % 7; if (!artCache.has(k)) artCache.set(k, artSvg(icon, seed)); return artCache.get(k)!; };

export default function RecipeBrowser(props: Props) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [f, setF] = useState<F>(EMPTY);
  const [shown, setShown] = useState(PAGE);
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const [seed] = useState(() => Math.floor(Math.random() * 1e6));

  useEffect(() => {
    setF(read());
    setFavs(new Set(getFavs().map((x) => x.slug)));
    fetch("/recipes-index.json").then((r) => r.json()).then((d: Row[]) => {
      setRows(d);
      if (new URLSearchParams(location.search).get("surprise")) {
        const p = d[Math.floor(Math.random() * d.length)];
        if (p) { if (p.s) location.href = `/recipes/${p.s}`; else { window.open(p.u, "_blank", "noopener"); } }
      }
    });
    const on = () => setFavs(new Set(getFavs().map((x) => x.slug)));
    window.addEventListener("ym:favs", on);
    return () => window.removeEventListener("ym:favs", on);
  }, []);

  useEffect(() => {
    if (!rows) return;
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(f)) if (v && !(k === "sort" && v === "az")) p.set(k, v);
    history.replaceState(history.state, "", p.toString() ? `?${p}` : location.pathname);
    setShown(PAGE);
  }, [f, rows]);

  const hay = useMemo(() => new Map(rows?.map((r) => [r.id, normalize(`${r.t} ${r.f}`)]) ?? []), [rows]);
  const results = useMemo(() => {
    if (!rows) return [];
    const terms = tokenize(f.q).map(variants).filter((v) => v[0].length > 1);
    let out = rows.filter((r) =>
      (!f.c || r.c === f.c) && (!f.sc || r.sc === f.sc) && (!f.h || r.h === f.h) && (!f.cu || r.cu === f.cu) && (!f.full || r.s) &&
      (!terms.length || terms.every((vs) => vs.some((v) => hay.get(r.id)!.includes(v)))));
    if (f.sort === "random") out = [...out].sort((a, b) => hash(a.id, seed) - hash(b.id, seed));
    else if (f.sort === "full") out = [...out].sort((a, b) => Number(!!b.s) - Number(!!a.s));
    return out;
  }, [rows, f, hay, seed]);

  const set = (k: keyof F, v: string) => setF((x) => ({ ...x, [k]: x[k] === v && k !== "q" && k !== "sort" ? "" : v, ...(k === "c" ? { sc: "" } : {}) }));
  const subs = f.c ? props.subs[f.c] ?? [] : [];
  const nActive = ["c", "h", "cu", "full", "q"].filter((k) => (f as any)[k]).length;

  return (
    <div className="rb">
      <div className="rb-top">
        <label className="rb-search">
          <span className="visually-hidden">סינון לפי שם מתכון</span>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input className="input" type="search" value={f.q} onChange={(e) => set("q", e.target.value)} placeholder={`חיפוש בין ${props.total.toLocaleString("he-IL")} מתכונים: חציל, שקדים, עוגת גבינה…`} />
        </label>
        <div className="rb-sort">
          <label htmlFor="rb-sort">סדר</label>
          <select id="rb-sort" className="input" value={f.sort} onChange={(e) => set("sort", e.target.value)}>
            <option value="az">א–ת</option>
            <option value="full">מתכונים מלאים קודם</option>
            <option value="random">ערבוב אקראי</option>
          </select>
        </div>
      </div>

      <nav className="rb-rail" aria-label="קטגוריות">
        <button type="button" className="rb-pill" aria-pressed={!f.c} onClick={() => setF((x) => ({ ...x, c: "", sc: "" }))}>הכול</button>
        {props.categories.map((c) => (
          <button key={c.slug} type="button" className="rb-pill" aria-pressed={f.c === c.slug} onClick={() => set("c", c.slug)}>
            {c.he} <small>{c.count}</small>
          </button>
        ))}
      </nav>
      {subs.length > 0 && (
        <div className="rb-rail rb-subs" role="group" aria-label="תת-קטגוריה">
          {subs.map((s) => <button key={s.slug} type="button" className="rb-chip" aria-pressed={f.sc === s.slug} onClick={() => set("sc", s.slug)}>{s.he} <small>{s.count}</small></button>)}
        </div>
      )}

      <div className="rb-filters">
        <div className="rb-field">
          <label htmlFor="rb-h">חג ומועד</label>
          <select id="rb-h" className="input" value={f.h} onChange={(e) => set("h", e.target.value)}>
            <option value="">הכול</option>{props.holidays.map((o) => <option key={o.slug} value={o.slug}>{o.he} ({o.count})</option>)}
          </select>
        </div>
        <div className="rb-field">
          <label htmlFor="rb-cu">מטבח</label>
          <select id="rb-cu" className="input" value={f.cu} onChange={(e) => set("cu", e.target.value)}>
            <option value="">הכול</option>{props.cuisines.map((o) => <option key={o.slug} value={o.slug}>{o.he} ({o.count})</option>)}
          </select>
        </div>
        <label className="ri-switch rb-full">
          <input type="checkbox" checked={!!f.full} onChange={(e) => set("full", e.target.checked ? "1" : "")} />
          <span>רק מתכונים מלאים באתר ✦</span>
        </label>
        {nActive > 0 && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setF({ ...EMPTY, sort: f.sort })}>ניקוי</button>}
      </div>

      <p className="rb-count" role="status" aria-live="polite">
        {rows ? `${results.length.toLocaleString("he-IL")} מתכונים` : `טוען ${props.total.toLocaleString("he-IL")} מתכונים…`}
      </p>

      {rows && results.length === 0 && (
        <div className="rb-empty"><p>לא נמצאו מתכונים. נסו מילה אחרת או נקו את הסינון.</p><button type="button" className="btn" onClick={() => setF(EMPTY)}>ניקוי</button></div>
      )}

      <ul className="ecard-grid">
        {results.slice(0, shown).map((r) => (
          <li key={r.id}>
            <article className="ecard">
              <div className="ecard-art" aria-hidden="true">
                {r.im ? <img src={`/images/recipes/${r.s}-640.avif`} alt="" loading="lazy" /> : <span style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: art(r.ic, r.t) }} />}
              </div>
              <div className="ecard-body">
                <p className="ecard-cat">{r.f || props.categories.find((c) => c.slug === r.c)?.he}</p>
                <h2 className="ecard-title">
                  {r.s ? <a className="card-link" href={`/recipes/${r.s}`}>{r.t}</a>
                    : <a className="card-link" href={r.u} target="_blank" rel="noopener">{r.t}<span className="visually-hidden"> (נפתח בגוגל דרייב בחלון חדש)</span></a>}
                </h2>
                <p className="ecard-meta">{r.s ? <span className="tag-full">✦ מתכון מלא באתר</span> : <span>המחברת המקורית ↗</span>}</p>
              </div>
              <button type="button" className="icon-btn fav-btn" aria-pressed={favs.has(r.s ?? r.id)} aria-label={`שמירה במועדפים: ${r.t}`} onClick={() => toggleFav(r.s ?? r.id, r.t)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true"><path d="M12 20s-7-4.4-9.2-9A5 5 0 0 1 12 6a5 5 0 0 1 9.2 5C19 15.6 12 20 12 20Z" /></svg>
              </button>
            </article>
          </li>
        ))}
      </ul>
      {rows && shown < results.length && (
        <div className="rb-more"><button type="button" className="btn" onClick={() => setShown((s) => s + PAGE)}>עוד מתכונים ({(results.length - shown).toLocaleString("he-IL")} נותרו)</button></div>
      )}
    </div>
  );
}
