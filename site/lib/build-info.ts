import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { gzipSync } from "node:zlib";

// Values computed at build time from the repository.

const root = join(process.cwd(), "..");

function pkg(): { version: string } {
  for (const file of [join(root, "package.json"), join(process.cwd(), "node_modules", "@rusticstack", "pico-reforged", "package.json")]) {
    if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8"));
  }
  return { version: "1.0.0" };
}

export const VERSION = pkg().version;
/** "v1.0" for the version pill. */
export const VERSION_LABEL = `v${VERSION.split(".").slice(0, 2).join(".")}`;

/** Gzip size of a built file in public/css, in kB with one decimal. */
export function gzipKb(name = "pico.min.css"): string {
  const file = join(process.cwd(), "public", "css", name);
  if (!existsSync(file)) return "12";
  const size = gzipSync(readFileSync(file), { level: 9 }).length;
  return (size / 1000).toFixed(1);
}

/** Last commit date (YYYY-MM-DD) of a file, or null when git is not available. */
export function lastUpdated(file: string): string | null {
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%cs", "--", relative(process.cwd(), file)], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return out || null;
  } catch {
    return null;
  }
}
