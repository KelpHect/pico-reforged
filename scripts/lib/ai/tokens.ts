// Builds ai/tokens.json (W3C Design Tokens, Format Module 2025.10) from the token sources in
// src/tokens, src/themes and src/extras. Nothing is written by hand: the values come from the
// CSS that the generators and the token files already produce.
import { readdirSync, readFileSync } from "node:fs";
import { formatHex } from "culori";
import { EXTRAS } from "../compiler/config.ts";
import { rootDeclarations, splitTop } from "./css.ts";
import { stringify } from "./json.ts";
import type { Declaration } from "./css.ts";

const EXT = "com.rusticstack.pico-reforged";
const DEFAULT_THEME = "azure";

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type Parsed = { type: string; light: Json; dark?: Json };
type Known = { path: string; type: string };
type Lookup = (cssVar: string) => Known | undefined;

type Source = { group: string[]; keyPrefix: string; decls: Declaration[]; file: string };

const GROUP_BY_TYPE: Record<string, string> = {
  color: "color",
  dimension: "dimension",
  number: "number",
  fontFamily: "font-family",
  fontWeight: "font-weight",
  transition: "transition",
  duration: "duration",
  shadow: "shadow",
};

const GROUP_DESCRIPTIONS: Record<string, string> = {
  color:
    "Semantic colors of the page. $value is the light scheme, the dark scheme is in $extensions dark. The primary tokens alias the default theme (azure).",
  dimension: "Spacing, radius, border and outline sizes, in rem.",
  number: "Unitless values: line height and opacities.",
  "font-family": "Font stacks. The stack of a token that ends in an emoji stack has it inlined.",
  "font-weight": "Font weights.",
  transition: "Transition shorthand used by interactive elements.",
  duration: "Time values that are not a full transition.",
  shadow: "Box shadows as DTCG shadow layers. $value is the light scheme.",
  palette:
    "The OKLCH palette behind pico.colors.css, one token per hue and step, plus the main color of each hue.",
  theme:
    "One group per built-in theme with the primary color set it defines. Use these to read or build a theme.",
  extras: "Root tokens of the opt-in extras, one group per extra.",
};

// ---------------------------------------------------------------------------------------------
// Value parsing

const num = (text: string): number => Number(text);
const NUMBER = /^-?(?:\d+\.?\d*|\.\d+)$/;
const DIMENSION = /^(-?(?:\d+\.?\d*|\.\d+))(rem|px)$/;
const DURATION = /^((?:\d+\.?\d*|\.\d+))(ms|s)$/;
const OKLCH =
  /^oklch\(\s*(\d*\.?\d+)\s+(\d*\.?\d+)\s+(\d*\.?\d+|none)\s*(?:\/\s*(\d*\.?\d+))?\s*\)$/;
const VAR_ONLY = /^var\((--pico-[\w-]+)\)$/;

const BEZIER: Record<string, [number, number, number, number]> = {
  ease: [0.25, 0.1, 0.25, 1],
  "ease-in": [0.42, 0, 1, 1],
  "ease-out": [0, 0, 0.58, 1],
  "ease-in-out": [0.42, 0, 0.58, 1],
  linear: [0, 0, 1, 1],
};

// A timing keyword or cubic-bezier(a, b, c, d) as the four control point numbers.
function bezier(text: string): [number, number, number, number] | null {
  const fn = /^cubic-bezier\(([^)]*)\)$/.exec(text);
  if (!fn) return BEZIER[text] ?? null;
  const points = (fn[1] as string).split(",").map((n) => Number(n.trim()));
  return points.length === 4 && points.every(Number.isFinite)
    ? (points as [number, number, number, number])
    : null;
}

function color(raw: string): Json | null {
  if (raw === "transparent") {
    return { colorSpace: "oklch", components: [0, 0, 0], alpha: 0, hex: "#000000" };
  }
  const m = OKLCH.exec(raw);
  if (!m) return null;
  const l = num(m[1] as string);
  const c = num(m[2] as string);
  const h = m[3] === "none" ? 0 : num(m[3] as string);
  const alpha = m[4] === undefined ? 1 : num(m[4]);
  const hex = formatHex({ mode: "oklch", l, c, h });
  return {
    colorSpace: "oklch",
    components: [l, c, h],
    ...(alpha === 1 ? {} : { alpha }),
    hex: hex ?? "#000000",
  };
}

