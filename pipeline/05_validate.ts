// Validates data/recipes, data/notes and data/menus against src/lib/schema.ts.
//   node pipeline/05_validate.ts                 → everything + stats
//   node pipeline/05_validate.ts <file> [...]    → only these files (agents self-check)
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import { recipeSchema, noteSchema, menuSchema } from "../src/lib/schema.ts";

const root = new URL("..", import.meta.url).pathname;
const dirs: Record<string, typeof recipeSchema | typeof noteSchema | typeof menuSchema> = {
  "data/recipes": recipeSchema,
  "data/notes": noteSchema,
  "data/menus": menuSchema,
};

const args = process.argv.slice(2);
const files: [string, any][] = [];
if (args.length) {
  for (const f of args) {
    const dir = Object.keys(dirs).find((d) => f.includes(d));
    if (!dir) throw new Error(`unknown data dir for ${f}`);
    files.push([f, dirs[dir]]);
  }
} else {
  for (const [dir, schema] of Object.entries(dirs)) {
    const abs = join(root, dir);
    if (!existsSync(abs)) continue;
    for (const f of readdirSync(abs)) if (f.endsWith(".json")) files.push([join(abs, f), schema]);
  }
}

let bad = 0;
const slugs = new Map<string, string>();
const stats: Record<string, number> = {};
for (const [file, schema] of files) {
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    bad++;
    console.log(`✗ ${basename(file)}: invalid JSON — ${(e as Error).message}`);
    continue;
  }
  const r = schema.safeParse(data);
  if (!r.success) {
    bad++;
    const issues = r.error.issues.slice(0, 6).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    console.log(`✗ ${basename(file)}: ${issues}`);
    continue;
  }
  const d = r.data as any;
  if (basename(file) !== `${d.slug}.json`) {
    bad++;
    console.log(`✗ ${basename(file)}: file name must equal slug (${d.slug}.json)`);
  }
  const key = `${file.includes("menus") ? "m" : file.includes("notes") ? "n" : "r"}:${d.slug}`;
  if (slugs.has(key)) {
    bad++;
    console.log(`✗ duplicate slug ${d.slug}`);
  }
  slugs.set(key, file);
  if (d.category) stats[d.category] = (stats[d.category] ?? 0) + 1;
}

console.log(`\n${files.length - bad}/${files.length} valid`);
if (!args.length) console.log(Object.entries(stats).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join("  "));
process.exit(bad ? 1 : 0);
