import { existsSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { glob } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { browserslistToTargets, Features, transform } from "lightningcss";
import browserslist from "browserslist";
import { DEFAULT_TARGETS } from "../compiler/config.ts";
import { buildIndex, mergeIndex, purgeSelectors } from "../compiler/purge.ts";
import type { ContentIndex } from "../compiler/purge.ts";
import { hasEmptyList } from "../compiler/selector.ts";
import type { Selector } from "../compiler/selector.ts";
import { scanStatements } from "./css-scan.ts";
import { toPosix } from "./glob.ts";
import { Scanner } from "./scanner.ts";
import type { ResolvedSource } from "./scanner.ts";

export type PurgeOutputOptions = {
  /** The folder with the built site. */
  dir: string;
  /** Globs for the stylesheets, relative to `dir`. Default every .css file. */
  css?: string[];
  /** More files to read for names, as globs relative to the working directory. */
  content?: string[];
  safelist?: (string | RegExp)[];
  /** Keep every rule that only lacks type selectors (tags) in the content. */
  keepTypes?: boolean;
  /** Report what would change and write nothing. */
  dryRun?: boolean;
  /** Targets used when the CSS is parsed again. Default the compiler's. */
  targets?: string | string[];
};

export type PurgedFile = {
  file: string;
  before: number;
  after: number;
  /** Style rules found inside the pico layers, and how many of them were removed. */
  rules: number;
  removed: number;
  /** True when the file has no pico layer, so it was left alone. */
  skipped: boolean;
};

export type PurgeOutputResult = {
  files: PurgedFile[];
  scanned: number;
  notes: string[];
};

/** A layer name that belongs to Pico Reforged: `pico` or anything under it. */
export const isPicoLayer = (name: string): boolean => name === "pico" || name.startsWith("pico.");

/** The layer names of a `@layer a, b {` prelude. */
const layerNames = (prelude: string): string[] =>
  prelude
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);

type Block = { start: number; end: number; body: string };

/**
 * The bodies to purge: every `@layer pico... { }` block, at the top level or inside layer
 * wrappers such as `@layer base { @layer pico.core { ... } }`. Rules outside them are not Pico's.
 */
export function findPicoBlocks(css: string, offset = 0, inside = false): Block[] {
  const blocks: Block[] = [];
  for (const statement of scanStatements(css)) {
    if (statement.kind !== "at" || statement.body === undefined) continue;
    if (statement.name === "layer") {
      const names = layerNames(statement.prelude);
      const pico = inside || (names.length === 1 && isPicoLayer(names[0] as string));
      if (pico) {
        blocks.push({
          start: offset + (statement.bodyStart as number),
          end: offset + (statement.bodyEnd as number),
          body: statement.body,
        });
      } else {
        // a wrapper layer, or a media/supports block that holds layers
        blocks.push(
          ...findPicoBlocks(statement.body, offset + (statement.bodyStart as number), false),
        );
      }
    } else if (statement.name === "media" || statement.name === "supports") {
      blocks.push(
        ...findPicoBlocks(statement.body, offset + (statement.bodyStart as number), false),
      );
    }
  }
  return blocks;
}

function targetsFor(query: string | string[] | undefined) {
  return browserslistToTargets(browserslist(query ?? DEFAULT_TARGETS));
}

/** Purges one block body with the index. Returns the new body and how many rules went. */
function purgeBody(
  body: string,
  index: ContentIndex | undefined,
  targets: ReturnType<typeof targetsFor>,
  unusedKeyframes: Set<string>,
): { body: string; rules: number; removed: number } {
  let rules = 0;
  let removed = 0;
  const keep = (sel: Selector): Selector[] =>
    index ? purgeSelectors(index, [sel]).filter((s) => !hasEmptyList(s)) : [sel];
  const minified = !/\n\s/.test(body);
  const result = transform({
    filename: "pico-layer.css",
    code: Buffer.from(body),
    minify: minified,
    targets,
    include: Features.Nesting,
    visitor: {
      Rule: {
        style(rule: { value: { selectors: Selector[] } }) {
          rules++;
          if (rule.value.selectors.every((s) => keep(s).length === 0)) removed++;
        },
        keyframes: (rule: { value: { name: { value?: string } } }) =>
          unusedKeyframes.has(rule.value.name.value ?? "") ? [] : undefined,
      },
      Selector: (sel: Selector) => keep(sel),
    },
  });
  return { body: new TextDecoder().decode(result.code), rules, removed };
}

