import type { APIRoute } from "astro";
import { catalog, imageFor } from "../lib/data";
import { catBySlug } from "../lib/site";

export const GET: APIRoute = () => {
  const rows = catalog.map((e) => ({
    id: e.id, t: e.t, c: e.c, sc: e.sc, h: e.h, cu: e.cu, f: e.f, u: e.u, s: e.s,
    ic: catBySlug[e.c]?.icon ?? "plate",
    im: e.s && imageFor(e.s) ? 1 : 0,
  }));
  return new Response(JSON.stringify(rows), { headers: { "Content-Type": "application/json; charset=utf-8" } });
};
