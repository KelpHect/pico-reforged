import { createHash } from "node:crypto";
import { existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { glob } from "node:fs/promises";
import { readTag } from "./scan-tag.ts";
import { isListPseudo } from "./selector.ts";
import type { Selector, SelectorComponent } from "./selector.ts";
import type { PurgeOptions } from "./types.ts";

/** Marker for an attribute whose values are not known (set from script, or a boolean attribute). */
export const ANY = Symbol("any");

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
  /**
   * true keeps every rule whose type selectors are the only thing missing from the content.
   * Class, id and attribute parts are still checked. For sites whose HTML comes from a CMS,
   * a database or Markdown, where the tags in use cannot be read from the sources.
   */
  keepTypes?: boolean;
};

/**
 * Attributes the framework itself reads at runtime: theme switching and text direction.
 * They count as present, with any value, in every scan. "open" is toggled by the browser
 * (a click on summary, showModal()), so it cannot be read from markup. Vue Router, Nuxt, React
 * Router and TanStack Router set aria-current themselves.
 */
const ALWAYS_PRESENT_ATTRS = [
  "data-theme",
  "dir",
  "open",
  // routers and UI libraries write these on the active, selected or disabled item
  "aria-current",
  "aria-selected",
  "aria-disabled",
];
/** Attribute name prefixes that bind the attribute to an expression (Vue, Alpine, Angular). */
const BOUND_PREFIX = /^(?:v-bind:|x-bind:|:)/;
/** Angular property bindings: [type]="kind", [attr.role]="r". */
const ANGULAR_BINDING = /^\[(?:attr\.)?([\w-]+)\]$/;
/**
 * Known HTML tag names. A bare identifier that is one of them counts as a tag, which covers
 * template languages without angle brackets (Pug, Slim, Haml), helper builders (van.tags) and
 * names inside nested quotes (:is="'dialog'").
 */
const HTML_TAGS = new Set(
  `a abbr address article aside audio b blockquote body br button canvas caption cite code col
   colgroup data datalist dd del details dfn dialog div dl dt em fieldset figcaption figure
   footer form h1 h2 h3 h4 h5 h6 head header hgroup hr html i iframe img input ins kbd label
   legend li main mark menu meter nav noscript object ol optgroup option output p picture pre
   progress q s samp search section select slot small source span strong sub summary sup table
   tbody td template textarea tfoot th thead time tr u ul var video`.split(/\s+/),
);
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
/**
 * Properties that reflect to an attribute: btn.disabled = true sets [disabled]. A script sets
 * them without ever writing the attribute, so the name alone counts as a use, with any value.
 */
const REFLECTED_PROPS = new Map(
  [
    "disabled",
    "readOnly",
    "hidden",
    "popover",
    "required",
    "checked",
    "selected",
    "multiple",
    "inert",
    "open",
    "indeterminate",
    "autofocus",
  ].map((name) => [name, name.toLowerCase()]),
);
/** `type: "date"`, `.type = "range"`, `"role": "switch"`: a name assigned a quoted value. */
const ASSIGNED_VALUE =
  /(?<![\w-])["']?([A-Za-z_][\w-]*)["']?\s*(?::|=(?!=))\s*(["'`])([^"'`\\\n]{1,80})\2/g;

/** camelCase to kebab-case: ariaBusy gives aria-busy. */
const kebab = (name: string): string => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

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
  scanPlain(index, text);
  // Markup inside JSON or a JS string has escaped quotes (role=\"button\"), which hides the
  // attribute values. The unescaped copy is read as well.
  if (ESCAPED.test(text)) {
    let copy = text;
    for (let pass = 0; pass < 2 && ESCAPED.test(copy); pass++) {
      copy = unescape(copy);
      scanPlain(index, copy);
    }
  }
}

