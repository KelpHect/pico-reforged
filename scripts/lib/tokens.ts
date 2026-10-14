import { readFileSync } from "node:fs";
import { formatOklch, rgbToTriple } from "./color.ts";
import type { Triple } from "./color.ts";
import { shadowLayers } from "../data/scheme.ts";
import type { SchemeColor, SchemeValue } from "../data/scheme.ts";

export type Palette = {
  hues: Record<string, Record<string, Triple>>;
  main: Record<string, number>;
  black: Triple;
  white: Triple;
};

export const palette: Palette = JSON.parse(
  readFileSync(new URL("../data/palette.json", import.meta.url), "utf8"),
);

export const STEPS = [950, 900, 850, 800, 750, 700, 650, 600, 550, 500, 450, 400, 350, 300, 250, 200, 150, 100, 50];

// "slate-500", "white" or "black" to a triple.
export function paletteTriple(name: string): Triple {
  if (name === "white" || name === "black") return palette[name];
  const [hue, step] = name.split("-") as [string, string];
  const triple = palette.hues[hue]?.[step];
  if (!triple) throw new Error(`Unknown palette color: ${name}`);
  return triple;
}

// A scheme.ts color (ref or rgb literal) to an oklch() string.
export function colorValue(value: SchemeColor): string {
  if ("ref" in value) return formatOklch(paletteTriple(value.ref), value.alpha);
  if ("rgb" in value) return formatOklch(rgbToTriple(value.rgb), value.alpha);
  throw new Error(`Cannot resolve color: ${JSON.stringify(value)}`);
}

const rem = (n: number): string => (n === 0 ? "0" : `${n}rem`);

function shadowValue(color: (alpha: number) => string): string {
  return shadowLayers
    .map(([x, y, blur, alpha, spread]) => {
      const c = color(alpha);
      return spread ? `0 0 0 ${rem(spread)} ${c}` : `${rem(x)} ${rem(y)} ${rem(blur)} ${c}`;
    })
    .join(", ");
}

// One semantic token to its declaration value. Equal light and dark values skip light-dark().
export function schemeValue(light: SchemeValue, dark: SchemeValue): string {
  if (typeof light === "string" || typeof dark === "string") {
    const text = (v: SchemeValue): string => (typeof v === "string" ? v : colorValue(v));
    const l = text(light);
    const d = text(dark);
    return l === d ? l : `light-dark(${l}, ${d})`;
  }
  if ("shadow" in light && "shadow" in dark) {
    return shadowValue((alpha) => {
      const l = colorValue({ ...light.shadow, alpha } as SchemeColor);
      const d = colorValue({ ...dark.shadow, alpha } as SchemeColor);
      return l === d ? l : `light-dark(${l}, ${d})`;
    });
  }
  const l = colorValue(light);
  const d = colorValue(dark);
  return l === d ? l : `light-dark(${l}, ${d})`;
}
