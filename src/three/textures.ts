// Procedural textures drawn on <canvas> at runtime: no image downloads.
import * as THREE from "three";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** Warm oak table top with planks, grain and knots. */
export function woodTexture(size = 1024, seed = 7): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const r = rng(seed);
  const planks = 5;
  const pw = size / planks;
  for (let p = 0; p < planks; p++) {
    const hue = 26 + r() * 6, light = 30 + r() * 8;
    g.fillStyle = `hsl(${hue} 42% ${light}%)`;
    g.fillRect(p * pw, 0, pw, size);
    // grain
    for (let i = 0; i < 220; i++) {
      const x = p * pw + r() * pw;
      g.strokeStyle = `hsla(${hue - 4} 45% ${light - 10 + r() * 16}% / ${0.08 + r() * 0.18})`;
      g.lineWidth = 0.6 + r() * 1.6;
      g.beginPath();
      g.moveTo(x, 0);
      let xx = x;
      for (let y = 0; y <= size; y += 16) { xx += (r() - 0.5) * 2.2; g.lineTo(xx, y); }
      g.stroke();
    }
    // knot
    if (r() > 0.4) {
      const kx = p * pw + pw * (0.3 + r() * 0.4), ky = r() * size;
      for (let k = 0; k < 9; k++) {
        g.strokeStyle = `hsla(${hue - 6} 50% ${18 + k * 2}% / .35)`;
        g.beginPath(); g.ellipse(kx, ky, 4 + k * 3, 12 + k * 7, 0, 0, Math.PI * 2); g.stroke();
      }
    }
    // seam
    g.fillStyle = "rgba(20,10,4,.55)";
    g.fillRect(p * pw, 0, 2, size);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

/** Off-white linen with a woven texture and a bordeaux stripe border. */
export function linenTexture(size = 512): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  g.fillStyle = "#efe6d6";
  g.fillRect(0, 0, size, size);
  const r = rng(3);
  for (let y = 0; y < size; y += 2) { g.fillStyle = `rgba(120,100,80,${0.03 + r() * 0.05})`; g.fillRect(0, y, size, 1); }
  for (let x = 0; x < size; x += 2) { g.fillStyle = `rgba(120,100,80,${0.03 + r() * 0.05})`; g.fillRect(x, 0, 1, size); }
  g.fillStyle = "#6b1e2b";
  for (const o of [26, 40]) { g.fillRect(o, 0, 5, size); g.fillRect(size - o - 5, 0, 5, size); g.fillRect(0, o, size, 5); g.fillRect(0, size - o - 5, size, 5); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Cream "menu card"/"book page" with Hebrew title text rendered in the site font. */
export function paperTexture(opts: { title: string; sub?: string; small?: string; w?: number; h?: number; icon?: string; ornament?: boolean }) {
  const { title, sub, small, w = 768, h = 1024 } = opts;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(w / 2, h / 2, h * 0.1, w / 2, h / 2, h * 0.75);
  grd.addColorStop(0, "#fbf6ec"); grd.addColorStop(1, "#ead9bd");
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  const r = rng(title.length * 13);
  for (let i = 0; i < 1800; i++) { g.fillStyle = `rgba(110,80,50,${r() * 0.05})`; g.fillRect(r() * w, r() * h, 1.5, 1.5); }
  // double frame
  g.strokeStyle = "#b4693e"; g.lineWidth = 3; g.strokeRect(40, 40, w - 80, h - 80);
  g.lineWidth = 1; g.strokeRect(54, 54, w - 108, h - 108);
  g.direction = "rtl";
  g.textAlign = "center";
  g.fillStyle = "#6b1e2b";
  g.font = `700 ${Math.round(w * 0.105)}px "Frank Ruhl Libre Variable", "Frank Ruhl Libre", serif`;
  wrap(g, title, w / 2, h * 0.42, w * 0.74, w * 0.12);
  if (sub) { g.fillStyle = "#8a4a24"; g.font = `italic 500 ${Math.round(w * 0.06)}px "Cormorant Garamond", serif`; g.direction = "ltr"; g.fillText(sub, w / 2, h * 0.62); g.direction = "rtl"; }
  if (small) { g.fillStyle = "#574a41"; g.font = `600 ${Math.round(w * 0.045)}px "Assistant Variable", "Assistant", sans-serif`; g.fillText(small, w / 2, h * 0.72); }
  if (opts.ornament !== false) { g.fillStyle = "#b4693e"; g.font = `${Math.round(w * 0.06)}px serif`; g.fillText("❦", w / 2, h * 0.24); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function wrap(g: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number) {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const wd of words) {
    const test = cur ? `${cur} ${wd}` : wd;
    if (g.measureText(test).width > maxW && cur) { lines.push(cur); cur = wd; } else cur = test;
  }
  if (cur) lines.push(cur);
  const start = y - ((lines.length - 1) * lh) / 2;
  lines.forEach((l, i) => g.fillText(l, x, start + i * lh));
}

/** Soft round sprite for particles (flour, steam, sparkles). */
export function softDot(size = 64): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, "rgba(255,255,255,1)"); grd.addColorStop(0.4, "rgba(255,255,255,.5)"); grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd; g.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

export async function fontsReady() {
  try {
    await Promise.all([
      document.fonts.load('700 40px "Frank Ruhl Libre Variable"'),
      document.fonts.load('italic 500 40px "Cormorant Garamond"'),
      document.fonts.load('600 40px "Assistant Variable"'),
    ]);
  } catch { /* fonts optional */ }
}
