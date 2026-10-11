import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { recipeSchema, noteSchema, menuSchema } from "./lib/schema";

// YM_DATA lets the pipeline preview a scratch dataset (e.g. work/pilot/data) without touching data/.
const base = process.env.YM_DATA ?? "./data";

export const collections = {
  recipes: defineCollection({ loader: glob({ pattern: "*.json", base: `${base}/recipes` }), schema: recipeSchema }),
  notes: defineCollection({ loader: glob({ pattern: "*.json", base: `${base}/notes` }), schema: noteSchema }),
  menus: defineCollection({ loader: glob({ pattern: "*.json", base: `${base}/menus` }), schema: menuSchema }),
};
