// Tests for the browser floor, transitions: false, unknown options, the exclude alias, module
// tokens and dead selectors.
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, test } from "vite-plus/test";
import { compile, DEFAULT_TARGETS } from "../../scripts/lib/compiler/index.ts";
import { headers } from "./helpers.ts";

const dir = mkdtempSync(join(tmpdir(), "pico-leftovers-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

test("the default targets are the Tailwind v4 floor", () => {
  assert.equal(
    DEFAULT_TARGETS,
    "chrome >= 111, edge >= 111, firefox >= 128, safari >= 16.4, ios_saf >= 16.4",
  );
});

test("the default build keeps @layer and never ships an unlayered build", async () => {
  const { css } = await compile();
  // Lightning CSS folds the order statement into the first block of each layer, and keeps the
  // names of the layers that are still empty (extras, utilities) in a short statement at the end.
  const order = ["tokens", "theme", "core", "extras", "utilities"].map((l) =>
    css.search(new RegExp(String.raw`@layer[^{;]*pico\.${l}`)),
  );
  assert.ok(order.every((at) => at > -1));
  assert.deepEqual(
    order,
    order.toSorted((a, b) => a - b),
  );
  const flat = await compile({ layers: false } as never);
  assert.match(flat.css, /@layer/);
  assert.ok(flat.stats.warnings.some((w) => /unknown option "layers"/.test(w)));
});

test("transitions: false removes every transition and animation", async () => {
  const { css } = await compile({ transitions: false });
  assert.match(css, /--pico-transition: 0s/);
  assert.doesNotMatch(css, /(^|[;{\s])transition(-[a-z]+)?\s*:/m);
  assert.doesNotMatch(css, /@starting-style/);
  assert.doesNotMatch(css, /animation-name: (tooltip|modal)|@keyframes (tooltip|modal)/);
  // The indeterminate progress bar is how a busy state shows, v2.1.1 kept it.
  assert.match(css, /animation: [^;]*progress-indeterminate/);
  assert.match(css, /\[dir="rtl"\] progress:indeterminate \{\s+animation-direction: reverse/);
  assert.match(css, /@keyframes progress-indeterminate/);
  // Only the icon data URI carries its own animation.
  const without = css.replace(/url\("data:image\/svg\+xml[^"]*"\)/g, "");
  assert.doesNotMatch(without, /animation-duration|animation-name: (modal|tooltip)/);
});

test("transitions stay by default", async () => {
  const { css } = await compile();
  assert.match(css, /transition:/);
  assert.match(css, /@starting-style/);
});

test("unknown options warn and the build still runs", async () => {
  const { css, stats } = await compile({ colour: "red", exclud: [] } as never);
  assert.ok(css.length > 0);
  assert.equal(stats.warnings.length, 2);
  assert.match(stats.warnings.join("\n"), /unknown option "colour"/);
  assert.match(stats.warnings.join("\n"), /unknown option "exclud"/);
});

test("exclude is an alias for turning modules off", async () => {
  const viaExclude = await compile({ exclude: ["components/modal", "forms/input-range"] });
  const viaModules = await compile({
    modules: { "components/modal": false, "forms/input-range": false },
  });
  assert.equal(viaExclude.css, viaModules.css);
  assert.deepEqual(viaExclude.stats.warnings, []);
  assert.deepEqual(viaExclude.stats.excludedModules.toSorted(), [
    "components/modal",
    "forms/input-range",
  ]);
  const csv = await compile({ exclude: "components/modal, forms/input-range" });
  assert.equal(csv.css, viaModules.css);
  await assert.rejects(compile({ exclude: ["components/nope"] }), /Unknown module/);
});

test("excluding a module drops the custom properties only it reads", async () => {
  const full = await compile();
  assert.match(full.css, /--pico-modal-overlay-background-color:/);
  assert.match(full.css, /--pico-icon-close:/);
  assert.match(full.css, /--pico-range-thumb-color:/);
  const lean = await compile({ exclude: ["components/modal", "forms/input-range"] });
  assert.doesNotMatch(lean.css, /--pico-modal-/);
  assert.doesNotMatch(lean.css, /--pico-icon-close/);
  assert.doesNotMatch(lean.css, /--pico-range-/);
  // Tokens other modules read stay.
  assert.match(lean.css, /--pico-primary-background:/);
  assert.match(lean.css, /--pico-icon-chevron:/);
  assert.ok(lean.css.length < full.css.length);
});

test("a token that a remaining rule still reads is kept", async () => {
  const file = join(dir, "theme.css");
  writeFileSync(
    file,
    ":root { --pico-card-extra: 1px; --pico-card-unused: 2px; }\ni { margin: var(--pico-card-extra); }",
  );
  const { css } = await compile({ theme: file, exclude: ["components/card"] });
  assert.match(css, /--pico-card-extra: 1px/);
  assert.doesNotMatch(css, /--pico-card-unused/);
  assert.doesNotMatch(css, /--pico-card-sectioning/);
});

test("rules with an empty :is() are dropped", async () => {
  const file = join(dir, "dead.css");
  writeFileSync(file, "a:is() { color: red; }\nb:where(:is()) { color: red; }\ni { color: blue; }");
  const { css } = await compile({ theme: file });
  const h = headers(css);
  assert.ok(!h.some((x) => x.startsWith("a:is()")));
  assert.ok(!h.some((x) => x.startsWith("b:where")));
  assert.ok(h.includes("i"));
});

test("no output rule has an empty selector list or a dead file-selector-button branch", async () => {
  for (const options of [{}, { entry: "classless" as const }, { classes: false }]) {
    const { css } = await compile(options);
    assert.doesNotMatch(css, /:(is|where|has)\(\s*\)/);
    // After ::file-selector-button only user-action pseudo-classes parse, so a rule with
    // :is([aria-current]...) there is dropped whole by the browser.
    assert.doesNotMatch(css, /::file-selector-button:is\([^)]*aria-current/);
  }
});
