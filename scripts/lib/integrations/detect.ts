import { EXTRAS } from "../compiler/config.ts";
import { scanStatements, stripComments } from "./css-scan.ts";
import type { Statement } from "./css-scan.ts";
import { applyPicoBlock, applySourceRule, emptyConfig, PICO_PACKAGE } from "./pico-config.ts";
import type { PicoConfig } from "./pico-config.ts";

export type ImportKind = "main" | "classless" | "colors" | "extras" | "extra";

/** One `@import` of the package. */
export type PicoImport = {
  kind: ImportKind;
  /** For kind "extra": the extra's name. */
  extra?: string;
  /** What follows the specifier: layer(...), supports(...), a media query. */
  suffix: string;
  statement: Statement;
};

export type RootParse = {
  imports: PicoImport[];
  config: PicoConfig;
  /** Statements to cut out of the source, sorted by position. */
  cuts: Statement[];
  /** Where the compiled CSS goes: just after the leading imports and layer statements. */
  insertAt: number;
  /** True when the file also imports Tailwind, which reads `@source` itself. */
  tailwind: boolean;
};

/** Cheap check before any parsing: does the text mention the package at all. */
export const mentionsPico = (css: string): boolean => css.includes(PICO_PACKAGE);

/**
 * The specifier and the rest of an `@import` prelude: `url("x") layer(a)`, `"x" screen`, `url(x)`.
 */
function readImport(prelude: string): { specifier: string; suffix: string } | undefined {
  const text = stripComments(prelude).trim();
  const quoted = /^(?:url\(\s*)?(["'])((?:\\.|(?!\1).)*)\1\s*(?:\))?/i.exec(text);
  if (quoted) {
    const rest = text.slice(quoted[0].length).trim();
    return { specifier: quoted[2] as string, suffix: rest };
  }
  const bare = /^url\(\s*([^)\s]+)\s*\)/i.exec(text);
  if (bare) return { specifier: bare[1] as string, suffix: text.slice(bare[0].length).trim() };
  return undefined;
}

/** Maps `@rusticstack/pico-reforged/...` to what it asks for. Undefined for other specifiers. */
export function classifySpecifier(
  specifier: string,
): { kind: ImportKind; extra?: string } | undefined {
  if (specifier !== PICO_PACKAGE && !specifier.startsWith(`${PICO_PACKAGE}/`)) return undefined;
  const sub = specifier
    .slice(PICO_PACKAGE.length)
    .replace(/^\//, "")
    .replace(/\.css$/, "");
  // Files the package exports as they are (css/pico.jade.min.css, package.json) and its JS entries
  // are ordinary imports for the bundler, not Pico roots.
  if (/^(?:css|src|dist)\//.test(sub) || ["package.json", "vite", "postcss"].includes(sub)) {
    return undefined;
  }
  switch (sub) {
    case "":
      return { kind: "main" };
    case "classless":
      return { kind: "classless" };
    case "colors":
      return { kind: "colors" };
    case "extras":
      return { kind: "extras" };
    default: {
      const m = /^extras\/([\w-]+)$/.exec(sub);
      if (m) {
        if (!EXTRAS.includes(m[1] as string)) {
          throw new Error(
            `Unknown extra "${m[1]}" in @import "${specifier}". Valid extras: ${EXTRAS.join(", ")}`,
          );
        }
        return { kind: "extra", extra: m[1] as string };
      }
      throw new Error(
        `Unknown Pico Reforged import "${specifier}". Use "${PICO_PACKAGE}", "/classless", "/colors", "/extras" or "/extras/<name>"`,
      );
    }
  }
}

const TAILWIND_IMPORT = /^(?:tailwindcss)(?:\/|$)/;

/**
 * Finds a root: a stylesheet that imports Pico Reforged. Returns undefined when it does not.
 * Also reads the `@pico` blocks and the `@source` rules of the file into `config`.
 */
export function parseRoot(css: string): RootParse | undefined {
  if (!mentionsPico(css)) return undefined;
  const statements = scanStatements(css);
  const imports: PicoImport[] = [];
  const config = emptyConfig();
  const cuts: Statement[] = [];
  const sourceRules: Statement[] = [];
  let tailwind = false;
  for (const statement of statements) {
    if (statement.kind !== "at") continue;
    if (statement.name === "import") {
      const parsed = readImport(statement.prelude);
      if (!parsed) continue;
      if (TAILWIND_IMPORT.test(parsed.specifier)) tailwind = true;
      const found = classifySpecifier(parsed.specifier);
      if (!found) continue;
      const entry: PicoImport = { kind: found.kind, suffix: parsed.suffix, statement };
      if (found.extra) entry.extra = found.extra;
      imports.push(entry);
      cuts.push(statement);
    } else if (statement.name === "pico") {
      cuts.push(statement);
    } else if (statement.name === "source") {
      sourceRules.push(statement);
    }
  }
  if (imports.length === 0) return undefined;

  // `@pico` and `@source` only count in a file that is a root. Everything is applied in order.
  for (const statement of statements) {
    if (statement.kind !== "at") continue;
    if (statement.name === "pico") {
      if (statement.body === undefined)
        throw new Error("@pico needs a block: @pico { theme: jade; }");
      applyPicoBlock(config, statement.body);
    } else if (statement.name === "source") {
      applySourceRule(config, statement.prelude);
    }
  }
  if (!tailwind) cuts.push(...sourceRules);
  cuts.sort((a, b) => a.start - b.start);

  // The compiled CSS goes after the leading @charset, @import and @layer statements.
  let insertAt = 0;
  for (const statement of statements) {
    const leading =
      statement.kind === "at" &&
      (statement.name === "charset" ||
        statement.name === "import" ||
        statement.name === "pico" ||
        statement.name === "source" ||
        (statement.name === "layer" && statement.body === undefined));
    if (!leading) break;
    insertAt = statement.end;
  }
  return { imports, config, cuts, insertAt, tailwind };
}

/** The suffix of an import as a wrapper: `layer(base)` gives `@layer base {`. */
export function wrapperFor(suffix: string): { open: string; close: string } | undefined {
  let rest = suffix.trim();
  if (!rest) return undefined;
  const opens: string[] = [];
  const layer = /^layer(?:\(\s*([^)]*?)\s*\))?(?=\s|$)/i.exec(rest);
  if (layer) {
    opens.push(layer[1] ? `@layer ${layer[1]} {` : "@layer {");
    rest = rest.slice(layer[0].length).trim();
  }
  const supports = /^supports\(([\s\S]*)\)(?=\s|$)/i.exec(rest);
  if (supports) {
    // supports(...) holds balanced parentheses; find the one that closes it
    let depth = 0;
    let end = -1;
    for (let i = 0; i < rest.length; i++) {
      if (rest[i] === "(") depth++;
      else if (rest[i] === ")" && --depth === 0) {
        end = i;
        break;
      }
    }
    if (end > 0) {
      const inner = rest.slice("supports(".length, end).trim();
      opens.push(`@supports ${/^[\w-]+\s*:/.test(inner) ? `(${inner})` : inner} {`);
      rest = rest.slice(end + 1).trim();
    }
  }
  if (rest) opens.push(`@media ${rest} {`);
  if (opens.length === 0) return undefined;
  return { open: `${opens.join("\n")}\n`, close: `\n${"}".repeat(opens.length)}\n` };
}
