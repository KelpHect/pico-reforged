// Neutral semantic color tokens, written once per token as [name, light, dark].
// Names are without the --pico- prefix. The order is the v2.1.1 order.
//
// Values:
//   ref('slate-500', 0.5)   palette step (or 'white' / 'black') with optional alpha
//   rgb(231, 234, 239.5)    sRGB literal for colors v2.1.1 built with mix(), copied from the
//                           compiled test/reference/v2.1.1/pico.css
//   'var(--pico-...)'       alias, written as is
//   shadow(color)           the layered box-shadow, with the given shadow color
// When light and dark are equal the generator writes the value without light-dark().

export type SchemeColor =
  | { ref: string; alpha?: number }
  | { rgb: [number, number, number]; alpha?: number }
  | { shadow: SchemeColor };
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
const shadow = (color: SchemeColor): SchemeColor => ({ shadow: color });
const v = (name: string): string => `var(--pico-${name})`;

// [x offset, y offset, blur, alpha, spread] of each box-shadow layer in rem, from the v2.1.1
// shadow() helper. The last layer is a 1px ring (no offset, no blur, 0.0625rem spread).
export const shadowLayers: [number, number, number, number, number][] = [
  [0.0145, 0.029, 0.174, 0.01698, 0],
  [0.0335, 0.067, 0.402, 0.024, 0],
  [0.0625, 0.125, 0.75, 0.03, 0],
  [0.1125, 0.225, 1.35, 0.036, 0],
  [0.2085, 0.417, 2.502, 0.04302, 0],
  [0.5, 1, 6, 0.06, 0],
  [0, 0, 0, 0.015, 0.0625],
];

