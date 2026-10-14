import assert from "node:assert/strict";
import { relative } from "node:path";
import { test } from "vite-plus/test";
import {
  findProjectRoot,
  resolveSources,
  Scanner,
} from "../../scripts/lib/integrations/scanner.ts";
import { matcher, parseGitignore, matchRules } from "../../scripts/lib/integrations/glob.ts";
import { makeProject, write } from "./helpers.ts";

const names = (root: string, files: string[]): string[] =>
  files.map((f) => relative(root, f).replaceAll("\\", "/")).toSorted();

const project = makeProject({
  "package.json": "{}",
  ".gitignore": "generated/\n*.secret.html\n/only-root.html\n",
  "src/page.html": '<main class="used-in-page"><button class="secondary">x</button></main>',
  "src/app.tsx": 'export const A = () => <div className="used-in-tsx" aria-busy="true" />;',
  "src/deep/.gitignore": "ignored-here.html\n!kept.secret.html\n",
  "src/deep/ignored-here.html": '<p class="nested-ignored">x</p>',
  "src/deep/kept.secret.html": '<p class="nested-kept">x</p>',
  "src/deep/ok.vue": '<template><span class="used-in-vue"></span></template>',
  "generated/out.html": '<p class="in-generated">x</p>',
  "top.secret.html": '<p class="top-secret">x</p>',
  "only-root.html": '<p class="only-root">x</p>',
  "src/only-root.html": '<p class="not-only-root">x</p>',
  "node_modules/lib/index.js": 'el.className = "in-node-modules"',
  ".git/config": "class=in-git",
  "dist/index.html": '<p class="in-dist">x</p>',
  ".next/server/page.html": '<p class="in-next">x</p>',
  ".astro/types.html": '<p class="in-astro">x</p>',
  ".svelte-kit/x.html": '<p class="in-svelte-kit">x</p>',
  ".nuxt/x.html": '<p class="in-nuxt">x</p>',
  ".output/x.html": '<p class="in-output">x</p>',
  "build/x.html": '<p class="in-build">x</p>',
  "out/x.html": '<p class="in-out">x</p>',
  "coverage/x.html": '<p class="in-coverage">x</p>',
  "pnpm-lock.yaml": "in-lock-file: yes",
  "package-lock.json": '{"in-package-lock": 1}',
  "src/styles.css": ".in-css-file { color: red }",
  "src/styles.scss": ".in-scss-file { color: red }",
  "assets/logo.png": Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 1]),
  "assets/raw.dat": Buffer.from("in-binary-file\0\0\0"),
  "src/huge.js": `el.className = "in-huge-file";\n${"x".repeat(1024 * 1024 + 10)}`,
  "hidden/.dotfile.html": '<p class="in-dotfile">x</p>',
});

const scan = (root = project, extra: Partial<ConstructorParameters<typeof Scanner>[0]> = {}) =>
  new Scanner({ root, ...extra }).scan();

test("the automatic scan walks the project and skips what it should", () => {
  const { index, files } = scan();
  const list = names(project, files);
  for (const wanted of [
    "src/page.html",
    "src/app.tsx",
    "src/deep/ok.vue",
    "hidden/.dotfile.html",
  ]) {
    assert.ok(list.includes(wanted), `${wanted} should be scanned: ${list.join(", ")}`);
  }
  for (const name of [
    "used-in-page",
    "used-in-tsx",
    "used-in-vue",
    "in-dotfile",
    "not-only-root",
  ]) {
    assert.ok(index.classes.has(name), name);
  }
  assert.ok(index.tags.has("main") && index.tags.has("button"));
  for (const name of [
    "in-node-modules",
    "in-git",
    "in-dist",
    "in-next",
    "in-astro",
    "in-svelte-kit",
    "in-nuxt",
    "in-output",
    "in-build",
    "in-out",
    "in-coverage",
    "in-lock-file",
    "in-package-lock",
    "in-css-file",
    "in-scss-file",
    "in-binary-file",
    "in-huge-file",
  ]) {
    assert.ok(!index.classes.has(name), `${name} must not be scanned`);
  }
});

test(".gitignore files are honoured, nested ones too", () => {
  const { index, files } = scan();
  const list = names(project, files);
  assert.ok(!index.classes.has("in-generated"), "generated/ is ignored");
  assert.ok(!index.classes.has("top-secret"), "*.secret.html is ignored");
  assert.ok(!list.includes("only-root.html"), "/only-root.html is anchored to the root");
  assert.ok(list.includes("src/only-root.html"), "src/only-root.html is not that file");
  assert.ok(!index.classes.has("nested-ignored"), "nested .gitignore ignores its file");
  assert.ok(index.classes.has("nested-kept"), "nested .gitignore re-includes with !");
});

test("gitignore parsing", () => {
  const rules = parseGitignore("# comment\n*.log\nbuild/\n!keep.log\n/rooted\nsrc/**/gen\n");
  assert.equal(matchRules(rules, "a/b/c.log", false), true);
  assert.equal(matchRules(rules, "keep.log", false), false);
  assert.equal(matchRules(rules, "x/build", true), true);
  assert.equal(matchRules(rules, "x/build", false), undefined, "build/ only matches folders");
  assert.equal(matchRules(rules, "rooted", false), true);
  assert.equal(matchRules(rules, "a/rooted", false), undefined);
  assert.equal(matchRules(rules, "src/a/b/gen", false), true);
});

