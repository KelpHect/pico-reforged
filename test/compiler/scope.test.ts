import assert from "node:assert/strict";
import { test } from "vite-plus/test";
import { compile } from "../../scripts/lib/compiler/index.ts";
import { parseScope, scopeSelector } from "../../scripts/lib/compiler/scope.ts";
import { SCOPE_GLOBAL } from "../../scripts/lib/compiler/scope-global.ts";
import { headers, mapSelectors, squash } from "./helpers.ts";

const scope = parseScope(".pico");
const scoped = (css: string): string =>
  squash(mapSelectors(css, (sel) => [scopeSelector(sel, scope, SCOPE_GLOBAL)]));

test("prefixes element and attribute selectors", () => {
  const out = scoped("button, [role=group] > a:hover {color: red}");
  assert.match(out, /\.pico button, \.pico \[role="group"\] > a:hover/);
});

test("leaves :root, :host, html and lone [data-theme] alone", () => {
  const out = scoped(
    ":root, :host, html {a: b} [data-theme=dark] {c: d} :root:not([data-theme=light]) {e: f}",
  );
  assert.match(out, /:root, :host, html \{/);
  assert.match(out, /\[data-theme="dark"\] \{/);
  assert.match(out, /:root:not\(\[data-theme="light"\]\) \{/);
  assert.doesNotMatch(out, /\.pico/);
});

test("puts the scope after an ancestor compound", () => {
  const out = scoped(
    "[data-theme=dark] a {a: b} [dir=rtl] select {c: d} :root:not([data-theme]) p {e: f}",
  );
  assert.match(out, /\[data-theme="dark"\] \.pico a/);
  assert.match(out, /\[dir="rtl"\] \.pico select/);
  assert.match(out, /:root:not\(\[data-theme\]\) \.pico p/);
});

test("keeps the box-sizing reset, body, main and the layout classes global", () => {
  const out = scoped(
    "*, *::before, ::after {a: b} body {c: d} main {e: f} .container, .grid > * {g: h} .modal-is-open dialog {i: j}",
  );
  assert.doesNotMatch(out, /\.pico/);
});

test("scopes ::selection, which v2.1.1 also scopes", () => {
  assert.match(scoped("::selection {a: b}"), /\.pico ::selection/);
});

test("accepts any selector as scope", () => {
  const sel = parseScope("#app main");
  const out = squash(mapSelectors("a {b: c}", (s) => [scopeSelector(s, sel, SCOPE_GLOBAL)]));
  assert.match(out, /#app main a/);
});

test("full build: every rule is scoped except the known global ones", async () => {
  const { css } = await compile({ scope: ".pico" });
  const out = squash(css);
  assert.match(out, /\.pico button/);
  assert.match(out, /\.pico body > footer|\.pico body > header/);
  assert.match(out, /\[dir="rtl"\] \.pico select/);
  assert.doesNotMatch(out, /\.pico :root|\.pico :host|\.pico html/);
  assert.match(out, /@keyframes tooltip-slide/);
  assert.doesNotMatch(out, /@keyframes \.pico/);
  const unscoped = headers(css).filter((h) => !h.includes(".pico"));
  for (const header of unscoped) {
    for (const part of header.split(/,(?![^(]*\))/)) {
      const p = part.trim();
      const ok =
        /^(:root|:host|:where\(:root\)|:where\(:host\)|html|\*|::?(before|after)|body|main|\[data-theme)/.test(
          p,
        ) ||
        /^\.(container|container-fluid|grid|modal-is)/.test(p) ||
        /^(\d+%|from|to)$/.test(p) ||
        p.startsWith(":where(.modal-is") ||
        p.startsWith("html:not") ||
        /^:(root|host)/.test(p);
      assert.ok(ok, `unscoped selector: ${p}`);
    }
  }
});

test("classless and scope together", async () => {
  const { css } = await compile({ entry: "classless", scope: ".pico" });
  assert.match(squash(css), /\.pico body > main/);
  assert.doesNotMatch(squash(css), /\.pico \.[a-z]/);
});
