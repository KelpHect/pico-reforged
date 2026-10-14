import { parse, converter, formatHex, clampChroma, wcagContrast } from "culori";
import type { Color, Oklch, Rgb } from "culori";

export type Triple = [number, number, number];

const toOklch: (color: Color | string) => Oklch = converter("oklch") as (
  color: Color | string,
) => Oklch;
const toRgb: (color: Color | string) => Rgb = converter("rgb") as (color: Color | string) => Rgb;

export const round = (n: number, d: number): number => {
  const f = 10 ** d;
  return Math.round(n * f) / f;
};

// Hex or rgb channels (0-255, fractions allowed) to a rounded [L, C, H] triple.
export function rgbToTriple([r, g, b]: Triple): Triple {
  const { l, c, h } = toOklch({ mode: "rgb", r: r / 255, g: g / 255, b: b / 255 });
  const C = round(c ?? 0, 4);
  return [round(l, 4), C, C === 0 || h === undefined ? 0 : round(h, 2)];
}

export function hexToTriple(hex: string): Triple {
  const color = parse(hex);
  if (!color) throw new Error(`Cannot parse ${hex}`);
  const { r, g, b } = toRgb(color);
  return rgbToTriple([r * 255, g * 255, b * 255]);
}

// Triple back to sRGB channels (0-255, unrounded, not clamped).
export function tripleToRgb([l, c, h]: Triple): Triple {
  const { r, g, b } = toRgb({ mode: "oklch", l, c, h });
  return [r * 255, g * 255, b * 255];
}

export function tripleToHex(triple: Triple): string {
  const [r, g, b] = tripleToRgb(triple).map((v) => Math.min(255, Math.max(0, v)) / 255) as Triple;
  return formatHex({ mode: "rgb", r, g, b });
}

const num = (n: number): string => String(round(n, 4));

// How far (in 8-bit steps) a shorter spelling may drift from the rounded sRGB channel. Under
// 0.5 it still lands on the same 8-bit value, and the margin absorbs the small differences
// between this converter and a browser's.
const SRGB_MARGIN = 0.4;

// Characters the three numbers take in the minified output (lightness as a percentage).
const textSize = ([l, c, h]: Triple): number =>
  String(round(l * 100, 2)).length + String(c).replace(/^0\./, ".").length + String(h).length;

// The shortest L, C, H spelling that lands on the same 8-bit sRGB color as the full precision
// triple (4, 4 and 2 decimals). Palette values are hex round trips, so the extra digits are
// below what an 8-bit display can show, and they cost bytes in every theme and every build.
export function compactTriple(triple: Triple): Triple {
  const [l, c, h] = triple;
  const target = tripleToRgb(triple).map((v) => Math.min(255, Math.max(0, Math.round(v))));
  let best = triple;
  let bestSize = textSize(triple);
  for (const dl of [2, 3, 4]) {
    for (const dc of [1, 2, 3, 4]) {
      for (const dh of c === 0 ? [0] : [0, 1, 2]) {
        const candidate: Triple = [round(l, dl), round(c, dc), c === 0 ? 0 : round(h, dh)];
        const size = textSize(candidate);
        if (size >= bestSize) continue;
        const rgb = tripleToRgb(candidate);
        if (rgb.every((v, i) => Math.abs(v - (target[i] as number)) <= SRGB_MARGIN)) {
          best = candidate;
          bestSize = size;
        }
      }
    }
  }
  return best;
}

// "oklch(0.5517 0.0283 264.36)" or with a slash alpha, in the shortest spelling that keeps
// the 8-bit sRGB color (see compactTriple).
export function formatOklch(triple: Triple, alpha?: number): string {
  const [l, c, h] = compactTriple(triple);
  const a = alpha === undefined || alpha === 1 ? "" : ` / ${alpha}`;
  return `oklch(${num(l)} ${num(c)} ${round(h, 2)}${a})`;
}

// WCAG contrast between two triples.
export function contrast(a: Triple, b: Triple): number {
  const to = ([l, c, h]: Triple) => ({ mode: "oklch" as const, l, c, h });
  return wcagContrast(to(a), to(b));
}

// Largest in-gamut chroma not above `chroma` for this lightness and hue.
export function fitChroma(l: number, chroma: number, h: number): number {
  const out = clampChroma({ mode: "oklch", l, c: chroma, h }, "oklch");
  return round(out.c ?? 0, 4);
}

export { parse, toOklch };
