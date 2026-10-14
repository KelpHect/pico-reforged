import { existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { glob } from "node:fs/promises";
import { readTag } from "./scan-tag.ts";
import { isListPseudo } from "./selector.ts";
import type { Selector, SelectorComponent } from "./selector.ts";
import type { PurgeOptions } from "./types.ts";

/** Marker for an attribute whose values are not known (set from script, or a boolean attribute). */
const ANY = Symbol("any");

export type ContentIndex = {
  tags: Set<string>;
  classes: Set<string>;
  ids: Set<string>;
  attrs: Map<string, Set<string> | typeof ANY>;
  safelist: (string | RegExp)[];
  /** Content globs that matched no file, filled by buildIndex. */
  missed: string[];
  /** Number of files scanned, filled by buildIndex. */
  files: number;
};

/**
 * Attributes the framework itself reads at runtime: theme switching and text direction.
 * They count as present, with any value, in every scan. "open" is toggled by the browser
 * (a click on summary, showModal()), so it cannot be read from markup.
 */
const ALWAYS_PRESENT_ATTRS = ["data-theme", "dir", "open"];
/** Attribute name prefixes that bind the attribute to an expression (Vue, Alpine, Angular). */
const BOUND_PREFIX = /^(?:v-bind:|x-bind:|:)/;
/** html and body always exist. */
/** Identifier-like tokens, with hyphens for class names. */
const IDENT = /[A-Za-z_][\w-]*/g;
/** Attributes whose values HTML compares case-insensitively. */
const CASE_INSENSITIVE_ATTRS = new Set([
  "type",
  "dir",
  "method",
  "rel",
  "align",
  "lang",
  "hidden",
  "disabled",
  "checked",
  "readonly",
  "selected",
  "required",
  "multiple",
]);
const ALWAYS_PRESENT_TAGS = ["html", "body", "head"];

export function emptyIndex(safelist: (string | RegExp)[] = []): ContentIndex {
  const index: ContentIndex = {
    tags: new Set(ALWAYS_PRESENT_TAGS),
    classes: new Set(),
    ids: new Set(),
    attrs: new Map(),
    safelist,
    missed: [],
    files: 0,
  };
  for (const name of ALWAYS_PRESENT_ATTRS) index.attrs.set(name, ANY);
  return index;
}

function addAttr(index: ContentIndex, name: string, value: string | typeof ANY): void {
  const key = name.toLowerCase();
  const have = index.attrs.get(key);
  if (have === ANY) return;
  if (value === ANY) {
    index.attrs.set(key, ANY);
    return;
  }
  if (have) have.add(value);
  else index.attrs.set(key, new Set([value]));
}

/**
 * Adds one file's text to the index. It reads markup (tags, attributes with values) and, for
 * classes and attribute names that scripts set, every quoted string: "modal-is-open" in
 * classList.add("modal-is-open") or "aria-busy" in setAttribute("aria-busy", "true").
 */
export function scanText(index: ContentIndex, text: string): void {
  for (let at = text.indexOf("<"); at !== -1; at = text.indexOf("<", at + 1)) {
    const tag = readTag(text, at);
    if (!tag) continue;
    index.tags.add(tag.name.toLowerCase());
    for (const attr of tag.attrs) {
      // Vue, Alpine and Angular bind an attribute to an expression: :aria-busy, v-bind:aria-busy
      const bound = BOUND_PREFIX.exec(attr.name);
      const name = (bound ? attr.name.slice(bound[0].length) : attr.name).toLowerCase();
      if (!name || name.startsWith("@") || name.startsWith("v-on:")) continue;
      if (attr.value === undefined || attr.dynamic || bound) {
        addAttr(index, name, ANY);
        if (attr.value === undefined) continue;
      }
      // Svelte-style class:name={x} directive
      if (name.startsWith("class:")) index.classes.add(name.slice(6));
      if (bound) {
        // :class="{ secondary: on }" holds identifiers, not quoted strings
        if (name === "class") for (const t of attr.value.match(IDENT) ?? []) index.classes.add(t);
        continue;
      }
      if (!attr.dynamic) addAttr(index, name, attr.value);
      if (name === "id") index.ids.add(attr.value.trim());
      if (name === "class" || name === "classname") {
        for (const c of attr.value.split(/\s+/)) if (c) index.classes.add(c);
      }
    }
  }
  for (const m of text.matchAll(/(["'`])((?:\\.|(?!\1)[^\\\n])*)\1/g)) {
    const body = m[2] as string;
    for (const token of body.split(/\s+/)) {
      if (!token) continue;
      index.classes.add(token);
      if (/^[a-z][a-z0-9]*$/.test(token)) index.tags.add(token);
      if (/^(aria|data)-[\w-]+$/.test(token) || /^[a-z]+$/.test(token)) addAttr(index, token, ANY);
    }
  }
  // Plain identifier pass: object keys (clsx({ secondary: on })) and strings a stray
  // apostrophe in prose pairs up wrongly. Wide on purpose, a false keep only costs bytes.
  for (const token of text.match(IDENT) ?? []) {
    index.classes.add(token);
    if (/^(aria|data)-[\w-]+$/.test(token)) addAttr(index, token, ANY);
  }
  // Template and JSX tags that the markup pattern misses are covered by the string scan above
  // and by this unquoted class attribute form.
  for (const m of text.matchAll(/class(?:Name)?\s*=\s*\{?\s*([\w-]+)/g))
    index.classes.add(m[1] as string);
}

export async function buildIndex(options: PurgeOptions): Promise<ContentIndex> {
  if (!Array.isArray(options.content)) {
    throw new Error("purge.content must be an array of file paths or globs");
  }
  const index = emptyIndex(options.safelist ?? []);
  const files = new Set<string>();
  for (const pattern of options.content) {
    let matched = 0;
    const pat =
      process.platform === "win32" && !existsSync(pattern)
        ? pattern.replaceAll("\\", "/")
        : pattern;
    const found = existsSync(pattern) && statSync(pattern).isFile() ? [pattern] : glob(pat);
    for await (const file of found) {
      files.add(file);
      matched++;
    }
    if (matched === 0) index.missed.push(pattern);
  }
  for (const file of files) {
    try {
      scanText(index, await readFile(file, "utf8"));
      index.files++;
    } catch {
      // directories matched by a glob are skipped
    }
  }
  return index;
}

function safelisted(index: ContentIndex, name: string): boolean {
  const bare = name.replace(/^[.#]/, "");
  return index.safelist.some((s) =>
    typeof s === "string" ? s.replace(/^[.#]/, "") === bare : s.test(name) || s.test(bare),
  );
}

function attrMatches(
  index: ContentIndex,
  c: Extract<SelectorComponent, { type: "attribute" }>,
): boolean {
  const name = c.name.toLowerCase();
  const op = c.operation;
  if (safelisted(index, name)) return true;
  const have = index.attrs.get(name);
  if (!have) return !!op && safelisted(index, `${name}=${op.value}`);
  if (!op || have === ANY) return true;
  const fold =
    CASE_INSENSITIVE_ATTRS.has(name) ||
    (op as { caseSensitivity?: string }).caseSensitivity === "ascii-case-insensitive";
  const want = fold ? op.value.toLowerCase() : op.value;
  if ([...have].some((v) => matchOp(op.operator, fold ? v.toLowerCase() : v, want))) return true;
  return safelisted(index, `${name}=${want}`);
}

function matchOp(operator: string, value: string, want: string): boolean {
  switch (operator) {
    case "equal":
      return value === want;
    case "includes":
      return value.split(/\s+/).includes(want);
    case "dash-match":
      return value === want || value.startsWith(`${want}-`);
    case "prefix":
      return value.startsWith(want);
    case "substring":
      return value.includes(want);
    case "suffix":
      return value.endsWith(want);
    default:
      return true;
  }
}

function compoundMayMatch(index: ContentIndex, compound: SelectorComponent[]): boolean {
  for (const c of compound) {
    switch (c.type) {
      case "type":
        if (!index.tags.has(c.name.toLowerCase()) && !safelisted(index, c.name)) return false;
        break;
      case "class":
        if (!index.classes.has(c.name) && !safelisted(index, c.name)) return false;
        break;
      case "id":
        if (!index.ids.has(c.name) && !safelisted(index, `#${c.name}`)) return false;
        break;
      case "attribute":
        if (!attrMatches(index, c)) return false;
        break;
      case "pseudo-class":
        if (isListPseudo(c) && !c.selectors.some((s) => selectorMayMatch(index, s))) return false;
        break;
      default:
        break;
    }
  }
  return true;
}

/** Judged on type, class, id and attribute parts only. Other pseudo-classes and elements are ignored. */
export function selectorMayMatch(index: ContentIndex, sel: Selector): boolean {
  let compound: SelectorComponent[] = [];
  for (const c of sel) {
    if (c.type === "combinator") {
      if (!compoundMayMatch(index, compound)) return false;
      compound = [];
    } else compound.push(c);
  }
  return compoundMayMatch(index, compound);
}

/** True when a type, class, id or attribute of the selector (outside :not) is on the safelist. */
function touchesSafelist(index: ContentIndex, sel: Selector): boolean {
  return sel.some((c) => {
    switch (c.type) {
      case "type":
      case "class":
        return safelisted(index, c.name);
      case "id":
        return safelisted(index, `#${c.name}`);
      case "attribute":
        return (
          safelisted(index, c.name) ||
          (!!c.operation && safelisted(index, `${c.name}=${c.operation.value}`))
        );
      case "pseudo-class":
        return isListPseudo(c) && c.selectors.some((s) => touchesSafelist(index, s));
      default:
        return false;
    }
  });
}

/** A safelisted name keeps every selector that mentions it, even if its other parts are absent. */
export function purgeSelectors(index: ContentIndex, list: Selector[]): Selector[] {
  const hasSafelist = index.safelist.length > 0;
  return list.filter(
    (s) => (hasSafelist && touchesSafelist(index, s)) || selectorMayMatch(index, s),
  );
}
