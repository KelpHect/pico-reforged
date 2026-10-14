import assert from "node:assert/strict";
import postcss from "postcss";
import { afterEach, beforeEach, test } from "vite-plus/test";
import pico from "../../scripts/integrations/postcss.ts";
import { hasSelector, makeProject, write } from "./helpers.ts";

const project = makeProject({
  "package.json": "{}",
  "src/app.css": `@import "@rusticstack/pico-reforged";
@pico { theme: jade; extras: badge; }
@source inline("keep-me");
.mine { color: rebeccapurple }
`,
  "src/index.html": `<main class="container"><button class="secondary" aria-busy="true">Save</button>
<span data-badge>new</span><article><h1>Hi</h1></article></main>`,
  "src/other.css": ".other { color: red }",
});
const cssFile = `${project}/src/app.css`;
const read = async (name: string) =>
  (await import("node:fs/promises")).readFile(`${project}/${name}`, "utf8");

const saved = process.env["NODE_ENV"];
beforeEach(() => {
  process.env["NODE_ENV"] = "production";
});
afterEach(() => {
  if (saved === undefined) delete process.env["NODE_ENV"];
  else process.env["NODE_ENV"] = saved;
});

const run = async (css: string, options = {}, from = cssFile) =>
  postcss([pico(options)]).process(css, { from });

test("production: the import becomes Pico, purged against the project", async () => {
  const result = await run(await read("src/app.css"));
  const css = result.css;
  assert.ok(!css.includes("@rusticstack") && !css.includes("@pico") && !css.includes("@source"));
  assert.ok(css.includes("@layer pico.core"), "layers are kept");
  assert.ok(css.includes(".mine"), "the app's own CSS is untouched");
  assert.ok(hasSelector(css, "button"), "button is used");
  assert.ok(hasSelector(css, ".secondary"), "class from the markup");
  assert.ok(hasSelector(css, "[data-badge"), "the badge extra is on and used");
  assert.ok(hasSelector(css, "[aria-busy"), "attribute from the markup");
  assert.ok(!hasSelector(css, "dialog"), "dialog is not used");
  assert.ok(!hasSelector(css, "details"), "details is not used");
  assert.ok(!hasSelector(css, ".contrast"), "unused class is gone");
  assert.ok(!hasSelector(css, "[role=switch]") && !hasSelector(css, '[role="switch"]'));
  // the theme from @pico is the jade one
  assert.match(css, /--pico-primary-background:\s*oklch\(51\.16% \.1145 160\.67\)/);
  assert.equal(result.warnings().length, 0, result.warnings().map(String).join("\n"));
});

test("development: the full stylesheet, no scan", async () => {
  process.env["NODE_ENV"] = "development";
  const full = (await run(await read("src/app.css"))).css;
  assert.ok(
    hasSelector(full, "dialog") &&
      hasSelector(full, ".contrast") &&
      hasSelector(full, "[data-badge"),
  );
  assert.ok(full.includes(".mine"));
});

test("purge: true forces the purge, purge: false disables it", async () => {
  process.env["NODE_ENV"] = "development";
  const forced = (await run(await read("src/app.css"), { purge: true })).css;
  assert.ok(!hasSelector(forced, "dialog"));
  process.env["NODE_ENV"] = "production";
  const off = (await run(await read("src/app.css"), { purge: false })).css;
  assert.ok(hasSelector(off, "dialog"));
});

test("quick bail: other stylesheets pass through untouched", async () => {
  const source = '@import "./other.css";\n.a { color: red }\n';
  const result = await run(source, {}, `${project}/src/other.css`);
  assert.equal(result.css, source);
  assert.equal(result.messages.length, 0);
});

test("dependency messages: files, folders, never the project folder itself", async () => {
  const result = await run(await read("src/app.css"));
  const deps = result.messages
    .filter((m) => m.type === "dependency")
    .map((m) => m["file"] as string);
  const dirs = result.messages.filter((m) => m.type === "dir-dependency");
  assert.ok(deps.some((f) => f.endsWith("src/index.html")));
  assert.ok(dirs.length > 0);
  for (const message of dirs) {
    assert.notEqual(
      (message["dir"] as string).replaceAll("\\", "/"),
      project,
      "root folder is skipped",
    );
    assert.notEqual(message["glob"], "**/*");
  }
  assert.ok(dirs.some((m) => (m["dir"] as string).replaceAll("\\", "/").endsWith("/src")));
});

test("content changes give new output: nothing stays from deleted markup", async () => {
  const dir = makeProject({
    "package.json": "{}",
    "app.css": '@import "@rusticstack/pico-reforged";\n',
    "index.html": '<main><dialog open></dialog><button class="first-class">x</button></main>',
  });
  const plugin = pico();
  const build = () =>
    postcss([plugin]).process('@import "@rusticstack/pico-reforged";\n', {
      from: `${dir}/app.css`,
    });
  assert.ok(hasSelector((await build()).css, "dialog"));
  write(dir, "index.html", "<main><button>x</button></main>");
  assert.ok(
    !hasSelector((await build()).css, "dialog"),
    "dialog left the markup, so it left the CSS",
  );
});

