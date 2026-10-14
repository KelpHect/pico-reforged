import { createHash } from "node:crypto";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { compile } from "../compiler/compile.ts";
import { EXTRAS, ROOT } from "../compiler/config.ts";
import { indexFingerprint } from "../compiler/purge.ts";
import type { CompileOptions } from "../compiler/types.ts";
import { parseRoot, wrapperFor } from "./detect.ts";
import type { PicoImport, RootParse } from "./detect.ts";
import { PICO_PACKAGE } from "./pico-config.ts";
import {
  DEFAULT_MAX_FILE_SIZE,
  findProjectRoot,
  resolveSources,
  Scanner,
  SOURCE_EXTENSIONS,
} from "./scanner.ts";
import type { ResolvedSource } from "./scanner.ts";
import type { ScanOptions, ScanResult } from "./scanner.ts";
import { toPosix } from "./glob.ts";

export type Dependencies = {
  /** Files the configuration reads (a theme file). Always worth watching. */
  config: string[];
  /** Scanned source files. Only present when the purge pass ran. */
  files: string[];
  /** Folders to watch for new files: every folder that holds a scanned file. */
  dirs: string[];
};

export type ProcessOptions = {
  /** The stylesheet's source text. */
  css: string;
  /** Absolute path of the stylesheet. Folder-relative paths in `@source` start here. */
  file: string;
  /** Apply the purge pass. false gives the full stylesheet. */
  purge: boolean;
  /** Fallback project root (the Vite or PostCSS root) when no package.json is found. */
  root?: string;
  /** Forced project root. Wins over detection. */
  projectRoot?: string;
  /** Folder names or absolute paths the scan leaves out (for example the build output). */
  ignore?: string[];
  minify?: boolean;
};

export type ProcessResult = {
  css: string;
  warnings: string[];
  dependencies: Dependencies;
  /** The folder the automatic scan started from, when there was one. */
  scanRoot?: string;
  /** Set when the purge pass ran. */
  purge?: { files: number; removedRules: number; notes: string[] };
};

/** What the scan caches are keyed by. */
type ScannerSlot = { scanner: Scanner; key: string };

const MAX_CACHED = 24;

function remember<T>(map: Map<string, T>, key: string, value: T): T {
  map.set(key, value);
  if (map.size > MAX_CACHED) map.delete(map.keys().next().value as string);
  return value;
}

/**
 * Compiles stylesheets that import Pico Reforged. One instance per build tool process: it keeps a
 * scanner per root (so unchanged files are not read again) and the compiled output per input,
 * keyed by the options and by what the scan found. Content that changes gives a new key, so
 * nothing is ever kept for names that left the sources.
 */
export class Engine {
  private readonly scanners = new Map<string, ScannerSlot>();
  private readonly compiled = new Map<
    string,
    Promise<{ css: string; warnings: string[]; removed: number }>
  >();

  /** Drops every cache. Call after a config change. */
  clear(): void {
    this.scanners.clear();
    this.compiled.clear();
  }

  async process(input: ProcessOptions): Promise<ProcessResult | undefined> {
    const parsed = parseRoot(input.css);
    if (!parsed) return undefined;
    return this.run(input, parsed);
  }

