// One-off: reads the v2.1.1 palette from scss/colors/_index.scss and writes
// scripts/data/palette.json as OKLCH triples. Run it again only if the source palette changes.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { hexToTriple, tripleToHex } from "./lib/color.ts";
import type { Triple } from "./lib/color.ts";

const root = new URL("../", import.meta.url);
const scss = readFileSync(new URL("scss/colors/_index.scss", root), "utf8");

const steps = [50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900, 950];
const hex: Record<string, string> = {};
const main: Record<string, number> = {};
const hueNames: string[] = [];

for (const m of scss.matchAll(/^\$([a-z]+)-(\d+): (#[0-9a-f]{6});/gm)) {
  hex[`${m[1]}-${m[2]}`] = m[3] as string;
}
for (const m of scss.matchAll(/^\$([a-z]+): \$[a-z]+-(\d+);/gm)) {
  main[m[1] as string] = Number(m[2]);
  hueNames.push(m[1] as string);
}

const hues: Record<string, Record<string, Triple>> = {};
let worst = 0;
let count = 0;
for (const hue of hueNames) {
  const byStep: Record<string, Triple> = {};
  hues[hue] = byStep;
  for (const step of steps) {
    const orig = hex[`${hue}-${step}`] as string;
    const triple = hexToTriple(orig);
    byStep[step] = triple;
    const back = tripleToHex(triple);
    for (let i = 1; i < 7; i += 2) {
      const d = Math.abs(parseInt(back.slice(i, i + 2), 16) - parseInt(orig.slice(i, i + 2), 16));
      worst = Math.max(worst, d);
      if (d > 1) console.error(`round trip off by ${d}: ${hue}-${step} ${orig} -> ${back}`);
    }
    count++;
  }
}

const out = { hues, main, black: hexToTriple("#000000"), white: hexToTriple("#ffffff") };
writeFileSync(
  fileURLToPath(new URL("scripts/data/palette.json", root)),
  JSON.stringify(out, null, 2).replace(/\[\s+([\d.]+),\s+([\d.]+),\s+([\d.]+)\s+\]/g, "[$1, $2, $3]") +
    "\n",
);
console.log(`${hueNames.length} hues, ${count} colors, max round trip error ${worst}/255`);
