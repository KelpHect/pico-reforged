import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import browserslist from "browserslist";
import { bundleAsync, browserslistToTargets, Features, transform } from "lightningcss";
import type { Targets } from "lightningcss";
import { ROOT, SRC } from "./config.ts";
import type { ResolvedOptions } from "./config.ts";
import { filterClassless } from "./classless.ts";
import {
  clean,
  dropRootFontSizeSteps,
  overrideCss,
  stripImportant,
  stripMotion,
} from "./transforms.ts";
import { purgeSelectors } from "./purge.ts";
import type { ContentIndex } from "./purge.ts";
import { orphanCandidates, orphanVisitor } from "./module-tokens.ts";
import { hasEmptyList } from "./selector.ts";
import type { Selector } from "./selector.ts";
import { parseScope, scopeSelector } from "./scope.ts";
import { SCOPE_GLOBAL } from "./scope-global.ts";
import { themeSource } from "./theme.ts";

const norm = (path: string): string => path.replaceAll("\\", "/");
const decode = (bytes: Uint8Array | void): string => (bytes ? new TextDecoder().decode(bytes) : "");

export function toTargets(query: string | string[]): Targets {
  return browserslistToTargets(browserslist(query));
}

/** Where a module goes when the entry does not import it. */
const INSERT_AFTER: Record<string, string> = {
  "layout/semantic-container": "layout/container",
  "layout/responsive-spacings": "layout/section",
};

const importLine = (module: string): RegExp =>
  new RegExp(String.raw`^[^\r\n]*@import url\("\./${module}\.css"\)[^\r\n]*$`, "m");

function entryText(source: string, options: ResolvedOptions): string {
  let text = source;
  if (options.entry !== "colors") {
    for (const [module, anchor] of Object.entries(INSERT_AFTER)) {
      if (!options.modules[module] || importLine(module).test(text)) continue;
      text = text.replace(
        importLine(anchor),
        (line) => `${line}\n@import url("./${module}.css") layer(pico.core);`,
      );
    }
    text += overrideCss({
      transitions: options.transitions,
      fluid: options.fluid,
      semanticContainer: options.modules["layout/semantic-container"] === true,
    });
  }
  return text;
}

export type Bundled = { css: string; map?: string; excluded: string[] };

/**
 * Step 1: bundle the entry with the module switches and the theme applied at import time,
 * and lower nesting so the selector passes see complete selectors.
 */
export async function bundleSource(options: ResolvedOptions): Promise<Bundled> {
  const entryName =
    options.entry === "colors"
      ? "pico.colors.css"
      : `pico.${options.entry === "classless" ? "classless." : ""}css`;
  const entryPath = norm(`${SRC}/${entryName}`);
  const excluded: string[] = [];
  const theme = options.entry === "colors" ? "" : themeSource(options.theme);

  const result = await bundleAsync({
    filename: entryPath,
    minify: false,
    sourceMap: options.sourceMap,
    projectRoot: ROOT,
    targets: toTargets(options.targets),
    include: Features.Nesting,
    resolver: {
      resolve(specifier, from) {
        return norm(resolve(dirname(from), specifier));
      },
      async read(file) {
        const path = norm(file);
        if (path === entryPath) return entryText(await readFile(file, "utf8"), options);
        const name = path.startsWith(`${SRC}/`)
          ? path.slice(SRC.length + 1).replace(/\.css$/, "")
          : "";
        if (name.startsWith("themes/")) return theme;
        if (name in options.modules && options.modules[name] === false) {
          excluded.push(name);
          return "";
        }
        return readFile(file, "utf8");
      },
    },
  });
  const out: Bundled = { css: decode(result.code), excluded };
  if (result.map) out.map = decode(result.map);
  return out;
}

export type PassCounts = { rules: number; removedByClassless: number; removedByPurge: number };

type Stage = { css: string; map?: string };

function runPass(stage: Stage, options: ResolvedOptions, visitor: object, minify: boolean): Stage {
  const result = transform({
    filename: "pico.css",
    code: Buffer.from(stage.css),
    minify,
    sourceMap: options.sourceMap,
    projectRoot: ROOT,
    ...(stage.map ? { inputSourceMap: stage.map } : {}),
    targets: toTargets(options.targets),
    visitor,
  });
  const next: Stage = { css: decode(result.code) };
  if (result.map) next.map = decode(result.map);
  return next;
}

