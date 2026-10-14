import assert from "node:assert/strict";
import { test } from "vite-plus/test";
import { build, createServer } from "vite-plus";
import type { Plugin } from "vite-plus";
import { ROOT } from "../../scripts/lib/compiler/config.ts";
import pico from "../../scripts/integrations/vite.ts";
import { hasSelector, makeProject } from "./helpers.ts";

const files = {
  "package.json": '{"name":"app","private":true}',
  "index.html": `<!doctype html><html><body>
<main class="container"><button class="secondary" aria-busy="true">Save</button><article>x</article></main>
<script type="module" src="/src/main.js"></script></body></html>`,
  "src/main.js": 'import "./app.css";\nconsole.log("app");\n',
  "src/app.css": `@import "@rusticstack/pico-reforged";
@pico { theme: jade; }
.mine { color: rebeccapurple }
`,
};

/** Output CSS of a build, joined. */
async function buildCss(
  dir: string,
  plugin = pico(),
  extra: Record<string, unknown> = {},
): Promise<string> {
  const result = await build({
    root: dir,
    configFile: false,
    logLevel: "silent",
    plugins: [plugin],
    build: { write: false, minify: false, cssMinify: false },
    ...extra,
  });
  const outputs = (Array.isArray(result) ? result : [result]).flatMap((r) =>
    "output" in r ? r.output : [],
  );
  return outputs
    .filter((o) => o.type === "asset" && o.fileName.endsWith(".css"))
    .map((o) => String((o as { source: string | Uint8Array }).source))
    .join("\n");
}

test("the plugin is a Vite plugin by type", () => {
  const plugin: Plugin = pico();
  assert.equal(plugin.name, "@rusticstack/pico-reforged:vite");
  assert.equal(plugin.enforce, "pre");
});

test("vite build: Pico is compiled and purged against the project", async () => {
  const dir = makeProject(files);
  const css = await buildCss(dir);
  assert.ok(!css.includes("@rusticstack") && !css.includes("@pico"));
  assert.ok(css.includes(".mine"), "app CSS is kept");
  assert.ok(
    hasSelector(css, "button") && hasSelector(css, ".secondary") && hasSelector(css, "[aria-busy"),
  );
  assert.ok(hasSelector(css, "dialog"), "safe mode keeps unseen tags");
  assert.ok(!hasSelector(css, ".contrast"), "unused rules are gone");
  assert.match(css, /oklch\(51\.16% \.1145 160\.67\)/, "jade theme");
});

test("vite build: the output folder is not scanned", async () => {
  const dir = makeProject({
    ...files,
    // a stale build from an earlier run that used a dialog
    "dist/old.html": '<button class="contrast">x</button>',
  });
  const css = await buildCss(dir);
  assert.ok(!hasSelector(css, ".contrast"));
});

test("vite build: purge false keeps everything", async () => {
  const dir = makeProject(files);
  const css = await buildCss(dir, pico({ purge: false }));
  assert.ok(hasSelector(css, "dialog") && hasSelector(css, ".contrast"));
});

test("vite build: the package's own css file, imported from a script, is purged too", async () => {
  const dir = makeProject({
    "package.json": "{}",
    "index.html": `<main><p>x</p></main><script type="module" src="/main.js"></script>`,
    "main.js": 'import "@rusticstack/pico-reforged";\n',
  });
  const css = await buildCss(dir, pico(), {
    resolve: { alias: { "@rusticstack/pico-reforged": `${ROOT}css/pico.min.css` } },
  });
  assert.ok(hasSelector(css, "p") && !hasSelector(css, ".contrast"));
});

test("vite build: works next to Tailwind-style files that do not mention Pico", async () => {
  const dir = makeProject({
    ...files,
    "src/other.css": ".other { color: red }",
    "src/main.js": 'import "./app.css";\nimport "./other.css";\n',
  });
  const css = await buildCss(dir);
  assert.ok(css.includes(".other") && css.includes(".mine"));
});

test("vite dev: the full stylesheet, nothing purged", async () => {
  const dir = makeProject(files);
  const server = await createServer({
    root: dir,
    configFile: false,
    logLevel: "silent",
    plugins: [pico()],
    server: { middlewareMode: true, ws: false },
    optimizeDeps: { noDiscovery: true },
  });
  try {
    const result = await server.transformRequest("/src/app.css?direct");
    const css = result?.code ?? "";
    assert.ok(hasSelector(css, "dialog") && hasSelector(css, ".contrast"), "no purge in dev");
    assert.ok(css.includes(".mine"));
    assert.ok(!css.includes("@rusticstack"));
  } finally {
    await server.close();
  }
});
