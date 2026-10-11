// Micro-interactions: 3D tilt + light-follow on cards, scroll reveals, click ripples.
// All disabled under prefers-reduced-motion or the "stop animations" a11y setting.
const still = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("a11y-no-motion");

// ── tilt (delegated, works for cards rendered later by React too)
let active: HTMLElement | null = null;
document.addEventListener("pointermove", (e) => {
  if (still() || e.pointerType !== "mouse") return;
  const card = (e.target as HTMLElement).closest<HTMLElement>(".ecard, .tile, .card, .ex");
  if (active && active !== card) { active.style.transform = ""; active = null; }
  if (!card) return;
  active = card;
  const r = card.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
  card.style.setProperty("--mx", `${x * 100}%`);
  card.style.setProperty("--my", `${y * 100}%`);
  card.style.transform = `perspective(900px) rotateX(${(0.5 - y) * 7}deg) rotateY(${(x - 0.5) * 9}deg) translateY(-4px)`;
}, { passive: true });
document.addEventListener("pointerleave", () => { if (active) active.style.transform = ""; active = null; });

// ── ripple on buttons and cards
document.addEventListener("pointerdown", (e) => {
  if (still()) return;
  const el = (e.target as HTMLElement).closest<HTMLElement>(".btn, .ecard, .chip, .rb-chip, .icon-btn");
  if (!el) return;
  const r = el.getBoundingClientRect();
  const s = document.createElement("span");
  const d = Math.max(r.width, r.height) * 2;
  s.className = "ripple";
  s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
  if (getComputedStyle(el).position === "static") el.style.position = "relative";
  el.style.overflow = "hidden";
  el.appendChild(s);
  setTimeout(() => s.remove(), 650);
});

// ── reveal on scroll (staggered)
const io = new IntersectionObserver((entries) => {
  for (const en of entries) if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
}, { rootMargin: "0px 0px -8% 0px" });

export function observeReveals(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>(".reveal:not(.in), .ecard-grid > li:not(.in), .tiles > *:not(.in), .grid-cards > *:not(.in)").forEach((el, i) => {
    if (still()) { el.classList.add("in"); return; }
    el.classList.add("reveal");
    el.style.transitionDelay = `${Math.min(i % 12, 11) * 35}ms`;
    io.observe(el);
  });
}
observeReveals();
document.addEventListener("astro:page-load", () => observeReveals());
new MutationObserver(() => observeReveals()).observe(document.body, { childList: true, subtree: true });
