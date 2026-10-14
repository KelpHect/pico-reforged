import { resolve } from "node:path";
import { Engine, syntheticRoot } from "../lib/integrations/process.ts";
import { mentionsPico } from "../lib/integrations/detect.ts";

export type PicoViteOptions = {
  /**
   * Project folder the automatic scan starts from. Default: the nearest folder with a
   * package.json above each stylesheet, then the Vite root.
   */
  root?: string;
  /** true always purges, false never does. Default "auto": purge in `vite build` only. */
  purge?: boolean | "auto";
  /** Folder names or paths the scan leaves out, on top of the defaults and the build output. */
  ignore?: string[];
  /** Minify the stylesheet here. Default false, because Vite minifies CSS itself. */
  minify?: boolean;
};

/** The part of Vite's resolved config that the plugin reads. */
type ViteConfigLike = {
  root: string;
  command: "build" | "serve";
  cacheDir?: string;
  build: { outDir: string; watch?: unknown };
};

/** The part of Vite's transform context that the plugin uses. */
type TransformContext = {
  addWatchFile(id: string): void;
  warn(message: string): void;
};

export type PicoVitePlugin = {
  name: string;
  enforce: "pre";
  configResolved(config: ViteConfigLike): void;
  transform: {
    filter: { id: { include: RegExp[]; exclude: RegExp[] } };
    handler(
      this: TransformContext,
      code: string,
      id: string,
    ): Promise<{ code: string; map: null } | null>;
  };
};

// Same shape as the filter in @tailwindcss/vite: real .css files, the style blocks of single
// file components, and inline style ids. Worker, raw and url imports are not stylesheets.
const INCLUDE = [/\.css(?:\?.*)?$/, /&lang\.css/, /[?&]lang\.css/];
const EXCLUDE = [/\/\.vite\//, /[?&](?:worker|sharedworker|raw|url)\b/, /[?&]commonjs-proxy\b/];

const isStylesheetId = (id: string): boolean =>
  INCLUDE.some((re) => re.test(id)) && !EXCLUDE.some((re) => re.test(id));

/**
 * Pico Reforged for Vite, and for the tools that run on Vite (Astro, SvelteKit, Nuxt, React
 * Router). In `vite dev` the import becomes the full compiled stylesheet, so there is nothing to
 * wait for. In `vite build` the stylesheet is compiled with the purge pass over the project's
 * sources.
 */
export default function pico(options: PicoViteOptions = {}): PicoVitePlugin {
  const engine = new Engine();
  let config: ViteConfigLike | undefined;
  const ignore: string[] = [];

  return {
    name: "@rusticstack/pico-reforged:vite",
    enforce: "pre",
    configResolved(resolved) {
      config = resolved;
      engine.clear();
      ignore.length = 0;
      ignore.push(resolve(resolved.root, resolved.build.outDir));
      if (resolved.cacheDir) ignore.push(resolved.cacheDir);
      ignore.push(...(options.ignore ?? []));
    },
    transform: {
      filter: { id: { include: INCLUDE, exclude: EXCLUDE } },
      async handler(code, id) {
        if (!config || !isStylesheetId(id)) return null;
        const file = id.split("?")[0] as string;
        // A script that imports the package gets the pre-built css file; treat it as a root.
        const synthetic = syntheticRoot(file);
        const source = synthetic ?? code;
        if (!mentionsPico(source)) return null;

        const build = config.command === "build";
        const purge =
          options.purge === undefined || options.purge === "auto" ? build : options.purge;
        const projectRoot = options.root ?? (synthetic ? config.root : undefined);
        const result = await engine.process({
          css: source,
          file: synthetic ? resolve(projectRoot ?? config.root, "pico-reforged.css") : file,
          purge,
          root: config.root,
          ...(projectRoot ? { projectRoot: resolve(config.root, projectRoot) } : {}),
          ignore,
          ...(options.minify ? { minify: true } : {}),
        });
        if (!result) return null;
        for (const warning of result.warnings) this.warn(`pico-reforged: ${warning}`);
        // The theme file always matters. Scanned sources matter to a watching build and to a
        // dev server that was told to purge.
        const watchSources =
          purge &&
          (!build ||
            (config.build.watch !== null &&
              config.build.watch !== undefined &&
              config.build.watch !== false));
        const { config: configFiles, files: scanned } = result.dependencies;
        for (const dep of watchSources ? [...configFiles, ...scanned] : configFiles) {
          if (dep !== file) this.addWatchFile(dep);
        }
        return { code: result.css, map: null };
      },
    },
  };
}
