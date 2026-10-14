export type EntryName = "pico" | "classless" | "colors";

export type ThemeOption = string | { color: string } | { hue: number; chroma: number };

export type PurgeOptions = {
  /** Globs of files to scan (HTML, templates, JS). */
  content: string[];
  /** Names that are always kept: classes, ids, tags, attribute names or "name=value". */
  safelist?: (string | RegExp)[];
};

export type CompileOptions = {
  /** Which source entry to build. Default "pico". */
  entry?: EntryName;
  /** Module switches by src path, for example "components/modal". Default: all on. */
  modules?: Record<string, boolean>;
  /** Built-in theme name, { color }, { hue, chroma } or the path of a CSS file with token overrides. */
  theme?: ThemeOption;
  /** false drops every selector that needs a class. Default true, false for the classless entry. */
  classes?: boolean;
  /** Adds layout/semantic-container. Default false, true for the classless entry. */
  semanticContainer?: boolean;
  /** Fluid semantic container: no max width. */
  fluid?: boolean;
  /** Selector that prefixes every rule, "" for none. */
  scope?: string;
  /** false keeps the root font size fixed. Default true. */
  responsiveTypography?: boolean;
  /** true adds layout/responsive-spacings. Default false. */
  responsiveSpacings?: boolean;
  /** false sets --pico-transition to 0s. Default true. */
  transitions?: boolean;
  /** false strips !important. Default true. */
  important?: boolean;
  /** false removes the @layer wrappers for browsers without cascade layers. Default true. */
  layers?: boolean;
  /** Remove rules that cannot match the given content. Default false. */
  purge?: PurgeOptions | false;
  /** Browserslist query. Default "defaults". */
  targets?: string | string[];
  minify?: boolean;
  sourceMap?: boolean;
  /** Text put at the top of the output. */
  banner?: string;
};

export type CompileStats = {
  entry: EntryName;
  bytes: number;
  gzipBytes: number;
  brotliBytes: number;
  rules: number;
  removedByClassless: number;
  removedByPurge: number;
  excludedModules: string[];
  durationMs: number;
  warnings: string[];
};

export type CompileResult = {
  css: string;
  map?: string;
  stats: CompileStats;
};
