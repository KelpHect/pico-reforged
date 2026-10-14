import assert from "node:assert/strict";
import { test } from "vite-plus/test";
import { emptyIndex, scanText } from "../../scripts/lib/compiler/purge.ts";
import { Engine } from "../../scripts/lib/integrations/process.ts";
import { purgeStylesheet } from "../../scripts/lib/integrations/purge-output.ts";
import { resolveSources, Scanner } from "../../scripts/lib/integrations/scanner.ts";
import { makeProject } from "./helpers.ts";

const IMPORT = '@import "@rusticstack/pico-reforged";\n';

test("one engine: a changed layer() suffix on the import changes the output", async () => {
  const dir = makeProject({
    "package.json": "{}",
    "index.html": "<main><button>a</button></main>",
  });
  const engine = new Engine();
  const file = `${dir}/app.css`;
  const plain = await engine.process({ css: IMPORT, file, purge: true });
  const layered = await engine.process({
    css: '@import "@rusticstack/pico-reforged" layer(base);\n',
    file,
    purge: true,
  });
  assert.ok(plain && layered);
  assert.ok(layered.css.includes("@layer base"), "the layer() wrapper was dropped by the cache");
});

test("one engine: adding the /colors import changes the output", async () => {
  const dir = makeProject({
    "package.json": "{}",
    "index.html": '<main class="pico-color-red-500"><button>a</button></main>',
  });
  const engine = new Engine();
  const file = `${dir}/app.css`;
  await engine.process({ css: IMPORT, file, purge: true });
  const withColors = await engine.process({
    css: `${IMPORT}@import "@rusticstack/pico-reforged/colors";\n`,
    file,
    purge: true,
  });
  assert.ok(withColors?.css.includes("pico-color-red-500"), "the colors CSS is missing");
});

test("an explicit @source file is read even when the automatic scan skips its extension", () => {
  const dir = makeProject({ "package.json": "{}", "src/legacy.pcss": '<p class="only-in-pcss">' });
  const scan = new Scanner({
    root: dir,
    sources: resolveSources(dir, [{ pattern: "./src/legacy.pcss", not: false }]),
  }).scan();
  assert.ok(scan.index.classes.has("only-in-pcss"));
});

test.skipIf(process.platform !== "win32")(
  "@source not on another drive does not exclude the whole project",
  () => {
    const dir = makeProject({ "package.json": "{}", "src/a.html": '<p class="kept">' });
    const other = dir.startsWith("D:") ? "C:/nowhere" : "D:/nowhere";
    const scan = new Scanner({
      root: dir,
      sources: [{ base: other, pattern: "", not: true }],
    }).scan();
    assert.ok(scan.index.classes.has("kept"));
  },
);

test.skipIf(process.platform !== "win32")(
  "ignore paths match whatever the drive letter case",
  () => {
    const dir = makeProject({ "package.json": "{}", "gen/a.html": '<p class="in-gen">' });
    const flipped = (dir[0] as string).toLowerCase() + dir.slice(1);
    const scan = new Scanner({ root: dir, ignore: [`${flipped}/gen`] }).scan();
    assert.ok(!scan.index.classes.has("in-gen"));
  },
);

test("an import of a prebuilt file of the package is left alone, not an error", async () => {
  const engine = new Engine();
  const css = '@import "@rusticstack/pico-reforged/css/pico.jade.min.css";\n.mine{color:red}\n';
  await assert.doesNotReject(async () => {
    const out = await engine.process({ css, file: `${process.cwd()}/a.css`, purge: false });
    assert.equal(out, undefined);
  });
});

test("purge of built CSS drops @keyframes that no kept rule uses", () => {
  const index = emptyIndex();
  scanText(index, '<p class="other">');
  const css =
    "@layer pico.core {\n  @keyframes spin {\n    to { transform: rotate(1turn); }\n  }\n  .spinner {\n    animation: spin 1s linear infinite;\n  }\n  .other { color: red; }\n}\n";
  const out = purgeStylesheet(css, index).css;
  assert.ok(!out.includes("@keyframes spin"), out);
});
