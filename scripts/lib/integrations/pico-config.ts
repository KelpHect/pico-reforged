import { EXTRAS, THEMES } from "../compiler/config.ts";
import type { CompileOptions } from "../compiler/types.ts";
import { expandBraces } from "./glob.ts";
import { splitTopLevel, stripComments } from "./css-scan.ts";

/**
 * CSS-first configuration, written in the stylesheet that imports Pico Reforged:
 *
 *   @import "@rusticstack/pico-reforged";
 *   @pico { theme: jade; extras: tabs badge; scope: none; purge: safe; safelist: aria-busy; }
 *   @source "../content";
 *   @source not "../src/legacy";
 *   @source inline("modal-is-open");
 *
 * Every piece is a plain CSS at-rule, so the file stays valid CSS without the plugin.
 */

export const PICO_PACKAGE = "@rusticstack/pico-reforged";

/** "safe" never drops a rule for a missing tag or attribute value. "auto" is an alias for it. */
export type PurgeMode = "safe" | "aggressive" | "off";

/** What an `@source` line asks for. Paths are as written, resolved by the caller. */
export type SourceRule = { pattern: string; not: boolean };

export type PicoConfig = {
  /** Compiler options set by `@pico`. */
  options: CompileOptions;
  /** classless set by `@pico`, undefined when the block does not say. */
  classless?: boolean;
  purge?: PurgeMode;
  /** Names kept whatever the content says (`safelist` and `@source inline`). */
  safelist: (string | RegExp)[];
  /** Tokens from `@source inline("...")`. They count as if they were found in the content. */
  inline: string[];
  /** `@source "path"` and `@source not "path"`, in order. */
  sources: SourceRule[];
  /** `source: none` turns automatic scanning off, a string sets its base folder. */
  source?: "none" | { base: string };
  /** Path of a CSS theme file, as written (`theme: "./brand.css"`). */
  themeFile?: string;
  warnings: string[];
};

export function emptyConfig(): PicoConfig {
  return { options: {}, safelist: [], inline: [], sources: [], warnings: [] };
}

const BOOLEANS: Record<string, boolean> = {
  true: true,
  false: false,
  on: true,
  off: false,
  yes: true,
  no: false,
};

/** Reads a quoted string, or returns the text unchanged. */
export function unquote(text: string): string {
  const t = text.trim();
  const q = t[0];
  if ((q === '"' || q === "'") && t.endsWith(q) && t.length >= 2) {
    return t.slice(1, -1).replace(/\\(.)/g, "$1");
  }
  return t;
}

/** Splits a value into tokens at spaces and commas, keeping quoted text and parentheses whole. */
export function tokens(value: string): string[] {
  const out: string[] = [];
  let current = "";
  let depth = 0;
  let quote = "";
  for (let i = 0; i < value.length; i++) {
    const ch = value[i] as string;
    if (quote) {
      current += ch;
      if (ch === "\\") current += value[++i] ?? "";
      else if (ch === quote) quote = "";
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
    } else if (ch === "(") {
      depth++;
      current += ch;
    } else if (ch === ")") {
      depth = Math.max(0, depth - 1);
      current += ch;
    } else if (depth === 0 && (/\s/.test(ch) || ch === ",")) {
      if (current) out.push(current);
      current = "";
    } else current += ch;
  }
  if (current) out.push(current);
  return out;
}

/** A safelist token: `/^htmx-/` becomes a RegExp, anything else stays a string. */
function safelistEntry(token: string): string | RegExp {
  const m = /^\/(.+)\/([a-z]*)$/.exec(token);
  if (m) return new RegExp(m[1] as string, m[2]);
  return unquote(token);
}