/** Backslash-escaped quotes and slashes, < style escapes and HTML entities for markup. */
const ESCAPED = /\\["'/]|\\u00(?:3c|3e|22|27|26)|&(?:lt|gt|quot|#39);/i;

function unescape(text: string): string {
  return text
    .replace(/\\u00(3c|3e|22|27|26)/gi, (_, hex: string) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    )
    .replace(/\\(["'/])/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function scanPlain(index: ContentIndex, text: string): void {
  for (let at = text.indexOf("<"); at !== -1; at = text.indexOf("<", at + 1)) {
    const tag = readTag(text, at);
    if (!tag) continue;
    index.tags.add(tag.name.toLowerCase());
    for (const attr of tag.attrs) {
      // Vue, Alpine and Angular bind an attribute to an expression: :aria-busy, v-bind:aria-busy
      const angular = ANGULAR_BINDING.exec(attr.name);
      const prefix = angular ? undefined : BOUND_PREFIX.exec(attr.name);
      const bound = !!angular || !!prefix;
      const name = (
        angular ? (angular[1] as string) : prefix ? attr.name.slice(prefix[0].length) : attr.name
      ).toLowerCase();
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
    if (HTML_TAGS.has(token)) index.tags.add(token);
    if (/^(aria|data)-[\w-]+$/.test(token)) addAttr(index, token, ANY);
    // Script properties: el.ariaBusy = "true" sets aria-busy
    if (/^aria[A-Z]/.test(token)) addAttr(index, kebab(token), ANY);
  }
  for (const token of text.match(IDENT) ?? []) {
    const reflected = REFLECTED_PROPS.get(token);
    if (reflected) addAttr(index, reflected, ANY);
  }
  for (const m of text.matchAll(ASSIGNED_VALUE)) {
    const value = (m[3] as string).trim();
    if (value && !/[{}$]/.test(value)) addAttr(index, m[1] as string, value);
  }
  // el.type = kind, el.setAttribute("role", r): the value is not a literal
  for (const m of text.matchAll(/\.(type|role|dir|method|rel|popover)\s*=(?!=)\s*[^\s"'`=]/g)) {
    addAttr(index, m[1] as string, ANY);
  }
  for (const m of text.matchAll(/setAttribute\(\s*["'`]([\w-]+)["'`]\s*,\s*[^\s"'`]/g)) {
    addAttr(index, m[1] as string, ANY);
  }
  // el.dataset.tooltip and el.dataset["tooltip"] set data-tooltip
  for (const m of text.matchAll(/\bdataset\s*(?:\.|\[\s*["'`])([A-Za-z_$][\w$]*)/g)) {
    addAttr(index, `data-${kebab(m[1] as string)}`, ANY);
  }
  // Template and JSX tags that the markup pattern misses are covered by the string scan above
  // and by this unquoted class attribute form.
  for (const m of text.matchAll(/class(?:Name)?\s*=\s*\{?\s*([\w-]+)/g))
    index.classes.add(m[1] as string);
}

/** Adds everything `from` knows to `into`. Both keep working afterwards. */
export function mergeIndex(into: ContentIndex, from: ContentIndex): void {
  for (const tag of from.tags) into.tags.add(tag);
  for (const name of from.classes) into.classes.add(name);
  for (const id of from.ids) into.ids.add(id);
  for (const [name, values] of from.attrs) {
    if (values === ANY) into.attrs.set(name, ANY);
    else for (const value of values) addAttr(into, name, value);
  }
  into.files += from.files;
}

/** A short stable hash of what the index can answer, for cache keys. */
export function indexFingerprint(index: ContentIndex): string {
  const hash = createHash("sha1");
  // Tokens never hold whitespace, so a newline keeps neighbours apart.
  const feed = (label: string, values: Iterable<string>): void => {
    hash.update(`\n#${label}\n`);
    for (const value of [...values].toSorted()) hash.update(`${value}\n`);
  };
  feed("tags", index.tags);
  feed("classes", index.classes);
  feed("ids", index.ids);
  feed(
    "attrs",
    [...index.attrs].map(([name, values]) =>
      values === ANY ? `${name}=*` : `${name}=${[...values].toSorted().join(",")}`,
    ),
  );
  hash.update(index.keepTypes ? "keepTypes" : "");
  return hash.digest("hex");
}

export async function buildIndex(options: PurgeOptions): Promise<ContentIndex> {
  if (options.index) {
    // A ready-made index (the integrations scan once and reuse it). Safelist and flags are
    // set on a copy so the shared one stays untouched.
    const copy: ContentIndex = {
      ...options.index,
      safelist: [...options.index.safelist, ...(options.safelist ?? [])],
      missed: [],
    };
    if (options.keepTypes) copy.keepTypes = true;
    return copy;
  }
  if (!Array.isArray(options.content)) {
    throw new Error("purge needs content globs or an index");
  }
  const index = emptyIndex(options.safelist ?? []);
  if (options.keepTypes) index.keepTypes = true;
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
        if (index.keepTypes) break;
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
