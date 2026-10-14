// Cuts one element out of a fixture page. A snippet is named by the start of its markup, so the
// manifest follows the fixtures when they change and fails loudly when the anchor is gone.
const VOID = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "source",
  "track",
  "wbr",
]);

type Tag = { name: string; closing: boolean; selfClosing: boolean; end: number };

// The tag that starts at `at`, with its end index. Quoted attribute values may hold ">".
function tagAt(html: string, at: number): Tag | null {
  const m = /^<(\/?)([a-zA-Z][\w-]*)/.exec(html.slice(at, at + 64));
  if (!m) return null;
  let i = at + m[0].length;
  let quote = "";
  for (; i < html.length; i++) {
    const ch = html[i] as string;
    if (quote) {
      if (ch === quote) quote = "";
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === ">") break;
  }
  return {
    name: (m[2] as string).toLowerCase(),
    closing: m[1] === "/",
    selfClosing: html[i - 1] === "/",
    end: i + 1,
  };
}

/** Index just after the element that starts at `start`. */
function elementEnd(html: string, start: number): number {
  const open = tagAt(html, start);
  if (!open) throw new Error(`No tag at ${html.slice(start, start + 40)}`);
  if (open.selfClosing || VOID.has(open.name)) return open.end;
  let depth = 1;
  let i = open.end;
  while (i < html.length) {
    const next = html.indexOf("<", i);
    if (next === -1) break;
    if (html.startsWith("<!--", next)) {
      i = html.indexOf("-->", next) + 3;
      continue;
    }
    const tag = tagAt(html, next);
    if (!tag) {
      i = next + 1;
      continue;
    }
    i = tag.end;
    if (tag.name !== open.name || VOID.has(tag.name) || tag.selfClosing) continue;
    depth += tag.closing ? -1 : 1;
    if (depth === 0) return i;
  }
  throw new Error(`Unclosed <${open.name}>`);
}

// Whitespace in the anchor matches any run of whitespace, and nothing between two tags matches
// any gap, so the anchor can be written on one line.
function anchor(text: string): RegExp {
  const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(escaped.replace(/>\s*</g, ">\\s*<").replace(/ +/g, "\\s+"));
}

function locate(html: string, find: string): number {
  const match = anchor(find).exec(html);
  if (!match) throw new Error(`Snippet not found: ${find}`);
  return match.index;
}

function dedent(text: string, indent: string): string {
  return text
    .split("\n")
    .map((line) => (line.startsWith(indent) ? line.slice(indent.length) : line.trimStart()))
    .join("\n");
}

function cleanup(text: string, keepStyle: boolean): string {
  let out = text;
  if (!keepStyle) out = out.replace(/ style="[^"]*"/g, "");
  out = out.replace(/\b(src|poster)="data:[^"]*"/g, '$1="image.svg"');
  return out
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

export type SnippetOptions = {
  /** Start of the element's markup, for example `<label> Email <input`. */
  find: string;
  /** Elements to cut out of the result, each named the same way. */
  remove?: string[];
  keepStyle?: boolean;
};

/** The element that starts at `find`, with the elements named in `remove` cut out. */
export function snippet(html: string, options: SnippetOptions): string {
  const source = html.replace(/\r\n/g, "\n");
  const start = locate(source, options.find);
  const lineStart = source.lastIndexOf("\n", start) + 1;
  const indent = /^[ \t]*/.exec(source.slice(lineStart, start))?.[0] ?? "";
  let text = source.slice(start, elementEnd(source, start));
  for (const find of options.remove ?? []) {
    const at = locate(text, find);
    const from = text.lastIndexOf("\n", at) + 1;
    const cutFrom = text.slice(from, at).trim() === "" ? from : at;
    const to = elementEnd(text, at);
    text = text.slice(0, cutFrom) + text.slice(text[to] === "\n" ? to + 1 : to);
  }
  return cleanup(dedent(text, indent), options.keepStyle === true);
}

/** The text of the nth <script> without src, dedented. */
export function script(html: string, nth = 0): string {
  const source = html.replace(/\r\n/g, "\n");
  const matches = [...source.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)];
  const body = matches[nth]?.[1];
  if (body === undefined) throw new Error(`No script ${nth}`);
  const lines = body
    .split("\n")
    .filter((l, i, all) => !(l.trim() === "" && (i === 0 || i === all.length - 1)));
  const indent = Math.min(
    ...lines.filter((l) => l.trim() !== "").map((l) => /^ */.exec(l)?.[0].length ?? 0),
  );
  return lines.map((l) => l.slice(indent).trimEnd()).join("\n");
}
