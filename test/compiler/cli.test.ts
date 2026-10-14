import assert from "node:assert/strict";
import { execFileSync, execSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const dir = mkdtempSync(join(tmpdir(), "pico-cli-"));
after(() => rmSync(dir, { recursive: true, force: true }));

const run = (script: string, args: string[], cwd = root) =>
  spawnSync(process.execPath, [script, ...args], { cwd, encoding: "utf8" });

test("themes lists the 20 themes", () => {
  const out = run("scripts/cli.ts", ["themes"]);
  assert.equal(out.status, 0);
  const names = out.stdout.trim().split(/\r?\n/);
  assert.equal(names.length, 20);
  assert.ok(names.includes("azure") && names.includes("zinc"));
});

test("build writes a file and prints a size line", () => {
  const out = join(dir, "lean.css");
  const res = run("scripts/cli.ts", [
    "build",
    "--entry",
    "classless",
    "--scope",
    ".pico",
    "--fluid",
    "--exclude",
    "components/modal,forms/input-range",
    "--no-layers",
    "--minify",
    "--out",
    out,
  ]);
  assert.equal(res.status, 0, res.stderr);
  const css = readFileSync(out, "utf8");
  assert.doesNotMatch(css, /@layer/);
  assert.match(css, /\.pico body ?> ?main/);
  assert.doesNotMatch(css, /dialog>article/);
  assert.match(res.stderr, /excluded/);
});

test("build prints to stdout without --out", () => {
  const res = run("scripts/cli.ts", ["build", "--entry", "colors"]);
  assert.equal(res.status, 0);
  assert.match(res.stdout, /\.pico-color-azure/);
});

test("build reads a JSON config and flags win over it", () => {
  const config = join(dir, "pico.config.json");
  writeFileSync(config, JSON.stringify({ entry: "classless", theme: "jade", scope: ".site" }));
  const a = run("scripts/cli.ts", ["build", "--config", config, "--minify"]);
  assert.equal(a.status, 0, a.stderr);
  assert.match(a.stdout, /\.site body/);
  const b = run("scripts/cli.ts", ["build", "--config", config, "--scope", ".other", "--minify"]);
  assert.match(b.stdout, /\.other body/);
  assert.doesNotMatch(b.stdout, /\.site/);
});

test("build reads a .ts config", () => {
  const config = join(dir, "custom.config.ts");
  writeFileSync(config, `export default { entry: "classless", scope: ".ts-scope" };\n`);
  const res = run("scripts/cli.ts", ["build", "--config", config]);
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /\.ts-scope body/);
});

test("build with --purge", () => {
  const html = join(dir, "page.html");
  writeFileSync(html, "<main><p>Hi</p></main>");
  const res = run("scripts/cli.ts", ["build", "--purge", html]);
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stderr, /dropped by purge/);
  assert.doesNotMatch(res.stdout, /details\.dropdown/);
});

test("matrix writes the v2.1.1 file names", { timeout: 300_000 }, () => {
  const out = join(dir, "matrix");
  const res = run("scripts/cli.ts", ["matrix", out]);
  assert.equal(res.status, 0, res.stderr);
  const files = readdirSync(out);
  assert.equal(files.length, 238);
  for (const name of [
    "pico.css",
    "pico.min.css",
    "pico.classless.amber.css",
    "pico.conditional.zinc.min.css",
    "pico.classless.conditional.jade.css",
    "pico.fluid.classless.min.css",
    "pico.fluid.classless.conditional.red.min.css",
    "pico.colors.css",
    "pico.colors.min.css",
  ]) {
    assert.ok(files.includes(name), `missing ${name}`);
  }
  assert.ok(!files.includes("pico.azure.css"));
  const text = readFileSync(join(out, "pico.min.css"), "utf8");
  assert.match(text, /^\/\*!\n \* Pico Reforged v\d/);
  assert.match(text, /Lucas Larroche/);
  assert.match(text, /2026 rusticstack/);
  assert.match(text, /https:\/\/pico\.rusticstack\.com/);
});

test("unknown commands and themes fail", () => {
  assert.equal(run("scripts/cli.ts", ["wat"]).status, 2);
  const res = run("scripts/cli.ts", ["build", "--theme", "nope"]);
  assert.equal(res.status, 1);
  assert.match(res.stderr, /Unknown theme/);
});

test("the emitted CLI in dist/ runs as plain JavaScript", { timeout: 120_000 }, () => {
  execSync("npx tsc -p tsconfig.build.json", { cwd: root, stdio: "pipe" });
  const cli = join(root, "dist", "cli.js");
  assert.ok(existsSync(cli));
  const source = readFileSync(cli, "utf8");
  assert.ok(source.startsWith("#!/usr/bin/env node"));
  assert.doesNotMatch(source, /from "\.[^"]*\.ts"/);
  assert.ok(existsSync(join(root, "dist", "data", "palette.json")));

  // Run it without type stripping, the way Node treats code inside node_modules.
  const out = join(dir, "dist-build.css");
  const res = execFileSync(
    process.execPath,
    ["--no-experimental-strip-types", cli, "build", "--theme", "#e5484d", "--minify", "--out", out],
    { cwd: root, encoding: "utf8", stdio: "pipe" },
  );
  assert.equal(res, "");
  assert.match(readFileSync(out, "utf8"), /--pico-primary/);
  assert.equal(
    execFileSync(process.execPath, [cli, "--version"], { encoding: "utf8" }).trim(),
    JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version,
  );
});
