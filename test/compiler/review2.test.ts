// Regression tests for bugs found in the second code review of the compiler. They fail until fixed.
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, test } from "vite-plus/test";
import { compile } from "../../scripts/lib/compiler/index.ts";
import { emptyIndex, purgeSelectors, scanText } from "../../scripts/lib/compiler/purge.ts";
import { headers, mapSelectors } from "./helpers.ts";

const dir = mkdtempSync(join(tmpdir(), "pico-review2-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const write = (name: string, text: string): string => {
  const file = join(dir, name);
  writeFileSync(file, text);
  return file;
};
const purged = async (name: string, text: string): Promise<string[]> => {
  const { css } = await compile({ purge: { content: [write(name, text)] } });
  return headers(css);
};
const has = (list: string[], needle: string | RegExp): boolean =>
  list.some((h) => (typeof needle === "string" ? h.includes(needle) : needle.test(h)));

test("a class attribute that spans several lines keeps every class", async () => {
  // Prettier and most editors wrap long class lists like this. The attribute value is split
  // on the letter s (/s+/ instead of /\s+/), so "secondary" is lost and the string scan does
  // not cover for it because it never matches across a newline.
  const h = await purged(
    "multiline.html",
    `<button\n  class="outline\n    secondary"\n>Save</button>`,
  );
  assert.ok(has(h, ".secondary"), ".secondary rules were dropped");
  assert.ok(has(h, ".outline"), ".outline rules were dropped");
});

test("the class index holds whole class names, not pieces split at the letter s", () => {
  const index = emptyIndex();
  scanText(index, `<p class="\n  contrast\n  secondary\n">x</p>`);
  assert.ok(index.classes.has("contrast"));
  assert.ok(index.classes.has("secondary"));
  assert.ok(!index.classes.has("econdary"), "split at the letter s");
});

test(
  "a content glob written with Windows backslashes matches files",
  { skip: process.platform !== "win32" },
  async () => {
    write("winglob.html", `<button class="contrast">x</button>`);
    const pattern = `${dir}\\winglob*.html`;
    const { css, stats } = await compile({ purge: { content: [pattern] } });
    assert.deepEqual(stats.warnings, [], "the glob matched nothing");
    assert.ok(has(headers(css), ".contrast"));
  },
);

test("classes used as unquoted object keys (clsx, Vue :class) are found", async () => {
  const h = await purged(
    "clsx.jsx",
    `export const B = ({ on }) => <button className={clsx({ contrast: on })}>x</button>;`,
  );
  assert.ok(has(h, ".contrast"), "clsx({ contrast: on }) did not register contrast");
  const v = await purged("vue.html", `<button :class="{ secondary: isSecondary }">x</button>`);
  assert.ok(has(v, ".secondary"), ':class="{ secondary: x }" did not register secondary');
});

test("an apostrophe in text does not hide a script string on the same line", async () => {
  const h = await purged(
    "apostrophe.html",
    `<p>It's open</p><script>document.documentElement.classList.add('modal-is-open')</script>`,
  );
  assert.ok(has(h, ".modal-is-open"), "the quote in It's swallowed 'modal-is-open'");
});

test("attribute values that HTML matches case-insensitively (type) keep their rules", () => {
  const index = emptyIndex();
  scanText(index, '<input type="Checkbox"><input type="RADIO">');
  const out = mapSelectors("input[type=checkbox] {a: b} input[type=radio] {a: b}", (sel) =>
    purgeSelectors(index, [sel]),
  );
  assert.match(out, /checkbox/, 'input[type=checkbox] dropped for type="Checkbox"');
  assert.match(out, /radio/, 'input[type=radio] dropped for type="RADIO"');
});
