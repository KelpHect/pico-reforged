import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { extname, resolve } from "node:path";
import { themes } from "../../data/themes.ts";
import type { CompileOptions, EntryName, PurgeOptions, ThemeOption } from "./types.ts";

export const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
export const SRC = `${ROOT.replaceAll("\\", "/")}src`;

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

/** Modules that are off unless asked for. The classless entry turns on the semantic container. */
const OFF_BY_DEFAULT = new Set(["layout/semantic-container", "layout/responsive-spacings"]);

export type ResolvedOptions = {
  entry: EntryName;
  /** Final on/off state of every module. */
  modules: Record<string, boolean>;
  theme: ThemeOption;
  classes: boolean;
  fluid: boolean;
  scope: string;
  responsiveTypography: boolean;
  transitions: boolean;
  important: boolean;
  layers: boolean;
  purge: PurgeOptions | false;
  targets: string | string[];
  minify: boolean;
  sourceMap: boolean;
  banner: string;
};

const KNOWN_KEYS = new Set([
  "entry", "modules", "theme", "classes", "semanticContainer", "fluid", "scope",
  "responsiveTypography", "responsiveSpacings", "transitions", "important", "layers",
  "purge", "targets", "minify", "sourceMap", "banner",
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

export function resolveOptions(input: CompileOptions = {}): ResolvedOptions {
  for (const key of Object.keys(input)) {
    if (KNOWN_KEYS.has(key)) continue;
    const hint = key === "exclude" ? ' To turn modules off use modules: {"components/modal": false}.' : "";
    throw new Error(`Unknown option "${key}".${hint} Valid options: ${[...KNOWN_KEYS].join(", ")}`);
  }
  const entry = input.entry ?? "pico";
  if (entry !== "pico" && entry !== "classless" && entry !== "colors") {
    throw new Error(`Unknown entry "${String(entry)}". Use pico, classless or colors.`);
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
  const important = input.important ?? true;
  const transitions = input.transitions ?? true;
  // v2.1.1 only built reduce-motion when transitions and !important were both on.
  if (!important || !transitions) modules["utilities/reduce-motion"] = false;

  return {
    entry,
    modules,
    theme: normalizeTheme(input.theme ?? DEFAULT_THEME),
    classes: input.classes ?? !classless,
    fluid: input.fluid ?? false,
    scope: (input.scope ?? "").trim(),
    responsiveTypography: input.responsiveTypography ?? true,
    transitions,
    important,
    layers: input.layers ?? true,
    purge: input.purge ?? false,
    targets: input.targets ?? "defaults",
    minify: input.minify ?? false,
    sourceMap: input.sourceMap ?? false,
    banner: input.banner ?? "",
  };
}

export function packageInfo(): { name: string; version: string } {
  const pkg = JSON.parse(readFileSync(new URL("../../../package.json", import.meta.url), "utf8"));
  return { name: pkg.name, version: pkg.version };
}

/** Loads pico.config.json, or a .ts/.mjs/.js module with the options as default export. */
export async function loadConfigFile(path: string): Promise<CompileOptions> {
  const file = resolve(path);
  if (!existsSync(file)) throw new Error(`Config file not found: ${path}`);
  if (extname(file) === ".json") return JSON.parse(readFileSync(file, "utf8"));
  const mod = await import(pathToFileURL(file).href);
  return (mod.default ?? mod) as CompileOptions;
}

/** Finds pico.config.{json,ts,mjs,js} in the working directory. */
export function findConfigFile(cwd = process.cwd()): string | undefined {
  for (const ext of ["json", "ts", "mjs", "js"]) {
    const file = resolve(cwd, `pico.config.${ext}`);
    if (existsSync(file)) return file;
  }
  return undefined;
}
