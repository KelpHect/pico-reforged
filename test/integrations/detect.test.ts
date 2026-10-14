import assert from "node:assert/strict";
import { test } from "vite-plus/test";
import { assemble } from "../../scripts/lib/integrations/process.ts";
import { classifySpecifier, parseRoot, wrapperFor } from "../../scripts/lib/integrations/detect.ts";
import { expandBraces } from "../../scripts/lib/integrations/glob.ts";

test("a stylesheet without the package is not a root", () => {
  assert.equal(parseRoot("body { color: red }"), undefined);
  assert.equal(parseRoot('@import "tailwindcss";'), undefined);
  // the name inside a comment or a value is not an import
  assert.equal(
    parseRoot("/* @rusticstack/pico-reforged */ a { content: '@rusticstack/pico-reforged' }"),
    undefined,
  );
});

test("root detection finds every import form", () => {
  const forms = [
    '@import "@rusticstack/pico-reforged";',
    "@import '@rusticstack/pico-reforged';",
    '@import url("@rusticstack/pico-reforged");',
    "@import url(@rusticstack/pico-reforged);",
    '@import "@rusticstack/pico-reforged" layer(base);',
    '@import "@rusticstack/pico-reforged/classless";',
    '@import "@rusticstack/pico-reforged/colors";',
    '@import "@rusticstack/pico-reforged/extras";',
    '@import "@rusticstack/pico-reforged/extras/tabs";',
  ];
  for (const form of forms) {
    const root = parseRoot(`${form}\nbody { margin: 0 }`);
    assert.ok(root, form);
    assert.equal(root.imports.length, 1, form);
  }
  assert.equal(
    parseRoot('@import "@rusticstack/pico-reforged/classless";')?.imports[0]?.kind,
    "classless",
  );
  assert.equal(
    parseRoot('@import "@rusticstack/pico-reforged/extras/tabs";')?.imports[0]?.extra,
    "tabs",
  );
});

test("specifiers of other packages and unknown subpaths", () => {
  assert.equal(classifySpecifier("@rusticstack/other"), undefined);
  assert.equal(classifySpecifier("@rusticstack/pico-reforged-extra"), undefined);
  assert.throws(
    () => classifySpecifier("@rusticstack/pico-reforged/nope"),
    /Unknown Pico Reforged import/,
  );
  assert.throws(
    () => classifySpecifier("@rusticstack/pico-reforged/extras/nope"),
    /Unknown extra "nope"/,
  );
});

test("@pico sets compiler options", () => {
  const root = parseRoot(`
    @import "@rusticstack/pico-reforged";
    @pico {
      theme: jade;
      extras: tabs badge;
      classless: false;
      scope: none;
      fluid: true;
      purge: safe;
      safelist: aria-busy /^htmx-/ "quoted-name";
      /* a comment; with a semicolon */
      exclude: components/modal, forms/input-range;
    }
  `);
  assert.ok(root);
  const { config } = root;
  assert.equal(config.options.theme, "jade");
  assert.deepEqual(config.options.extras, ["tabs", "badge"]);
  assert.equal(config.classless, false);
  assert.equal(config.options.scope, "");
  assert.equal(config.options.fluid, true);
  assert.equal(config.purge, "safe");
  assert.deepEqual(config.options.exclude, ["components/modal", "forms/input-range"]);
  assert.equal(config.safelist[0], "aria-busy");
  assert.ok(config.safelist[1] instanceof RegExp && config.safelist[1].test("htmx-request"));
  assert.equal(config.safelist[2], "quoted-name");
});

