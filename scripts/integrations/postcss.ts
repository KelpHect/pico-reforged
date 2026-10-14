import type { PluginCreator } from "postcss";
import { Engine, syntheticRoot } from "../lib/integrations/process.ts";
import { PICO_PACKAGE } from "../lib/integrations/pico-config.ts";
import { toPosix } from "../lib/integrations/glob.ts";

export type PicoPostcssOptions = {
  /**
   * Project folder the automatic scan starts from. Default: the nearest folder with a
   * package.json above the stylesheet, then the working directory.
   */
  base?: string;
  /** true always purges, false never does. Default "auto": purge when NODE_ENV is production. */
  purge?: boolean | "auto";
  /** Folder names or paths the scan leaves out, on top of the defaults. */
  ignore?: string[];
  /** Minify the stylesheet here. Default false, bundlers minify CSS themselves. */
  minify?: boolean;
};

const PLUGIN = "@rusticstack/pico-reforged";

/**
 * Pico Reforged for PostCSS: Next.js (Turbopack and webpack), Parcel, webpack, anything that
 * runs postcss.config. Put it first in the list. A stylesheet with
 * `@import "@rusticstack/pico-reforged"` is replaced by the compiled CSS, purged against the
 * project's sources when NODE_ENV is production.
 */
const pico: PluginCreator<PicoPostcssOptions> = (options = {}) => {
  const engine = new Engine();
  return {
    postcssPlugin: PLUGIN,
    async Once(root, { result, postcss }) {
      const from = result.opts.from ? toPosix(result.opts.from) : undefined;
      const synthetic = from ? syntheticRoot(from) : undefined;

      // Quick bail: most stylesheets in a project never mention Pico Reforged.
      let mentioned = synthetic !== undefined;
      if (!mentioned) {
        root.walkAtRules("import", (rule) => {
          if (rule.params.includes(PICO_PACKAGE)) {
            mentioned = true;
            return false;
          }
          return undefined;
        });
      }
      if (!mentioned) return;

      const base = options.base ?? process.cwd();
      const production = process.env["NODE_ENV"] === "production";
      const purge =
        options.purge === undefined || options.purge === "auto" ? production : options.purge;
      const file = from && !synthetic ? from : `${toPosix(base)}/pico-reforged.css`;
      const pending = result.messages;
      const report = (dependencies: {
        config: string[];
        files: string[];
        dirs: string[];
        root?: string;
      }): void => {
        for (const path of [...dependencies.config, ...dependencies.files]) {
          pending.push({
            type: "dependency",
            plugin: PLUGIN,
            file: path,
            parent: result.opts.from,
          });
        }
        for (const dir of dependencies.dirs) {
          // The project folder itself is skipped: watching it recursively loops in Next.js when
          // the build output lives there. Its own files are watched one by one above.
          if (dependencies.root && dir === dependencies.root) continue;
          pending.push({
            type: "dir-dependency",
            plugin: PLUGIN,
            dir,
            glob: "*",
            parent: result.opts.from,
          });
        }
      };

      let processed;
      try {
        processed = await engine.process({
          css: synthetic ?? root.toString(),
          file,
          purge,
          root: base,
          ...(synthetic || options.base ? { projectRoot: toPosix(base) } : {}),
          ...(options.ignore ? { ignore: options.ignore } : {}),
          ...(options.minify ? { minify: true } : {}),
        });
      } catch (error) {
        throw root.error(error instanceof Error ? error.message : String(error));
      }
      if (!processed) return;
      for (const warning of processed.warnings) result.warn(`pico-reforged: ${warning}`);
      report({
        ...processed.dependencies,
        ...(processed.scanRoot ? { root: processed.scanRoot } : {}),
      });

      const next = postcss.parse(processed.css, { from: result.opts.from });
      root.removeAll();
      root.append(next.nodes);
    },
  };
};
pico.postcss = true;

export default pico;

// `require("@rusticstack/pico-reforged/postcss")` (Next.js loads plugin names this way) then
// returns the plugin function itself instead of the module namespace.
export { pico as "module.exports" };
