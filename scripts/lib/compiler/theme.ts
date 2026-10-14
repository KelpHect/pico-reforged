import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildTheme } from "../themes.ts";
import { DEFAULT_THEME, SRC, THEMES } from "./config.ts";
import type { ThemeOption } from "./types.ts";

function readSrc(path: string): string {
  return readFileSync(`${SRC}/${path}`, "utf8");
}

/**
 * The CSS that replaces the theme import of the entry.
 * - built-in name: src/themes/<name>.css
 * - { color } or { hue, chroma }: generated with buildTheme
 * - path to a CSS file: the default theme followed by the file, so it only has to override tokens
 */
export function themeSource(theme: ThemeOption): string {
  if (typeof theme === "string") {
    if (THEMES.includes(theme)) return readSrc(`themes/${theme}.css`);
    const file = resolve(theme);
    if (existsSync(file)) {
      return `${readSrc(`themes/${DEFAULT_THEME}.css`)}\n${readFileSync(file, "utf8")}`;
    }
    throw new Error(
      `Unknown theme "${theme}". Use one of ${THEMES.join(", ")}, { color }, { hue, chroma } or a CSS file path.`,
    );
  }
  return buildTheme(theme).css;
}
