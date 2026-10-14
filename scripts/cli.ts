#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { parseArgs } from "node:util";
import {
  buildMatrix,
  compile,
  findConfigFile,
  formatStats,
  formatTable,
  loadConfigFile,
  packageInfo,
  MODULES,
  THEMES,
} from "./lib/compiler/index.ts";
import type { CompileOptions, EntryName, ThemeOption } from "./lib/compiler/index.ts";

const HELP = `pico-reforged

Usage
  pico-reforged build [options]    compile one stylesheet
  pico-reforged matrix [outDir]    write the full file set (default outDir: css)
  pico-reforged themes             list the built-in themes
  pico-reforged modules            list the modules that can be excluded

Build options
  --config <file>        pico.config.json, .ts or .mjs (found in the working directory if omitted)
  --entry <name>         pico, classless or colors
  --theme <value>        theme name, a color such as "#e5484d", or the path of a CSS file
  --no-classes           drop every selector that needs a class
  --semantic-container   style body > header, main and footer as containers
  --fluid                no max width on the semantic container
  --scope <selector>     prefix every rule, for example .pico
  --exclude <list>       comma separated modules to leave out, for example components/modal
  --purge <glob>         remove rules that cannot match these files (repeatable)
  --safelist <name>      keep this class, id, tag or attribute when purging (repeatable)
  --responsive-spacings  scale spacings with the viewport
  --no-responsive-typography
  --no-transitions
  --no-important
  --no-layers            remove @layer for browsers without cascade layers
  --targets <query>      browserslist query, default "defaults"
  --minify
  --source-map
  --out <file>           write to a file instead of stdout
`;

const THEME_NAMES = new Set(THEMES);

function parseTheme(value: string): ThemeOption {
  if (THEME_NAMES.has(value)) return value;
  if (/^#[0-9a-f]{3,8}$/i.test(value) || /^(rgb|hsl|oklch|oklab|lab|lch|hwb)a?\(/i.test(value)) {
    return { color: value };
  }
  return value;
}

const fromFlags = (values: Record<string, unknown>): CompileOptions => {
  const o: CompileOptions = {};
  if (values["entry"]) o.entry = values["entry"] as EntryName;
  if (values["theme"]) o.theme = parseTheme(values["theme"] as string);
  if (values["no-classes"]) o.classes = false;
  if (values["semantic-container"]) o.semanticContainer = true;
  if (values["fluid"]) o.fluid = true;
  if (values["scope"] !== undefined) o.scope = values["scope"] as string;
  if (values["exclude"]) {
    o.modules = Object.fromEntries(
      (values["exclude"] as string)
        .split(",")
        .map((m) => [m.trim(), false] as const)
        .filter(([m]) => m),
    );
  }
  const purge = values["purge"] as string[] | undefined;
  if (purge?.length)
    o.purge = { content: purge, safelist: (values["safelist"] as string[] | undefined) ?? [] };
  if (values["responsive-spacings"]) o.responsiveSpacings = true;
  if (values["no-responsive-typography"]) o.responsiveTypography = false;
  if (values["no-transitions"]) o.transitions = false;
  if (values["no-important"]) o.important = false;
  if (values["no-layers"]) o.layers = false;
  if (values["targets"]) o.targets = values["targets"] as string;
  if (values["minify"]) o.minify = true;
  if (values["source-map"]) o.sourceMap = true;
  return o;
};

async function build(argv: string[]): Promise<void> {
  const { values } = parseArgs({
    args: argv,
    options: {
      config: { type: "string" },
      entry: { type: "string" },
      theme: { type: "string" },
      "no-classes": { type: "boolean" },
      "semantic-container": { type: "boolean" },
      fluid: { type: "boolean" },
      scope: { type: "string" },
      exclude: { type: "string" },
      purge: { type: "string", multiple: true },
      safelist: { type: "string", multiple: true },
      "responsive-spacings": { type: "boolean" },
      "no-responsive-typography": { type: "boolean" },
      "no-transitions": { type: "boolean" },
      "no-important": { type: "boolean" },
      "no-layers": { type: "boolean" },
      targets: { type: "string" },
      minify: { type: "boolean" },
      "source-map": { type: "boolean" },
      out: { type: "string" },
    },
  });
  const configFile = values.config ?? findConfigFile();
  const fileOptions = configFile ? await loadConfigFile(configFile) : {};
  const flagOptions = fromFlags(values);
  const options: CompileOptions = {
    ...fileOptions,
    ...flagOptions,
    modules: { ...fileOptions.modules, ...flagOptions.modules },
  };
  if (values["source-map"] && !values.out) {
    console.error("warning: --source-map needs --out; the map is discarded");
  }
  const result = await compile(options);
  for (const warning of result.stats.warnings) console.error(`warning: ${warning}`);
  if (values.out) {
    const file = resolve(values.out);
    mkdirSync(dirname(file), { recursive: true });
    const link = result.map ? `\n/*# sourceMappingURL=${basename(file)}.map */\n` : "";
    writeFileSync(file, result.css + link);
    if (result.map) writeFileSync(`${file}.map`, result.map);
    console.error(formatStats(values.out, result.stats));
  } else {
    process.stdout.write(result.css);
    console.error(formatStats("stdout", result.stats));
  }
}

async function matrix(argv: string[]): Promise<void> {
  const outDir = resolve(argv[0] ?? "css");
  const started = performance.now();
  const files = await buildMatrix(outDir);
  console.error(`${formatTable(files.slice(0, 6))}\n...`);
  console.error(
    `${files.length} files in ${outDir} (${Math.round((performance.now() - started) / 1000)} s)`,
  );
}

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);
  switch (command) {
    case "build":
      return build(rest);
    case "matrix":
      return matrix(rest);
    case "themes":
      console.log(THEMES.join("\n"));
      return;
    case "modules":
      console.log(MODULES.join("\n"));
      return;
    case "--version":
    case "-v":
      console.log(packageInfo().version);
      return;
    case undefined:
    case "help":
    case "--help":
    case "-h":
      console.log(HELP);
      return;
    default:
      console.error(`Unknown command "${command}"\n\n${HELP}`);
      process.exitCode = 2;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
