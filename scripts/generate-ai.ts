// Writes ai/tokens.json and ai/components.json. Run with `node scripts/generate-ai.ts`.
// The sources are src/tokens, src/themes, src/extras, scripts/data/components.ts and the fixtures,
// so run `node scripts/generate.ts` first when the palette or the themes change.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { generateComponents } from "./lib/ai/components.ts";
import { generateReferences } from "./lib/ai/reference.ts";
import type { Component } from "./lib/ai/reference.ts";
import { generateTokens } from "./lib/ai/tokens.ts";

const root = new URL("../", import.meta.url);

export function generateAi(): Record<string, string> {
  const components = generateComponents(root);
  return {
    "ai/tokens.json": generateTokens(root),
    "ai/components.json": components,
    ...generateReferences((JSON.parse(components) as { components: Component[] }).components),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const files = generateAi();
  for (const [path, content] of Object.entries(files)) {
    const target = fileURLToPath(new URL(path, root));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
  console.log("generated", Object.keys(files).length, "files");
}
