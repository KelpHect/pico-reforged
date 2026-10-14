/**
 * A small, forgiving scanner for the top level of a stylesheet. It finds statements (at-rules and
 * rules) with their text ranges, skipping comments, strings and url(). It never builds a tree:
 * the integrations only need to find imports, `@pico`, `@source` and `@layer pico.*` blocks.
 */

export type Statement = {
  /** Offset of the first character, `end` is just after the closing `;` or `}`. */
  start: number;
  end: number;
  kind: "at" | "rule";
  /** At-rule name in lower case without the "@", empty for a rule. */
  name: string;
  /** Text between the name and the block or semicolon, trimmed, comments removed. */
  prelude: string;
  /** Text inside the braces, undefined for a statement without a block. */
  body?: string;
  /** Offsets of the body inside the source (just after "{" and at "}"). */
  bodyStart?: number;
  bodyEnd?: number;
};

/** Index after the closing quote of the string that starts at `i`. */
function skipString(css: string, i: number): number {
  const quote = css[i] as string;
  let j = i + 1;
  while (j < css.length) {
    const ch = css[j] as string;
    if (ch === "\\") j += 2;
    else if (ch === quote || ch === "\n") return j + 1;
    else j++;
  }
  return css.length;
}

function skipComment(css: string, i: number): number {
  const close = css.indexOf("*/", i + 2);
  return close === -1 ? css.length : close + 2;
}

/** Index after an unquoted url( ... ), which may hold characters such as ";" and "{". */
function skipUrl(css: string, i: number): number {
  let j = i + 4;
  while (css[j] === " " || css[j] === "\n" || css[j] === "\t") j++;
  if (css[j] === '"' || css[j] === "'") return j; // quoted: the caller handles the string
  const close = css.indexOf(")", j);
  return close === -1 ? css.length : close + 1;
}

const isUrlStart = (css: string, i: number): boolean =>
  (css[i] === "u" || css[i] === "U") &&
  css.slice(i, i + 4).toLowerCase() === "url(" &&
  !/[\w-]/.test(css[i - 1] ?? " ");

/** Index of the "}" that closes the block opened at `open`, or css.length. */
function matchBrace(css: string, open: number): number {
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    const ch = css[i] as string;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return i;
    } else if (ch === '"' || ch === "'") i = skipString(css, i) - 1;
    else if (ch === "/" && css[i + 1] === "*") i = skipComment(css, i) - 1;
    else if (isUrlStart(css, i)) {
      const next = skipUrl(css, i);
      if (next > i) i = next - 1;
    }
  }
  return css.length;
}

/** Removes comments, leaving strings alone. */
export function stripComments(text: string): string {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i] as string;
    if (ch === "/" && text[i + 1] === "*") {
      i = skipComment(text, i) - 1;
      out += " ";
    } else if (ch === '"' || ch === "'") {
      const next = skipString(text, i);
      out += text.slice(i, next);
      i = next - 1;
    } else out += ch;
  }
  return out;
}

/** Splits at `separator` where it is outside strings, parentheses, brackets and braces. */
export function splitTopLevel(text: string, separator: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let from = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i] as string;
    if (ch === '"' || ch === "'") i = skipString(text, i) - 1;
    else if (ch === "(" || ch === "[" || ch === "{") depth++;
    else if (ch === ")" || ch === "]" || ch === "}") depth = Math.max(0, depth - 1);
    else if (ch === separator && depth === 0) {
      parts.push(text.slice(from, i));
      from = i + 1;
    }
  }
  parts.push(text.slice(from));
  return parts;
}

/** The top-level statements of a stylesheet, in source order. */
export function scanStatements(css: string): Statement[] {
  const out: Statement[] = [];
  let i = 0;
  while (i < css.length) {
    const ch = css[i] as string;
    if (/\s/.test(ch) || ch === ";") {
      i++;
      continue;
    }
    if (ch === "/" && css[i + 1] === "*") {
      i = skipComment(css, i);
      continue;
    }
    if (ch === "}") {
      i++;
      continue;
    }
    const start = i;
    // Find the end of the prelude: the first "{" or ";" outside strings, parens and comments.
    let depth = 0;
    let stop = -1;
    let j = i;
    for (; j < css.length; j++) {
      const c = css[j] as string;
      if (c === '"' || c === "'") j = skipString(css, j) - 1;
      else if (c === "/" && css[j + 1] === "*") j = skipComment(css, j) - 1;
      else if (isUrlStart(css, j)) {
        const next = skipUrl(css, j);
        if (next > j) j = next - 1;
      } else if (c === "(" || c === "[") depth++;
      else if (c === ")" || c === "]") depth = Math.max(0, depth - 1);
      else if ((c === "{" || c === ";") && depth === 0) {
        stop = j;
        break;
      }
    }
    if (stop === -1) stop = css.length;
    const head = stripComments(css.slice(start, stop)).trim();
    const isAt = head.startsWith("@");
    const nameMatch = isAt ? /^@([\w-]+)/.exec(head) : null;
    const statement: Statement = {
      start,
      end: stop + 1,
      kind: isAt ? "at" : "rule",
      name: nameMatch ? (nameMatch[1] as string).toLowerCase() : "",
      prelude: nameMatch ? head.slice(nameMatch[0].length).trim() : head,
    };
    if (css[stop] === "{") {
      const close = matchBrace(css, stop);
      statement.body = css.slice(stop + 1, close);
      statement.bodyStart = stop + 1;
      statement.bodyEnd = close;
      statement.end = Math.min(close + 1, css.length);
    } else if (stop >= css.length) statement.end = css.length;
    out.push(statement);
    i = statement.end;
  }
  return out;
}
