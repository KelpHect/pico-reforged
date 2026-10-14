// Usage: node test/api/check.ts <built-dir> [--dev]
// --dev checks only pico.css and pico.colors.css; the other files need the real compiler.
// Compares built CSS against baseline.json. removed.json shape:
// { "classes": ["name"], "attributes": [...], "properties": [...], "keyframes": [...], "elements": [...] }
// A "*" key applies to every file, a file name key applies to that file only.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { EXTRAS } from "../../scripts/lib/compiler/index.ts";
import { extractApi } from "./extract.ts";
import type { Api } from "./extract.ts";

type Kind = keyof Api;

const here = dirname(fileURLToPath(import.meta.url));
const dev = process.argv.includes("--dev");
const dir = process.argv.slice(2).find((a) => !a.startsWith("--"));
if (!dir) {
  console.error("usage: node test/api/check.ts <built-dir> [--dev]");
  process.exit(2);
}

const files = [
  "pico.css",
  "pico.classless.css",
  "pico.conditional.css",
  "pico.fluid.classless.css",
  "pico.colors.css",
];
const devFiles = new Set(["pico.css", "pico.colors.css"]);
const kinds: Kind[] = ["classes", "attributes", "properties", "keyframes", "elements"];
const baseline = JSON.parse(readFileSync(join(here, "baseline.json"), "utf8")) as Record<
  string,
  Api
>;
const removed = JSON.parse(readFileSync(join(here, "removed.json"), "utf8")) as Record<
  string,
  Partial<Api>
>;

const allowed = (file: string, kind: Kind): Set<string> =>
  new Set([...(removed["*"]?.[kind] ?? []), ...(removed[file]?.[kind] ?? [])]);

let failed = false;
for (const file of files) {
  if (dev && !devFiles.has(file)) {
    console.log(`${file}: skipped (--dev, needs the real compiler)`);
    continue;
  }
  const path = resolve(dir, file);
  if (!existsSync(path)) {
    console.log(`${file}: MISSING FILE`);
    failed = true;
    continue;
  }
  const built = extractApi(readFileSync(path), file);
  const base = baseline[file];
  if (!base) {
    console.log(`${file}: no baseline entry`);
    failed = true;
    continue;
  }
  let fileFailed = false;
  const lines: string[] = [];
  for (const kind of kinds) {
    const ref = new Set(base[kind]);
    const now = new Set(built[kind]);
    const ok = allowed(file, kind);
    const missing = [...ref].filter((x) => !now.has(x) && !ok.has(x));
    const skipped = [...ref].filter((x) => !now.has(x) && ok.has(x));
    const added = [...now].filter((x) => !ref.has(x));
    if (missing.length) {
      fileFailed = true;
      lines.push(`  missing ${kind} (${missing.length}): ${missing.join(" ")}`);
    }
    if (skipped.length)
      lines.push(`  allowlisted ${kind} (${skipped.length}): ${skipped.join(" ")}`);
    if (added.length) lines.push(`  added ${kind} (${added.length}): ${added.join(" ")}`);
  }
  // Extras are opt-in. Their tokens and their layer must never reach the v2.1.1 files.
  const leaks = [...new Set(built.properties)].filter((p) =>
    EXTRAS.some((name) => p.startsWith(`--pico-${name}-`)),
  );
  const extrasLayer = /@layer\s+pico\.extras\s*\{/.test(readFileSync(path, "utf8"));
  if (leaks.length || extrasLayer) {
    fileFailed = true;
    lines.push(
      `  extras leaked into the default build: ${[...leaks, ...(extrasLayer ? ["@layer pico.extras"] : [])].join(" ")}`,
    );
  }
  console.log(`${file}: ${fileFailed ? "FAIL" : "ok"}`);
  lines.forEach((l) => console.log(l));
  if (fileFailed) failed = true;
}
process.exit(failed ? 1 : 0);
