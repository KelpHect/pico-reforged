import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, extname, join, resolve } from "node:path";
import { themes } from "../../data/themes.ts";
import type { CompileOptions, EntryName, PurgeOptions, ThemeOption } from "./types.ts";

/**
 * The package root: the nearest folder above this file that holds package.json. The same code
 * runs from scripts/lib/compiler/ (development) and from dist/ (the bundled CLI and library),
 * so a fixed number of "../" would be wrong in one of them.
 */
function findPackageRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  while (!existsSync(join(dir, "package.json"))) {
    const parent = dirname(dir);
    if (parent === dir) throw new Error("pico-reforged: package.json not found");
    dir = parent;
  }
  return `${dir.replaceAll("\\", "/")}/`;
}

export const ROOT = findPackageRoot();
export const SRC = `${ROOT}src`;

/**
 * Default browserslist query: the same floor as Tailwind CSS v4. Lightning CSS lowers nesting,
 * light-dark() and OKLCH for these browsers and adds the prefixes they still need. Override it
 * with the `targets` option or --targets.
 */
export const DEFAULT_TARGETS =
  "chrome >= 111, edge >= 111, firefox >= 128, safari >= 16.4, ios_saf >= 16.4";

/**
 * Optional higher floor, Baseline 2024 (Chrome and Edge 123, Firefox 128, Safari and iOS 17.5).
 * Native nesting, light-dark() and OKLCH stay in the output instead of being lowered, which
 * makes the files smaller. Select it with `targets: "modern"` or `--targets modern`.
 */
export const MODERN_TARGETS =
  "chrome >= 123, edge >= 123, firefox >= 128, safari >= 17.5, ios_saf >= 17.5";

export const THEMES: string[] = Object.keys(themes);
export const DEFAULT_THEME = "azure";

/** Every switchable module, in import order. Names match the paths under src/. */
export const MODULES: string[] = [
  "reset/document",
  "layout/landmarks",
  "layout/section",
  "layout/responsive-spacings",
  "layout/container",
  "layout/semantic-container",
  "layout/grid",
  "layout/overflow-auto",
  "content/typography",
  "content/link",
  "content/button",
  "content/table",
  "content/embedded",
  "content/code",
  "content/figure",
  "content/misc",
  "forms/basics",
  "forms/checkbox-radio-switch",
  "forms/input-color",
  "forms/input-date",
  "forms/input-file",
  "forms/input-range",
  "forms/input-search",
  "components/accordion",
  "components/card",
  "components/dropdown",
  "components/group",
  "components/loading",
  "components/modal",
  "components/nav",
  "components/progress",
  "components/tooltip",
  "components/popover",
  "utilities/accessibility",
  "utilities/reduce-motion",
];

/** Every opt-in extra, in import order. Names match the files under src/extras/. */
export const EXTRAS: string[] = [
  "tabs",
  "alert",
  "toast",
  "badge",
  "avatar",
  "skeleton",
  "app-shell",
  "data-table",
  "pagination",
  "stepper",
  "empty-state",
];

/** Modules that are off unless asked for. The classless entry turns on the semantic container. */
const OFF_BY_DEFAULT = new Set(["layout/semantic-container", "layout/responsive-spacings"]);

export type ResolvedOptions = {
  entry: EntryName;
  /** Final on/off state of every module. */
  modules: Record<string, boolean>;
  theme: ThemeOption;
  /** Extras to include, in EXTRAS order. */
  extras: string[];
  extrasDir: string;
  classes: boolean;
  fluid: boolean;
  scope: string;
  responsiveTypography: boolean;
  transitions: boolean;
  important: boolean;
  purge: PurgeOptions | false;
  targets: string | string[];
  minify: boolean;
  sourceMap: boolean;
  banner: string;
  /** Problems with the input that did not stop the build, such as unknown keys. */
  warnings: string[];
};

const KNOWN_KEYS = new Set([
  "entry",
  "modules",
  "exclude",
  "theme",
  "extras",
  "extrasDir",
  "classes",
  "semanticContainer",
  "fluid",
  "scope",
  "responsiveTypography",
  "responsiveSpacings",
  "transitions",
  "important",
  "purge",
  "targets",
  "minify",
  "sourceMap",
  "banner",
]);

