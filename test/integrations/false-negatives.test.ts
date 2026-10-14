import assert from "node:assert/strict";
import { test } from "vite-plus/test";
import { ANY, emptyIndex, scanText } from "../../scripts/lib/compiler/purge.ts";
import { Engine } from "../../scripts/lib/integrations/process.ts";
import { resolveSources, Scanner } from "../../scripts/lib/integrations/scanner.ts";
import { makeProject } from "./helpers.ts";

const scanOf = (text: string) => {
  const index = emptyIndex();
  scanText(index, text);
  return index;
};

const values = (index: ReturnType<typeof scanOf>, name: string): string[] | "any" => {
  const have = index.attrs.get(name);
  return have === ANY ? "any" : have ? [...have] : [];
};

test("framework components give a, img and headings without the tags in the sources", () => {
  const dir = makeProject({
    "package.json": "{}",
    "src/layout.tsx": "<main><Link href='/'/></main>",
  });
  const { index } = new Scanner({ root: dir }).scan();
  for (const tag of ["a", "img", "h1", "h6"]) assert.ok(index.tags.has(tag), tag);
});

test("a value assigned with key: 'value' or el.prop = 'value' is recorded", () => {
  const index = scanOf(
    "const f = { type: 'date' }; h('input', { 'role': 'switch' }); i.type = 'range'; a === 'x'",
  );
  assert.ok(values(index, "type").includes("date"));
  assert.ok(values(index, "type").includes("range"));
  assert.ok(index.attrs.has("role"));
});

test("properties that reflect to attributes count as the attribute", () => {
  const index = scanOf("btn.disabled = true; input.readOnly = true; el.popover = 'auto'");
  assert.equal(values(index, "disabled"), "any");
  assert.equal(values(index, "readonly"), "any");
  assert.equal(values(index, "popover"), "any");
});

test("server code inside a tag does not hide the tag or its attributes", () => {
  const php = scanOf(
    `<input type="<?= $t ?>"><button <?= $busy ? 'aria-busy="true"' : '' ?>>x</button>`,
  );
  assert.ok(php.tags.has("button"));
  assert.equal(values(php, "type"), "any");
  assert.equal(values(php, "aria-busy"), "any");
  const ejs = scanOf(`<button <% if (busy) { %>aria-busy<% } %>>x</button>`);
  assert.ok(ejs.tags.has("button"));
  assert.ok(ejs.attrs.has("aria-busy"));
});

test("build-like folder names are scanned below the scan root", () => {
  const dir = makeProject({
    "package.json": "{}",
    "src/app/build/page.tsx": "<dialog open><article>x</article></dialog>",
    "src/x/target/a.html": "<details><summary>s</summary></details>",
    "dist/old.html": "<mark>stale</mark>",
  });
  const { index } = new Scanner({ root: dir }).scan();
  assert.ok(index.tags.has("dialog"));
  assert.ok(index.tags.has("details"));
  assert.ok(!index.tags.has("mark"));
});

test("a folder with Next.js output markers is not scanned", () => {
  const dir = makeProject({
    "package.json": "{}",
    "src/a.html": "<p>x</p>",
    "out-next/BUILD_ID": "abc",
    "out-next/page.html": "<mark>stale</mark>",
  });
  const { index } = new Scanner({ root: dir }).scan();
  assert.ok(!index.tags.has("mark"));
});

test("a CMS renderer or markdown library turns on the content tags", () => {
  const dir = makeProject({
    "package.json": "{}",
    "src/a.tsx": "<article><RichText data={post.body}/></article>",
  });
  const scan = new Scanner({ root: dir }).scan();
  assert.ok(scan.index.tags.has("blockquote"));
  assert.ok(scan.index.tags.has("input"));
});

test("an explicit @source lifts the 1 MB limit, the automatic scan reports the file", () => {
  const big = `{"html":"<mark>x</mark>","pad":"${"x".repeat(1_200_000)}"}`;
  const dir = makeProject({ "package.json": "{}", "src/data/big.json": big });
  const auto = new Scanner({ root: dir }).scan();
  assert.equal(auto.skipped.length, 1);
  assert.ok(!auto.index.tags.has("mark"));
  const explicit = new Scanner({
    root: dir,
    sources: resolveSources(dir, [{ pattern: "./src/data/big.json", not: false }]),
  }).scan();
  assert.ok(explicit.index.tags.has("mark"));
});

test("a scan with no markup or script file warns", async () => {
  const dir = makeProject({ "package.json": "{}", "notes.txt": "hello" });
  const out = await new Engine().process({
    css: '@import "@rusticstack/pico-reforged";\n',
    file: `${dir}/app.css`,
    purge: true,
  });
  assert.ok(out?.warnings.some((w) => w.includes("no markup or script file")));
});