test("a .gitignore above the project is read when there is a git repository", () => {
  const repo = makeProject({
    ".git/HEAD": "ref: refs/heads/main",
    ".gitignore": "ignored-by-parent.html\n",
    "app/package.json": "{}",
    "app/ignored-by-parent.html": '<p class="parent-ignored">x</p>',
    "app/ok.html": '<p class="parent-ok">x</p>',
  });
  const { index } = scan(`${repo}/app`);
  assert.ok(!index.classes.has("parent-ignored"));
  assert.ok(index.classes.has("parent-ok"));
});

test("@source forces a folder in, even inside node_modules, and re-includes ignored paths", () => {
  const sources = resolveSources(project, [
    { pattern: "node_modules/lib", not: false },
    { pattern: "generated/*.html", not: false },
  ]);
  const { index } = scan(project, { sources });
  assert.ok(index.classes.has("in-node-modules"));
  assert.ok(index.classes.has("in-generated"));
});

test("@source adds a place outside the project root", () => {
  const other = makeProject({ "x/card.html": '<p class="outside-root">x</p>' });
  const sources = resolveSources(project, [{ pattern: `${other}/x`, not: false }]);
  assert.ok(scan(project, { sources }).index.classes.has("outside-root"));
});

test("@source not leaves files out, by folder and by glob", () => {
  const sources = resolveSources(project, [
    { pattern: "src/deep", not: true },
    { pattern: "**/*.tsx", not: true },
  ]);
  const { index } = scan(project, { sources });
  assert.ok(!index.classes.has("used-in-vue"));
  assert.ok(!index.classes.has("nested-kept"));
  assert.ok(!index.classes.has("used-in-tsx"));
  assert.ok(index.classes.has("used-in-page"));
});

test("no automatic scan: only the @source paths count", () => {
  const sources = resolveSources(project, [{ pattern: "src/page.html", not: false }]);
  const { index, files } = new Scanner({ sources }).scan();
  assert.equal(files.length, 1);
  assert.ok(index.classes.has("used-in-page"));
  assert.ok(!index.classes.has("used-in-tsx"));
});

test("extra ignore names and paths", () => {
  const { index } = scan(project, { ignore: ["deep", `${project}/hidden`] });
  assert.ok(!index.classes.has("used-in-vue"));
  assert.ok(!index.classes.has("in-dotfile"));
  assert.ok(index.classes.has("used-in-page"));
});

test("the cache follows the content: a class that leaves the source leaves the index", () => {
  const dir = makeProject({
    "package.json": "{}",
    "a.html": '<p class="first-name">x</p>',
    "b.html": '<p class="stays">x</p>',
  });
  const scanner = new Scanner({ root: dir });
  let result = scanner.scan();
  assert.ok(result.index.classes.has("first-name") && result.index.classes.has("stays"));
  write(dir, "a.html", '<p class="second-name-longer">x</p>');
  result = scanner.scan();
  assert.ok(!result.index.classes.has("first-name"), "removed class is gone");
  assert.ok(result.index.classes.has("second-name-longer") && result.index.classes.has("stays"));
  write(dir, "c.html", '<p class="new-file">x</p>');
  assert.ok(scanner.scan().index.classes.has("new-file"));
  // deleting a file removes what only it held
  write(dir, "c.html", "");
  assert.ok(!scanner.scan().index.classes.has("new-file"));
});

test("project root detection", () => {
  const dir = makeProject({ "package.json": "{}", "a/b/c/style.css": "" });
  assert.equal(findProjectRoot(`${dir}/a/b/c/style.css`), dir);
  assert.equal(findProjectRoot(`${dir}/a/b`), dir);
});

test("code that writes HTML at run time adds the common content tags", () => {
  const plain = makeProject({ "a.html": "<main>x</main>" });
  assert.ok(!scan(plain).index.tags.has("blockquote"));
  for (const [name, text] of [
    ["a.md", "# Title\n\n> quote"],
    ["a.tsx", "<div dangerouslySetInnerHTML={{ __html: html }} />"],
    ["a.vue", '<div v-html="html"></div>'],
    ["a.svelte", "{@html html}"],
    ["a.njk", "{{ body | safe }}"],
  ] as const) {
    const dir = makeProject({ [name]: text });
    const result = scan(dir);
    assert.ok(result.index.tags.has("blockquote"), name);
    assert.ok(result.dynamicHtml.length > 0, name);
  }
});

test("scripts that set aria and data attributes are understood", () => {
  const dir = makeProject({
    "a.js":
      'el.ariaBusy = "true"; el.dataset.tooltip = "x"; el.dataset["dataPlacement"] = "top"; el.setAttribute("aria-expanded", "true")',
  });
  const { attrs } = scan(dir).index;
  for (const name of ["aria-busy", "data-tooltip", "data-data-placement", "aria-expanded"]) {
    assert.ok(attrs.has(name), name);
  }
});

test("glob matching", () => {
  const isMatch = matcher(["src/**/*.{html,tsx}", "*.md"]);
  assert.ok(isMatch("src/a.html") && isMatch("src/a/b/c.tsx") && isMatch("README.md"));
  assert.ok(!isMatch("src/a.css") && !isMatch("docs/README.md"));
});
