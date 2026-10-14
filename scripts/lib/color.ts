import { parse, converter, formatHex, clampChroma, wcagContrast } from "culori";

export type Triple = [number, number, number];

const toOklch = converter("oklch");
const toRgb = converter("rgb");

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

// "oklch(0.5517 0.0283 264.36)" or with a slash alpha.
export function formatOklch([l, c, h]: Triple, alpha?: number): string {
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
