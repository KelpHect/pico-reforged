import { brotliCompressSync, gzipSync } from "node:zlib";
import type { CompileStats } from "./types.ts";

export function sizes(css: string): { bytes: number; gzipBytes: number; brotliBytes: number } {
  const buf = Buffer.from(css);
  return {
    bytes: buf.length,
    gzipBytes: gzipSync(buf).length,
    brotliBytes: brotliCompressSync(buf).length,
  };
}

const kb = (n: number): string => `${(n / 1024).toFixed(1)} kB`;

/** One line per build, for the CLI. */
export function formatStats(label: string, stats: CompileStats): string {
  const parts = [
    `${label}: ${kb(stats.bytes)}`,
    `gzip ${kb(stats.gzipBytes)}`,
    `brotli ${kb(stats.brotliBytes)}`,
    `${stats.rules} rules`,
  ];
  if (stats.removedByClassless) parts.push(`${stats.removedByClassless} dropped by classless`);
  if (stats.removedByPurge) parts.push(`${stats.removedByPurge} dropped by purge`);
  if (stats.extras.length) parts.push(`extras ${stats.extras.join(", ")}`);
  if (stats.excludedModules.length) parts.push(`excluded ${stats.excludedModules.join(", ")}`);
  parts.push(`${stats.durationMs} ms`);
  return parts.join(", ");
}

/** Table for the matrix command. */
export function formatTable(rows: { name: string; stats: CompileStats }[]): string {
  const width = Math.max(...rows.map((r) => r.name.length));
  return rows
    .map(
      (r) =>
        `${r.name.padEnd(width)}  ${kb(r.stats.bytes).padStart(10)}  ${kb(r.stats.gzipBytes).padStart(10)}`,
    )
    .join("\n");
}
