// Line-art illustrations used as photo fallbacks and category tiles.
export const art: Record<string, string> = {
  croissant: '<path d="M14 40c6-14 16-20 26-20s20 6 26 20c-6 2-10 0-13-4-2 6-7 9-13 9s-11-3-13-9c-3 4-7 6-13 4Z"/><path d="M27 36c2-6 6-9 13-9s11 3 13 9M33 25l3 9M47 25l-3 9"/>',
  plate: '<circle cx="40" cy="40" r="24"/><circle cx="40" cy="40" r="15"/><path d="M8 22v14a5 5 0 0 0 5 5v19M13 22v12M18 22v14a5 5 0 0 1-5 5M70 22c-4 2-5 8-5 14 0 3 2 5 5 5v19"/>',
  olive: '<ellipse cx="34" cy="44" rx="9" ry="12" transform="rotate(-25 34 44)"/><ellipse cx="50" cy="40" rx="8" ry="11" transform="rotate(20 50 40)"/><path d="M40 28c4-8 12-12 22-12-2 8-8 13-17 14M40 28c-3-6-9-9-16-9 1 6 6 10 13 10"/>',
  jar: '<path d="M26 26h28v6c4 3 6 7 6 12v14a6 6 0 0 1-6 6H26a6 6 0 0 1-6-6V44c0-5 2-9 6-12Z"/><path d="M24 20h32v6H24zM26 46h28"/>',
  leaf: '<path d="M18 62C18 34 34 18 64 16c0 30-16 46-44 46Z"/><path d="M18 62 50 30M30 50h12M38 42h10M28 42l2-12"/>',
  pot: '<path d="M16 34h48v16a14 14 0 0 1-14 14H30a14 14 0 0 1-14-14Z"/><path d="M10 34h60M34 28h12M30 22c0-4 4-4 4-8M40 22c0-4 4-4 4-8M50 22c0-4 4-4 4-8"/>',
  carrot: '<path d="M22 58 50 30c4-4 10-2 10 4 0 2-1 4-3 5L29 62c-3 2-9 1-7-4Z"/><path d="M52 28c0-6 2-10 6-12M56 32c6 0 10-2 12-6M54 26c-4-4-4-8-2-12M34 46l4 4M42 40l4 4"/>',
  sprout: '<path d="M40 64V36M40 40c-2-10-10-16-22-16 0 12 8 18 22 16ZM40 36c2-12 10-18 24-18 0 14-10 20-24 18Z"/><path d="M26 64h28"/>',
  pasta: '<path d="M14 40h52a26 26 0 0 1-52 0Z"/><path d="M22 40c4-6 10-6 14 0s10 6 14 0 10-6 12 0M50 18 36 40M58 20 44 40"/>',
  bowl: '<path d="M12 38h56a28 28 0 0 1-56 0Z"/><path d="M28 64h24M26 32c2-6 6-6 8 0M38 30c2-6 6-6 8 0M48 32c2-6 6-6 8 0"/>',
  pie: '<path d="M10 44h60l-6 14H16Z"/><path d="M12 44c4-14 16-22 28-22s24 8 28 22M24 34l6 6M40 28v8M56 34l-6 6"/>',
  bread: '<path d="M14 56V36c0-10 12-16 26-16s26 6 26 16v20Z"/><path d="M28 30l6 10M40 26l4 12M52 30l2 10"/>',
  fish: '<path d="M10 40c10-14 30-18 44-6l12-10v32L54 46C40 58 20 54 10 40Z"/><circle cx="26" cy="38" r="2"/><path d="M38 32c3 4 3 12 0 16"/>',
  drumstick: '<path d="M44 16c10 0 18 8 18 18 0 12-12 18-22 16l-12 12a5 5 0 1 1-6-6l-1-1a5 5 0 1 1 6-6l12-12c-2-10 4-21 5-21Z"/><path d="M46 26c4 0 8 4 8 8"/>',
  meat: '<path d="M16 46c-4-14 8-28 26-28s28 10 26 24-14 22-28 20-22-6-24-16Z"/><ellipse cx="44" cy="40" rx="8" ry="6"/><path d="M22 52c6 4 14 6 22 5"/>',
  sauce: '<path d="M30 14h20v10l6 8v26a6 6 0 0 1-6 6H30a6 6 0 0 1-6-6V32l6-8Z"/><path d="M24 44h32M30 24h20"/>',
  jam: '<path d="M22 30h36v26a8 8 0 0 1-8 8H30a8 8 0 0 1-8-8Z"/><path d="M18 22h44l-4 8H22Z"/><path d="M34 44c0-4 6-6 6-2 0-4 6-2 6 2 0 5-6 8-6 8s-6-3-6-8Z"/>',
  cheese: '<path d="M12 50 54 22l14 12v18a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4Z"/><path d="M12 50h56"/><circle cx="30" cy="48" r="3"/><circle cx="48" cy="40" r="4"/><circle cx="58" cy="50" r="2.5"/>',
  cake: '<path d="M16 62V42h48v20M16 52c6 4 10 4 16 0s10-4 16 0 10 4 16 0M12 62h56"/><path d="M40 42V30M40 30c-3-3-3-7 0-10 3 3 3 7 0 10Z"/>',
  cookie: '<circle cx="40" cy="40" r="24"/><circle cx="32" cy="32" r="2.5"/><circle cx="48" cy="34" r="2.5"/><circle cx="36" cy="48" r="2.5"/><circle cx="50" cy="48" r="2"/><circle cx="42" cy="40" r="1.5"/>',
  dessert: '<path d="M22 34h36l-6 26H28Z"/><path d="M20 34c0-10 9-16 20-16s20 6 20 16M36 18c0-6 4-8 8-8"/><path d="M26 46h28"/>',
  candy: '<circle cx="40" cy="40" r="12"/><path d="M28 36 14 28v24l14-8M52 36l14-8v24l-14-8M34 34l12 12"/>',
  cup: '<path d="M18 28h36v14a18 18 0 0 1-36 0Z"/><path d="M54 32h4a7 7 0 0 1 0 14h-6M28 18c0-4 4-4 4-8M38 18c0-4 4-4 4-8"/><path d="M16 64h40"/>',
  cocktail: '<path d="M16 18h48L40 44Z"/><path d="M40 44v18M30 64h20M50 18l8-10"/><circle cx="60" cy="8" r="3"/>',
};

