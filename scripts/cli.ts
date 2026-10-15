#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { parseArgs } from "node:util";
import {
  buildMatrix,
  compile,
  DEFAULT_TARGETS,
  findConfigFile,
  formatStats,
  formatTable,
  loadConfigFile,
  packageInfo,
  EXTRAS,
  MODULES,
  THEMES,
} from "./lib/compiler/index.ts";
import { purgeOutput } from "./lib/integrations/purge-output.ts";
import type { PurgeOutputOptions } from "./lib/integrations/purge-output.ts";
import type { CompileOptions, EntryName, ThemeOption } from "./lib/compiler/index.ts";

const HELP = `pico-reforged

Usage
  pico-reforged build [options]    compile one stylesheet
  pico-reforged matrix [outDir]    write the full file set (default outDir: css)
  pico-reforged purge <outDir>     remove unused Pico rules from a built site
  pico-reforged themes             list the built-in themes
  pico-reforged modules            list the modules that can be excluded
  pico-reforged extras             list the opt-in extras

Purge options (pico-reforged purge <outDir>)
  --css <glob>           stylesheets to rewrite, relative to outDir (default **/*.css, repeatable)
  --content <glob>       more files to read names from, relative to the working directory (repeatable)
  --safelist <name>      keep this class, id, tag or attribute (repeatable). /regex/ is accepted
  --mode <mode>          safe (default) never drops a rule for a missing tag or attribute value,
                         aggressive also drops those, so run-time markup needs --safelist
  --keep-types           keep rules that only lack tags in the content (CMS or Markdown output)
  --targets <query>      browserslist query used when the CSS is parsed again (default: the build floor)
  --dry-run              report and write nothing

Only rules inside @layer pico.* change. Other CSS in the files is left as it is.

Build options
  --config <file>        pico.config.json, .ts or .mjs (found in the working directory if omitted)
  --entry <name>         pico, classless, colors or extras
  --theme <value>        theme name, a color such as "#e5484d", or the path of a CSS file
  --extras <list>        comma separated extras to add, or "all", for example tabs,badge
  --no-classes           drop every selector that needs a class
  --semantic-container   style body > header, main and footer as containers
  --fluid                no max width on the semantic container
  --scope <selector>     prefix every rule, for example .pico
  --exclude <list>       comma separated modules to leave out, for example components/modal
  --purge <glob>         remove rules that cannot match these files (repeatable)
  --safelist <name>      keep this class, id, tag or attribute when purging (repeatable). /regex/ is
                         accepted. Adds to the purge block of the config file
  --responsive-spacings  scale spacings with the viewport
  --no-responsive-typography
  --no-transitions
  --no-important
  --targets <query>      browserslist query, default "${DEFAULT_TARGETS}", or "modern" for a
                         smaller build that keeps native nesting and light-dark()
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

/** A /regex/flags entry becomes a RegExp, anything else stays a name. */
const parseSafelist = (entries: string[] | undefined): (string | RegExp)[] =>
  (entries ?? []).map((entry) => {
    const m = /^\/(.+)\/([a-z]*)$/.exec(entry);
    return m ? new RegExp(m[1] as string, m[2]) : entry;
  });

const fromFlags = (values: Record<string, unknown>): CompileOptions => {
  const o: CompileOptions = {};
  if (values["entry"]) o.entry = values["entry"] as EntryName;
  if (values["theme"]) o.theme = parseTheme(values["theme"] as string);
  if (values["extras"]) o.extras = values["extras"] as string;
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
  if (purge?.length) o.purge = { content: purge };
  if (values["responsive-spacings"]) o.responsiveSpacings = true;
  if (values["no-responsive-typography"]) o.responsiveTypography = false;
  if (values["no-transitions"]) o.transitions = false;
  if (values["no-important"]) o.important = false;
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
      extras: { type: "string" },
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
  // --safelist adds to the purge block of the config file, with or without --purge
  const safelist = parseSafelist(values.safelist);
  const filePurge = fileOptions.purge || undefined;
  if (options.purge || filePurge) {
    const purge = { ...filePurge, ...options.purge };
    purge.safelist = [...(filePurge?.safelist ?? []), ...safelist];
    options.purge = purge;
  } else if (safelist.length > 0) {
    console.error(
      "warning: --safelist has no effect without --purge or a purge block in the config",
    );
  }
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

async function purgeSite(argv: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      css: { type: "string", multiple: true },
      content: { type: "string", multiple: true },
      safelist: { type: "string", multiple: true },
      mode: { type: "string" },
      "keep-types": { type: "boolean" },
      "dry-run": { type: "boolean" },
      targets: { type: "string" },
    },
  });
  const dir = positionals[0];
  if (!dir) {
    console.error("purge needs the folder of the built site: pico-reforged purge <outDir>");
    process.exitCode = 2;
    return;
  }
  const mode = values.mode === "auto" ? "safe" : values.mode;
  if (mode !== undefined && mode !== "safe" && mode !== "aggressive") {
    console.error(`--mode takes safe or aggressive, found "${values.mode}"`);
    process.exitCode = 2;
    return;
  }
  const options: PurgeOutputOptions = { dir, safelist: parseSafelist(values.safelist) };
  if (mode) options.mode = mode;
  if (values.css) options.css = values.css;
  if (values.content) options.content = values.content;
  if (values["keep-types"]) options.keepTypes = true;
  if (values["dry-run"]) options.dryRun = true;
  if (values.targets) options.targets = values.targets;
  const result = await purgeOutput(options);
  for (const file of result.files) {
    console.error(
      file.skipped
        ? `${file.file}: no @layer pico.* block, left alone`
        : `${file.file}: ${file.removed} of ${file.rules} rules removed (${file.before} to ${file.after} bytes)`,
    );
  }
  for (const note of result.notes) console.error(`note: ${note}`);
  console.error(
    `scanned ${result.scanned} files${options.dryRun ? " (dry run, nothing written)" : ""}`,
  );
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
    case "purge":
      return purgeSite(rest);
    case "themes":
      console.log(THEMES.join("\n"));
      return;
    case "modules":
      console.log(MODULES.join("\n"));
      return;
    case "extras":
      console.log(EXTRAS.join("\n"));
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