/** Names of @keyframes that nothing but their own definition mentions. */
function findUnusedKeyframes(css: string): Set<string> {
  const drop = new Set<string>();
  for (const m of css.matchAll(/@keyframes\s+([\w-]+)/g)) {
    const name = (m[1] as string).replace(/[$()*+.?[\\\]^{|-]/g, "\\$&");
    const uses = css.match(new RegExp(String.raw`(?<![\w-])${name}(?![\w-])`, "g"))?.length ?? 0;
    const defs = css.match(new RegExp(String.raw`@keyframes\s+${name}(?![\w-])`, "g"))?.length ?? 0;
    if (uses <= defs) drop.add(m[1] as string);
  }
  return drop;
}

/** Rewrites the pico layers of one stylesheet. */
export function purgeStylesheet(
  css: string,
  index: ContentIndex,
  targets = targetsFor(undefined),
): { css: string; rules: number; removed: number; found: boolean } {
  const rewrite = (
    text: string,
    use: ContentIndex | undefined,
    drop: Set<string>,
  ): { css: string; rules: number; removed: number; found: boolean } => {
    const blocks = findPicoBlocks(text);
    let out = "";
    let at = 0;
    let rules = 0;
    let removed = 0;
    for (const block of blocks) {
      const purged = purgeBody(block.body, use, targets, drop);
      rules += purged.rules;
      removed += purged.removed;
      out += text.slice(at, block.start) + purged.body;
      at = block.end;
    }
    return { css: out + text.slice(at), rules, removed, found: blocks.length > 0 };
  };
  const first = rewrite(css, index, new Set());
  if (!first.found) return first;
  // A second pass drops the @keyframes whose rules are gone.
  const drop = findUnusedKeyframes(first.css);
  if (drop.size === 0) return first;
  return { ...first, css: rewrite(first.css, undefined, drop).css };
}

/**
 * Scans a built site (html, js and any other text) and removes the Pico rules nothing uses from
 * the built CSS, in place. Only rules inside `@layer pico.*` change. Everything else in the
 * files, the app's own CSS above all, is written back exactly as it was.
 */
export async function purgeOutput(options: PurgeOutputOptions): Promise<PurgeOutputResult> {
  const dir = resolve(options.dir);
  const notes: string[] = [];
  const sources: ResolvedSource[] = [];
  if (!existsSync(dir)) throw new Error(`purge: ${dir} does not exist. Build the site first`);
  const scanner = new Scanner({
    root: dir,
    sources,
    gitignore: false,
    onlyCoreIgnores: true,
    // minified bundles are big; the names in them are what we are after
    maxFileSize: 32 * 1024 * 1024,
  });
  const scan = scanner.scan();
  const index = scan.index;
  if (scan.files.length === 0) {
    throw new Error(
      `purge: ${dir} holds no file to scan. Build the site first, or check the folder`,
    );
  }
  for (const pattern of options.content ?? []) {
    const extra = await buildIndex({ content: [pattern] });
    if (extra.files === 0) notes.push(`no file matches --content "${pattern}"`);
    mergeIndex(index, extra);
  }
  index.safelist = options.safelist ?? [];
  if (options.keepTypes) index.keepTypes = true;
  if (scan.skipped.length > 0) {
    notes.push(`${scan.skipped.length} file(s) over the size limit were not scanned`);
  }
  if (scan.dynamicHtml.length > 0) {
    notes.push("HTML is written at run time in some files, so the common content tags were kept");
  }

  const patterns = options.css?.length ? options.css : ["**/*.css"];
  const cssFiles = new Set<string>();
  for (const pattern of patterns) {
    for await (const file of glob(pattern, { cwd: dir })) cssFiles.add(resolve(dir, file));
  }
  const targets = targetsFor(options.targets);
  const files: PurgedFile[] = [];
  for (const file of [...cssFiles].toSorted()) {
    if (!statSync(file).isFile()) continue;
    const source = readFileSync(file, "utf8");
    const out = purgeStylesheet(source, index, targets);
    const entry: PurgedFile = {
      file: toPosix(relative(dir, file)),
      before: Buffer.byteLength(source),
      after: Buffer.byteLength(out.css),
      rules: out.rules,
      removed: out.removed,
      skipped: !out.found,
    };
    files.push(entry);
    if (out.found && !options.dryRun && out.css !== source) {
      // the map no longer matches the rewritten file, so it goes with its comment
      const stale = existsSync(`${file}.map`);
      writeFileSync(
        file,
        stale ? out.css.replace(/\n?\/\*# sourceMappingURL=[^*]*\*\/\s*$/, "\n") : out.css,
      );
      if (stale) rmSync(`${file}.map`, { force: true });
    }
  }
  if (files.length === 0) notes.push("no CSS file matched");
  else if (files.every((f) => f.skipped)) {
    notes.push("none of the CSS files holds an @layer pico.* block, so nothing was changed");
  }
  return { files, scanned: scan.files.length, notes };
}
