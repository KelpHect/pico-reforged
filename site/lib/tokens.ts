import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Reads ai/tokens.json at build time so the reference tables show the current defaults and
// a light and dark swatch for color tokens.

type Color = { colorSpace: string; components: number[]; alpha?: number; hex: string };
type Dimension = { value: number; unit: string };
type Leaf = {
  $type: string;
  $value: unknown;
  $extensions?: Record<string, { cssVar?: string; dark?: Color }>;
};

export type TokenInfo = {
  /** Default value as CSS text. */
  value: string;
  /** Light and dark colors for color tokens, as CSS colors. */
  light?: string;
  dark?: string;
};

const EXT = "com.rusticstack.pico-reforged";

function color(value: Color): string {
  const [l, c, h] = value.components;
  const alpha = value.alpha !== undefined && value.alpha < 1 ? ` / ${value.alpha}` : "";
  return `oklch(${l} ${c} ${h}${alpha})`;
}

function dimension(value: Dimension): string {
  return value.value === 0 ? "0" : `${value.value}${value.unit}`;
}

function ref(text: string): string {
  return text.replace(/\{([^}]+)\}/g, (_, path: string) => `var(--pico-${path.split(".").pop()})`);
}

function format(leaf: Leaf): string {
  const value = leaf.$value;
  if (typeof value === "string") return ref(value);
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    if (leaf.$type === "fontFamily") return value.map((name) => (/\s/.test(name) ? `"${name}"` : name)).join(", ");
    if (leaf.$type === "shadow") return value.map((layer) => shadow(layer)).join(", ");
    return value.join(" ");
  }
  if (value && typeof value === "object") {
    if ("colorSpace" in value) return color(value as Color);
    if ("unit" in value) return dimension(value as Dimension);
    if (leaf.$type === "shadow") return shadow(value as Record<string, unknown>);
    if (leaf.$type === "transition") {
      const t = value as { duration: Dimension; timingFunction: number[] };
      return `${dimension(t.duration)} cubic-bezier(${t.timingFunction.join(", ")})`;
    }
  }
  return "";
}

function shadow(layer: Record<string, unknown>): string {
  const parts = ["offsetX", "offsetY", "blur", "spread"].map((key) => dimension(layer[key] as Dimension));
  return `${layer.inset ? "inset " : ""}${parts.join(" ")} ${color(layer.color as Color)}`;
}

/**
 * Declared values from the token and extras sources. tokens.json writes a calc() or other
 * derived value as a plain reference, so for those the declaration is the honest default.
 */
function declarations(root: string): Map<string, string> {
  const map = new Map<string, string>();
  const files = [join(root, "src", "tokens", "core.css"), join(root, "src", "themes", "azure.css")];
  const extras = join(root, "src", "extras");
  if (existsSync(extras)) for (const file of readdirSync(extras)) if (file.endsWith(".css")) files.push(join(extras, file));
  for (const file of files) {
    if (!existsSync(file)) continue;
    const css = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const match of css.matchAll(/(--pico-[a-z0-9-]+)\s*:\s*([^;{}]+);/g)) {
      if (!map.has(match[1])) map.set(match[1], match[2].replace(/\s+/g, " ").trim());
    }
  }
  return map;
}

let cache: Map<string, TokenInfo> | null = null;

function load(): Map<string, TokenInfo> {
  if (cache) return cache;
  cache = new Map();
  const candidates = [
    join(process.cwd(), "..", "ai", "tokens.json"),
    join(process.cwd(), "node_modules", "@rusticstack", "pico-reforged", "ai", "tokens.json"),
  ];
  const file = candidates.find((candidate) => existsSync(candidate));
  const declared = declarations(join(process.cwd(), ".."));
  for (const [name, value] of declared) cache.set(name, { value });
  if (!file) return cache;
  const data = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
  const seen = new Set<string>();
  const walk = (node: Record<string, unknown>, path: string[]) => {
    for (const [key, child] of Object.entries(node)) {
      if (key.startsWith("$") || !child || typeof child !== "object") continue;
      // Themes repeat the primary tokens per theme; the azure theme is the site default
      if (path.length === 1 && path[0] === "theme" && key !== "azure") continue;
      const leaf = child as Leaf;
      if ("$value" in leaf) {
        const ext = leaf.$extensions?.[EXT];
        if (!ext?.cssVar) continue;
        const info: TokenInfo = { value: format(leaf) };
        if (leaf.$type === "color" && leaf.$value && typeof leaf.$value === "object") {
          info.light = color(leaf.$value as Color);
          info.dark = ext.dark ? color(ext.dark) : info.light;
          info.value = ext.dark ? `light-dark(${(leaf.$value as Color).hex}, ${ext.dark.hex})` : (leaf.$value as Color).hex;
          if ((leaf.$value as Color).alpha !== undefined) info.value = ext.dark ? `light-dark(${info.light}, ${info.dark})` : info.light;
        }
        // A reference in tokens.json may stand for a calc(); keep the declaration then
        if (typeof leaf.$value === "string" && declared.has(ext.cssVar)) continue;
        if (info.value === `var(${ext.cssVar})`) continue;
        if (!seen.has(ext.cssVar)) {
          seen.add(ext.cssVar);
          cache!.set(ext.cssVar, info);
        }
      } else walk(leaf as unknown as Record<string, unknown>, [...path, key]);
    }
  };
  walk(data, []);
  return cache;
}

export function tokenInfo(name: string): TokenInfo | undefined {
  return load().get(name);
}
