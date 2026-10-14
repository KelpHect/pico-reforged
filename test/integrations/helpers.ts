import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll } from "vite-plus/test";

/** A throwaway project folder, removed when the test file ends. */
export function makeProject(files: Record<string, string | Buffer>): string {
  const dir = mkdtempSync(join(tmpdir(), "pico-int-"));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));
  for (const [name, content] of Object.entries(files)) write(dir, name, content);
  return dir.replaceAll("\\", "/");
}

export function write(dir: string, name: string, content: string | Buffer): void {
  const file = join(dir, name);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

/** Names of the rule headers in a stylesheet, whitespace squashed. */
export function selectorsOf(css: string): string[] {
  return [...css.replace(/\s+/g, " ").matchAll(/(?:^|[{};])\s*([^{};@\s][^{};]*)\{/g)].map((m) =>
    (m[1] as string).trim(),
  );
}

/** True when some rule header in the stylesheet contains the text. */
export const hasSelector = (css: string, text: string): boolean =>
  selectorsOf(css).some((s) => s.includes(text));
