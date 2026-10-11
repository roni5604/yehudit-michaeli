import type { APIRoute } from "astro";
import { art, artSvg } from "../../lib/art";

export function getStaticPaths() {
  return Object.keys(art).map((icon) => ({ params: { icon } }));
}
export const GET: APIRoute = ({ params }) =>
  new Response(artSvg(params.icon!), { headers: { "Content-Type": "image/svg+xml" } });
