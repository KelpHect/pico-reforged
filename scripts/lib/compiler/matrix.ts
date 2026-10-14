import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { DEFAULT_THEME, EXTRAS, THEMES, packageInfo } from "./config.ts";
import { compileBoth } from "./compile.ts";
import type { CompileOptions, CompileStats } from "./types.ts";

type Variant = {
  /** File name stem, as in v2.1.1. */
  stem: string;
  options: CompileOptions;
  /** v2.1.1 never published the default-theme file of these two. */
  noDefaultTheme?: boolean;
};

export const MATRIX_VARIANTS: Variant[] = [
  { stem: "pico", options: {} },
  { stem: "pico.classless", options: { entry: "classless" } },
  { stem: "pico.conditional", options: { scope: ".pico" } },
  {
    stem: "pico.classless.conditional",
    options: { entry: "classless", scope: ".pico" },
    noDefaultTheme: true,
  },
  { stem: "pico.fluid.classless", options: { entry: "classless", fluid: true } },
  {
    stem: "pico.fluid.classless.conditional",
    options: { entry: "classless", fluid: true, scope: ".pico" },
    noDefaultTheme: true,
  },
];

export function banner(): string {
  const { version } = packageInfo();
  return `/*!
 * Pico Reforged v${version} (https://pico.rusticstack.com)
 * Copyright 2019-2025 Lucas Larroche and the Pico CSS authors
 * Copyright 2026 rusticstack
 * Licensed under MIT
 */`;
}

/** Every file name the matrix writes, in the order it writes them. */
export function matrixNames(): string[] {
  const names: string[] = [];
  for (const variant of MATRIX_VARIANTS) {
    for (const theme of THEMES) {
      const isDefault = theme === DEFAULT_THEME;
      if (isDefault && variant.noDefaultTheme) continue;
      const stem = isDefault ? variant.stem : `${variant.stem}.${theme}`;
      names.push(`${stem}.css`, `${stem}.min.css`);
    }
  }
  names.push("pico.colors.css", "pico.colors.min.css");
  names.push("pico.extras.css", "pico.extras.min.css");
  for (const extra of EXTRAS) names.push(`extras/${extra}.css`, `extras/${extra}.min.css`);
  return names;
}

/**
 * Writes the whole v2.1.1 file set into outDir, plus the opt-in extras: pico.extras(.min).css
 * with all of them and extras/<name>(.min).css for each one. Extras files are layered and carry
 * their own tokens, so they load on their own after pico.css. Returns the stats of each file.
 */
export async function buildMatrix(
  outDir: string,
): Promise<{ name: string; stats: CompileStats }[]> {
  await mkdir(outDir, { recursive: true });
  const header = banner();
  const written: { name: string; stats: CompileStats }[] = [];

  const jobs: { stem: string; options: CompileOptions }[] = [];
  for (const variant of MATRIX_VARIANTS) {
    for (const theme of THEMES) {
      const isDefault = theme === DEFAULT_THEME;
      if (isDefault && variant.noDefaultTheme) continue;
      jobs.push({
        stem: isDefault ? variant.stem : `${variant.stem}.${theme}`,
        options: { ...variant.options, theme },
      });
    }
  }
  jobs.push({ stem: "pico.colors", options: { entry: "colors" } });
  jobs.push({ stem: "pico.extras", options: { entry: "extras", extras: true } });
  for (const extra of EXTRAS) {
    jobs.push({ stem: `extras/${extra}`, options: { entry: "extras", extras: [extra] } });
  }
  await mkdir(join(outDir, "extras"), { recursive: true });

  for (const job of jobs) {
    const { plain, min } = await compileBoth({ ...job.options, banner: header });
    await writeFile(join(outDir, `${job.stem}.css`), plain.css);
    await writeFile(join(outDir, `${job.stem}.min.css`), min.css);
    written.push(
      { name: `${job.stem}.css`, stats: plain.stats },
      { name: `${job.stem}.min.css`, stats: min.stats },
    );
  }
  return written;
}
