/** A parsed opening tag: its name, its attributes (value undefined for a bare attribute) and where it ends. */
export type TagMatch = {
  name: string;
  attrs: { name: string; value: string | undefined; dynamic: boolean }[];
  end: number;
};

const isSpace = (ch: string | undefined): boolean =>
  ch === " " || ch === "\n" || ch === "\t" || ch === "\r" || ch === "\f";
const NAME_END = /[\s=<>"'/]/;

/** Skips a { ... } expression with nested braces and strings. Returns the index after the closing brace, or -1. */
function skipBraces(text: string, start: number): number {
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    const ch = text[i] as string;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return i + 1;
    } else if (ch === '"' || ch === "'" || ch === "`") {
      const close = text.indexOf(ch, i + 1);
      if (close === -1) return -1;
      i = close;
    }
  }
  return -1;
}

/**
 * Reads the opening tag that starts at `start` (a "<"). It ends at the first ">" that is not
 * inside a quoted value or a {...} expression, so `a > b` and `() => go()` do not cut it short.
 * Returns undefined when the text is not a tag (for example `i<n` in script).
 */
export function readTag(text: string, start: number): TagMatch | undefined {
  let i = start + 1;
  if (!/[a-zA-Z]/.test(text[i] ?? "")) return undefined;
  const nameStart = i;
  while (i < text.length && /[\w:-]/.test(text[i] as string)) i++;
  const name = text.slice(nameStart, i);
  const attrs: TagMatch["attrs"] = [];
  while (i < text.length) {
    const ch = text[i] as string;
    if (ch === ">") return { name, attrs, end: i + 1 };
    if (ch === "<") return undefined;
    if (isSpace(ch) || ch === "/") {
      i++;
      continue;
    }
    if (ch === '"' || ch === "'") {
      // a stray quoted string between attributes
      const close = text.indexOf(ch, i + 1);
      if (close === -1) return undefined;
      i = close + 1;
      continue;
    }
    if (ch === "{") {
      // JSX spread {...props}
      const next = skipBraces(text, i);
      if (next === -1) return undefined;
      i = next;
      continue;
    }
    if (ch === "=") {
      i++;
      continue;
    }
    const attrStart = i;
    while (i < text.length && !NAME_END.test(text[i] as string)) i++;
    const attrName = text.slice(attrStart, i);
    let j = i;
    while (isSpace(text[j])) j++;
    if (text[j] !== "=") {
      attrs.push({ name: attrName, value: undefined, dynamic: false });
      continue;
    }
    j++;
    while (isSpace(text[j])) j++;
    const q = text[j];
    if (q === '"' || q === "'") {
      const close = text.indexOf(q, j + 1);
      if (close === -1) return undefined;
      const value = text.slice(j + 1, close);
      attrs.push({ name: attrName, value, dynamic: /\$\{|\{\{|\{%/.test(value) });
      i = close + 1;
    } else if (q === "{") {
      const next = skipBraces(text, j);
      if (next === -1) return undefined;
      attrs.push({ name: attrName, value: text.slice(j, next), dynamic: true });
      i = next;
    } else {
      const valueStart = j;
      while (j < text.length && !isSpace(text[j]) && text[j] !== ">") j++;
      const value = text.slice(valueStart, j);
      attrs.push({ name: attrName, value, dynamic: /\$\{|\{\{/.test(value) });
      i = j;
    }
  }
  return undefined;
}