/** A theme string that is a CSS color becomes { color }; a name or a file path stays. */
export function normalizeTheme(theme: ThemeOption): ThemeOption {
  if (
    typeof theme === "string" &&
    !THEMES.includes(theme) &&
    (/^#[0-9a-f]{3,8}$/i.test(theme) || /^(rgb|hsl|oklch|oklab|lab|lch|hwb)a?\(/i.test(theme))
  ) {
    return { color: theme };
  }
  return theme;
}

/** `exclude` takes a list or a comma separated string of module names. */
function excludeList(exclude: CompileOptions["exclude"]): string[] {
  const list = typeof exclude === "string" ? exclude.split(",") : (exclude ?? []);
  return list.map((name) => name.trim()).filter(Boolean);
}

/** `extras` takes true, "all", a list or a comma separated string. Returns names in EXTRAS order. */
function extrasList(extras: CompileOptions["extras"], fallback: boolean): string[] {
  if (extras === undefined) return fallback ? [...EXTRAS] : [];
  if (extras === true) return [...EXTRAS];
  if (extras === false) return [];
  const list = (typeof extras === "string" ? extras.split(",") : extras)
    .map((name) => name.trim())
    .filter(Boolean);
  if (list.includes("all")) return [...EXTRAS];
  for (const name of list) {
    if (!EXTRAS.includes(name)) {
      throw new Error(`Unknown extra "${name}". Valid extras: ${EXTRAS.join(", ")}`);
    }
  }
  return EXTRAS.filter((name) => list.includes(name));
}

export function resolveOptions(input: CompileOptions = {}): ResolvedOptions {
  const warnings: string[] = [];
  for (const key of Object.keys(input)) {
    if (!KNOWN_KEYS.has(key)) {
      warnings.push(
        `unknown option "${key}" ignored. Valid options: ${[...KNOWN_KEYS].join(", ")}`,
      );
    }
  }
  const entry = input.entry ?? "pico";
  if (entry !== "pico" && entry !== "classless" && entry !== "colors" && entry !== "extras") {
    throw new Error(`Unknown entry "${String(entry)}". Use pico, classless, colors or extras.`);
  }
  const classless = entry === "classless";

  const modules: Record<string, boolean> = {};
  for (const name of MODULES) modules[name] = !OFF_BY_DEFAULT.has(name);
  modules["layout/semantic-container"] = input.semanticContainer ?? classless;
  modules["layout/responsive-spacings"] = input.responsiveSpacings ?? false;
  for (const [name, on] of Object.entries(input.modules ?? {})) {
    if (!MODULES.includes(name)) {
      throw new Error(`Unknown module "${name}". Valid modules: ${MODULES.join(", ")}`);
    }
    modules[name] = on;
  }
  for (const name of excludeList(input.exclude)) {
    if (!MODULES.includes(name)) {
      throw new Error(`Unknown module "${name}". Valid modules: ${MODULES.join(", ")}`);
    }
    modules[name] = false;
  }
  const extras = extrasList(input.extras, entry === "extras");
  if (entry === "colors" && extras.length) {
    warnings.push('the "colors" entry takes no extras, so "extras" is ignored');
    extras.length = 0;
  }
  const important = input.important ?? true;
  const transitions = input.transitions ?? true;
  // v2.1.1 only built reduce-motion when transitions and !important were both on.
  if (!important || !transitions) modules["utilities/reduce-motion"] = false;

  return {
    entry,
    modules,
    theme: normalizeTheme(input.theme ?? DEFAULT_THEME),
    extras,
    extrasDir: input.extrasDir ? resolve(input.extrasDir).replaceAll("\\", "/") : "",
    classes: input.classes ?? !classless,
    fluid: input.fluid ?? false,
    scope: (input.scope ?? "").trim(),
    responsiveTypography: input.responsiveTypography ?? true,
    transitions,
    important,
    purge: input.purge ?? false,
    targets: input.targets ?? DEFAULT_TARGETS,
    minify: input.minify ?? false,
    sourceMap: input.sourceMap ?? false,
    banner: input.banner ?? "",
    warnings,
  };
}

export function packageInfo(): { name: string; version: string } {
  const pkg = JSON.parse(readFileSync(`${ROOT}package.json`, "utf8")) as {
    name: string;
    version: string;
  };
  return { name: pkg.name, version: pkg.version };
}

/** Loads pico.config.json, or a .ts/.mjs/.js module with the options as default export. */
export async function loadConfigFile(path: string): Promise<CompileOptions> {
  const file = resolve(path);
  if (!existsSync(file)) throw new Error(`Config file not found: ${path}`);
  if (extname(file) === ".json") return JSON.parse(readFileSync(file, "utf8")) as CompileOptions;
  const mod = (await import(pathToFileURL(file).href)) as { default?: CompileOptions };
  return mod.default ?? (mod as CompileOptions);
}

/** Finds pico.config.{json,ts,mjs,js} in the working directory. */
export function findConfigFile(cwd = process.cwd()): string | undefined {
  for (const ext of ["json", "ts", "mjs", "js"]) {
    const file = resolve(cwd, `pico.config.${ext}`);
    if (existsSync(file)) return file;
  }
  return undefined;
}
