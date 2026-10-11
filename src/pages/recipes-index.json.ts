import type { APIRoute } from "astro";
import { catalog, imageFor } from "../lib/data";
import { catBySlug } from "../lib/site";

export const GET: APIRoute = () => {
  const rows = catalog.map((e) => ({
    id: e.id, t: e.t, c: e.c, sc: e.sc, h: e.h, cu: e.cu, f: e.f, u: e.u, s: e.s,
    ic: catBySlug[e.c]?.icon ?? "plate",
    ...(() => { const im = imageFor(e.id) ?? (e.s ? imageFor(e.s) : null); return im ? { im: im.src640, cr: im.kind === "pexels" ? `צילום: ${im.by} · Pexels` : "להמחשה" } : { im: 0 }; })(),
  }));
  return new Response(JSON.stringify(rows), { headers: { "Content-Type": "application/json; charset=utf-8" } });
};
