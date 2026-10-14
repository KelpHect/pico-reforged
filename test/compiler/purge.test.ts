import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, test } from "vite-plus/test";
import { compile } from "../../scripts/lib/compiler/index.ts";
import { squash } from "./helpers.ts";

const dir = mkdtempSync(join(tmpdir(), "pico-purge-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const page = join(dir, "page.html");
writeFileSync(
  page,
  `<!doctype html><html><body>
  <main class="container">
    <h1>Title</h1>
    <button class="secondary" aria-busy="true">Save</button>
    <input type="checkbox" role="switch">
    <script>document.body.classList.add("modal-is-open")</script>
  </main></body></html>`,
);
const other = join(dir, "other.html");
writeFileSync(other, `<table class="striped"><tbody><tr><td>1</td></tr></tbody></table>`);

const purge = (content: string[], safelist: (string | RegExp)[] = []) =>
  compile({ purge: { content, safelist } });

test("keeps what the content uses and drops the rest", async () => {
  const { css, stats } = await purge([page]);
  const out = squash(css);
  assert.ok(stats.removedByPurge > 100);
  assert.match(out, /\.container/);
  assert.match(out, /button\.secondary|\.secondary/);
  assert.match(out, /\[role="switch"\]/);
  assert.match(out, /h1/);
  assert.doesNotMatch(out, /details\.dropdown/);
  assert.doesNotMatch(out, /(^| |,)nav /);
  assert.doesNotMatch(out, /\[type="range"\]::-webkit-slider-thumb/);
  assert.doesNotMatch(out, /\.grid/);
  const full = (await compile()).css;
  assert.ok(css.length < full.length * 0.7);
});

test("reads attribute values", async () => {
  const withBusy = squash((await purge([page])).css);
  const without = squash((await purge([other])).css);
  assert.match(withBusy, /\[aria-busy="true"\]:not\(input/);
  assert.doesNotMatch(without, /\[aria-busy="true"\]:not\(input/);
});

test("picks up classes that scripts set", async () => {
  assert.match(squash((await purge([page])).css), /\.modal-is-open/);
  assert.doesNotMatch(squash((await purge([other])).css), /\.modal-is-open/);
});

test("accepts several globs", async () => {
  const out = squash((await purge([join(dir, "*.html").replaceAll("\\", "/")])).css);
  assert.match(out, /\.striped/);
  assert.match(out, /\.container/);
});

test("safelist keeps names, patterns and attributes", async () => {
  const bare = squash((await purge([page])).css);
  assert.doesNotMatch(bare, /details\.dropdown/);
  assert.doesNotMatch(bare, /\.grid/);
  assert.doesNotMatch(bare, /\[type="range"\]::-webkit-slider-thumb/);
  const kept = squash((await purge([page], ["dropdown", /^gri/, "type=range"])).css);
  assert.match(kept, /details\.dropdown/);
  assert.match(kept, /\.grid/);
  assert.match(kept, /\[type="range"\]::-webkit-slider-thumb/);
});

test("keeps :root, tokens and the theme switch", async () => {
  const out = squash((await purge([other])).css);
  assert.match(out, /:root, :host/);
  assert.match(out, /--pico-primary:/);
  assert.match(out, /\[data-theme="dark"\]/);
});

test("combines with classless and scope", async () => {
  const { css, stats } = await compile({
    entry: "classless",
    scope: ".pico",
    purge: { content: [other] },
  });
  assert.ok(stats.removedByClassless > 0 && stats.removedByPurge > 0);
  assert.match(squash(css), /\.pico table/);
  assert.doesNotMatch(squash(css), /\.pico dialog/);
});

test("a > or < inside a quoted attribute value does not hide the tag", async () => {
  const file = join(dir, "srcdoc.html");
  writeFileSync(file, `<div x-data="a > b"><iframe srcdoc="<p>x</p>"></iframe></div>`);
  const { css } = await purge([file]);
  assert.match(squash(css), /iframe/);
});
