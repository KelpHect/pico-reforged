import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";
import { test } from "vite-plus/test";
import { EXTRAS, MODULES, THEMES } from "../../scripts/lib/compiler/index.ts";
import { tokenUse } from "../../scripts/lib/ai/css.ts";
import { generateAi } from "../../scripts/generate-ai.ts";

const root = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const EXT = "com.rusticstack.pico-reforged";

type Node = { [key: string]: unknown };
type Component = {
  name: string;
  category: string;
  optIn: { kind: string; css: string };
  summary: string;
  markup: string | null;
  examples: { label: string; html: string }[];
  variants: { selector: string }[];
  tokens: { reads: string[]; defines: string[] };
};

const read = (path: string): string =>
  readFileSync(join(root, path), "utf8").replace(/\r\n/g, "\n");
const tokens = JSON.parse(read("ai/tokens.json")) as Node;
const components = (JSON.parse(read("ai/components.json")) as { components: Component[] })
  .components;

function walk(node: Node, path: string[], visit: (path: string[], token: Node) => void): void {
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith("$") || value === null || typeof value !== "object") continue;
    const child = value as Node;
    if ("$value" in child) visit([...path, key], child);
    else walk(child, [...path, key], visit);
  }
}

const all: { path: string; token: Node }[] = [];
walk(tokens, [], (path, token) => all.push({ path: path.join("."), token }));
const cssOnly = (tokens.$extensions as Node)[EXT] as { cssOnly: Node; themes: string[] };

test("the generated files are up to date", () => {
  for (const [path, content] of Object.entries(generateAi())) {
    assert.equal(read(path), content, `${path} is stale, run: node scripts/generate-ai.ts`);
  }
});

test("every module and every extra has a manifest entry", () => {
  const byModule = new Map(components.map((c) => [c.optIn.css, c]));
  assert.equal(byModule.size, components.length, "two entries share a module");
  const names = new Set(components.map((c) => c.name));
  assert.equal(names.size, components.length, "duplicate entry name");

  for (const dir of ["reset", "layout", "content", "forms", "components", "utilities", "extras"]) {
    for (const file of readdirSync(join(root, "src", dir)).filter((f) => f.endsWith(".css"))) {
      assert.ok(
        byModule.has(`src/${dir}/${file}`),
        `src/${dir}/${file} has no entry in ai/components.json`,
      );
    }
  }
  for (const module of MODULES) {
    assert.ok(byModule.has(`src/${module}.css`), `module ${module} has no manifest entry`);
  }
  for (const extra of EXTRAS) {
    assert.ok(byModule.has(`src/extras/${extra}.css`), `extra ${extra} has no manifest entry`);
  }
  for (const c of components) {
    assert.ok(c.summary.length > 0, `${c.name} has no summary`);
    assert.ok(c.variants.length >= 0);
  }
});

test("core and extras are told apart by opt-in", () => {
  for (const c of components) {
    const isExtra = c.optIn.css.startsWith("src/extras/");
    assert.equal(c.optIn.kind === "extra", isExtra, c.name);
    assert.equal(c.category === "extras", isExtra, c.name);
  }
});

test("components that take markup carry it", () => {
  const without = new Set(["document", "responsive-spacings", "accessibility", "reduce-motion"]);
  for (const c of components) {
    if (without.has(c.name)) continue;
    assert.ok(c.markup && c.markup.includes("<"), `${c.name} has no markup`);
    assert.ok(!/__[A-Z]+__|data:image/.test(c.markup), `${c.name} markup has fixture placeholders`);
  }
});

test("every --pico-* name in src is a token or a component hook", () => {
  const known = new Set<string>(Object.keys(cssOnly.cssOnly));
  for (const { token } of all)
    known.add(((token.$extensions as Node)[EXT] as Node).cssVar as string);
  for (const c of components) for (const name of c.tokens.defines) known.add(name);

  const declared = new Set<string>();
  const reads = new Set<string>();
  const scan = (dir: string): void => {
    for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) scan(path);
      else if (entry.name.endsWith(".css")) {
        const use = tokenUse(read(path));
        for (const n of use.declares) declared.add(n);
        for (const n of use.reads) reads.add(n);
      }
    }
  };
  scan("src");

  const missing = [...declared].filter((n) => !known.has(n));
  assert.deepEqual(missing, [], "declared in src but missing from ai/*.json");
  const undeclared = [...reads].filter((n) => !declared.has(n));
  assert.deepEqual(undeclared, [], "read with var() but declared nowhere in src");
});

test("every alias points at a token of the same type", () => {
  const byPath = new Map(all.map((t) => [t.path, t.token]));
  const check = (value: unknown, type: string, where: string): void => {
    if (typeof value === "string" && /^\{.+\}$/.test(value)) {
      const target = byPath.get(value.slice(1, -1));
      assert.ok(target, `${where}: ${value} does not exist`);
      assert.equal(target.$type, type, `${where}: ${value} has another type`);
    } else if (Array.isArray(value)) {
      for (const v of value) check(v, type, where);
    } else if (value !== null && typeof value === "object") {
      const inner = value as Node;
      if ("color" in inner) check(inner.color, "color", where);
      for (const key of ["offsetX", "offsetY", "blur", "spread"]) {
        if (key in inner) check(inner[key], "dimension", where);
      }
    }
  };
  for (const { path, token } of all) {
    check(token.$value, token.$type as string, path);
    const dark = ((token.$extensions as Node)[EXT] as Node).dark;
    if (dark !== undefined) check(dark, token.$type as string, `${path} (dark)`);
  }
});

test("tokens.json has all themes, a palette and typed tokens", () => {
  assert.deepEqual(cssOnly.themes, THEMES);
  assert.ok(all.some((t) => t.path === "palette.red-500"));
  assert.ok(all.some((t) => t.path === "color.background-color"));
  for (const { path, token } of all) {
    assert.equal(typeof token.$type, "string", `${path} has no $type`);
  }
  const colors = all.filter((t) => t.token.$type === "color" && typeof t.token.$value === "object");
  for (const { path, token } of colors) {
    const value = token.$value as { colorSpace: string; components: number[] };
    assert.equal(value.colorSpace, "oklch", path);
    assert.equal(value.components.length, 3, path);
  }
});

test("package.json ships and exposes the AI files", () => {
  const pkg = JSON.parse(read("package.json")) as {
    files: string[];
    exports: Record<string, unknown>;
    scripts: Record<string, string>;
  };
  for (const entry of ["ai", "skills", "AGENTS.md"]) assert.ok(pkg.files.includes(entry), entry);
  assert.equal(pkg.exports["./tokens.json"], "./ai/tokens.json");
  assert.equal(pkg.exports["./components.json"], "./ai/components.json");
  assert.ok(pkg.scripts["generate:ai"]);
});

test("the skill exists and stays short", () => {
  const skill = read("skills/pico-reforged/SKILL.md");
  assert.match(skill, /^---\nname: pico-reforged\ndescription: .{40,}\n/);
  assert.ok(skill.split("\n").length <= 320, "SKILL.md is over 320 lines");
  for (const match of skill.matchAll(/\]\((references\/[^)#]+)/g)) {
    const file = match[1] as string;
    assert.ok(read(`skills/pico-reforged/${file}`).length > 0, file);
  }
});
