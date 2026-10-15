// Neutral semantic color tokens, written once per token as [name, light, dark].
// Names are without the --pico- prefix. The order is the v2.1.1 order.
//
// Values:
//   ref('slate-500', 0.5)   palette step (or 'white' / 'black') with optional alpha
//   rgb(231, 234, 239.5)    sRGB literal, used where v2.1.1 built a color with mix()
//   ok(0.27, 0.012)         oklch literal on the neutral hue 265, optional alpha
//   'var(--pico-...)'       alias, written as is
//   stack(...layers)        a box-shadow, see below
// When light and dark are equal the generator writes the value without light-dark().

export type SchemeColor =
  | { ref: string; alpha?: number }
  | { rgb: [number, number, number]; alpha?: number };
export type SchemeValue = SchemeColor | string;
export type SchemeRow = [name: string, light: SchemeValue, dark: SchemeValue];

const ref = (name: string, alpha?: number): SchemeColor => ({
  ref: name,
  ...(alpha === undefined ? {} : { alpha }),
});
const rgb = (r: number, g: number, b: number, alpha?: number): SchemeColor => ({
  rgb: [r, g, b],
  ...(alpha === undefined ? {} : { alpha }),
});
const ok = (l: number, c: number, h = 265, a?: number): string =>
  a === undefined ? `oklch(${l} ${c} ${h})` : `oklch(${l} ${c} ${h} / ${a})`;
const v = (name: string): string => `var(--pico-${name})`;

// A box-shadow layer: geometry shared by both schemes, one color per scheme. light-dark() only
// takes colors, so the scheme switch happens per layer color, never on the whole value.
type ShadowLayer = [
  x: string,
  y: string,
  blur: string,
  spread: string,
  light: string,
  dark: string,
];
const stack = (...layers: ShadowLayer[]): string =>
  layers
    .map(([x, y, blur, spread, l, d]) => {
      const color = l === d ? l : `light-dark(${l}, ${d})`;
      return `${x} ${y} ${blur} ${spread} ${color}`;
    })
    .join(", ");

// 1px ring that outlines cards and menus in both schemes, so they need no CSS border
const ring: ShadowLayer = ["0", "0", "0", "0.0625rem", ok(0.2, 0.02, 265, 0.07), ok(1, 0, 0, 0.1)];
const boxShadow = stack(
  ring,
  ["0", "0.0625rem", "0.125rem", "0", ok(0.2, 0.02, 265, 0.05), ok(0, 0, 0, 0.3)],
  ["0", "0.25rem", "0.75rem", "-0.25rem", ok(0.2, 0.02, 265, 0.08), ok(0, 0, 0, 0.35)],
);
const dropdownShadow = stack(
  ring,
  ["0", "0.125rem", "0.25rem", "-0.0625rem", ok(0.2, 0.02, 265, 0.06), ok(0, 0, 0, 0.3)],
  ["0", "0.75rem", "2rem", "-0.5rem", ok(0.2, 0.02, 265, 0.18), ok(0, 0, 0, 0.5)],
);

