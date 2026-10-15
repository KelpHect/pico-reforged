// Usage: node test/visual/freeze.ts [--from dist-dev]
// Copies the CSS that run.ts needs from a dev build into test/reference/current, the baseline that
// `pnpm test:visual` gates against. Run it after a deliberate visual change has been reviewed.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fromArg = process.argv.indexOf("--from");
const from = resolve(root, fromArg > -1 ? (process.argv[fromArg + 1] as string) : "dist-dev");
const to = join(root, "test", "reference", "current");

const files = [
  "pico.css",
  "pico.classless.css",
  "pico.fluid.classless.css",
  "pico.colors.css",
  "pico.conditional.css",
  "pico.extras.css",
];

mkdirSync(to, { recursive: true });
for (const file of files) {
  const source = join(from, file);
  if (!existsSync(source)) throw new Error(`${source} is missing, run node scripts/dev-build.ts`);
  copyFileSync(source, join(to, file));
  console.log(`test/reference/current/${file}`);
}
