import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "vite-plus/test";
import { EXTRAS, ROOT } from "../../scripts/lib/compiler/config.ts";
import { syntheticRoot } from "../../scripts/lib/integrations/process.ts";

const pkg = JSON.parse(readFileSync(`${ROOT}package.json`, "utf8")) as {
  exports: Record<string, string | { style?: string }>;
};

// The `style` condition is what bundlers pick for a CSS @import without the plugin. The raw
// sources have no layers on the extras, keep native nesting and light-dark(), and the classless
// source still has the class selectors, so it has to point at the built, layered files.
const styleTargets = Object.entries(pkg.exports).flatMap(([name, value]) => {
  const style = typeof value === "object" ? value.style : undefined;
  if (!style) return [];
  return name.includes("*")
    ? EXTRAS.map((extra) => [name.replace("*", extra), style.replace("*", extra)] as const)
    : [[name, style] as const];
});

test("every style export points at a built file", () => {
  assert.ok(styleTargets.length >= 4 + EXTRAS.length);
  for (const [name, style] of styleTargets) {
    assert.ok(style.startsWith("./css/"), `${name} -> ${style}`);
    assert.ok(!style.endsWith(".min.css"), `${name} -> ${style}`);
  }
});

test("style files are layered and need no lowering", () => {
  for (const [name, style] of styleTargets) {
    const css = readFileSync(`${ROOT}${style.slice(2)}`, "utf8");
    assert.match(css, /@layer pico[.\w]*/, `${name} has no pico layer`);
    assert.ok(!css.includes("light-dark("), `${name} still has light-dark()`);
  }
});

test("the plugins treat the style files as roots", () => {
  for (const [name, style] of styleTargets) {
    const root = syntheticRoot(`${ROOT}${style.slice(2)}`);
    const expected =
      name === "." ? "@rusticstack/pico-reforged" : `@rusticstack/pico-reforged/${name.slice(2)}`;
    assert.equal(root, `@import "${expected}";\n`, name);
  }
});
