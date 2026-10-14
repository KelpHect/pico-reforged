// Next requests segment prefetch files as one dotted name, for example
// __next.docs.$c$slug.__PAGE__.txt, but the static export can write them as nested folders
// (__next.docs/$c$slug/__PAGE__.txt). Rename them to the dotted form so link prefetches resolve.
// Nothing to do when the export already wrote flat files.
import { existsSync, readdirSync, renameSync, rmSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), "..", "out"));
let moved = 0;

function flatten(dir, prefix, target) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) flatten(full, `${prefix}.${entry}`, target);
    else {
      renameSync(full, join(target, `${prefix}.${entry}`));
      moved += 1;
    }
  }
}

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (!statSync(full).isDirectory()) continue;
    if (entry.startsWith("__next.")) {
      flatten(full, entry, dir);
      rmSync(full, { recursive: true, force: true });
    } else walk(full);
  }
}

if (existsSync(root)) walk(root);
console.log(`flatten-rsc: renamed ${moved} prefetch files`);