/** Drops @keyframes that no declaration refers to any more (the modal ones in classless builds). */
function pruneKeyframes(stage: Stage, options: ResolvedOptions): Stage {
  const defined = new Map<string, number>();
  for (const m of stage.css.matchAll(/^\s*@keyframes\s+([\w-]+)/gm)) {
    defined.set(m[1] as string, (defined.get(m[1] as string) ?? 0) + 1);
  }
  const unused = new Set<string>();
  for (const [name, count] of defined) {
    const uses =
      stage.css.match(new RegExp(String.raw`(?<![\w-])${name}(?![\w-])`, "g"))?.length ?? 0;
    if (uses <= count) unused.add(name);
  }
  if (unused.size === 0) return stage;
  return runPass(
    stage,
    options,
    {
      Rule: {
        keyframes: (rule: { value: { name: { value?: string } } }) =>
          unused.has(rule.value.name.value ?? "") ? [] : undefined,
      },
    },
    false,
  );
}

/** Removes the custom properties of excluded modules that no remaining rule reads. */
function dropOrphanTokens(stage: Stage, options: ResolvedOptions, excluded: string[]): Stage {
  const prefixes = orphanCandidates(excluded);
  if (prefixes.length === 0) return stage;
  let current = stage;
  // A dropped token can be the only reader of another, so go on until nothing is left to drop.
  for (let i = 0; i < 4; i++) {
    const removed = { count: 0 };
    current = runPass(current, options, orphanVisitor(prefixes, current.css, removed), false);
    if (removed.count === 0) break;
  }
  return current;
}

/** Final lowering and minify, its own pass so it also covers what the visitor passes changed. */
export function minifyStage(
  stage: { css: string; map?: string },
  options: ResolvedOptions,
): { css: string; map?: string } {
  return runPass(stage, options, {}, true);
}

/**
 * Step 2: declaration edits, then the selector passes (classless, purge, scope), then layer
 * removal. A visitor cannot hand a style rule back
 * unless it is cleaned first (see clean), so selectors go through the per-selector Selector
 * hook, which also drops a rule once all its selectors are gone.
 */
export function finalize(
  bundled: Bundled,
  options: ResolvedOptions,
  index?: ContentIndex,
): { css: string; map?: string; counts: PassCounts } {
  const counts: PassCounts = { rules: 0, removedByClassless: 0, removedByPurge: 0 };
  const scope = options.scope ? parseScope(options.scope) : undefined;
  const filterClasses = !options.classes && options.entry !== "colors";
  let stage: Stage = bundled.map ? { css: bundled.css, map: bundled.map } : { css: bundled.css };

  if (!options.important || !options.responsiveTypography || !options.transitions) {
    stage = runPass(
      stage,
      options,
      {
        Rule: {
          style(rule: { value: Parameters<typeof stripImportant>[0] }) {
            let changed = false;
            if (!options.transitions && stripMotion(rule.value)) changed = true;
            if (!options.important && stripImportant(rule.value)) changed = true;
            if (changed) return clean(rule);
          },
          // Entry animations for dialogs and popovers only exist to be transitioned.
          "starting-style": () => (options.transitions ? undefined : []),
          media(rule: { value: Parameters<typeof dropRootFontSizeSteps>[0] }) {
            if (!options.responsiveTypography && dropRootFontSizeSteps(rule.value))
              return clean(rule);
          },
        },
      },
      false,
    );
  }

  const keep = (sel: Selector): Selector[] => {
    let list = [sel];
    if (filterClasses) {
      list = filterClassless(list);
      if (list.length === 0) return list;
    }
    if (index) list = purgeSelectors(index, list);
    return list.filter((s) => !hasEmptyList(s));
  };
  const removedBy = (list: Selector[]): "classless" | "purge" | "dead" | null => {
    if (list.every(hasEmptyList)) return "dead";
    if (filterClasses && list.every((s) => filterClassless([s]).length === 0)) return "classless";
    if (index && list.every((s) => keep(s).length === 0)) return "purge";
    return null;
  };
  stage = runPass(
    stage,
    options,
    {
      Rule: {
        style(rule: { value: { selectors: Selector[] } }) {
          const why = removedBy(rule.value.selectors);
          if (why === "classless") counts.removedByClassless++;
          else if (why === "purge") counts.removedByPurge++;
          else counts.rules++;
        },
      },
      Selector(sel: Selector) {
        const list = keep(sel);
        return scope ? list.map((s) => scopeSelector(s, scope, SCOPE_GLOBAL)) : list;
      },
    },
    false,
  );

  if (filterClasses || index || !options.transitions) stage = pruneKeyframes(stage, options);

  stage = dropOrphanTokens(stage, options, bundled.excluded);
  return { ...stage, counts };
}
