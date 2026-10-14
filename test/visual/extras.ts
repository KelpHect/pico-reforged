// Usage: node test/visual/extras.ts [--only <name>] [--fixtures <dir>] [--report <dir>]
// For each test/fixtures/extras/<name>.html: builds pico.css and the extra into a temp folder,
// loads the page (__CSS__ is pico.css, __EXTRA__ is the extra) in Chromium, saves screenshots at
// 1280 light, 1280 dark, 375 light and 1280 light with dir=rtl, and runs axe-core on each.
// Writes test/visual/extras-report/<name>/*.png, axe.json and a summary.json at the top.
// Exits 1 when axe finds a serious or critical violation (or a page fails to load).
import { AxeBuilder } from "@axe-core/playwright";
import { chromium } from "playwright";
import type { Browser } from "playwright";
import http from "node:http";
import type { AddressInfo } from "node:net";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { EXTRAS, compile } from "../../scripts/lib/compiler/index.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");

const args = process.argv.slice(2);
const opt = (name: string): string | undefined => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const only = opt("only");
const fixturesDir = resolve(root, opt("fixtures") ?? "test/fixtures/extras");
const reportDir = resolve(root, opt("report") ?? "test/visual/extras-report");

type Mode = { name: string; width: number; scheme: "light" | "dark"; rtl?: boolean };

const modes: Mode[] = [
  { name: "1280-light", width: 1280, scheme: "light" },
  { name: "1280-dark", width: 1280, scheme: "dark" },
  { name: "375-light", width: 375, scheme: "light" },
  { name: "1280-light-rtl", width: 1280, scheme: "light", rtl: true },
];

const BLOCKING = new Set(["serious", "critical"]);

type Violation = {
  id: string;
  impact: string | null;
  help: string;
  helpUrl: string;
  nodes: { target: string; html: string; summary: string }[];
};

type AxeRun = { mode: string; violations: Violation[]; error?: string };

// Motion and carets would make screenshots flaky.
const injected = `
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
    caret-color: transparent !important;
    scroll-behavior: auto !important;
  }
`;

function startServer(dir: string): Promise<http.Server> {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const parts = url.pathname.split("/").filter(Boolean);
    const [kind, ...rest] = parts;
    const send = (code: number, body: string, type = "text/plain") => {
      res.writeHead(code, { "content-type": type, "cache-control": "no-store" });
      res.end(body);
    };
    if (kind === "page" && rest[0]) {
      const name = rest[0];
      const file = join(fixturesDir, `${name}.html`);
      if (!/^[\w-]+$/.test(name) || !existsSync(file)) return send(404, "no fixture");
      const html = readFileSync(file, "utf8")
        .replaceAll("__CSS__", "/css/pico.css")
        .replaceAll("__EXTRA__", `/css/extras/${name}.css`);
      return send(200, html, "text/html; charset=utf-8");
    }
    if (kind === "css" && rest.length && !rest.includes("..")) {
      const file = join(dir, ...rest);
      if (!existsSync(file)) return send(404, "no css");
      return send(200, readFileSync(file, "utf8"), "text/css");
    }
    send(404, "not found");
  });
  return new Promise<http.Server>((ok) => server.listen(0, "127.0.0.1", () => ok(server)));
}

async function launch(): Promise<Browser> {
  try {
    return await chromium.launch();
  } catch (err) {
    console.warn(
      `Bundled Chromium failed (${(err instanceof Error ? err.message : String(err)).split("\n")[0]}), trying system Chrome`,
    );
    return chromium.launch({ channel: "chrome" });
  }
}

async function main(): Promise<void> {
  if (only && !EXTRAS.includes(only)) {
    throw new Error(`Unknown extra "${only}". Valid extras: ${EXTRAS.join(", ")}`);
  }
  const available = existsSync(fixturesDir)
    ? readdirSync(fixturesDir)
        .filter((f) => f.endsWith(".html"))
        .map((f) => f.slice(0, -5))
    : [];
  const unknown = available.filter((f) => !EXTRAS.includes(f));
  if (unknown.length) {
    throw new Error(`fixtures without a matching extra in ${fixturesDir}: ${unknown.join(", ")}`);
  }
  const names = available.filter((f) => !only || f === only);
  if (!names.length) {
    if (only) throw new Error(`no fixture for "${only}" in ${fixturesDir}`);
    console.log(`No extras fixtures in ${fixturesDir}, nothing to check.`);
    return;
  }

  // Build once into a temp folder: the base stylesheet and each extra on its own.
  const tmp = mkdtempSync(join(tmpdir(), "pico-extras-check-"));
  mkdirSync(join(tmp, "extras"), { recursive: true });
  writeFileSync(join(tmp, "pico.css"), (await compile()).css);
  for (const name of names) {
    const { css } = await compile({ entry: "extras", extras: [name] });
    writeFileSync(join(tmp, "extras", `${name}.css`), css);
  }

  rmSync(reportDir, { recursive: true, force: true });
  mkdirSync(reportDir, { recursive: true });

  const server = await startServer(tmp);
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const browser = await launch();
  const summary: Record<string, { blocking: number; violations: number; runs: AxeRun[] }> = {};
  let failed = false;

  try {
    for (const name of names) {
      const out = join(reportDir, name);
      mkdirSync(out, { recursive: true });
      const runs: AxeRun[] = [];
      for (const mode of modes) {
        const context = await browser.newContext({
          viewport: { width: mode.width, height: 800 },
          colorScheme: mode.scheme,
          deviceScaleFactor: 1,
          reducedMotion: "reduce",
        });
        const page = await context.newPage();
        try {
          const response = await page.goto(`${base}/page/${name}`, { waitUntil: "load" });
          if (!response?.ok()) throw new Error(`page returned ${response?.status()}`);
          if (mode.rtl) await page.evaluate(() => (document.documentElement.dir = "rtl"));
          await page.addStyleTag({ content: injected });
          await page.evaluate(() => document.fonts.ready);
          await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());
          await page.screenshot({
            path: join(out, `${mode.name}.png`),
            fullPage: true,
            animations: "disabled",
          });
          const result = await new AxeBuilder({ page }).analyze();
          runs.push({
            mode: mode.name,
            violations: result.violations.map((v) => ({
              id: v.id,
              impact: v.impact ?? null,
              help: v.help,
              helpUrl: v.helpUrl,
              nodes: v.nodes.map((n) => ({
                target: n.target.join(" "),
                html: n.html.slice(0, 200),
                summary: (n.failureSummary ?? "").split("\n").slice(0, 3).join(" ").trim(),
              })),
            })),
          });
        } catch (err) {
          failed = true;
          runs.push({
            mode: mode.name,
            violations: [],
            error: err instanceof Error ? err.message : String(err),
          });
        } finally {
          await context.close();
        }
      }
      const all = runs.flatMap((r) => r.violations);
      const blocking = all.filter((v) => BLOCKING.has(v.impact ?? "")).length;
      if (blocking) failed = true;
      summary[name] = { blocking, violations: all.length, runs };
      writeFileSync(join(out, "axe.json"), `${JSON.stringify(runs, null, 2)}\n`);
      const errors = runs.filter((r) => r.error).map((r) => `${r.mode}: ${r.error}`);
      console.log(
        `${name}: ${all.length} axe violations, ${blocking} serious or critical${errors.length ? `, errors: ${errors.join("; ")}` : ""}`,
      );
    }
  } finally {
    await browser.close();
    server.close();
    rmSync(tmp, { recursive: true, force: true });
  }

  writeFileSync(join(reportDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(`Report: ${reportDir}`);
  if (failed) process.exitCode = 1;
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