test("@pico accepts a color or a CSS file as theme and rejects bad values", () => {
  const color = parseRoot('@import "@rusticstack/pico-reforged"; @pico { theme: #e5484d; }');
  assert.deepEqual(color?.config.options.theme, { color: "#e5484d" });
  const file = parseRoot('@import "@rusticstack/pico-reforged"; @pico { theme: "./brand.css"; }');
  assert.equal(file?.config.themeFile, "./brand.css");
  const bad = (css: string) => () => parseRoot(`@import "@rusticstack/pico-reforged"; ${css}`);
  assert.throws(bad("@pico { theme: nope; }"), /unknown theme/);
  assert.throws(bad("@pico { extras: tabs nope; }"), /unknown extra "nope"/);
  assert.throws(bad("@pico { fluid: maybe; }"), /takes true or false/);
  assert.throws(bad("@pico { purge: sometimes; }"), /safe, aggressive or off/);
  assert.throws(bad("@pico { theme }"), /expected "name: value"/);
  // "auto" shipped first and stays an alias for "safe"
  assert.equal(
    parseRoot('@import "@rusticstack/pico-reforged"; @pico { purge: auto; }')?.config.purge,
    "safe",
  );
  assert.equal(
    parseRoot('@import "@rusticstack/pico-reforged"; @pico { purge: aggressive; }')?.config.purge,
    "aggressive",
  );
  // unknown properties warn, they do not stop the build
  const warned = parseRoot('@import "@rusticstack/pico-reforged"; @pico { colour: red; }');
  assert.match(warned?.config.warnings[0] ?? "", /unknown property "colour"/);
});

test("@source rules", () => {
  const root = parseRoot(`
    @import "@rusticstack/pico-reforged";
    @source "../content";
    @source "../app/**/*.{html,tsx}";
    @source not "../src/legacy";
    @source inline("aria-busy modal-is-open");
    @source inline("btn-{a,b,c}");
  `);
  assert.ok(root);
  assert.deepEqual(root.config.sources, [
    { pattern: "../content", not: false },
    { pattern: "../app/**/*.{html,tsx}", not: false },
    { pattern: "../src/legacy", not: true },
  ]);
  assert.deepEqual(root.config.inline, ["aria-busy", "modal-is-open", "btn-a", "btn-b", "btn-c"]);
  assert.ok(root.config.safelist.includes("btn-b"));
  assert.throws(
    () => parseRoot('@import "@rusticstack/pico-reforged"; @source nothing;'),
    /@source: expected/,
  );
});

test("source: none and source: path configure the automatic scan", () => {
  assert.equal(
    parseRoot('@import "@rusticstack/pico-reforged"; @pico { source: none; }')?.config.source,
    "none",
  );
  assert.deepEqual(
    parseRoot('@import "@rusticstack/pico-reforged"; @pico { source: "../src"; }')?.config.source,
    {
      base: "../src",
    },
  );
});

test("brace expansion", () => {
  assert.deepEqual(expandBraces("a-{b,c}-d"), ["a-b-d", "a-c-d"]);
  assert.deepEqual(expandBraces("{a,{b,c}}"), ["a", "b", "c"]);
  assert.deepEqual(expandBraces("plain"), ["plain"]);
});

test("the import wrapper follows layer, supports and media", () => {
  assert.equal(wrapperFor(""), undefined);
  assert.equal(wrapperFor("layer(base)")?.open, "@layer base {\n");
  assert.equal(wrapperFor("layer")?.open, "@layer {\n");
  assert.match(
    wrapperFor("layer(base) screen and (width >= 40em)")?.open ?? "",
    /@layer base \{\n@media screen and \(width >= 40em\) \{/,
  );
  assert.match(wrapperFor("supports(display: grid)")?.open ?? "", /@supports \(display: grid\) \{/);
});

test("assemble puts the compiled CSS after the imports and removes the Pico statements", () => {
  const source = `@charset "utf-8";
@import "./fonts.css";
@import "@rusticstack/pico-reforged";
@pico { theme: jade; }
@source "../x";
@layer app;
body { color: red; }
@import "@rusticstack/pico-reforged/extras/tabs";
`;
  const root = parseRoot(source);
  assert.ok(root);
  const out = assemble(source, root, "/*COMPILED*/");
  assert.ok(out.indexOf("/*COMPILED*/") > out.indexOf("@layer app;"));
  assert.ok(out.indexOf("/*COMPILED*/") < out.indexOf("body {"));
  assert.ok(!out.includes("@pico") && !out.includes("@source") && !out.includes("pico-reforged"));
  assert.ok(out.includes('@import "./fonts.css"'));
});

test("a file that also imports Tailwind keeps its @source rules", () => {
  const source = '@import "tailwindcss";\n@import "@rusticstack/pico-reforged";\n@source "../x";\n';
  const root = parseRoot(source);
  assert.ok(root);
  assert.ok(assemble(source, root, "/*C*/").includes('@source "../x"'));
});
