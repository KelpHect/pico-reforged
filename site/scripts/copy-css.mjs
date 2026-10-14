// Copies the built Pico Reforged CSS into public/css so the live examples can load it, and
// writes the runtime theme sheet the site's own theme picker uses.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { improveExample } from "./example-a11y.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const siteRoot = join(here, "..");
const require = createRequire(import.meta.url);
const pkgRoot = dirname(require.resolve("@rusticstack/pico-reforged/package.json"));
const cssDir = join(pkgRoot, "css");
const outDir = join(siteRoot, "public", "css");

if (!existsSync(join(cssDir, "pico.min.css"))) {
  console.error("css/pico.min.css is missing. Run `pnpm build` in the repository root first.");
  process.exit(1);
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(join(outDir, "extras"), { recursive: true });

const themes = readdirSync(join(pkgRoot, "src", "themes"))
  .filter((file) => file.endsWith(".css"))
  .map((file) => file.slice(0, -4));

const files = ["pico.min.css", "pico.classless.min.css", "pico.colors.min.css", "pico.extras.min.css"];
for (const theme of themes) {
  if (theme === "azure") continue;
  files.push(`pico.${theme}.min.css`, `pico.classless.${theme}.min.css`);
}
for (const file of readdirSync(join(cssDir, "extras"))) {
  if (file.endsWith(".min.css")) files.push(`extras/${file}`);
}
for (const file of files) cpSync(join(cssDir, file), join(outDir, file));

// Theme sheet for the page chrome. The main stylesheet is compiled with one theme (azure), so
// the picker adds the primary tokens of another theme under [data-pico-theme]. Lightning CSS
// lowers light-dark() the same way the main build does.
const pkgRequire = createRequire(join(pkgRoot, "package.json"));
const { DEFAULT_TARGETS } = await import(pathToFileURL(join(pkgRoot, "dist", "compiler.js")).href);
const browserslist = pkgRequire("browserslist");
const { browserslistToTargets, transform } = pkgRequire("lightningcss");

let themeCss = "@layer pico.tokens, pico.theme, pico.core, pico.extras, pico.utilities;\n@layer pico.theme {\n";
for (const theme of themes) {
  if (theme === "azure") continue;
  const source = readFileSync(join(pkgRoot, "src", "themes", `${theme}.css`), "utf8");
  const body = source.slice(source.indexOf("{") + 1, source.lastIndexOf("}"));
  themeCss += `:root[data-pico-theme="${theme}"], :root[data-pico-theme="${theme}"] [data-theme] {${body}}\n`;
}
themeCss += "}\n";
const lowered = transform({
  filename: "site-themes.css",
  code: Buffer.from(themeCss),
  minify: true,
  targets: browserslistToTargets(browserslist(DEFAULT_TARGETS)),
});
writeFileSync(join(outDir, "site-themes.css"), lowered.code);

// Standalone example pages, built from the repository's test fixtures. They run on the site's
// origin, so they read the theme the visitor picked and follow it.
const examples = JSON.parse(readFileSync(join(siteRoot, "lib", "examples.json"), "utf8"));
const exampleScript = `<script>${readFileSync(join(here, "example-theme.js"), "utf8")}</script>`;
const examplesDir = join(siteRoot, "public", "examples");
rmSync(examplesDir, { recursive: true, force: true });
mkdirSync(examplesDir, { recursive: true });
for (const example of examples) {
  let html = readFileSync(join(pkgRoot, example.source), "utf8");
  html = improveExample(html, { wrapTables: example.slug === "kitchen-sink" })
    .replaceAll("../css/", "/css/")
    .replace("__CSS__", `/css/${example.stylesheet ?? "pico"}.min.css`)
    .replace("__EXTRA__", `/css/${example.extra ?? "pico.extras"}.min.css`)
    .replace("__COLORS__", "/css/pico.colors.min.css")
    .replace("</head>", `${exampleScript}
  </head>`);
  writeFileSync(join(examplesDir, `${example.slug}.html`), html);
}

// The AI skill, when the repository has one.
const skillCandidates = [
  "skills/pico-reforged/SKILL.md",
  "ai/pico-reforged/SKILL.md",
  "ai/skill/SKILL.md",
  "ai/SKILL.md",
  "skill/SKILL.md",
  "SKILL.md",
  ".claude/skills/pico-reforged/SKILL.md",
];
const skillDir = join(siteRoot, "public", "skill");
rmSync(skillDir, { recursive: true, force: true });
for (const candidate of skillCandidates) {
  const from = join(pkgRoot, candidate);
  if (existsSync(from)) {
    mkdirSync(skillDir, { recursive: true });
    cpSync(from, join(skillDir, "SKILL.md"));
    console.log(`skill: copied ${candidate}`);
    break;
  }
}
if (!existsSync(join(skillDir, "SKILL.md"))) console.warn("skill: no SKILL.md found in the repository, /skill/SKILL.md will not be published");
console.log(`css: copied ${files.length} files to public/css`);