export const scheme: SchemeRow[] = [
  ["background-color", ref("white"), rgb(19, 22.5, 30.5)],

  // Text
  ["color", ref("zinc-750"), ref("zinc-200")],
  ["muted-color", ref("zinc-550"), ref("zinc-400")],
  ["muted-border-color", rgb(231, 234, 239.5), ref("slate-850")],

  // Primary aliases (the primary colors themselves live in src/themes/)
  ["primary-border", v("primary-background"), v("primary-background")],
  ["primary-hover-border", v("primary-hover-background"), v("primary-hover-background")],
  ["primary-hover-underline", v("primary-hover"), v("primary-hover")],

  // Secondary
  ["secondary", ref("slate-550"), ref("zinc-350")],
  ["secondary-background", ref("slate-600"), ref("slate-600")],
  ["secondary-border", v("secondary-background"), v("secondary-background")],
  ["secondary-underline", ref("slate-550", 0.5), ref("zinc-350", 0.5)],
  ["secondary-hover", ref("slate-650"), ref("zinc-250")],
  ["secondary-hover-background", ref("slate-650"), ref("slate-550")],
  ["secondary-hover-border", v("secondary-hover-background"), v("secondary-hover-background")],
  ["secondary-hover-underline", v("secondary-hover"), v("secondary-hover")],
  ["secondary-focus", ref("slate-550", 0.25), ref("slate-350", 0.25)],
  ["secondary-inverse", ref("white"), ref("white")],

  // Contrast
  ["contrast", ref("slate-900"), ref("slate-100")],
  ["contrast-background", ref("slate-900"), ref("slate-50")],
  ["contrast-border", v("contrast-background"), v("contrast-background")],
  ["contrast-underline", ref("slate-900", 0.5), ref("slate-100", 0.5)],
  ["contrast-hover", ref("black"), ref("white")],
  ["contrast-hover-background", ref("black"), ref("white")],
  ["contrast-hover-border", v("contrast-hover-background"), v("contrast-hover-background")],
  // v2.1.1 pointed the light one at secondary-hover and the dark one at contrast-hover. Kept.
  ["contrast-hover-underline", v("secondary-hover"), v("contrast-hover")],
  ["contrast-focus", ref("slate-550", 0.25), ref("slate-150", 0.25)],
  ["contrast-inverse", ref("white"), ref("black")],

  ["box-shadow", shadow(ref("slate-400")), shadow(rgb(7, 8.5, 12))],

  // Typography
  ["h1-color", ref("zinc-800"), ref("zinc-50")],
  ["h2-color", ref("zinc-750"), ref("zinc-100")],
  ["h3-color", ref("zinc-700"), ref("zinc-200")],
  ["h4-color", ref("zinc-650"), ref("zinc-250")],
  ["h5-color", ref("zinc-600"), ref("zinc-300")],
  ["h6-color", ref("zinc-550"), ref("zinc-400")],
  ["mark-background-color", rgb(252.5, 230.5, 191.5), ref("azure-750")],
  ["mark-color", ref("zinc-950"), ref("white")],
  ["ins-color", rgb(28.5, 105.5, 84), rgb(98, 175, 154)],
  ["del-color", rgb(136, 56.5, 53), rgb(205.5, 126, 123)],
  ["blockquote-border-color", v("muted-border-color"), v("muted-border-color")],
  ["blockquote-footer-color", v("muted-color"), v("muted-color")],

  // Table
  ["table-border-color", v("muted-border-color"), v("muted-border-color")],
  ["table-row-stripped-background-color", ref("zinc-500", 0.0375), ref("zinc-500", 0.0375)],

  // Code
  ["code-background-color", rgb(243, 244.5, 246.75), rgb(26, 30.5, 40.25)],
  ["code-color", ref("zinc-550"), ref("zinc-400")],
  ["code-kbd-background-color", v("color"), v("color")],
  ["code-kbd-color", v("background-color"), v("background-color")],

  // Form elements
  ["form-element-background-color", rgb(251, 251.5, 252.25), rgb(28, 33, 43.5)],
  ["form-element-selected-background-color", ref("slate-100"), ref("slate-800")],
  ["form-element-border-color", ref("slate-150"), ref("slate-800")],
  ["form-element-color", ref("zinc-850"), ref("zinc-100")],
  ["form-element-placeholder-color", v("muted-color"), ref("zinc-400")],
  ["form-element-active-background-color", ref("white"), rgb(26, 30.5, 40.25)],
  ["form-element-active-border-color", v("primary-border"), v("primary-border")],
  ["form-element-focus-color", v("primary-border"), v("primary-border")],
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
  ["switch-background-color", ref("slate-200"), ref("slate-750")],
  ["switch-checked-background-color", v("primary-background"), v("primary-background")],
  ["switch-color", ref("white"), ref("white")],

  // Range
  ["range-border-color", ref("slate-100"), ref("slate-850")],
  ["range-active-border-color", ref("slate-200"), ref("slate-800")],
  ["range-thumb-border-color", v("background-color"), v("background-color")],
  ["range-thumb-color", v("secondary-background"), v("secondary-background")],
  ["range-thumb-active-color", v("primary-background"), v("primary-background")],

  // Accordion
  ["accordion-border-color", v("muted-border-color"), v("muted-border-color")],
  ["accordion-active-summary-color", v("primary-hover"), v("primary-hover")],
  ["accordion-close-summary-color", v("color"), v("color")],
  ["accordion-open-summary-color", v("muted-color"), v("muted-color")],

  // Card
  ["card-background-color", v("background-color"), ref("slate-900")],
  ["card-border-color", v("muted-border-color"), v("card-background-color")],
  ["card-box-shadow", v("box-shadow"), v("box-shadow")],
  ["card-sectioning-background-color", rgb(251, 251.5, 252.25), rgb(26, 30.5, 40.25)],

  // Dropdown
  ["dropdown-background-color", ref("white"), ref("slate-900")],
  ["dropdown-border-color", ref("slate-50"), ref("slate-850")],
  ["dropdown-box-shadow", v("box-shadow"), v("box-shadow")],
  ["dropdown-color", v("color"), v("color")],
  ["dropdown-hover-background-color", ref("slate-50"), ref("slate-850")],

  // Modal
  ["modal-overlay-background-color", rgb(232, 234, 237, 0.75), rgb(7.5, 8.5, 10, 0.75)],

  // Progress
  ["progress-background-color", ref("slate-100"), ref("slate-850")],
  ["progress-color", v("primary-background"), v("primary-background")],

  // Tooltip
  ["tooltip-background-color", v("contrast-background"), v("contrast-background")],
  ["tooltip-color", v("contrast-inverse"), v("contrast-inverse")],
];
