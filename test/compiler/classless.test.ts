import assert from "node:assert/strict";
import { test } from "node:test";
import { filterClassless } from "../../scripts/lib/compiler/classless.ts";
import { compile } from "../../scripts/lib/compiler/index.ts";
import { headers, mapSelectors, squash } from "./helpers.ts";

const filter = (css: string): string => mapSelectors(css, (sel) => filterClassless([sel]));

test("drops a selector that needs a class and keeps the others in the list", () => {
  const out = squash(filter(".a, b, c.d, e {color: red}"));
  assert.match(out, /b, e \{/);
  assert.doesNotMatch(out, /\.a|\.d/);
});

test("drops the rule when no selector is left", () => {
  assert.equal(filter(".a {color: red} .b > c {color: blue}").trim(), "");
});

test("keeps classes inside :not()", () => {
  const out = squash(filter("a:not(.outline) {color: red} b:not(.x, [y]) {color: blue}"));
  assert.match(out, /a:not\(\.outline\)/);
  assert.match(out, /b:not\(\.x, \[y\]\)/);
});

test("filters the branches of :is() and :where() and drops the selector when none is left", () => {
  const out = squash(filter(":is(.x, a):hover {color: red} :where(.y, .z) b {color: blue}"));
  assert.match(out, /:is\(a\):hover/);
  assert.doesNotMatch(out, /\.x|\.y|\.z/);
});

test("keeps table.striped, as v2.1.1 did", () => {
  assert.match(filter("table.striped tbody tr {color: red}"), /table\.striped/);
});

test("classless build has no selector that needs a class", async () => {
  const { css, stats } = await compile({ entry: "classless" });
  assert.ok(stats.removedByClassless > 30);
  for (const header of headers(css)) {
    const outsideNot = header.replace(/:not\((?:[^()]|\([^()]*\))*\)/g, "");
    for (const part of outsideNot.split(",")) {
      if (/table\.striped/.test(part)) continue;
      assert.doesNotMatch(part, /\.[a-z]/i, `class left in: ${header}`);
    }
  }
  assert.match(squash(css), /dialog > article :is\(a, button\)\[rel="prev"\]/);
  assert.match(squash(css), /body > header, body > main, body > footer/);
});

test("the classless build drops keyframes only the class flow used", async () => {
  const full = (await compile()).css;
  const classless = (await compile({ entry: "classless" })).css;
  assert.match(full, /@keyframes modal-overlay/);
  assert.doesNotMatch(classless, /@keyframes modal-overlay/);
  assert.match(classless, /@keyframes progress-indeterminate/);
});

test("classes: false on the pico entry gives the same filter", async () => {
  const { css } = await compile({ classes: false });
  assert.doesNotMatch(squash(css), /(^| )\.container/);
});
