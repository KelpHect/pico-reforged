import { contrast, fitChroma, formatOklch, parse, rgbToTriple, toOklch, round } from "./color.ts";
import type { Triple } from "./color.ts";
import { palette, paletteTriple, STEPS } from "./tokens.ts";
import { steps as shared, themes } from "../data/themes.ts";
import type { Inverse, SchemeSteps, ThemeDef } from "../data/themes.ts";

export const SELECTOR = ":root,\n:host,\n[data-theme]";

// Spinner on a filled button is white unless the theme's inverse text is black.
const LOADING_BLACK = `[aria-busy="true"]:not(input, select, textarea):is(button, [type="submit"], [type="button"], [type="reset"], [role="button"]):not(.outline)::before {
  filter: brightness(0) invert(0);
}`;

const BLACK: Triple = [0, 0, 0];
const WHITE: Triple = [1, 0, 0];

type Lookup = (step: number) => Triple;

// The page background of each scheme (background-color in scheme.ts). Focus rings need 3:1 on it.
const PAGE: Record<"light" | "dark", Triple> = { light: WHITE, dark: [0.165, 0.006, 265] };
type Row = [name: string, light: string, dark: string | null];

// def: { hue?, inverse, light: { background, hoverBackground }, dark: {...} }
// lookup: (step) => triple for the theme's own hue.
// Returns [token, light, dark] rows for the theme tokens, values as CSS strings.
export function themeRows(def: ThemeDef, lookup: Lookup): { rows: Row[]; darkInverse: Inverse } {
  const per = (scheme: "light" | "dark") => {
    const s = shared[scheme];
    const d: SchemeSteps = def[scheme];
    const inverse: Inverse = typeof def.inverse === "string" ? def.inverse : def.inverse[scheme];
    const stepOrRgb = (v: SchemeSteps["background"]): Triple =>
      typeof v === "object" ? rgbToTriple(v.rgb) : lookup(v);
    // Light hues (amber, yellow) move to a darker step in light and a lighter one in dark
    // until the focus color reaches 3:1 on the page.
    let focus = s.focus;
    const toward = scheme === "light" ? 50 : -50;
    while (contrast(lookup(focus), PAGE[scheme]) < 3 && STEPS.includes(focus + toward)) {
      focus += toward;
    }
    return {
      inverse,
      "text-selection-color": formatOklch(lookup(s.selection), s.selectionAlpha),
      primary: formatOklch(lookup(s.primary)),
      "primary-background": formatOklch(stepOrRgb(d.background)),
      "primary-underline": formatOklch(lookup(s.primary), s.underlineAlpha),
      "primary-hover": formatOklch(lookup(s.hover)),
      "primary-hover-background": formatOklch(stepOrRgb(d.hoverBackground)),
      "primary-focus": formatOklch(lookup(focus), s.focusAlpha),
      "primary-inverse": formatOklch(inverse === "black" ? BLACK : WHITE),
    };
  };
  const light = per("light");
  const dark = per("dark");
  const rows: Row[] = [];
  for (const key of Object.keys(light) as (keyof typeof light)[]) {
    if (key === "inverse") continue;
    rows.push([key, light[key], dark[key]]);
  }
  // Soft shadow under the switch thumb, so a white thumb still reads on a light track.
  rows.push(["switch-thumb-box-shadow", `0 0.0625rem 0.125rem 0 ${formatOklch(BLACK, 0.2)}`, null]);
  return { rows, darkInverse: dark.inverse };
}

function rowsToCss(rows: Row[]): string {
  return rows
    .map(([name, light, dark]) => {
      const value =
        dark === null ? light : light === dark ? light : `light-dark(${light}, ${dark})`;
      return `  --pico-${name}: ${value};`;
    })
    .join("\n");
}

export function themeCss(def: ThemeDef, lookup: Lookup, header: string): string {
  const { rows, darkInverse } = themeRows(def, lookup);
  let css = `${header}\n${SELECTOR} {\n${rowsToCss(rows)}\n}\n`;
  if (darkInverse === "black") css += `\n${LOADING_BLACK}\n`;
  return css;
}

// The built-in theme named `name`.
export function builtInTheme(name: string, header: string): string {
  const def = themes[name];
  if (!def) throw new Error(`Unknown theme: ${name}`);
  return themeCss(def, (step: number) => paletteTriple(`${name}-${step}`), header);
}

// Custom theme from one color ("#e5484d", any CSS color) or { color } or { hue, chroma }.
// Builds a 19-step scale with the azure lightness curve, azure's chroma shape scaled to the
// requested chroma and clamped to sRGB, then applies the azure step mapping.
export type ThemeInput = string | { color: string } | { hue: number; chroma: number };

export function buildTheme(input: ThemeInput, { name = "custom" } = {}) {
  let hue: number;
  let chroma: number;
  const source = typeof input === "string" ? { color: input } : input;
  if ("color" in source) {
    const parsed = parse(source.color);
    if (!parsed) throw new Error(`Cannot parse color: ${source.color}`);
    const { c, h } = toOklch(parsed);
    chroma = c ?? 0;
    hue = h ?? 0;
  } else {
    ({ hue, chroma } = source);
  }
  if (typeof hue !== "number" || typeof chroma !== "number") {
    throw new Error("Theme needs a color, or both hue and chroma");
  }
  const azure = palette.hues.azure as Record<string, Triple>;
  const peak = Math.max(...STEPS.map((s) => (azure[s] as Triple)[1]));
  const scale: Record<number, Triple> = {};
  for (const step of STEPS) {
    const [l, c] = azure[step] as Triple;
    scale[step] = [l, fitChroma(l, chroma * (c / peak), hue), round(hue, 2)];
  }
  const inverseFor = (bg: Triple): Inverse =>
    contrast(WHITE, bg) >= contrast(BLACK, bg) ? "white" : "black";
  const azureDef = themes.azure as ThemeDef;
  const at = (n: number | { rgb: Triple }) => scale[n as number] as Triple;
  const def: ThemeDef = {
    ...azureDef,
    inverse: {
      light: inverseFor(at(azureDef.light.background)),
      dark: inverseFor(at(azureDef.dark.background)),
    },
  };
  const header = `/* Custom theme ${name} (hue ${round(hue, 2)}, chroma ${round(chroma, 4)}) */`;
  const css = themeCss(def, (step: number) => scale[step] as Triple, header);
  return { name, hue: round(hue, 2), chroma: round(chroma, 4), scale, css };
}
