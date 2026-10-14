import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "vite-plus/test";
import { compile } from "../../scripts/lib/compiler/index.ts";
import { findPicoBlocks, purgeStylesheet } from "../../scripts/lib/integrations/purge-output.ts";
import { emptyIndex, scanText } from "../../scripts/lib/compiler/purge.ts";
import { hasSelector, makeProject } from "./helpers.ts";

const root = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const cli = (args: string[], cwd = root) =>
  spawnSync(process.execPath, [`${root}/scripts/cli.ts`, ...args], { cwd, encoding: "utf8" });

const userCss =
  ".user-rule{color:red}dialog.mine{margin:0}@layer app{.contrast{color:blue}}.secondary{outline:1px solid}";

async function fixture(minify: boolean): Promise<{ dir: string; css: string }> {
  const pico = (await compile({ minify, extras: ["badge"] })).css;
  const css = `${userCss}\n${pico}\n/* after */ footer.mine{padding:0}`;
  const dir = makeProject({
    "index.html": `<!doctype html><link rel="stylesheet" href="/assets/site.css">
<main class="container"><button class="secondary" aria-busy="true">Save</button><article>x</article></main>
<script src="/assets/app.js"></script>`,
    "assets/app.js":
      'document.body.classList.add("modal-is-open");document.querySelector("main").dataset.tooltip="x";',
    "assets/site.css": css,
    "docs/other.html": "<p>text</p>",
  });
  return { dir, css };
}

test("purge CLI rewrites the pico layers in place and leaves user CSS alone", async () => {
  const { dir, css } = await fixture(true);
  const run = cli(["purge", dir]);
  assert.equal(run.status, 0, run.stderr);
  const out = readFileSync(`${dir}/assets/site.css`, "utf8");
  assert.ok(out.length < css.length / 2, `${out.length} of ${css.length}`);
  // what the page uses is there
  assert.ok(
    hasSelector(out, "button") && hasSelector(out, ".secondary") && hasSelector(out, "[aria-busy"),
  );
  assert.ok(hasSelector(out, "[data-tooltip"), "set from script through dataset");
  // what it does not use is gone, inside the pico layers only
  const blocks = findPicoBlocks(out);
  assert.ok(blocks.length > 0);
  const picoText = blocks.map((b) => b.body).join("\n");
  assert.ok(!hasSelector(picoText, "dialog") && !hasSelector(picoText, ".contrast"));
  assert.ok(!hasSelector(picoText, "[data-badge"), "badge extra is unused");
  // the user's CSS outside the pico layers is untouched, even when it looks unused
  assert.ok(out.startsWith(userCss), "user CSS before Pico is byte for byte the same");
  assert.ok(out.endsWith("/* after */ footer.mine{padding:0}"));
  assert.match(run.stderr, /rules removed/);
});

test("purge CLI: --dry-run writes nothing", async () => {
  const { dir, css } = await fixture(true);
  const run = cli(["purge", dir, "--dry-run"]);
  assert.equal(run.status, 0, run.stderr);
  assert.equal(readFileSync(`${dir}/assets/site.css`, "utf8"), css);
  assert.match(run.stderr, /dry run/);
});

test("purge CLI: --safelist and --content keep what the build output cannot show", async () => {
  const { dir } = await fixture(false);
  const extra = makeProject({ "server/page.html": "<details><summary>s</summary></details>" });
  const run = cli([
    "purge",
    dir,
    "--safelist",
    "aria-invalid",
    "--safelist",
    "/^pico-color-/",
    "--content",
    `${extra}/server/*.html`,
  ]);
  assert.equal(run.status, 0, run.stderr);
  const out = readFileSync(`${dir}/assets/site.css`, "utf8");
  assert.ok(hasSelector(out, "details"), "--content");
  assert.ok(hasSelector(out, "[aria-invalid"), "--safelist");
  const picoOnly = findPicoBlocks(out)
    .map((b) => b.body)
    .join("\n");
  assert.ok(!hasSelector(picoOnly, "dialog"));
  assert.ok(out.includes("{\n"), "a readable file stays readable");
});

test("purge CLI: --keep-types keeps rules that only lack tags", async () => {
  const { dir } = await fixture(true);
  const run = cli(["purge", dir, "--keep-types"]);
  assert.equal(run.status, 0, run.stderr);
  const out = readFileSync(`${dir}/assets/site.css`, "utf8");
  assert.ok(hasSelector(out, "dialog") && hasSelector(out, "blockquote"));
  assert.ok(
    !hasSelector(
      findPicoBlocks(out)
        .map((b) => b.body)
        .join("\n"),
      ".contrast",
    ),
  );
});

test("purge CLI: --css picks the files, a file without pico layers is skipped", async () => {
  const { dir } = await fixture(true);
  const other = makeProject({
    "x.html": "<p>x</p>",
    "plain.css": "dialog{margin:0}.nothing{color:red}",
  });
  const none = cli(["purge", other]);
  assert.equal(none.status, 0, none.stderr);
  assert.equal(readFileSync(`${other}/plain.css`, "utf8"), "dialog{margin:0}.nothing{color:red}");
  assert.match(none.stderr, /no @layer pico/);
  const picked = cli(["purge", dir, "--css", "assets/nothing.css"]);
  assert.match(picked.stderr, /no CSS file matched/);
});

test("purge CLI: errors", () => {
  assert.equal(cli(["purge"]).status, 2);
  const empty = makeProject({});
  const run = cli(["purge", empty]);
  assert.equal(run.status, 1);
  assert.match(run.stderr, /holds no file to scan/);
});

test("pico layers are found at the top level and inside wrapper layers", () => {
  const css =
    "@layer pico.core{a{color:red}}@layer base{@layer pico.core{b{color:red}}}@layer app{c{color:red}}";
  assert.equal(findPicoBlocks(css).length, 2);
  const index = emptyIndex();
  scanText(index, "<a>x</a>");
  const out = purgeStylesheet(css, index);
  assert.ok(out.css.includes("a{color:red}") && !out.css.includes("b{"), out.css);
  assert.ok(out.css.includes("c{color:red}"), "outside the pico layers");
});
