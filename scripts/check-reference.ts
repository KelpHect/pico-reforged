// Compares every semantic token in src/tokens/scheme.css plus a theme file with the compiled
// v2.1.1 output in test/reference/v2.1.1/. Prints the largest per-channel difference (0-255)
// for light and dark. Usage: node scripts/check-reference.ts [theme] [--all]
import { readFileSync } from "node:fs";
import { parse, converter } from "culori";

const root = new URL("../", import.meta.url);
const read = (p: string): string => readFileSync(new URL(p, root), "utf8").replaceAll("\r", "");
const toRgb = converter("rgb");

const theme = process.argv.find((a, i) => i > 1 && !a.startsWith("--")) ?? "azure";
const all = process.argv.includes("--all");

type Decls = Map<string, string>;

function declsOf(block: string): Decls {
  const map: Decls = new Map();
  for (const m of block.matchAll(/^\s*--pico-([a-z0-9-]+): (.*);$/gm))
    map.set(m[1] as string, m[2] as string);
  return map;
}

function between(css: string, start: string): string {
  const from = css.indexOf(start);
  const open = css.indexOf("{", from);
  const close = css.indexOf("\n}", open);
  return css.slice(open + 1, close);
}

function splitTop(value: string, sep: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of value) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === sep && depth === 0) {
      parts.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  parts.push(cur.trim());
  return parts;
}

// light-dark(a, b) anywhere in a value, for one scheme.
function pick(value: string, scheme: "light" | "dark"): string {
  let out = value;
  for (;;) {
    const i = out.indexOf("light-dark(");
    if (i < 0) return out;
    let depth = 0;
    let j = i + "light-dark".length;
    for (; j < out.length; j++) {
      if (out[j] === "(") depth++;
      if (out[j] === ")" && --depth === 0) break;
    }
    const args = splitTop(out.slice(i + "light-dark(".length, j), ",");
    out = out.slice(0, i) + (scheme === "light" ? args[0] : args[1]) + out.slice(j + 1);
  }
}

const COLOR = /(rgba?\([^)]*\)|oklch\([^)]*\)|#[0-9a-fA-F]{3,8}\b)/g;

function resolve(map: Decls, name: string, depth = 0): string {
  const raw = map.get(name);
  if (raw === undefined) return `MISSING(${name})`;
  const alias = raw.match(/^var\(--pico-([a-z0-9-]+)\)$/);
  if (alias && depth < 10) return resolve(map, alias[1] as string, depth + 1);
  return raw;
}

function colorsOf(value: string): { skeleton: string; colors: number[][] } {
  const colors: number[][] = [];
  const skeleton = value.replace(COLOR, (c) => {
    const p = parse(c);
    if (!p) throw new Error(`cannot parse ${c}`);
    const { r, g, b, alpha } = toRgb(p);
    colors.push([r * 255, g * 255, b * 255, (alpha ?? 1) * 255]);
    return "<c>";
  });
  return { skeleton: skeleton.replace(/\s+/g, " ").replace(/\b0\./g, "."), colors };
}

function diff(a: string, b: string): number {
  const x = colorsOf(a);
  const y = colorsOf(b);
  if (x.skeleton !== y.skeleton || x.colors.length !== y.colors.length) return Infinity;
  let worst = 0;
  x.colors.forEach((c, i) =>
    c.forEach((v, k) => (worst = Math.max(worst, Math.abs(v - (y.colors[i]?.[k] ?? 0))))),
  );
  return worst;
}

const refCss = read(
  theme === "azure" ? "test/reference/v2.1.1/pico.css" : `test/reference/v2.1.1/pico.${theme}.css`,
);
const refLight = declsOf(between(refCss, "[data-theme=light],\n:root:not([data-theme=dark])"));
const refDark = declsOf(between(refCss, "\n[data-theme=dark] {"));

const mine = declsOf(read("src/tokens/scheme.css") + read(`src/themes/${theme}.css`));
const own = (scheme: "light" | "dark"): Decls =>
  new Map([...mine].map(([k, v]) => [k, pick(v, scheme)]));
const myLight = own("light");
const myDark = own("dark");

const skip =
  /^(icon-|font|line-height|border-|outline|transition|spacing|typography|block|grid|nav|group|modal-overlay-b|scrollbar|text-underline|button-|form-element-disabled|loading)/;
let max = 0;
let bad = 0;
let rows = 0;
console.log(`theme ${theme}\ntoken | light | dark`);
for (const [name] of refLight) {
  if (skip.test(name) && !mine.has(name)) continue;
  if (!mine.has(name)) {
    console.log(`${name} | not generated | `);
    bad++;
    continue;
  }
  const l = diff(resolve(refLight, name), resolve(myLight, name));
  const d = diff(resolve(refDark, name), resolve(myDark, name));
  const w = Math.max(l, d);
  rows++;
  if (w > max && w !== Infinity) max = w;
  if (w > 1.01) bad++;
  if (all || w > 0.8)
    console.log(`${name} | ${l.toFixed(2)} | ${d.toFixed(2)}${w > 1.01 ? "  <-- MISMATCH" : ""}`);
}
for (const name of mine.keys())
  if (!refLight.has(name)) console.log(`${name} | only in new output`);
console.log(`${rows} tokens compared, max channel difference ${max.toFixed(2)}, ${bad} over 1`);
