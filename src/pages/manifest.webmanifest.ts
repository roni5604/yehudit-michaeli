import type { APIRoute } from "astro";
import { SITE } from "../lib/site";

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({
      name: SITE.name,
      short_name: SITE.shortName,
      description: SITE.description,
      lang: "he",
      dir: "rtl",
      start_url: "/",
      scope: "/",
      display: "standalone",
      background_color: "#f6efe4",
      theme_color: "#6b1e2b",
      icons: [
        { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
        { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        { src: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
      ],
      shortcuts: [
        { name: "כל המתכונים", url: "/recipes" },
        { name: "המועדפים שלי", url: "/favorites" },
        { name: "רשימת הקניות", url: "/shopping-list" },
      ],
    }),
    { headers: { "Content-Type": "application/manifest+json" } },
  );
