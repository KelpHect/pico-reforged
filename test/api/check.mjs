// Usage: node test/api/check.mjs <built-dir>
// Compares built CSS against baseline.json. removed.json shape:
// { "classes": ["name"], "attributes": [...], "properties": [...], "keyframes": [...], "elements": [...] }
// A "*" key applies to every file, a file name key applies to that file only.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractApi } from './extract.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const dir = process.argv[2];
if (!dir) {
  console.error('usage: node test/api/check.mjs <built-dir>');
  process.exit(2);
}

const files = [
  'pico.css',
  'pico.classless.css',
  'pico.conditional.css',
  'pico.fluid.classless.css',
  'pico.colors.css',
];
const kinds = ['classes', 'attributes', 'properties', 'keyframes', 'elements'];
const baseline = JSON.parse(readFileSync(join(here, 'baseline.json'), 'utf8'));
const removed = JSON.parse(readFileSync(join(here, 'removed.json'), 'utf8'));

const allowed = (file, kind) =>
  new Set([...(removed['*']?.[kind] ?? []), ...(removed[file]?.[kind] ?? [])]);

let failed = false;
for (const file of files) {
  const path = resolve(dir, file);
  if (!existsSync(path)) {
    console.log(`${file}: MISSING FILE`);
    failed = true;
    continue;
  }
  const built = extractApi(readFileSync(path), file);
  let fileFailed = false;
  const lines = [];
  for (const kind of kinds) {
    const ref = new Set(baseline[file][kind]);
    const now = new Set(built[kind]);
    const ok = allowed(file, kind);
    const missing = [...ref].filter((x) => !now.has(x) && !ok.has(x));
    const skipped = [...ref].filter((x) => !now.has(x) && ok.has(x));
    const added = [...now].filter((x) => !ref.has(x));
    if (missing.length) {
      fileFailed = true;
      lines.push(`  missing ${kind} (${missing.length}): ${missing.join(' ')}`);
    }
    if (skipped.length) lines.push(`  allowlisted ${kind} (${skipped.length}): ${skipped.join(' ')}`);
    if (added.length) lines.push(`  added ${kind} (${added.length}): ${added.join(' ')}`);
  }
  console.log(`${file}: ${fileFailed ? 'FAIL' : 'ok'}`);
  lines.forEach((l) => console.log(l));
  if (fileFailed) failed = true;
}
process.exit(failed ? 1 : 0);
