// Wires every [data-fav] heart button on the page to localStorage favourites.
import { isFav, toggleFav } from "./store";

function paint(root: ParentNode = document) {
  root.querySelectorAll<HTMLButtonElement>("[data-fav]").forEach((b) => {
    const on = isFav(b.dataset.fav!);
    b.setAttribute("aria-pressed", String(on));
  });
}

document.addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-fav]");
  if (!b) return;
  e.preventDefault();
  const on = toggleFav(b.dataset.fav!, b.dataset.title ?? "");
  b.setAttribute("aria-pressed", String(on));
  announce(on ? `נשמר במועדפים: ${b.dataset.title}` : `הוסר מהמועדפים: ${b.dataset.title}`);
});

export function announce(msg: string) {
  let live = document.getElementById("ym-live");
  if (!live) {
    live = document.createElement("div");
    live.id = "ym-live";
    live.className = "visually-hidden";
    live.setAttribute("role", "status");
    live.setAttribute("aria-live", "polite");
    document.body.appendChild(live);
  }
  live.textContent = "";
  requestAnimationFrame(() => (live!.textContent = msg));
}

paint();
document.addEventListener("astro:page-load", () => paint());
window.addEventListener("ym:favs", () => paint());
