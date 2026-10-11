// Recipe body: ingredients (scaling, gram conversion, checklist), steps (progress,
// timers) and a full-screen cook mode that keeps the screen awake.
// Server-rendered by Astro for SEO / no-JS, hydrated on idle.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatQty, unitFor, toGrams } from "../lib/quantities";
import { addToList } from "../scripts/store";
import "./recipe.css";

type Ing = { qty: number | null; qtyMax?: number | null; unit: string | null; item: string; note?: string | null; raw: string };
type Group<T> = { group: string | null; items: T[] };
type Step = { text: string; timerMin?: number | null };

interface Props {
  slug: string;
  title: string;
  servings: number | null;
  yieldText: string | null;
  ingredients: Group<Ing>[];
  steps: Group<Step>[];
}

const announce = (msg: string) => {
  const el = document.getElementById("recipe-live");
  if (el) { el.textContent = ""; requestAnimationFrame(() => (el.textContent = msg)); }
};

function line(i: Ing, f: number, grams: boolean): { main: string; extra?: string } {
  if (f === 1 && !grams) return { main: i.raw };
  if (i.qty == null) return { main: i.raw };
  const q = i.qty * f;
  const qMax = i.qtyMax ? i.qtyMax * f : null;
  const unit = unitFor(i.unit, qMax ?? q);
  const main = f === 1
    ? i.raw
    : `${formatQty(q, i.unit)}${qMax ? `–${formatQty(qMax, i.unit)}` : ""} ${unit} ${i.item}${i.note ? `, ${i.note}` : ""}`.replace(/\s+/g, " ").trim();
  if (!grams) return { main };
  const g = toGrams(q, i.unit, i.item);
  return { main, extra: g ? `≈ ${formatQty(g, "גרם")} גרם` : undefined };
}