const tones = [
  ["#efe2cf", "#b4693e"], ["#e8dcc6", "#6b1e2b"], ["#e6e3cf", "#566139"], ["#f0dfd2", "#8a4a24"],
  ["#e4d8c8", "#5b3a2e"], ["#ece4d6", "#7a2d3a"], ["#e3e1d0", "#4f5a33"],
];

export function toneFor(seed: string): [string, string, number] {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const [bg, fg] = tones[h % tones.length];
  return [bg, fg, h];
}

/** Standalone SVG string (for /art/<icon>.svg and client-rendered cards). */
export function artSvg(icon: string, seed = icon): string {
  const [bg, fg, h] = toneFor(seed);
  const id = `p${h.toString(36)}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" preserveAspectRatio="xMidYMid slice"><defs><pattern id="${id}" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><path d="M0 5h10" stroke="${fg}" stroke-opacity=".07" stroke-width="1.2"/></pattern></defs><rect width="300" height="200" fill="${bg}"/><rect width="300" height="200" fill="url(#${id})"/><circle cx="150" cy="100" r="74" fill="none" stroke="${fg}" stroke-opacity=".18" stroke-width="1.2"/><circle cx="150" cy="100" r="68" fill="none" stroke="${fg}" stroke-opacity=".12" stroke-width=".8"/><g transform="translate(102 52) scale(1.2)" fill="none" stroke="${fg}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${art[icon] ?? art.plate}</g></svg>`;
}