export const scheme: SchemeRow[] = [
  ["background-color", ok(1, 0, 0), ok(0.165, 0.006)],

  // Text
  ["color", ok(0.27, 0.012), ok(0.92, 0.005)],
  ["muted-color", ok(0.5, 0.016), ok(0.71, 0.012)],
  ["muted-border-color", ok(0.925, 0.005), ok(0.29, 0.008)],

  // Primary aliases (the primary colors themselves live in src/themes/)
  ["primary-border", v("primary-background"), v("primary-background")],
  ["primary-hover-border", v("primary-hover-background"), v("primary-hover-background")],
  ["primary-hover-underline", v("primary-hover"), v("primary-hover")],
  // Selected and current tints (tabs, app shell nav, table rows). Mixed into transparent so they
  // work on any surface. They mix the text step of the primary, which stays visible on a dark page
  // and on light themes like amber, where the filled step barely lifts off.
  [
    "primary-subtle-background",
    "color-mix(in oklab, var(--pico-primary) 10%, transparent)",
    "color-mix(in oklab, var(--pico-primary) 20%, transparent)",
  ],
  [
    "primary-subtle-border",
    "color-mix(in oklab, var(--pico-primary) 28%, transparent)",
    "color-mix(in oklab, var(--pico-primary) 40%, transparent)",
  ],

  // Secondary
  ["secondary", ref("slate-550"), ref("zinc-350")],
  ["secondary-background", ok(0.955, 0.004), ok(0.27, 0.008)],
  ["secondary-border", ok(0.88, 0.006), ok(0.34, 0.008)],
  ["secondary-underline", ref("slate-550", 0.5), ref("zinc-350", 0.5)],
  ["secondary-hover", ref("slate-650"), ref("zinc-250")],
  ["secondary-hover-background", ok(0.925, 0.005), ok(0.31, 0.008)],
  ["secondary-hover-border", ok(0.84, 0.008), ok(0.38, 0.008)],
  ["secondary-hover-underline", v("secondary-hover"), v("secondary-hover")],
  ["secondary-focus", ok(0.57, 0.025), ok(0.74, 0.02)],
  ["secondary-inverse", ok(0.24, 0.012), ok(0.95, 0.004)],

  // Contrast
  ["contrast", ref("slate-900"), ref("slate-100")],
  ["contrast-background", ok(0.22, 0.012), ok(0.93, 0.005)],
  ["contrast-border", v("contrast-background"), v("contrast-background")],
  ["contrast-underline", ref("slate-900", 0.5), ref("slate-100", 0.5)],
  ["contrast-hover", ref("black"), ref("white")],
  ["contrast-hover-background", ok(0.3, 0.012), ok(1, 0, 0)],
  ["contrast-hover-border", v("contrast-hover-background"), v("contrast-hover-background")],
  // v2.1.1 pointed the light one at secondary-hover and the dark one at contrast-hover. Kept.
  ["contrast-hover-underline", v("secondary-hover"), v("contrast-hover")],
  ["contrast-focus", ok(0.22, 0.012), ok(0.93, 0.005)],
  ["contrast-inverse", ok(1, 0, 0), ok(0.165, 0.006)],

  ["box-shadow", boxShadow, boxShadow],

  // Typography
  ["h1-color", ok(0.2, 0.012), ok(0.97, 0.004)],
  ["h2-color", ok(0.2, 0.012), ok(0.97, 0.004)],
  ["h3-color", ok(0.2, 0.012), ok(0.97, 0.004)],
  ["h4-color", ok(0.2, 0.012), ok(0.97, 0.004)],
  ["h5-color", ok(0.27, 0.012), ok(0.92, 0.005)],
  ["h6-color", ok(0.4, 0.014), ok(0.8, 0.008)],
  ["mark-background-color", rgb(252.5, 230.5, 191.5), ref("azure-750")],
  ["mark-color", ref("zinc-950"), ref("white")],
  ["ins-color", rgb(28.5, 105.5, 84), rgb(98, 175, 154)],
  ["del-color", rgb(136, 56.5, 53), rgb(205.5, 126, 123)],
  ["blockquote-border-color", v("muted-border-color"), v("muted-border-color")],
  ["blockquote-footer-color", v("muted-color"), v("muted-color")],

  // Table
  ["table-border-color", v("muted-border-color"), v("muted-border-color")],
  ["table-row-stripped-background-color", ok(0.5, 0.01, 265, 0.035), ok(1, 0, 0, 0.05)],

  // Code
  ["code-background-color", ok(0.967, 0.003), ok(0.215, 0.007)],
  ["code-color", ok(0.36, 0.014), ok(0.8, 0.01)],
  ["code-kbd-background-color", v("color"), v("color")],
  ["code-kbd-color", v("background-color"), v("background-color")],

  // Form elements
  ["form-element-background-color", ok(1, 0, 0), ok(0.195, 0.007)],
  ["form-element-selected-background-color", ok(0.955, 0.004), ok(0.27, 0.008)],
  ["form-element-border-color", ok(0.66, 0.012), ok(0.52, 0.01)],
  ["form-element-color", ok(0.2, 0.012), ok(0.95, 0.004)],
  ["form-element-placeholder-color", v("muted-color"), v("muted-color")],
  ["form-element-active-background-color", ok(1, 0, 0), ok(0.21, 0.007)],
  // The focus color reaches 3:1 on the page in every theme, the filled primary may not (amber)
  ["form-element-active-border-color", v("primary-focus"), v("primary-focus")],
  ["form-element-focus-color", v("primary-focus"), v("primary-focus")],
  ["form-element-invalid-border-color", rgb(183.5, 105.5, 106.5), rgb(149.5, 74, 80)],
  ["form-element-invalid-active-border-color", rgb(200.25, 79.25, 72.25), rgb(183.25, 63.5, 59)],
  [
    "form-element-invalid-focus-color",
    v("form-element-invalid-active-border-color"),
    v("form-element-invalid-active-border-color"),
  ],
  ["form-element-valid-border-color", rgb(76, 154.5, 137.5), rgb(42, 123, 111)],
  ["form-element-valid-active-border-color", rgb(39, 152.75, 118.75), rgb(22, 137, 105.5)],
  [
    "form-element-valid-focus-color",
    v("form-element-valid-active-border-color"),
    v("form-element-valid-active-border-color"),
  ],

  // Switch
  ["switch-background-color", ok(0.66, 0.012), ok(0.52, 0.01)],
  ["switch-checked-background-color", v("primary-background"), v("primary-background")],
  ["switch-color", ref("white"), ref("white")],

  // Range
  ["range-border-color", ok(0.9, 0.006), ok(0.38, 0.008)],
  ["range-active-border-color", ok(0.85, 0.008), ok(0.44, 0.008)],
  ["range-thumb-border-color", v("background-color"), v("background-color")],
  ["range-thumb-color", v("primary-background"), v("primary-background")],
  ["range-thumb-active-color", v("primary-background"), v("primary-background")],

  // Accordion
  ["accordion-border-color", v("muted-border-color"), v("muted-border-color")],
  ["accordion-active-summary-color", v("primary-hover"), v("primary-hover")],
  ["accordion-close-summary-color", v("color"), v("color")],
  ["accordion-open-summary-color", v("color"), v("color")],

  // Card
  ["card-background-color", v("background-color"), ok(0.215, 0.007)],
  ["card-border-color", v("muted-border-color"), ok(0.32, 0.008)],
  ["card-box-shadow", v("box-shadow"), v("box-shadow")],
  ["card-sectioning-background-color", ok(0.985, 0.002), ok(0.24, 0.008)],

  // Dropdown
  ["dropdown-background-color", ok(1, 0, 0), ok(0.235, 0.008)],
  ["dropdown-border-color", ok(0.92, 0.005), ok(0.32, 0.008)],
  ["dropdown-box-shadow", dropdownShadow, dropdownShadow],
  ["dropdown-color", v("color"), v("color")],
  ["dropdown-hover-background-color", ok(0.965, 0.004), ok(0.29, 0.008)],

  // Modal
  ["modal-overlay-background-color", ok(0.2, 0.02, 265, 0.4), ok(0, 0, 0, 0.6)],

  // Progress
  ["progress-background-color", ok(0.925, 0.005), ok(0.27, 0.008)],
  ["progress-color", v("primary-background"), v("primary-background")],

  // Tooltip
  ["tooltip-background-color", ok(0.24, 0.012), ok(0.3, 0.01)],
  ["tooltip-color", ok(1, 0, 0), ok(0.95, 0.004)],
];
