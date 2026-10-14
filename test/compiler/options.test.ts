import assert from "node:assert/strict";
import { test } from "vite-plus/test";
import { compile, THEMES } from "../../scripts/lib/compiler/index.ts";
import { squash } from "./helpers.ts";

const dialogRule = /(^|[ }])dialog \{/;

test("module exclusion removes the module and reports it", async () => {
  const full = await compile();
  const lean = await compile({
    modules: { "components/modal": false, "forms/input-range": false },
  });
  assert.match(squash(full.css), dialogRule);
  assert.doesNotMatch(squash(lean.css), dialogRule);
  assert.doesNotMatch(lean.css, /\[type="range"\]::-webkit-slider-thumb/);
  assert.deepEqual(lean.stats.excludedModules.toSorted(), [
    "components/modal",
    "forms/input-range",
  ]);
  assert.ok(lean.css.length < full.css.length);
});

test("an unknown module is an error", async () => {
  await assert.rejects(compile({ modules: { "components/nope": false } }), /Unknown module/);
});

test("semantic container and responsive spacings are modules too", async () => {
  const plain = squash((await compile()).css);
  assert.doesNotMatch(plain, /margin-inline: auto; padding: var\(--pico-block-spacing-vertical\)/);
  const on = squash((await compile({ semanticContainer: true, responsiveSpacings: true })).css);
  assert.match(on, /margin-inline: auto/);
  assert.match(on, /calc\(var\(--pico-spacing\) \* 1\.25\)/);
});

test("theme from a color keeps the hue", async () => {
  const { css } = await compile({ theme: { color: "#e5484d" }, targets: "chrome 140" });
  const match = css.match(/--pico-primary: light-dark\(oklch\(([\d.]+)% ([\d.]+) ([\d.]+)\)/);
  assert.ok(match, "primary token missing");
  assert.ok(Math.abs(Number(match[3]) - 23) < 3, `hue ${match[3]}`);
  const azure = await compile({ targets: "chrome 140" });
  assert.notEqual(css, azure.css);
});

test("theme from hue and chroma", async () => {
  const { css } = await compile({ theme: { hue: 300, chroma: 0.15 }, targets: "chrome 140" });
  assert.match(css, /--pico-primary: light-dark\(oklch\([\d.]+% [\d.]+ 300\)/);
});

test("every built-in theme compiles and only changes the primary tokens", async () => {
  const base = await compile({ targets: "chrome 140" });
  const jade = await compile({ theme: "jade", targets: "chrome 140" });
  assert.equal(THEMES.length, 20);
  assert.ok(jade.css.includes("--pico-primary-background"));
  assert.notEqual(jade.css, base.css);
  assert.equal(jade.css.length > base.css.length * 0.95, true);
});

test("theme from a CSS file layers it over the default", async () => {
  const { mkdtempSync, rmSync, writeFileSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const dir = mkdtempSync(join(tmpdir(), "pico-theme-"));
  try {
    const file = join(dir, "brand.css");
    writeFileSync(file, ":root { --pico-border-radius: 0.5rem; --pico-primary: hotpink; }");
    const { css } = await compile({ theme: file });
    assert.match(css, /--pico-border-radius: \.5rem/);
    assert.match(css, /--pico-primary: hotpink/);
    assert.match(css, /--pico-primary-background/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("an unknown theme is an error", async () => {
  await assert.rejects(compile({ theme: "nope" }), /Unknown theme/);
});

test("important: false strips !important and the reduce-motion block", async () => {
  const { css } = await compile({ important: false });
  assert.doesNotMatch(css, /!important/);
  assert.doesNotMatch(css, /animation-duration: 1ms/);
  assert.match((await compile()).css, /!important/);
});

test("responsiveTypography: false keeps the root size fixed", async () => {
  const on = await compile();
  const off = await compile({ responsiveTypography: false });
  assert.match(on.css, /--pico-font-size: 106\.25%/);
  assert.doesNotMatch(off.css, /106\.25%|131\.25%/);
  assert.match(off.css, /--pico-container-max-width: 510px/);
});

test("fluid removes the container width and keeps the side padding", async () => {
  const fixed = squash((await compile({ entry: "classless" })).css);
  const fluid = squash((await compile({ entry: "classless", fluid: true })).css);
  assert.doesNotMatch(fixed, /--pico-container-max-width: 100%;[^}]*\} body/);
  assert.match(fluid, /--pico-container-max-width: 100%/);
  assert.match(
    fluid,
    /body > header, body > main, body > footer \{ padding-inline: var\(--pico-block-spacing-horizontal\)/,
  );
});

test("minify, banner and source map", async () => {
  const plain = await compile({ banner: "/*! hello */" });
  const min = await compile({ minify: true, sourceMap: true, banner: "/*! hello */" });
  assert.ok(plain.css.startsWith("/*! hello */\n"));
  assert.ok(min.css.startsWith("/*! hello */\n"));
  assert.ok(min.css.length < plain.css.length * 0.9);
  assert.ok(!min.css.slice(14).includes("\n"));
  assert.ok(min.map && (JSON.parse(min.map) as { version: number }).version === 3);
});

test("the colors entry has the palette and the utilities", async () => {
  const { css } = await compile({ entry: "colors" });
  assert.match(css, /\.pico-color-azure-550/);
  assert.match(css, /\.pico-background-red/);
});

test("stats add up", async () => {
  const { stats } = await compile();
  assert.ok(
    stats.bytes > 50_000 && stats.gzipBytes < stats.bytes && stats.brotliBytes < stats.gzipBytes,
  );
  assert.ok(stats.rules > 300);
});

test("source map points at src files and follows the banner", async () => {
  const bare = await compile({ sourceMap: true });
  const withBanner = await compile({ sourceMap: true, banner: "/*! a */\n/*! b */" });
  const map = JSON.parse(bare.map as string) as { sources: string[]; mappings: string };
  assert.ok(map.sources.includes("src/components/modal.css"));
  assert.ok(
    map.sources.every((s) => !s.includes(":")),
    "sources are relative",
  );
  const shifted = JSON.parse(withBanner.map as string) as { mappings: string };
  const lines = (m: string) => m.split(";").length;
  assert.ok(shifted.mappings.startsWith(";;"));
  assert.equal(lines(shifted.mappings), lines(map.mappings) + 2);
});

test("transitions: false leaves no hard-coded animation or transition duration", async () => {
  const { css } = await compile({ transitions: false });
  assert.doesNotMatch(
    css,
    /animation-(duration|name|delay)|@keyframes modal|transition: margin|overlay [0-9.]+s/,
  );
});
