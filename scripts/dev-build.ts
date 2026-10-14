// Quick build for development and tests: the azure variants in readable form, written to
// dist-dev/ (or --out <folder>), or minified with --minify. The full file set comes from
// `npm run build`.
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { compile } from "./lib/compiler/index.ts";
import type { CompileOptions } from "./lib/compiler/index.ts";

const root = new URL("../", import.meta.url);
const outArg = process.argv.indexOf("--out");
const outName = outArg > -1 ? process.argv[outArg + 1] : "dist-dev";
const outDir = fileURLToPath(new URL(`${outName}/`, root));
mkdirSync(outDir, { recursive: true });

// --targets <query|modern> builds for another floor, to run the visual tests against it.
const targetsArg = process.argv.indexOf("--targets");
const targets = targetsArg > -1 ? { targets: process.argv[targetsArg + 1] as string } : {};
// --minify runs the minify pass too (selector factoring only happens there).
const minify = process.argv.includes("--minify");

const files: Record<string, CompileOptions> = {
  "pico.css": {},
  "pico.classless.css": { entry: "classless" },
  "pico.conditional.css": { scope: ".pico" },
  "pico.fluid.classless.css": { entry: "classless", fluid: true },
  "pico.colors.css": { entry: "colors" },
  "pico.extras.css": { entry: "extras" },
};

for (const [name, options] of Object.entries(files)) {
  const { css } = await compile({ ...options, ...targets, minify });
  writeFileSync(outDir + name, css);
  console.log(`${outName}/${name}: ${css.length} bytes`);
}