test("@source adds content that lives elsewhere, @source not removes some", async () => {
  const dir = makeProject({
    "package.json": "{}",
    "app/app.css":
      '@import "@rusticstack/pico-reforged";\n@source "../content";\n@source not "../skip";\n',
    "app/index.html": "<main><p>x</p></main>",
    "content/page.html": "<details><summary>s</summary></details>",
    "skip/page.html": "<dialog></dialog>",
  });
  const css = (
    await run(
      await (await import("node:fs/promises")).readFile(`${dir}/app/app.css`, "utf8"),
      {},
      `${dir}/app/app.css`,
    )
  ).css;
  assert.ok(hasSelector(css, "details"), "from @source");
  assert.ok(!hasSelector(css, "dialog"), "from @source not");
});

test("safelist and inline sources keep what only a script adds", async () => {
  const dir = makeProject({
    "package.json": "{}",
    "app.css":
      '@import "@rusticstack/pico-reforged";\n@pico { safelist: aria-invalid; }\n@source inline("modal-is-open");\n',
    "index.html": "<main><p>x</p></main>",
  });
  const css = (
    await run(
      await (await import("node:fs/promises")).readFile(`${dir}/app.css`, "utf8"),
      {},
      `${dir}/app.css`,
    )
  ).css;
  assert.ok(hasSelector(css, "[aria-invalid"), "safelist keeps the attribute rules");
  assert.ok(hasSelector(css, ".modal-is-open"), "inline source keeps the class rule");
});

test("purge: safe keeps the rules that only lack tags", async () => {
  const dir = makeProject({
    "package.json": "{}",
    "app.css": '@import "@rusticstack/pico-reforged";\n@pico { purge: safe; }\n',
    "index.html": "<main><p>x</p></main>",
  });
  const css = (
    await run(
      await (await import("node:fs/promises")).readFile(`${dir}/app.css`, "utf8"),
      {},
      `${dir}/app.css`,
    )
  ).css;
  assert.ok(hasSelector(css, "dialog") && hasSelector(css, "blockquote"));
  assert.ok(!hasSelector(css, ".contrast"), "classes are still checked");
});

test("purge: off in @pico wins in production", async () => {
  const dir = makeProject({
    "package.json": "{}",
    "app.css": '@import "@rusticstack/pico-reforged";\n@pico { purge: off; }\n',
    "index.html": "<main><p>x</p></main>",
  });
  const css = (
    await run(
      await (await import("node:fs/promises")).readFile(`${dir}/app.css`, "utf8"),
      {},
      `${dir}/app.css`,
    )
  ).css;
  assert.ok(hasSelector(css, "dialog"));
});

test("a scan that finds nothing does not strip the stylesheet", async () => {
  const dir = makeProject({
    "package.json": "{}",
    "app.css": '@import "@rusticstack/pico-reforged";\n@pico { source: none; }\n',
  });
  const result = await run(
    await (await import("node:fs/promises")).readFile(`${dir}/app.css`, "utf8"),
    {},
    `${dir}/app.css`,
  );
  assert.ok(hasSelector(result.css, "dialog"));
  assert.match(result.warnings().map(String).join("\n"), /purge skipped/);
});

test("classless and colors imports", async () => {
  const dir = makeProject({
    "package.json": "{}",
    "index.html":
      '<main><p class="pico-color-red-500">x</p><div class="pico-background-azure-500"></div></main>',
  });
  const source =
    '@import "@rusticstack/pico-reforged/classless";\n@import "@rusticstack/pico-reforged/colors";\n';
  const css = (await run(source, {}, `${dir}/app.css`)).css;
  assert.ok(!hasSelector(css, ".secondary"), "classless has no classes");
  assert.ok(hasSelector(css, ".pico-color-red-500"));
  assert.ok(!hasSelector(css, ".pico-color-green-500"));
});

test("a script import of the package CSS file becomes a root", async () => {
  const { ROOT } = await import("../../scripts/lib/compiler/config.ts");
  const dir = makeProject({ "package.json": "{}", "index.html": "<main><p>x</p></main>" });
  const result = await postcss([pico({ base: dir })]).process("/* prebuilt */ body{}", {
    from: `${ROOT}css/pico.min.css`,
  });
  assert.ok(hasSelector(result.css, "p") && !hasSelector(result.css, "dialog"));
});

test("editing the theme file changes the output, with the same plugin instance", async () => {
  const dir = makeProject({
    "package.json": "{}",
    "index.html": "<main><p>x</p></main>",
    "brand.css": ":root { --pico-primary-background: oklch(0.3 0.1 100); }",
  });
  const plugin = pico();
  const source = '@import "@rusticstack/pico-reforged";\n@pico { theme: "./brand.css"; }\n';
  const build = () => postcss([plugin]).process(source, { from: `${dir}/app.css` });
  const first = await build();
  assert.ok(first.css.includes("oklch(30% .1 100)"));
  assert.ok(
    first.messages.some((m) => m.type === "dependency" && String(m["file"]).endsWith("brand.css")),
  );
  write(dir, "brand.css", ":root { --pico-primary-background: oklch(0.4 0.1 200); }");
  const second = await build();
  assert.ok(second.css.includes("oklch(40% .1 200)"));
  assert.ok(!second.css.includes("oklch(30% .1 100)"));
});
