// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://yehudit-michaeli.vercel.app",
  trailingSlash: "ignore",
  build: { format: "directory", inlineStylesheets: "auto" },
  prefetch: { prefetchAll: false, defaultStrategy: "hover" },
  integrations: [
    react(),
    sitemap({
      filter: (page) => !/\/(favorites|shopping-list|search)\/?$/.test(page),
      i18n: undefined,
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    build: { chunkSizeWarningLimit: 1600 },
  },
});