  private async run(input: ProcessOptions, parsed: RootParse): Promise<ProcessResult> {
    const { config } = parsed;
    const cssDir = dirname(resolve(input.file));
    const warnings = [...config.warnings];
    const options = this.compileOptions(parsed, cssDir, warnings);
    const dependencies: Dependencies = { config: [], files: [], dirs: [] };
    if (config.themeFile) dependencies.config.push(toPosix(resolve(cssDir, config.themeFile)));

    const mode = config.purge ?? "auto";
    let scan: ScanResult | undefined;
    let purgeInfo: ProcessResult["purge"];
    let scanRoot: string | undefined;
    const wantPurge = input.purge && mode !== "off";
    if (wantPurge) {
      const projectRoot = input.projectRoot ?? findProjectRoot(cssDir) ?? input.root ?? cssDir;
      const base =
        config.source === "none"
          ? undefined
          : config.source
            ? resolve(cssDir, config.source.base)
            : projectRoot;
      const sources = resolveSources(cssDir, config.sources);
      // packages linked into the project (workspace:, link:, file:) are part of the app
      if (base && config.source !== "none") sources.push(...linkedPackages(projectRoot));
      const scanOptions: ScanOptions = {
        sources,
        ignore: [...(input.ignore ?? []), ...nextDistDirs(projectRoot)],
      };
      if (base) scanOptions.root = base;
      scanRoot = base;
      scan = this.scanner(scanOptions).scan();
      dependencies.files.push(...scan.files);
      dependencies.dirs.push(...scan.dirs);
      if (scan.skipped.length > 0) {
        const shown = scan.skipped.slice(0, 3).join(", ");
        warnings.push(
          `${scan.skipped.length} file(s) over the size limit were not scanned (${shown}). The limit is ${DEFAULT_MAX_FILE_SIZE / 1024 / 1024} MB, 32 MB for a file named by @source`,
        );
      }
      if (scan.files.length > 0 && !scan.files.some(isSourceFile)) {
        warnings.push(
          `the scan of ${base ?? "the @source paths"} found no markup or script file, so rules used by components elsewhere (another workspace package, node_modules) are removed. Add them with @source or set "purge: off" in @pico`,
        );
      }
      if (scan.files.length === 0) {
        warnings.push(
          `purge skipped: the scan of ${base ?? "the @source paths"} found no file, so the full stylesheet is used. Check @source or set "purge: off" in @pico`,
        );
        scan = undefined;
      }
    }

    const key = createHash("sha1")
      .update(
        JSON.stringify({
          options,
          // layer()/supports()/media wrappers and the /colors import change the output
          imports: parsed.imports.map((i) => [i.kind, i.extra ?? "", i.suffix]),
          mode: scan ? mode : "full",
          minify: input.minify ?? false,
          safelist: config.safelist.map(String),
          fp: scan ? indexFingerprint(scan.index) : "",
          // the theme file's content, so an edit to it gives new output
          theme: config.themeFile ? fileHash(resolve(cssDir, config.themeFile)) : "",
        }),
      )
      .digest("hex");
    let pending = this.compiled.get(key);
    if (!pending) {
      pending = this.compileAll(
        parsed,
        options,
        scan,
        mode === "safe",
        input.minify ?? false,
        config.safelist,
      );
      void remember(this.compiled, key, pending);
      pending.catch(() => this.compiled.delete(key));
    }
    const built = await pending;
    warnings.push(...built.warnings);
    if (scan) {
      purgeInfo = {
        files: scan.files.length,
        removedRules: built.removed,
        notes: scan.dynamicHtml.length
          ? [
              `HTML is written at run time in ${scan.dynamicHtml.length} file(s), so the common content tags were kept`,
            ]
          : [],
      };
    }
    const result: ProcessResult = {
      css: assemble(input.css, parsed, built.css),
      warnings: [...new Set(warnings)],
      dependencies,
    };
    if (purgeInfo) result.purge = purgeInfo;
    if (scanRoot) result.scanRoot = toPosix(scanRoot);
    return result;
  }

  private scanner(options: ScanOptions): Scanner {
    const key = JSON.stringify(options);
    const slot = this.scanners.get(key);
    if (slot) return slot.scanner;
    const scanner = new Scanner(options);
    remember(this.scanners, key, { scanner, key });
    return scanner;
  }

  /** The compile options for the root, before purge is added. */
  private compileOptions(parsed: RootParse, cssDir: string, warnings: string[]): CompileOptions {
    const { config, imports } = parsed;
    const options: CompileOptions = { ...config.options };
    delete options.extras;
    const kinds = new Set(imports.map((i) => i.kind));
    const extras = new Set<string>();
    const fromConfig = config.options.extras;
    if (Array.isArray(fromConfig)) for (const name of fromConfig) extras.add(name);
    for (const i of imports) {
      if (i.kind === "extras") for (const name of EXTRAS) extras.add(name);
      if (i.kind === "extra" && i.extra) extras.add(i.extra);
    }
    const hasMain = kinds.has("main") || kinds.has("classless");
    const importsClassless = kinds.has("classless");
    const classless = config.classless ?? importsClassless;
    if (config.classless === false && importsClassless) {
      warnings.push('@pico "classless: false" overrides the "/classless" import');
    }
    if (hasMain) {
      options.entry = classless ? "classless" : "pico";
      options.extras = EXTRAS.filter((name) => extras.has(name));
    } else if (extras.size > 0) {
      options.entry = "extras";
      options.extras = EXTRAS.filter((name) => extras.has(name));
    } else {
      options.entry = "colors";
    }
    if (config.themeFile) options.theme = resolve(cssDir, config.themeFile);
    options.minify = options.minify ?? false;
    return options;
  }

  private async compileAll(
    parsed: RootParse,
    options: CompileOptions,
    scan: ScanResult | undefined,
    keepTypes: boolean,
    minify: boolean,
    safelist: (string | RegExp)[],
  ): Promise<{ css: string; warnings: string[]; removed: number }> {
    const warnings: string[] = [];
    let removed = 0;
    const purge = scan
      ? { index: scan.index, safelist, ...(keepTypes ? { keepTypes: true } : {}) }
      : (false as const);
    const parts: string[] = [];
    const run = async (extra: CompileOptions): Promise<string> => {
      const result = await compile({
        ...options,
        ...extra,
        minify: minify || options.minify,
        purge,
      });
      warnings.push(...result.stats.warnings);
      removed += result.stats.removedByPurge;
      return result.css;
    };
    if (options.entry !== "colors") parts.push(await run({}));
    if (parsed.imports.some((i) => i.kind === "colors")) {
      const colors: CompileOptions = { entry: "colors", extras: [] };
      parts.push(await run(colors));
    }
    const wrapper = wrapperFor(mainSuffix(parsed.imports));
    const body = parts.join("\n");
    return {
      css: wrapper ? `${wrapper.open}${body}${wrapper.close}` : body,
      warnings,
      removed,
    };
  }
}

