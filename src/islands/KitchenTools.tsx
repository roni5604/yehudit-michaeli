// Unit & oven-temperature converters for the kitchen notebook.
import { useState } from "react";
import { toGrams, formatQty } from "../lib/quantities";

const ITEMS = ["קמח", "סוכר", "אבקת סוכר", "סוכר חום", "חמאה", "שמן", "חלב", "אורז", "סולת", "קקאו", "שיבולת שועל", "אגוזים", "שקדים טחונים", "דבש", "קורנפלור"];
const UNITS = ["כוס", "כף", "כפית"];
const OVEN = [[140, 275, 1], [150, 300, 2], [160, 325, 3], [180, 350, 4], [190, 375, 5], [200, 400, 6], [220, 425, 7], [230, 450, 8], [240, 475, 9]];

export default function KitchenTools() {
  const [qty, setQty] = useState(1);
  const [unit, setUnit] = useState("כוס");
  const [item, setItem] = useState("קמח");
  const g = toGrams(qty, unit, item);
  return (
    <div className="kt">
      <section className="kt-card" aria-labelledby="kt1">
        <h3 id="kt1">כוסות ← גרמים</h3>
        <div className="kt-row">
          <label>כמות<input className="input" type="number" min={0.125} step={0.25} value={qty} onChange={(e) => setQty(Number(e.target.value) || 0)} /></label>
          <label>מידה<select className="input" value={unit} onChange={(e) => setUnit(e.target.value)}>{UNITS.map((u) => <option key={u}>{u}</option>)}</select></label>
          <label>מצרך<select className="input" value={item} onChange={(e) => setItem(e.target.value)}>{ITEMS.map((u) => <option key={u}>{u}</option>)}</select></label>
        </div>
        <p className="kt-out" aria-live="polite">{g ? <>≈ <strong>{formatQty(g, "גרם")}</strong> גרם</> : "—"}</p>
        <p className="kt-note">ערכים משוערים. כוס = 240 מ״ל, כף = 15 מ״ל, כפית = 5 מ״ל.</p>
      </section>
      <section className="kt-card" aria-labelledby="kt2">
        <h3 id="kt2">טמפרטורות תנור</h3>
        <table className="kt-table">
          <thead><tr><th>צלזיוס</th><th>פרנהייט</th><th>Gas</th></tr></thead>
          <tbody>{OVEN.map(([c, f, gm]) => <tr key={c}><td>{c}°</td><td>{f}°F</td><td>{gm}</td></tr>)}</tbody>
        </table>
      </section>
    </div>
  );
}
