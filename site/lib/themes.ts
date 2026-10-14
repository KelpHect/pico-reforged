// Swatch colors are the --pico-primary-background value of each src/themes file.
export const DEFAULT_THEME = "azure";

export const THEMES = [
  { name: "amber", swatch: "oklch(0.8403 0.1724 84.08)" },
  { name: "azure", swatch: "oklch(0.529 0.1254 242.05)" },
  { name: "blue", swatch: "oklch(0.5291 0.2045 262.05)" },
  { name: "cyan", swatch: "oklch(0.5189 0.0878 194.79)" },
  { name: "fuchsia", swatch: "oklch(0.5507 0.2143 346.23)" },
  { name: "green", swatch: "oklch(0.5526 0.1632 138.19)" },
  { name: "grey", swatch: "oklch(0.7412 0 0)" },
  { name: "indigo", swatch: "oklch(0.5084 0.1969 278.11)" },
  { name: "jade", swatch: "oklch(0.5116 0.1145 160.67)" },
  { name: "lime", swatch: "oklch(0.8116 0.2028 124.6)" },
  { name: "orange", swatch: "oklch(0.583 0.1868 36.08)" },
  { name: "pink", swatch: "oklch(0.5817 0.2122 8.21)" },
  { name: "pumpkin", swatch: "oklch(0.7652 0.1752 62.57)" },
  { name: "purple", swatch: "oklch(0.5087 0.1833 320.69)" },
  { name: "red", swatch: "oklch(0.5416 0.1886 29.8)" },
  { name: "sand", swatch: "oklch(0.8265 0.0255 91.65)" },
  { name: "slate", swatch: "oklch(0.4852 0.0465 264.66)" },
  { name: "violet", swatch: "oklch(0.5036 0.1892 298.49)" },
  { name: "yellow", swatch: "oklch(0.8911 0.186 103.19)" },
  { name: "zinc", swatch: "oklch(0.5268 0.0236 264.35)" },
] as const;

export type ThemeName = (typeof THEMES)[number]["name"];