const isSourceFile = (file: string): boolean =>
  SOURCE_EXTENSIONS.has(extname(file).slice(1).toLowerCase());

/**
 * Folders of the packages the project links to by path or workspace, whatever the version range
 * says (`workspace:*`, `*`, `^1.0.0`, `link:`, `file:`): a dependency whose node_modules entry
 * resolves to a folder outside node_modules is source code of the app. Their own linked
 * dependencies are followed too (apps/web to packages/ui to packages/icons).
 */
function linkedPackages(projectRoot: string): ResolvedSource[] {
  const out: ResolvedSource[] = [];
  const seen = new Set<string>([toPosix(realpathOr(projectRoot))]);
  const queue = [projectRoot];
  while (queue.length > 0) {
    const dir = queue.shift() as string;
    let manifest: Record<string, unknown>;
    try {
      manifest = JSON.parse(readFileSync(resolve(dir, "package.json"), "utf8")) as Record<
        string,
        unknown
      >;
    } catch {
      continue;
    }
    for (const field of ["dependencies", "devDependencies", "peerDependencies"]) {
      const deps = manifest[field];
      if (!deps || typeof deps !== "object") continue;
      for (const name of Object.keys(deps)) {
        const real = resolveLinked(dir, name);
        if (!real || seen.has(real)) continue;
        seen.add(real);
        out.push({ base: real, pattern: "", not: false });
        queue.push(real);
      }
    }
  }
  return out;
}

function realpathOr(path: string): string {
  try {
    return realpathSync(path);
  } catch {
    return path;
  }
}

/** The real folder of node_modules/<name> seen from `dir`, when it lies outside node_modules. */
function resolveLinked(dir: string, name: string): string | undefined {
  for (let current = resolve(dir); ; current = dirname(current)) {
    const link = resolve(current, "node_modules", name);
    if (existsSync(link)) {
      try {
        const real = toPosix(realpathSync(link));
        return real.includes("/node_modules/") ? undefined : real;
      } catch {
        return undefined;
      }
    }
    if (dirname(current) === current) return undefined;
  }
}

/**
 * The distDir of a Next.js project. Next writes chunks, types and caches into it before the
 * PostCSS step runs, and a custom name has no BUILD_ID yet on a clean build.
 */
function nextDistDirs(projectRoot: string): string[] {
  for (const name of ["js", "mjs", "cjs", "ts", "mts"]) {
    let text: string;
    try {
      text = readFileSync(resolve(projectRoot, `next.config.${name}`), "utf8");
    } catch {
      continue;
    }
    const m = /\bdistDir\s*:\s*(["'`])([^"'`$\n]+)\1/.exec(text);
    if (m) return [toPosix(resolve(projectRoot, m[2] as string))];
  }
  return [];
}

/** A hash of a file's content, "missing" when it cannot be read. */
function fileHash(file: string): string {
  try {
    return createHash("sha1").update(readFileSync(file)).digest("hex");
  } catch {
    return "missing";
  }
}

function mainSuffix(imports: PicoImport[]): string {
  const first = imports[0];
  return first ? first.suffix : "";
}

/** Cuts the Pico statements out of the source and puts the compiled CSS after the imports. */
export function assemble(source: string, parsed: RootParse, compiled: string): string {
  const cutRange = (from: number, to: number, cuts: { start: number; end: number }[]): string => {
    let out = "";
    let at = from;
    for (const cut of cuts) {
      out += source.slice(at, cut.start);
      at = Math.max(at, cut.end);
    }
    return out + source.slice(at, to);
  };
  const before = parsed.cuts.filter((c) => c.end <= parsed.insertAt);
  const after = parsed.cuts.filter((c) => c.end > parsed.insertAt);
  return `${cutRange(0, parsed.insertAt, before)}
${compiled.trim()}
${cutRange(parsed.insertAt, source.length, after)}`;
}

/* Files of the package itself, which a script can import (`import "@rusticstack/pico-reforged"`). */

const PACKAGE_FILE = /^(pico(?:\.(classless|colors|extras))?)(?:\.min)?\.css$/;

/**
 * When `file` is one of the package's own stylesheets, the import line that stands for it.
 * A script that imports the package gets the pre-built css file; this turns it into a root.
 */
export function syntheticRoot(file: string): string | undefined {
  const fold = (text: string): string => (process.platform === "win32" ? text.toLowerCase() : text);
  const path = toPosix(file).split("?")[0] as string;
  const root = toPosix(ROOT);
  if (!fold(path).startsWith(fold(root))) return undefined;
  const rel = path.slice(root.length);
  const top = /^(css|src)\/(.+)$/.exec(rel);
  if (!top) return undefined;
  const name = top[2] as string;
  const m = PACKAGE_FILE.exec(name);
  if (m) {
    const kind = m[2];
    return `@import "${PICO_PACKAGE}${kind ? `/${kind}` : ""}";\n`;
  }
  const extra = /^extras\/([\w-]+?)(?:\.min)?\.css$/.exec(name);
  if (extra && EXTRAS.includes(extra[1] as string)) {
    return `@import "${PICO_PACKAGE}/extras/${extra[1]}";\n`;
  }
  return undefined;
}
