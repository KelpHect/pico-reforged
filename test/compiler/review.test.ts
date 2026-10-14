// Regression tests for bugs found in the code review of the compiler. They fail until fixed.
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { compile } from "../../scripts/lib/compiler/index.ts";
import { headers } from "./helpers.ts";

const dir = mkdtempSync(join(tmpdir(), "pico-review-"));
after(() => rmSync(dir, { recursive: true, force: true }));

const content = (name: string, text: string): string => {
  const file = join(dir, name);
  writeFileSync(file, text);
  return file;
};
const purged = async (name: string, text: string): Promise<string[]> => {
  const { css } = await compile({ purge: { content: [content(name, text)] } });
  return headers(css);
};
const anyHeader = (list: string[], needle: string): boolean => list.some((h) => h.includes(needle));
/** A rule that applies to an element that has aria-busy="true" (not just the :not() form). */
const busyRule = (list: string[]): boolean => list.some((h) => /(?<!:not\()\[aria-busy="true"\]/.test(h));

test("purge keeps [open] rules when the markup has details and dialog that start closed", async () => {
  const h = await purged(
    "closed.html",
    `<details class="dropdown"><summary>a</summary><ul><li>b</li></ul></details>` +
      `<details><summary>c</summary><p>d</p></details><dialog><article>e</article></dialog>`,
  );
  // open is toggled by the browser (user click, showModal()), so it can never be known from markup
  assert.ok(anyHeader(h, "details[open]"), "details[open] rules were dropped");
  assert.ok(anyHeader(h, "details.dropdown[open]"), "details.dropdown[open] was dropped");
  assert.ok(anyHeader(h, "dialog[open]"), "dialog[open] was dropped");
});

test("purge keeps attribute rules for JSX bound values", async () => {
  const h = await purged("jsx.html", `<button aria-busy={loading}>Save</button>`);
  assert.ok(busyRule(h), "bound attribute value counted as the literal text");
});

test("purge keeps attribute rules after an arrow function in the same tag", async () => {
  const h = await purged("arrow.html", `<button onClick={() => go()} aria-busy="true">Save</button>`);
  assert.ok(busyRule(h), "a > inside an attribute value ended the tag early");
});

test("purge keeps attribute rules after a > inside a quoted attribute value", async () => {
  const h = await purged("gt.html", `<button data-x="a > b" aria-busy="true">Save</button>`);
  assert.ok(busyRule(h));
});

test("purge understands Vue and Alpine bound attributes (:aria-busy, v-bind:aria-busy)", async () => {
  const h = await purged("vue.html", `<button :aria-busy="loading">Save</button>`);
  assert.ok(busyRule(h), ":aria-busy never matches aria-busy");
});

test("purge keeps element rules for tags created from script", async () => {
  const h = await purged("script.js", `const d = document.createElement("dialog"); document.body.append(d);`);
  assert.ok(
    h.some((s) => /(^|[\s,])dialog([\s,.:\[]|$)/.test(s)),
    "createElement('dialog') does not register a dialog tag",
  );
});

test("purge that matches no file is reported instead of silently emptying the sheet", async () => {
  const run = compile({ purge: { content: [join(dir, "does-not-exist", "*.html")] } });
  const result = await run.then(
    (r) => r,
    () => "threw" as const,
  );
  assert.ok(result === "threw" || result.stats.warnings.length > 0, "no error and no warning");
});

test("a scope with several selectors is rejected instead of using the first one", async () => {
  await assert.rejects(compile({ scope: ".a, .b" }));
});
