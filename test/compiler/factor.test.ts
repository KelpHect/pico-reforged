import assert from "node:assert/strict";
import { test } from "vite-plus/test";
import { compile } from "../../scripts/lib/compiler/index.ts";
import { factorSelectors } from "../../scripts/lib/compiler/factor.ts";
import { emptyIndex, scanText } from "../../scripts/lib/compiler/purge.ts";
import type { Selector } from "../../scripts/lib/compiler/selector.ts";

const type = (name: string) => ({ type: "type", name });
const cls = (name: string) => ({ type: "class", name });
const hover = { type: "pseudo-class", kind: "hover" };
const popover = { type: "pseudo-class", kind: "popover-open" };
const sel = (...parts: object[]) => parts as unknown as Selector;

test("merges selectors that differ in one place of the same specificity", () => {
  const list = [sel(type("a"), hover), sel(type("b"), hover), sel(type("c"), hover)];
  const out = factorSelectors(list);
  assert.equal(out.length, 1);
  assert.equal((out[0] as unknown as { kind: string }[])[0]?.kind, "is");
});

test("leaves a list alone when specificity would change", () => {
  const list = [sel(type("button"), cls("secondary")), sel(cls("reset"), cls("secondary"))];
  assert.equal(factorSelectors(list), list);
});

test("keeps pseudo-classes newer than the floor out of :is()", () => {
  const name = type("a-long-element-name-that-pays-for-the-merge");
  const focus = { type: "pseudo-class", kind: "focus" };
  const out = factorSelectors([sel(name, popover), sel(name, hover), sel(name, focus)]);
  assert.equal(out.length, 2);
  assert.equal(JSON.stringify(out).includes("popover-open"), true);
  assert.equal(JSON.stringify(out[1]).includes("popover-open"), false);
});

test("the minified build factors lists and the plain build keeps them as written", async () => {
  const min = await compile({ entry: "classless", minify: true });
  const plain = await compile({ entry: "classless", minify: false });
  assert.match(min.css, /body>:is\(header,main,footer\)/);
  assert.match(plain.css, /body > header,\s*body > main,\s*body > footer/);
});

test("each declaration is written once, lowering runs a single time", async () => {
  const min = await compile({ minify: true });
  assert.equal(min.css.match(/-webkit-text-decoration:inherit/g)?.length, 1);
  const toggles = min.css.match(/--lightningcss-light:initial;--lightningcss-dark: ;/g);
  assert.equal(toggles?.length, 2);
  const plain = await compile({ minify: false });
  assert.equal(plain.css.match(/-webkit-text-decoration: inherit/g)?.length, 1);
  assert.ok(!/(--lightningcss-light: initial;\s*--lightningcss-dark: ;\s*){2}/.test(plain.css));
});

test("a build that purges factors after the purge, in the floor and the modern output", async () => {
  const index = emptyIndex();
  scanText(index, '<main class="container"><button>Save</button></main>');
  const floor = await compile({ minify: true, purge: { index } });
  const modern = await compile({ minify: true, purge: { index }, targets: "modern" });
  assert.ok(
    !floor.css.includes("[type=submit]"),
    "branches the page lacks are purged, then factored",
  );
  assert.ok(!floor.css.includes("&") && !modern.css.includes("&"), "flattened for purge");
  assert.equal(modern.stats.removedByPurge, floor.stats.removedByPurge);
  assert.ok(floor.stats.removedByPurge > 0);
});
