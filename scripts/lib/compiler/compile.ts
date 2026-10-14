import { bundleSource, finalize, lowerStage, minifyStage } from "./bundle.ts";
import { resolveOptions } from "./config.ts";
import type { ResolvedOptions } from "./config.ts";
import { buildIndex } from "./purge.ts";
import type { ContentIndex } from "./purge.ts";
import { sizes } from "./report.ts";
import type { CompileOptions, CompileResult } from "./types.ts";

type Built = {
  css: string;
  map?: string;
  options: ResolvedOptions;
  stats: Omit<CompileResult["stats"], "bytes" | "gzipBytes" | "brotliBytes" | "durationMs">;
};

function purgeWarnings(index: ContentIndex | undefined): string[] {
  if (!index) return [];
  const warnings = index.missed.map((pattern) => `purge: no file matches "${pattern}"`);
  if (index.files === 0) {
    warnings.push("purge: no content file was read, so only rules for html, body and head survive");
  }
  return warnings;
}

/** Everything up to, but not including, the lowering and minify pass. */
async function build(input: CompileOptions): Promise<Built> {
  const options = resolveOptions(input);
  const index = options.purge ? await buildIndex(options.purge) : undefined;
  const bundled = await bundleSource(options);
  const done = finalize(bundled, options, index);
  const built: Built = {
    css: done.css,
    options,
    stats: {
      entry: options.entry,
      rules: done.counts.rules,
      removedByClassless: done.counts.removedByClassless,
      removedByPurge: done.counts.removedByPurge,
      excludedModules: [...new Set(bundled.excluded)],
      extras: options.extras,
      warnings: [...options.warnings, ...purgeWarnings(index)],
    },
  };
  if (done.map) built.map = done.map;
  return built;
}

function finish(
  built: Built,
  minify: boolean,
  started: number,
  banner = built.options.banner,
): CompileResult {
  const stage = minify ? minifyStage(built, built.options) : lowerStage(built, built.options);
  const css = banner ? `${banner}\n${stage.css}` : stage.css;
  const result: CompileResult = {
    css,
    stats: { ...built.stats, ...sizes(css), durationMs: Math.round(performance.now() - started) },
  };
  if (stage.map) {
    // The banner pushes every mapped line down, one empty mapping segment per banner line.
    const shift = built.options.banner ? built.options.banner.split("\n").length : 0;
    const map = JSON.parse(stage.map) as { mappings: string };
    map.mappings = ";".repeat(shift) + map.mappings;
    result.map = JSON.stringify(map);
  }
  return result;
}

export async function compile(input: CompileOptions = {}): Promise<CompileResult> {
  const started = performance.now();
  const built = await build(input);
  return finish(built, built.options.minify, started);
}

/**
 * One bundle, both the readable and the minified output. Used by the matrix. The minified file
 * can take a shorter banner than the readable one.
 */
export async function compileBoth(
  input: CompileOptions = {},
  minBanner?: string,
): Promise<{ plain: CompileResult; min: CompileResult }> {
  const started = performance.now();
  const built = await build({ ...input, sourceMap: false });
  return {
    plain: finish(built, false, started),
    min: finish(built, true, started, minBanner ?? built.options.banner),
  };
}