function dimension(raw: string): Json | null {
  if (raw === "0") return { value: 0, unit: "px" };
  const m = DIMENSION.exec(raw);
  return m ? { value: num(m[1] as string), unit: m[2] as string } : null;
}

// One value of a known type, or an alias to a token of that type.
function typed(raw: string, type: "color" | "dimension", lookup: Lookup): Json | null {
  const ref = VAR_ONLY.exec(raw);
  if (ref) {
    const known = lookup(ref[1] as string);
    return known?.type === type ? `{${known.path}}` : null;
  }
  return type === "color" ? color(raw) : dimension(raw);
}

function shadow(raw: string, lookup: Lookup): Parsed | null {
  const light: Json[] = [];
  const dark: Json[] = [];
  let differs = false;
  for (const layer of splitTop(raw, ",")) {
    const parts = splitTop(layer, " ");
    const inset = parts[0] === "inset";
    if (inset) parts.shift();
    if (parts.length < 4 || parts.length > 5) return null;
    const colorText = parts.pop() as string;
    const [x, y, blur, spread = "0"] = parts as [string, string, string, string?];
    const dims = [x, y, blur, spread].map((d) => typed(d, "dimension", lookup));
    if (dims.includes(null)) return null;
    let colors: [Json | null, Json | null];
    const pair = /^light-dark\((.*)\)$/.exec(colorText);
    if (pair) {
      const args = splitTop(pair[1] as string, ",");
      if (args.length !== 2) return null;
      colors = [
        typed(args[0] as string, "color", lookup),
        typed(args[1] as string, "color", lookup),
      ];
      differs = true;
    } else {
      const one = typed(colorText, "color", lookup);
      colors = [one, one];
    }
    if (colors[0] === null || colors[1] === null) return null;
    const make = (c: Json): Json => ({
      color: c,
      offsetX: dims[0] as Json,
      offsetY: dims[1] as Json,
      blur: dims[2] as Json,
      spread: dims[3] as Json,
      ...(inset ? { inset: true } : {}),
    });
    light.push(make(colors[0]));
    dark.push(make(colors[1]));
  }
  if (light.length === 0) return null;
  const pick = (layers: Json[]): Json => (layers.length === 1 ? (layers[0] as Json) : layers);
  return { type: "shadow", light: pick(light), ...(differs ? { dark: pick(dark) } : {}) };
}

