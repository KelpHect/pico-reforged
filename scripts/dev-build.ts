// Minimal dev bundler: bundles the three entries with Lightning CSS and writes unminified
// output to dist-dev/. The real compiler comes later.
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { bundleAsync, browserslistToTargets } from "lightningcss";
import browserslist from "browserslist";

const root = new URL("../", import.meta.url);
const targets = browserslistToTargets(browserslist("defaults"));
const outDir = fileURLToPath(new URL("dist-dev/", root));
mkdirSync(outDir, { recursive: true });

for (const entry of ["pico.css", "pico.classless.css", "pico.colors.css"]) {
  const { code } = await bundleAsync({
    filename: fileURLToPath(new URL(`src/${entry}`, root)),
    minify: false,
    targets,
  });
  writeFileSync(outDir + entry, code);
  console.log(`dist-dev/${entry}: ${code.length} bytes`);
}
