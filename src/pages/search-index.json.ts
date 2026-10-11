import type { APIRoute } from "astro";
import { catalog, entryHref } from "../lib/data";
import { catBySlug, subBySlug } from "../lib/site";

// Compact index for client-side Hebrew search over the whole catalogue (titles + folders only).
export const GET: APIRoute = () => {
  const docs = catalog.map((e) => ({
    id: e.id,
    t: e.t,
    c: (e.sc && subBySlug[e.sc]?.he) || catBySlug[e.c]?.he || "",
    i: e.f,
    g: e.s ? "מתכון מלא" : "",
    d: "",
    href: entryHref(e),
    ext: e.s ? 0 : 1,
  }));
  return new Response(JSON.stringify(docs), { headers: { "Content-Type": "application/json; charset=utf-8" } });
};
