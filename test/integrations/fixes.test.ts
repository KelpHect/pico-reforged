import assert from "node:assert/strict";
import { test } from "vite-plus/test";
import { Engine } from "../../scripts/lib/integrations/process.ts";
import { emptyIndex, scanText, ANY } from "../../scripts/lib/compiler/purge.ts";
import { Scanner } from "../../scripts/lib/integrations/scanner.ts";
import { makeProject } from "./helpers.ts";

const IMPORT = '@import "@rusticstack/pico-reforged";\n';

test("markup in JSON with escaped quotes keeps its attribute values", () => {
  const index = emptyIndex();
  scanText(index, String.raw`[{"body":"<a role=\"button\"><input type=\"range\"></a>"}]`);
  assert.ok((index.attrs.get("type") as Set<string>).has("range"));
  assert.ok((index.attrs.get("role") as Set<string>).has("button"));
});

test("Pug tags, nested-quote tags and variable assignments are read", () => {
  const index = emptyIndex();
  scanText(index, "dialog\n  article\n    h3 Title\n<component :is=\"'table'\">\nel.type = kind;");
  for (const tag of ["dialog", "article", "table"]) assert.ok(index.tags.has(tag), tag);
  assert.equal(index.attrs.get("type"), ANY);
});

test("Svelte quoted braces and Angular bindings mark the value as unknown", () => {
  const index = emptyIndex();
  scanText(index, '<input type="{kind}"><a [attr.role]="r">');
  assert.equal(index.attrs.get("type"), ANY);
  assert.equal(index.attrs.get("role"), ANY);
});

test("htmx fragments and unescaped template output keep content and form tags", () => {
  for (const text of [
    '<button hx-get="/modal">x</button>',
    "{{{ body }}}",
    "{{ x | mark_safe }}",
  ]) {
    const dir = makeProject({ "package.json": "{}", "index.html": text });
    const scan = new Scanner({ root: dir }).scan();
    assert.ok(scan.index.tags.has("table"), text);
    assert.ok(scan.index.tags.has("label"), text);
  }
});

test("a source file over the size limit counts as dynamic", () => {
  const dir = makeProject({ "package.json": "{}", "big.md": "x".repeat(2048) });
  const scan = new Scanner({ root: dir, maxFileSize: 1024 }).scan();
  assert.ok(scan.index.tags.has("blockquote"));
});

test("a sibling build folder with a custom name is not scanned", () => {
  const dir = makeProject({
    "package.json": "{}",
    "index.html": "<main></main>",
    "dist-full/index.html": '<p class="only-in-old-build"></p>',
  });
  const scan = new Scanner({ root: dir }).scan();
  assert.ok(!scan.index.classes.has("only-in-old-build"));
});

test("a custom Next.js distDir is not scanned", async () => {
  const dir = makeProject({
    "package.json": "{}",
    "next.config.mjs": 'export default { distDir: ".next-orig" };',
    "app/page.tsx": "export default () => <main />;",
    ".next-orig/build/chunks/a.js": 'const t = "reset"; const f = "file"; const s = "search";',
  });
  const out = await new Engine().process({ css: IMPORT, file: `${dir}/app/app.css`, purge: true });
  assert.ok(out);
  assert.ok(!out.dependencies.files.some((f) => f.includes(".next-orig")));
});
