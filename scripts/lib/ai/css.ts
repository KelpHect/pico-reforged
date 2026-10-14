// Small readers for the plain CSS in src/: custom property declarations in root blocks (with
// their comments), and the var() references and declared names of a file via Lightning CSS.
import { transform } from "lightningcss";

export type Declaration = {
  name: string;
  value: string;
  /** The comment right above the declaration, or the last section comment in the block. */
  comment?: string;
  /** Width queries the declaration sits in, such as "(width >= 576px)". */
  media?: string;
  /** "base" for :root, :host and [data-theme]; "dark" for [data-theme="dark"]; "light" likewise. */
  scope: "base" | "light" | "dark";
};

const COMMENT = /\/\*([\s\S]*?)\*\//g;

/** Collapse whitespace and trim the padding inside parentheses. */
export function squash(value: string): string {
  return value.replace(/\s+/g, " ").replace(/\(\s+/g, "(").replace(/\s+\)/g, ")").trim();
}

/** Split at a separator that is outside parentheses and quotes. */
export function splitTop(text: string, sep: "," | " "): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote = "";
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i] as string;
    if (quote) {
      if (ch === quote) quote = "";
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (depth === 0 && (sep === " " ? /\s/.test(ch) : ch === sep)) {
      parts.push(text.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(text.slice(start));
  return parts.map((p) => p.trim()).filter((p) => p !== "");
}

type Block = { prelude: string; body: string };

// Top-level blocks and statements of a stylesheet body. Comments stay in the text.
function blocks(css: string): Block[] {
  const out: Block[] = [];
  let depth = 0;
  let quote = "";
  let start = 0;
  let open = -1;
  for (let i = 0; i < css.length; i++) {
    const ch = css[i] as string;
    if (quote) {
      if (ch === quote) quote = "";
      continue;
    }
    if (ch === "/" && css[i + 1] === "*") {
      i = css.indexOf("*/", i + 2) + 1;
      if (i === 0) break;
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "{") {
      if (depth === 0) open = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) {
        out.push({
          prelude: css.slice(start, open).replace(COMMENT, "").trim(),
          body: css.slice(open + 1, i),
        });
        start = i + 1;
      }
    } else if (ch === ";" && depth === 0) start = i + 1;
  }
  return out;
}

function scopeOf(selector: string): Declaration["scope"] | null {
  const items = selector
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (items.length === 0) return null;
  if (items.some((s) => s === ":root" || s === ":host")) return "base";
  if (items.every((s) => s === '[data-theme="dark"]')) return "dark";
  if (items.every((s) => s === '[data-theme="light"]')) return "light";
  if (items.every((s) => s === "[data-theme]")) return "base";
  return null;
}

function declarationsOf(
  body: string,
  scope: Declaration["scope"],
  media: string | undefined,
): Declaration[] {
  const out: Declaration[] = [];
  let section: string | undefined;
  let depth = 0;
  let quote = "";
  let start = 0;
  const flush = (end: number): void => {
    const raw = body.slice(start, end);
    let comment: string | undefined;
    const text = raw.replace(COMMENT, (_all, inner: string) => {
      comment = squash(inner);
      return "";
    });
    const colon = text.indexOf(":");
    const name = text.slice(0, colon).trim();
    if (comment !== undefined) section = comment;
    if (colon > 0 && name.startsWith("--pico-")) {
      out.push({
        name,
        value: squash(text.slice(colon + 1)),
        ...(section ? { comment: section } : {}),
        ...(media ? { media } : {}),
        scope,
      });
    }
  };
  for (let i = 0; i < body.length; i++) {
    const ch = body[i] as string;
    if (quote) {
      if (ch === quote) quote = "";
    } else if (ch === "/" && body[i + 1] === "*") {
      i = body.indexOf("*/", i + 2) + 1;
      if (i === 0) break;
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === ";" && depth === 0) {
      flush(i);
      start = i + 1;
    }
  }
  flush(body.length);
  return out;
}

/**
 * The --pico-* declarations that sit in :root, :host, [data-theme] and [data-theme="dark"|"light"]
 * blocks, including the ones inside width media queries. Element-scoped declarations are skipped.
 */
export function rootDeclarations(css: string, media?: string): Declaration[] {
  const out: Declaration[] = [];
  for (const { prelude, body } of blocks(css)) {
    if (prelude.startsWith("@media")) {
      const query = squash(prelude.slice("@media".length));
      // The dark scheme media query repeats [data-theme="dark"] for pages without the attribute.
      if (query.includes("prefers-color-scheme")) continue;
      if (query.includes("width")) out.push(...rootDeclarations(body, query));
      continue;
    }
    if (prelude.startsWith("@")) continue;
    const scope = scopeOf(prelude);
    if (scope) out.push(...declarationsOf(body, scope, media));
  }
  return out;
}

/** The first comment of a file, without the delimiters. */
export function headerComment(css: string): string {
  const match = /^\s*\/\*([\s\S]*?)\*\//.exec(css);
  return match ? squash((match[1] as string).replace(/^\s*\*/gm, "")) : "";
}

/** Every --pico-* name a file reads with var() and every one it declares, at any selector. */
export function tokenUse(css: string): { reads: string[]; declares: string[] } {
  const reads = new Set<string>();
  const declares = new Set<string>();
  transform({
    filename: "module.css",
    code: Buffer.from(css),
    errorRecovery: true,
    visitor: {
      Variable(variable) {
        if (variable.name.ident.startsWith("--pico-")) reads.add(variable.name.ident);
      },
      Declaration: {
        custom(declaration) {
          if (declaration.name.startsWith("--pico-")) declares.add(declaration.name);
        },
      },
    },
  });
  return { reads: [...reads].toSorted(), declares: [...declares].toSorted() };
}