// ───────────── timers ─────────────
type Timer = { id: number; label: string; total: number; left: number; running: boolean };
function beep() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.35, 0.7].forEach((t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.28);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.3);
    });
    navigator.vibrate?.([200, 100, 200]);
  } catch { /* audio unavailable */ }
}
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export default function RecipeInteractive({ slug, title, servings, yieldText, ingredients, steps }: Props) {
  const base = servings ?? 1;
  const [count, setCount] = useState(base);
  const [grams, setGrams] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [done, setDone] = useState<Set<string>>(new Set());
  const [timers, setTimers] = useState<Timer[]>([]);
  const [cook, setCook] = useState(false);
  const f = count / base;

  // tick timers
  useEffect(() => {
    if (!timers.some((t) => t.running)) return;
    const h = setInterval(() => {
      setTimers((ts) =>
        ts.map((t) => {
          if (!t.running) return t;
          const left = t.left - 1;
          if (left <= 0) { beep(); announce(`הטיימר הסתיים: ${t.label}`); return { ...t, left: 0, running: false }; }
          return { ...t, left };
        }),
      );
    }, 1000);
    return () => clearInterval(h);
  }, [timers]);

  const startTimer = useCallback((min: number, label: string) => {
    setTimers((ts) => [...ts, { id: Date.now(), label, total: min * 60, left: min * 60, running: true }]);
    announce(`טיימר של ${min} דקות הופעל`);
  }, []);

  const flatSteps = useMemo(() => steps.flatMap((g, gi) => g.items.map((s, si) => ({ ...s, key: `${gi}-${si}`, group: si === 0 ? g.group : null }))), [steps]);

  const addAll = () => {
    const lines = ingredients.flatMap((g) => g.items.map((i) => line(i, f, false).main));
    addToList(lines, slug, title);
    announce("המצרכים נוספו לרשימת הקניות");
    const b = document.getElementById("add-list-done");
    if (b) { b.hidden = false; setTimeout(() => (b.hidden = true), 4000); }
  };

  let stepNo = 0;
  return (
    <div className="ri-wrap">
      <div id="recipe-live" className="visually-hidden" role="status" aria-live="polite" />

      <section className="ri-ingredients" aria-labelledby="ing-title">
        <div className="ri-sticky">
          <h2 id="ing-title" className="ri-h2">מצרכים</h2>
          <div className="ri-controls">
            {servings ? (
              <div className="ri-scaler" role="group" aria-label="כמות מנות">
                <button type="button" className="icon-btn" onClick={() => setCount((c) => Math.max(1, c - 1))} aria-label="פחות מנות" disabled={count <= 1}>−</button>
                <output aria-live="polite"><strong>{count}</strong> מנות</output>
                <button type="button" className="icon-btn" onClick={() => setCount((c) => Math.min(base * 8, c + 1))} aria-label="יותר מנות">+</button>
              </div>
            ) : (
              <div className="ri-scaler" role="group" aria-label="הכפלת כמויות">
                {[0.5, 1, 2, 3].map((m) => (
                  <button key={m} type="button" className="ri-mult" aria-pressed={count === m} onClick={() => setCount(m)}>
                    {m === 0.5 ? "½×" : `${m}×`}
                  </button>
                ))}
              </div>
            )}
            <label className="ri-switch">
              <input type="checkbox" checked={grams} onChange={(e) => setGrams(e.target.checked)} />
              <span>הצגת משקל משוער בגרמים</span>
            </label>
          </div>
          {yieldText && <p className="ri-yield">כמות: {f === 1 ? yieldText : `${yieldText} (×${formatQty(f)})`}</p>}

          {ingredients.map((g, gi) => (
            <div className="ri-group" key={gi}>
              {g.group && <h3 className="ri-h3">{g.group}</h3>}
              <ul className="ri-ing-list">
                {g.items.map((it, ii) => {
                  const k = `${gi}-${ii}`;
                  const l = line(it, f, grams);
                  const on = checked.has(k);
                  return (
                    <li key={k} className={on ? "is-checked" : undefined}>
                      <label>
                        <input
                          type="checkbox" className="checkbox" checked={on}
                          onChange={() => setChecked((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; })}
                        />
                        <span className="ri-ing-text">{l.main}{l.extra && <small className="ri-g"> ({l.extra})</small>}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          <div className="ri-ing-actions no-print">
            <button type="button" className="btn btn-ghost btn-sm" onClick={addAll}>הוספה לרשימת הקניות</button>
            <span id="add-list-done" className="ri-ok" hidden>✓ נוסף. <a href="/shopping-list">לרשימה</a></span>
          </div>
        </div>
      </section>

      <section className="ri-steps" aria-labelledby="steps-title">
        <div className="ri-steps-head">
          <h2 id="steps-title" className="ri-h2">אופן ההכנה</h2>
          <button type="button" className="btn btn-sm no-print" onClick={() => setCook(true)}>מצב בישול ⤢</button>
        </div>
        {steps.map((g, gi) => (
          <div className="ri-group" key={gi}>
            {g.group && <h3 className="ri-h3">{g.group}</h3>}
            <ol className="ri-step-list" start={stepNo + 1}>
              {g.items.map((s, si) => {
                stepNo++;
                const k = `${gi}-${si}`;
                const isDone = done.has(k);
                return (
                  <li key={k} className={isDone ? "is-done" : undefined}>
                    <button
                      type="button" className="ri-step-num" aria-pressed={isDone}
                      aria-label={`שלב ${stepNo}: ${isDone ? "בוצע, לחיצה לביטול" : "סימון כבוצע"}`}
                      onClick={() => setDone((d) => { const n = new Set(d); n.has(k) ? n.delete(k) : n.add(k); return n; })}
                    >{isDone ? "✓" : stepNo}</button>
                    <div className="ri-step-body">
                      <p>{s.text}</p>
                      {s.timerMin ? (
                        <button type="button" className="ri-timer-btn no-print" onClick={() => startTimer(s.timerMin!, `שלב ${stepNo}`)}>
                          ⏱ טיימר {s.timerMin} דק׳
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </section>

      {timers.length > 0 && (
        <aside className="ri-timers no-print" aria-label="טיימרים פעילים">
          {timers.map((t) => (
            <div key={t.id} className={`ri-timer ${t.left === 0 ? "is-over" : ""}`}>
              <span className="ri-timer-label">{t.label}</span>
              <span className="ri-timer-time" aria-label={`נותרו ${mmss(t.left)}`}>{t.left === 0 ? "הסתיים!" : mmss(t.left)}</span>
              <button type="button" className="ri-timer-x" onClick={() => setTimers((ts) => ts.map((x) => (x.id === t.id ? { ...x, running: !x.running } : x)))} aria-label={t.running ? "השהיה" : "המשך"}>
                {t.running ? "❚❚" : "▶"}
              </button>
              <button type="button" className="ri-timer-x" onClick={() => setTimers((ts) => ts.filter((x) => x.id !== t.id))} aria-label="סגירת טיימר">✕</button>
            </div>
          ))}
        </aside>
      )}

      {cook && (
        <CookMode
          title={title}
          steps={flatSteps}
          ingredients={ingredients.map((g) => ({ group: g.group, items: g.items.map((i) => line(i, f, grams).main) }))}
          onClose={() => setCook(false)}
          onTimer={startTimer}
        />
      )}
    </div>
  );
}

function CookMode({ title, steps, ingredients, onClose, onTimer }: {
  title: string;
  steps: (Step & { key: string; group: string | null })[];
  ingredients: Group<string>[];
  onClose: () => void;
  onTimer: (m: number, l: string) => void;
}) {
  const [i, setI] = useState(0);
  const [showIng, setShowIng] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);
  const lock = useRef<any>(null);

  useEffect(() => {
    const d = ref.current!;
    d.showModal();
    // keep the screen awake while cooking
    (navigator as any).wakeLock?.request("screen").then((l: any) => (lock.current = l)).catch(() => {});
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === " ") { e.preventDefault(); setI((x) => Math.min(steps.length - 1, x + 1)); }
      if (e.key === "ArrowRight") { e.preventDefault(); setI((x) => Math.max(0, x - 1)); }
    };
    d.addEventListener("keydown", onKey);
    return () => { d.removeEventListener("keydown", onKey); lock.current?.release?.(); };
  }, [steps.length]);

  useEffect(() => { announce(`שלב ${i + 1} מתוך ${steps.length}`); }, [i, steps.length]);

  const s = steps[i];
  return (
    <dialog ref={ref} className="cook" aria-label={`מצב בישול: ${title}`} onClose={onClose} onCancel={onClose}>
      <div className="cook-top">
        <p className="cook-title">{title}</p>
        <div className="cook-top-btns">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowIng((v) => !v)} aria-expanded={showIng}>
            {showIng ? "חזרה לשלבים" : "מצרכים"}
          </button>
          <button type="button" className="icon-btn" onClick={() => ref.current?.close()} aria-label="יציאה ממצב בישול">✕</button>
        </div>
      </div>
      {showIng ? (
        <div className="cook-ing">
          {ingredients.map((g, gi) => (
            <div key={gi}>
              {g.group && <h3>{g.group}</h3>}
              <ul>{g.items.map((t, ti) => <li key={ti}>{t}</li>)}</ul>
            </div>
          ))}
        </div>
      ) : (
        <div className="cook-step" aria-live="polite">
          <p className="cook-count">שלב {i + 1} מתוך {steps.length}{s.group ? ` · ${s.group}` : ""}</p>
          <p className="cook-text">{s.text}</p>
          {s.timerMin ? <button type="button" className="btn" onClick={() => onTimer(s.timerMin!, `שלב ${i + 1}`)}>⏱ הפעלת טיימר {s.timerMin} דק׳</button> : null}
        </div>
      )}
      <div className="cook-nav">
        <button type="button" className="btn btn-ghost" onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0}>→ הקודם</button>
        <div className="cook-progress" aria-hidden="true"><span style={{ width: `${((i + 1) / steps.length) * 100}%` }} /></div>
        {i < steps.length - 1
          ? <button type="button" className="btn" onClick={() => setI((x) => x + 1)}>הבא ←</button>
          : <button type="button" className="btn" onClick={() => ref.current?.close()}>בתיאבון! ✓</button>}
      </div>
    </dialog>
  );
}