function single(
  name: string,
  raw: string,
  lookup: Lookup,
  rawOf: (cssVar: string) => string | undefined,
): Parsed | null {
  const ref = VAR_ONLY.exec(raw);
  if (ref) {
    const known = lookup(ref[1] as string);
    return known ? { type: known.type, light: `{${known.path}}` } : null;
  }
  const c = typed(raw, "color", lookup);
  if (c !== null) return { type: "color", light: c };
  if (name.startsWith("--pico-font-family")) {
    const families: string[] = [];
    for (const entry of splitTop(raw, ",")) {
      const inner = VAR_ONLY.exec(entry);
      if (inner) {
        const text = rawOf(inner[1] as string);
        if (text === undefined || text.includes("var(")) return null;
        families.push(...splitTop(text, ",").map((f) => f.replace(/^["']|["']$/g, "")));
      } else families.push(entry.replace(/^["']|["']$/g, ""));
    }
    return { type: "fontFamily", light: families };
  }
  const d = dimension(raw);
  if (d !== null) return { type: "dimension", light: d };
  const t = /^((?:\d+\.?\d*|\.\d+))(ms|s)\s+(.+)$/.exec(raw);
  const curve = t ? bezier(t[3] as string) : null;
  if (t && curve) {
    return {
      type: "transition",
      light: {
        duration: { value: num(t[1] as string), unit: t[2] as string },
        delay: { value: 0, unit: "s" },
        timingFunction: curve as Json,
      },
    };
  }
  const du = DURATION.exec(raw);
  if (du)
    return { type: "duration", light: { value: num(du[1] as string), unit: du[2] as string } };
  if (NUMBER.test(raw)) {
    return name === "--pico-font-weight"
      ? { type: "fontWeight", light: num(raw) }
      : { type: "number", light: num(raw) };
  }
  if (/^\d/.test(raw) || raw.startsWith("-")) return shadow(raw, lookup);
  return null;
}

function parse(
  name: string,
  raw: string,
  lookup: Lookup,
  rawOf: (cssVar: string) => string | undefined,
): Parsed | null {
  const pair = /^light-dark\((.*)\)$/.exec(raw);
  if (pair && splitTop(pair[1] as string, ",").length === 2) {
    const [a, b] = splitTop(pair[1] as string, ",") as [string, string];
    const light = single(name, a, lookup, rawOf);
    const dark = single(name, b, lookup, rawOf);
    if (!light || !dark || light.type !== dark.type) return null;
    return JSON.stringify(light.light) === JSON.stringify(dark.light)
      ? light
      : { type: light.type, light: light.light, dark: dark.light };
  }
  return single(name, raw, lookup, rawOf);
}

// ---------------------------------------------------------------------------------------------
// Descriptions for tokens that have no comment in the source

const FAMILY: Record<string, string> = {
  primary: "Primary",
  secondary: "Secondary",
  contrast: "Contrast",
};
const ROLE: Record<string, string> = {
  background: "fill color",
  border: "border color",
  underline: "link underline color",
  inverse: "text color on a filled background",
  focus: "focus ring color",
  hover: "hover color",
};

function describe(name: string): string | undefined {
  const key = name.replace(/^--pico-/, "");
  const parts = key.split("-");
  const family = FAMILY[parts[0] as string];
  if (family) {
    const hover = parts.includes("hover");
    const role = ROLE[parts.at(-1) as string];
    if (parts.length === 1) return `${family} text and link color.`;
    if (role) return `${family}${hover && role !== ROLE.hover ? " hover" : ""} ${role}.`;
  }
  const swatch = /^color-([a-z]+)(?:-(d+))?$/.exec(key);
  if (swatch && !["light", "dark", "black", "white"].includes(swatch[1] as string)) {
    return swatch[2]
      ? `Palette ${swatch[1] as string}, step ${swatch[2]}.`
      : `Main color of the ${swatch[1] as string} hue.`;
  }
  const heading = /^h([1-6])-color$/.exec(key);
  if (heading) return `Color of h${heading[1] as string}.`;
  const rules: [RegExp, string][] = [
    [/^background-color$/, "Page background color."],
    [/^color$/, "Default text color."],
    [/^muted-color$/, "Muted text color for secondary information."],
    [/^muted-border-color$/, "Border color of separators and quiet surfaces."],
    [/^box-shadow$/, "Default elevated shadow."],
    [/^form-element-.*invalid/, "Form element color in the invalid state."],
    [/^form-element-.*valid/, "Form element color in the valid state."],
    [/^form-element-/, "Form element color."],
    [/^card-border-radius$/, "Corner radius of cards, menus, dialogs and other surfaces."],
    [/^card-/, "Card surface."],
    [/^dropdown-/, "Dropdown menu surface."],
    [/^modal-/, "Modal overlay."],
    [/^code-/, "Code, kbd and samp."],
    [/^table-/, "Table."],
    [/^switch-/, "Switch control."],
    [/^range-/, "Range input."],
    [/^accordion-/, "Accordion summary."],
    [/^progress-/, "Progress bar."],
    [/^tooltip-/, "Tooltip bubble."],
    [/^mark-/, "mark element."],
    [/^ins-|^del-/, "ins and del elements."],
    [/^blockquote-/, "blockquote element."],
    [/^text-selection-color$/, "Background of selected text."],
    [
      /^switch-thumb-box-shadow$/,
      "Soft shadow under the switch thumb when the theme fill is light.",
    ],
    [/^font-family-emoji$/, "Emoji font stack, appended to the text stacks."],
    [/^font-family-sans-serif$/, "System sans-serif stack."],
    [/^font-family-monospace$/, "System monospace stack."],
    [/^font-family$/, "Font stack of the page."],
    [/^line-height$/, "Line height of body text."],
    [/^font-weight$/, "Font weight of body text."],
    [/^font-size$/, "Root font size. Steps up once on wide screens, see responsive."],
    [/^text-underline-offset$/, "Offset of link underlines."],
    [/^border-radius$/, "Corner radius of controls and cards."],
    [/^border-width$/, "Width of borders."],
    [/^outline-width$/, "Width of focus rings."],
    [/^transition$/, "Transition of interactive elements."],
    [/^spacing$/, "Base spacing unit."],
    [/^typography-spacing-vertical$/, "Vertical space between text blocks."],
    [/^block-spacing-(vertical|horizontal)$/, "Padding of sections and cards."],
    [/^grid-(column|row)-gap$/, "Gap of .grid."],
    [/^form-element-spacing-(vertical|horizontal)$/, "Padding inside form controls."],
    [
      /^container-max-width$/,
      "Width of .container. Grows with the viewport width, see responsive.",
    ],
    [/^(button|group)-.*box-shadow/, "Box shadow of buttons and groups."],
    [/^form-element-disabled-opacity$/, "Opacity of disabled controls."],
    [/^loading-spinner-opacity$/, "Opacity of the loading spinner."],
    [/^modal-overlay-backdrop-filter$/, "Backdrop filter of the modal overlay."],
    [/^scrollbar-width$/, "Scrollbar width that a modal compensates for."],
    [/^nav-/, "Spacing and divider of nav."],
    [/^icon-/, "Inline SVG icon used as a background image."],
    [/^color-(light|dark|black|white)$/, "Palette base color."],
  ];
  const hit = rules.find(([re]) => re.test(key));
  return hit?.[1];
}

// ---------------------------------------------------------------------------------------------
// Assembly

type Entry = {
  decl: Declaration;
  dark?: Declaration;
  responsive: Declaration[];
};

function collect(decls: Declaration[]): Map<string, Entry> {
  const map = new Map<string, Entry>();
  for (const decl of decls) {
    const entry = map.get(decl.name) ?? { decl, responsive: [] };
    if (decl.media) entry.responsive.push(decl);
    else if (decl.scope === "dark") entry.dark = decl;
    else if (!map.has(decl.name)) entry.decl = decl;
    map.set(decl.name, entry);
  }
  return map;
}

function files(root: URL, dir: string): string[] {
  return readdirSync(new URL(`src/${dir}/`, root))
    .filter((f) => f.endsWith(".css"))
    .toSorted();
}

function sources(root: URL): Source[] {
  const read = (path: string): Declaration[] =>
    rootDeclarations(readFileSync(new URL(path, root), "utf8"));
  const out: Source[] = [];
  const add = (group: string[], keyPrefix: string, file: string): void =>
    void out.push({ group, keyPrefix, decls: read(file), file });
  const flat: string[] = [];
  for (const file of ["core", "scheme", "scheme-images"]) flat.push(`src/tokens/${file}.css`);
  for (const file of flat) add([], "--pico-", file);
  add(["palette"], "--pico-color-", "src/tokens/palette.css");
  for (const file of files(root, "themes")) {
    add(["theme", file.replace(/\.css$/, "")], "--pico-", `src/themes/${file}`);
  }
  for (const extra of EXTRAS) add(["extras", extra], "--pico-", `src/extras/${extra}.css`);
  return out;
}

function place(tree: { [key: string]: Json }, path: string[], key: string, value: Json): void {
  let node = tree;
  for (const part of path) {
    node[part] ??= {};
    node = node[part] as { [key: string]: Json };
  }
  node[key] = value;
}

export function generateTokens(root: URL): string {
  const all = sources(root);

  // Pass 1: every declaration by name, so font stacks and aliases can be followed. Only the
  // default build sees the flat sources and the default theme.
  const flatSources = all.filter((s) => s.group.length === 0 || s.group[0] === "extras");
  const defaultTheme = all.find((s) => s.group[1] === DEFAULT_THEME) as Source;
  const raw = new Map<string, string>();
  for (const s of [...flatSources, defaultTheme]) {
    for (const d of s.decls)
      if (!d.media && d.scope === "base" && !raw.has(d.name)) raw.set(d.name, d.value);
  }
  const rawOf = (cssVar: string): string | undefined => raw.get(cssVar);

  // Which names can be tokens, and where they live. Aliases resolve over several passes.
  const known = new Map<string, Known>();
  const lookup: Lookup = (cssVar) => known.get(cssVar);
  const entries = new Map<string, Entry & { source: Source }>();
  for (const s of [...flatSources, defaultTheme]) {
    for (const [name, entry] of collect(s.decls)) {
      if (!entries.has(name)) entries.set(name, { ...entry, source: s });
    }
  }
  const pathOf = (name: string, source: Source): string => {
    const key = name.replace(source.keyPrefix, "");
    return source.group[0] === "extras" ? `extras.${source.group[1] as string}.${key}` : "";
  };
  for (let changed = true; changed;) {
    changed = false;
    for (const [name, entry] of entries) {
      if (known.has(name)) continue;
      const parsed = parse(name, entry.decl.value, lookup, rawOf);
      if (!parsed) continue;
      const key = name.replace(/^--pico-/, "");
      const path =
        entry.source.group[0] === "extras"
          ? pathOf(name, entry.source)
          : `${GROUP_BY_TYPE[parsed.type] as string}.${key}`;
      known.set(name, { path, type: parsed.type });
      changed = true;
    }
  }

  // Pass 2: write the tree. Palette and themes are parsed on their own.
  const tree: { [key: string]: Json } = {};
  const cssOnly: { [key: string]: Json } = {};
  const emit = (
    path: string[],
    key: string,
    name: string,
    entry: Entry,
    parsed: Parsed,
    forceValue?: Json,
  ): void => {
    const description =
      describe(name) ?? (entry.decl.comment ? `${entry.decl.comment}.` : undefined);
    const ext: { [key: string]: Json } = { cssVar: name };
    let dark = parsed.dark;
    if (entry.dark) {
      const darkParsed = parse(name, entry.dark.value, lookup, rawOf);
      if (darkParsed) dark = darkParsed.light;
    }
    if (forceValue === undefined && dark !== undefined) ext.dark = dark;
    if (entry.responsive.length > 0) {
      ext.responsive = entry.responsive.map((r) => ({
        minWidth: `${/(\d+)px/.exec(r.media ?? "")?.[1] ?? ""}px`,
        css: r.value,
      }));
    }
    place(tree, path, key, {
      $type: parsed.type,
      $value: forceValue ?? parsed.light,
      ...(description ? { $description: description } : {}),
      $extensions: { [EXT]: ext },
    });
  };

  const sourceOrder = (s: Source): number => (s.group[0] === "theme" ? 1 : 0);
  for (const s of all.toSorted((a, b) => sourceOrder(a) - sourceOrder(b))) {
    const own = collect(s.decls);
    const isFlat = s.group.length === 0;
    for (const [name, entry] of own) {
      const key = name.replace(s.keyPrefix, "");
      if (isFlat || s.group[0] === "extras") {
        const info = known.get(name);
        const parsed = parse(name, entry.decl.value, lookup, rawOf);
        if (info && parsed) {
          const path = info.path.split(".");
          emit(path.slice(0, -1), path.at(-1) as string, name, entry, parsed);
        } else if (!cssOnly[name]) {
          cssOnly[name] = cssEntry(entry, s.file);
        }
        continue;
      }
      // palette and themes
      const parsed = parse(name, entry.decl.value, () => undefined, rawOf);
      if (!parsed) {
        cssOnly[name] ??= cssEntry(entry, s.file);
        continue;
      }
      emit(s.group, key, name, entry, parsed);
    }
  }

  // Top-level aliases of the default theme so var(--pico-primary) style names resolve.
  for (const [name, entry] of collect(defaultTheme.decls)) {
    const parsed = parse(name, entry.decl.value, () => undefined, rawOf);
    if (!parsed) continue;
    const group = GROUP_BY_TYPE[parsed.type] as string;
    const key = name.replace(/^--pico-/, "");
    emit([group], key, name, entry, parsed, `{theme.${DEFAULT_THEME}.${key}}`);
  }

  const ordered: { [key: string]: Json } = {
    $description:
      "Design tokens of Pico Reforged (W3C Design Tokens Format Module 2025.10), generated from src/tokens, src/themes and src/extras by scripts/generate-ai.ts. See ai/README.md.",
  };
  const order = [
    "color",
    "dimension",
    "number",
    "font-family",
    "font-weight",
    "transition",
    "duration",
    "shadow",
    "palette",
    "theme",
    "extras",
  ];
  for (const group of order) {
    const node = tree[group] as { [key: string]: Json } | undefined;
    if (!node) continue;
    ordered[group] = { $description: GROUP_DESCRIPTIONS[group] as string, ...node };
  }
  ordered.$extensions = {
    [EXT]: {
      defaultTheme: DEFAULT_THEME,
      themes: Object.keys(tree.theme as object),
      cssOnly: Object.fromEntries(
        Object.entries(cssOnly).toSorted(([a], [b]) => a.localeCompare(b)),
      ),
    },
  };
  return `${stringify(ordered)}
`;
}

function cssEntry(entry: Entry, file: string): Json {
  return {
    css: entry.decl.value,
    ...(entry.dark ? { dark: entry.dark.value } : {}),
    ...(entry.responsive.length > 0
      ? {
          responsive: entry.responsive.map((r) => ({
            minWidth: `${/(\d+)px/.exec(r.media ?? "")?.[1] ?? ""}px`,
            css: r.value,
          })),
        }
      : {}),
    ...(entry.decl.comment ? { description: `${entry.decl.comment}.` } : {}),
    source: file,
  };
}
