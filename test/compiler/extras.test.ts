import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, test } from "vite-plus/test";
import { EXTRAS, buildMatrix, compile, matrixNames } from "../../scripts/lib/compiler/index.ts";
import { squash } from "./helpers.ts";

const root = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const dir = mkdtempSync(join(tmpdir(), "pico-extras-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

// Stand-in extras with a class rule, an attribute rule and a token, so these tests do not depend
// on what the real files contain.
const extrasDir = join(dir, "extras-src");
mkdirSync(extrasDir);
for (const name of EXTRAS) {
  writeFileSync(
    join(extrasDir, `${name}.css`),
    `:root, :host, [data-theme] { --pico-${name}-gap: 1rem; }
.x-${name} { color: red; }
[role="tab"].x-${name}, [data-x-${name}] { margin-inline-start: var(--pico-${name}-gap); }
`,
  );
}
const opts = { extrasDir, targets: "chrome 140" };
const ORDER = ["pico.tokens", "pico.theme", "pico.core", "pico.extras", "pico.utilities"];

// Lightning CSS splits the layer order statement into blocks and shorter statements. What
// counts is the order in which the names first appear.
function layerOrder(css: string): string[] {
  const seen: string[] = [];
  for (const m of css.matchAll(/@layer\s+([\w.,\s]+?)\s*[;{]/g)) {
    for (const name of (m[1] as string).split(",")) {
      if (!seen.includes(name.trim())) seen.push(name.trim());
    }
  }
  return seen;
}

test("the default build has no extras", async () => {
  const { css, stats } = await compile();
  assert.deepEqual(stats.extras, []);
  assert.doesNotMatch(css, /@layer pico\.extras\s*\{/);
  assert.deepEqual(layerOrder(css), ORDER);
});

test("leaving the extras option out, or empty, gives byte-identical builds", async () => {
  for (const entry of ["pico", "classless"] as const) {
    const plain = await compile({ entry, minify: true });
    for (const extras of [false, [] as string[], ""]) {
      const same = await compile({ entry, minify: true, extras });
      assert.equal(same.stats.bytes, plain.stats.bytes);
      assert.equal(same.css, plain.css);
    }
  }
});

test("adding an extra appends a layer and leaves the base build as it was", async () => {
  const base = await compile(opts);
  const withTabs = await compile({ ...opts, extras: ["tabs"] });
  assert.ok(withTabs.css.length > base.css.length);
  assert.deepEqual(layerOrder(withTabs.css), ORDER);
  // The extras block goes in before the trailing statement that declares pico.utilities.
  const marker = withTabs.css.indexOf("@layer pico.extras {");
  assert.ok(marker > 0);
  const tail = base.css.lastIndexOf("@layer pico.extras, pico.utilities;");
  assert.equal(withTabs.css.slice(0, marker).trimEnd(), base.css.slice(0, tail).trimEnd());
});

test("extras take a list, a comma string, all and true", async () => {
  const some = await compile({ ...opts, extras: ["badge", "tabs"] });
  assert.deepEqual(some.stats.extras, ["tabs", "badge"]);
  assert.match(some.css, /\.x-tabs/);
  assert.match(some.css, /\.x-badge/);
  assert.doesNotMatch(some.css, /\.x-alert/);
  assert.deepEqual((await compile({ ...opts, extras: "tabs, badge" })).stats.extras, [
    "tabs",
    "badge",
  ]);
  assert.deepEqual((await compile({ ...opts, extras: "all" })).stats.extras, EXTRAS);
  assert.deepEqual((await compile({ ...opts, extras: true })).stats.extras, EXTRAS);
});

test("an unknown extra is an error", async () => {
  await assert.rejects(compile({ extras: ["tabs", "carousel"] }), /Unknown extra "carousel"/);
});

test("extras sit in the pico.extras layer and keep their tokens", async () => {
  const text = squash((await compile({ ...opts, extras: ["tabs"] })).css);
  assert.match(text, /@layer pico\.extras \{/);
  assert.match(text, /:root, :host, \[data-theme\] \{ --pico-tabs-gap: 1rem/);
});

test("the classless filter applies to extras", async () => {
  const classy = squash((await compile({ ...opts, extras: ["tabs"] })).css);
  assert.match(classy, /\.x-tabs \{/);
  const classless = squash((await compile({ ...opts, entry: "classless", extras: ["tabs"] })).css);
  assert.doesNotMatch(classless, /\.x-tabs/);
  assert.match(classless, /\[data-x-tabs\]/);
  assert.match(classless, /--pico-tabs-gap/);
  const off = squash((await compile({ ...opts, classes: false, extras: ["tabs"] })).css);
  assert.doesNotMatch(off, /\.x-tabs/);
});

test("the scope applies to extras", async () => {
  const text = squash((await compile({ ...opts, scope: ".pico", extras: ["tabs"] })).css);
  assert.match(text, /\.pico \.x-tabs/);
  assert.match(text, /\.pico \[data-x-tabs\]/);
  assert.match(text, /:root, :host, \[data-theme\] \{ --pico-tabs-gap/);
  assert.doesNotMatch(text, /(^|[{},] )\[data-x-tabs\]/);
});

test("the extras entry builds a standalone, layered file with its tokens", async () => {
  const { css, stats } = await compile({ ...opts, entry: "extras", extras: ["badge"] });
  assert.deepEqual(stats.extras, ["badge"]);
  const text = squash(css);
  assert.deepEqual(layerOrder(text), ORDER);
  assert.match(text, /@layer pico\.extras \{/);
  assert.match(text, /--pico-badge-gap/);
  assert.doesNotMatch(text, /x-tabs/);
  assert.doesNotMatch(text, /--pico-primary:/);
  assert.deepEqual((await compile({ ...opts, entry: "extras" })).stats.extras, EXTRAS);
});

test("the colors entry ignores extras with a warning", async () => {
  const { css, stats } = await compile({ entry: "colors", extras: ["tabs"] });
  assert.deepEqual(stats.extras, []);
  assert.match(stats.warnings.join("\n"), /colors/);
  assert.doesNotMatch(css, /pico-tabs/);
});

test("the real extras compile into every entry without warnings", async () => {
  for (const entry of ["pico", "classless", "extras"] as const) {
    const { stats, css } = await compile({ entry, extras: true, scope: ".pico" });
    assert.deepEqual(stats.warnings, []);
    assert.ok(css.length > 0);
  }
});

test("CLI: --extras adds the chosen extras and validates the names", () => {
  const run = (...args: string[]) =>
    spawnSync(process.execPath, ["scripts/cli.ts", ...args], { cwd: root, encoding: "utf8" });
  const some = run("build", "--extras", "tabs,badge", "--minify", "--out", join(dir, "a.css"));
  assert.equal(some.status, 0, some.stderr);
  assert.match(some.stderr, /extras tabs, badge/);
  const all = run("build", "--extras", "all", "--minify", "--out", join(dir, "b.css"));
  assert.equal(all.status, 0, all.stderr);
  assert.match(all.stderr, new RegExp(`extras ${EXTRAS.join(", ")}`));
  const bad = run("build", "--extras", "tabs,nope");
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /Unknown extra "nope"/);
  assert.deepEqual(run("extras").stdout.trim().split(/\r?\n/), EXTRAS);
  const entry = run("build", "--entry", "extras", "--extras", "alert", "--out", join(dir, "c.css"));
  assert.equal(entry.status, 0, entry.stderr);
  assert.deepEqual(layerOrder(readFileSync(join(dir, "c.css"), "utf8")), ORDER);
});

test("the matrix writes pico.extras and one standalone file per extra", async () => {
  const names = matrixNames();
  assert.ok(names.includes("pico.extras.css") && names.includes("pico.extras.min.css"));
  for (const extra of EXTRAS) {
    assert.ok(names.includes(`extras/${extra}.css`) && names.includes(`extras/${extra}.min.css`));
  }
  assert.equal(names.length, 238 + 2 + EXTRAS.length * 2);
  const out = join(dir, "matrix");
  const written = await buildMatrix(out);
  assert.equal(written.length, names.length);
  const files = readdirSync(out, { recursive: true, withFileTypes: true }).filter((e) =>
    e.isFile(),
  );
  assert.equal(files.length, names.length);
  const all = readFileSync(join(out, "pico.extras.css"), "utf8");
  assert.match(all, /^\/\*!\n \* Pico Reforged/);
  assert.deepEqual(layerOrder(all), ORDER);
  for (const extra of EXTRAS) {
    const own = readFileSync(join(out, "extras", `${extra}.css`), "utf8");
    assert.deepEqual(layerOrder(own), ORDER);
  }
  // The default files never carry an extras block.
  for (const name of ["pico.css", "pico.classless.css", "pico.conditional.css"]) {
    assert.doesNotMatch(readFileSync(join(out, name), "utf8"), /@layer pico\.extras\s*\{/);
  }
}, 300_000);