const COLOR_VALUE = /^(?:#[0-9a-f]{3,8}|(?:rgb|hsl|oklch|oklab|lab|lch|hwb)a?\(.*\))$/i;

export type Declaration = { name: string; value: string };

/** Declarations of an `@pico` block. Comments go, `;` ends a declaration. */
export function parseDeclarations(body: string): Declaration[] {
  const out: Declaration[] = [];
  for (const part of splitTopLevel(stripComments(body), ";")) {
    const text = part.trim();
    if (!text) continue;
    const colon = text.indexOf(":");
    if (colon === -1) throw new Error(`@pico: expected "name: value", found "${text}"`);
    out.push({
      name: text.slice(0, colon).trim().toLowerCase(),
      value: text
        .slice(colon + 1)
        .replace(/\s*!important\s*$/i, "")
        .trim(),
    });
  }
  return out;
}

function bool(name: string, value: string): boolean {
  const v = BOOLEANS[unquote(value).toLowerCase()];
  if (v === undefined) throw new Error(`@pico: "${name}" takes true or false, found "${value}"`);
  return v;
}

function names(value: string): string[] {
  return tokens(value).map(unquote).filter(Boolean);
}

const KNOWN = [
  "theme",
  "classless",
  "classes",
  "extras",
  "scope",
  "exclude",
  "fluid",
  "semantic-container",
  "responsive-spacings",
  "responsive-typography",
  "transitions",
  "important",
  "targets",
  "minify",
  "purge",
  "safelist",
  "source",
];

/** Applies one `@pico { ... }` block to the config. Later blocks win over earlier ones. */
export function applyPicoBlock(config: PicoConfig, body: string): void {
  for (const { name, value } of parseDeclarations(body)) {
    const o = config.options;
    switch (name) {
      case "theme": {
        const text = unquote(value);
        if (COLOR_VALUE.test(text)) o.theme = { color: text };
        else if (THEMES.includes(text)) o.theme = text;
        else if (/\.css$/i.test(text)) config.themeFile = text;
        else {
          throw new Error(
            `@pico: unknown theme "${text}". Use a theme name (${THEMES.join(", ")}), a color or a quoted path to a CSS file`,
          );
        }
        break;
      }
      case "classless":
        config.classless = bool(name, value);
        break;
      case "classes":
        o.classes = bool(name, value);
        break;
      case "extras": {
        const list = names(value);
        if (list.length === 1 && list[0] === "none") o.extras = [];
        else {
          for (const extra of list) {
            if (extra !== "all" && !EXTRAS.includes(extra)) {
              throw new Error(
                `@pico: unknown extra "${extra}". Valid extras: ${EXTRAS.join(", ")}`,
              );
            }
          }
          o.extras = list.includes("all") ? [...EXTRAS] : list;
        }
        break;
      }
      case "scope": {
        const text = unquote(value);
        o.scope = text.toLowerCase() === "none" ? "" : text;
        break;
      }
      case "exclude":
        o.exclude = names(value);
        break;
      case "fluid":
        o.fluid = bool(name, value);
        break;
      case "semantic-container":
        o.semanticContainer = bool(name, value);
        break;
      case "responsive-spacings":
        o.responsiveSpacings = bool(name, value);
        break;
      case "responsive-typography":
        o.responsiveTypography = bool(name, value);
        break;
      case "transitions":
        o.transitions = bool(name, value);
        break;
      case "important":
        o.important = bool(name, value);
        break;
      case "targets":
        o.targets = unquote(value);
        break;
      case "minify":
        o.minify = bool(name, value);
        break;
      case "purge": {
        const v = unquote(value).toLowerCase();
        if (v !== "auto" && v !== "safe" && v !== "aggressive" && v !== "off") {
          throw new Error(`@pico: "purge" takes safe, aggressive or off, found "${value}"`);
        }
        config.purge = v === "auto" ? "safe" : v;
        break;
      }
      case "safelist":
        config.safelist.push(...tokens(value).map(safelistEntry));
        break;
      case "source": {
        const text = unquote(value);
        config.source = text.toLowerCase() === "none" ? "none" : { base: text };
        break;
      }
      default:
        config.warnings.push(
          `@pico: unknown property "${name}" ignored. Valid properties: ${KNOWN.join(", ")}`,
        );
    }
  }
}

/** Reads the quoted strings of an at-rule prelude: `"a" "b"` gives [a, b]. */
function quotedList(text: string): string[] {
  return [...text.matchAll(/"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'/g)].map((m) =>
    (m[1] ?? m[2] ?? "").replace(/\\(.)/g, "$1"),
  );
}

/**
 * Applies one `@source` prelude. Forms: `"path"`, `not "path"`, `inline("a b {c,d}")`.
 * `not inline(...)` has no meaning here (nothing is generated) and only adds a warning.
 */
export function applySourceRule(config: PicoConfig, prelude: string): void {
  const text = prelude.trim();
  const inline = /^(not\s+)?inline\s*\(([\s\S]*)\)$/i.exec(text);
  if (inline) {
    if (inline[1]) {
      config.warnings.push(
        "@source not inline(...) is not supported: Pico Reforged ships fixed CSS, so there is nothing to block. Use @source not to leave files out of the scan",
      );
      return;
    }
    for (const entry of quotedList(inline[2] as string)) {
      for (const token of entry.split(/\s+/).filter(Boolean)) {
        for (const name of expandBraces(token)) {
          config.inline.push(name);
          config.safelist.push(name);
        }
      }
    }
    return;
  }
  const negated = /^not\s+/i.test(text);
  const paths = quotedList(negated ? text.replace(/^not\s+/i, "") : text);
  if (paths.length === 0) {
    throw new Error(
      `@source: expected a quoted path, not "path" or inline("names"), found "${prelude}"`,
    );
  }
  for (const pattern of paths) config.sources.push({ pattern, not: negated });
}
