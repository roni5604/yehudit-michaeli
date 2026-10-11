// Browser-only persistence for personal conveniences. Everything stays in this
// browser's localStorage. Nothing is sent to any server (see /cookies).
const FAV = "ym.favs";
const LIST = "ym.shopping";

function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode / storage disabled — feature silently degrades */
  }
}

export interface FavItem { slug: string; title: string; addedAt: number }
export const getFavs = (): FavItem[] => read<FavItem[]>(FAV, []);
export const favCount = () => getFavs().length;
export const isFav = (slug: string) => getFavs().some((f) => f.slug === slug);
export function toggleFav(slug: string, title: string): boolean {
  const favs = getFavs();
  const i = favs.findIndex((f) => f.slug === slug);
  if (i >= 0) favs.splice(i, 1);
  else favs.unshift({ slug, title, addedAt: Date.now() });
  write(FAV, favs);
  window.dispatchEvent(new CustomEvent("ym:favs"));
  return i < 0;
}

export interface ListItem { id: string; text: string; recipe?: string; recipeTitle?: string; done: boolean }
export const getList = (): ListItem[] => read<ListItem[]>(LIST, []);
export function setList(items: ListItem[]) {
  write(LIST, items);
  window.dispatchEvent(new CustomEvent("ym:list"));
}
export function addToList(lines: string[], recipe?: string, recipeTitle?: string) {
  const items = getList();
  for (const text of lines) {
    if (!items.some((it) => it.text === text && it.recipe === recipe)) {
      items.push({ id: Math.random().toString(36).slice(2, 10), text, recipe, recipeTitle, done: false });
    }
  }
  setList(items);
}
