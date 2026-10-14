// Usage: node test/visual/crop.ts in.png out.png y height
import { PNG } from "pngjs";
import { readFileSync, writeFileSync } from "node:fs";
const [i, o, y, h] = process.argv.slice(2) as [string, string, string, string];
const src = PNG.sync.read(readFileSync(i));
const H = Math.min(+h, src.height - +y);
const out = new PNG({ width: src.width, height: H });
PNG.bitblt(src, out, 0, +y, src.width, H, 0, 0);
writeFileSync(o, PNG.sync.write(out));
