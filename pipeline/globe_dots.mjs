// Precomputes a dotted-continent globe (lat/lng of land points) for the cuisines scene.
// Source: Natural Earth 1:110m via the world-atlas package (public domain).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { feature } from "topojson-client";
import { geoContains } from "d3-geo";

const topo = JSON.parse(readFileSync(new URL("../node_modules/world-atlas/land-110m.json", import.meta.url)));
const land = feature(topo, topo.objects.land);
const pts = [];
// Fibonacci sphere sampling → evenly spaced dots
const N = 26000;
const golden = Math.PI * (3 - Math.sqrt(5));
for (let i = 0; i < N; i++) {
  const y = 1 - (i / (N - 1)) * 2;
  const r = Math.sqrt(1 - y * y);
  const th = golden * i;
  const lat = (Math.asin(y) * 180) / Math.PI;
  const lng = ((Math.atan2(Math.sin(th) * r, Math.cos(th) * r) * 180) / Math.PI);
  if (lat < -60) continue; // skip Antarctica clutter
  if (geoContains(land, [lng, lat])) pts.push(Math.round(lat * 10) / 10, Math.round(lng * 10) / 10);
}
mkdirSync(new URL("../public/data/", import.meta.url), { recursive: true });
writeFileSync(new URL("../public/data/globe-dots.json", import.meta.url), JSON.stringify(pts));
console.log("land dots:", pts.length / 2);
