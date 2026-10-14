// The 20 themes, taken from scss/themes/default/_theme-colors.scss.
//
// Every theme uses the same palette steps for text, hover and focus colors. Only the filled
// background step, the hover background step and the inverse (text on a filled background)
// differ. A theme maps to these tokens:
//
//   --pico-text-selection-color  hue-<selection> at selectionAlpha
//   --pico-primary               hue-<primary>
//   --pico-primary-background    hue-<background>
//   --pico-primary-underline     hue-<primary> at 0.5
//   --pico-primary-hover         hue-<hover>
//   --pico-primary-hover-background  hue-<hoverBackground>
//   --pico-primary-focus         hue-<focus> at focusAlpha
//   --pico-primary-inverse       white or black
//   --pico-switch-thumb-box-shadow  soft shadow when the inverse is black, none otherwise

export const defaultTheme = "azure";

// Shared by every theme. Azure is the model the custom theme builder follows too.
export const steps = {
  light: {
    selection: 400,
    selectionAlpha: 0.25,
    primary: 550,
    underlineAlpha: 0.5,
    hover: 650,
    focus: 400,
    focusAlpha: 0.5,
  },
  dark: {
    selection: 350,
    selectionAlpha: 0.1875,
    primary: 350,
    underlineAlpha: 0.5,
    hover: 250,
    focus: 350,
    focusAlpha: 0.375,
  },
};

// Per theme: filled background and hover background steps for each scheme, and the inverse
// color. A hover background can be an { rgb } literal where v2.1.1 used mix().
export type Step = number | { rgb: [number, number, number] };
export type SchemeSteps = { background: Step; hoverBackground: Step };
export type Inverse = "white" | "black";
export type ThemeDef = {
  inverse: Inverse | { light: Inverse; dark: Inverse };
  light: SchemeSteps;
  dark: SchemeSteps;
};

const same = (inverse: Inverse, light: SchemeSteps, dark: SchemeSteps): ThemeDef => ({
  inverse,
  light,
  dark,
});

export const themes: Record<string, ThemeDef> = {
  amber: same(
    "black",
    { background: 200, hoverBackground: 250 },
    { background: 200, hoverBackground: 150 },
  ),
  azure: same(
    "white",
    { background: 550, hoverBackground: 600 },
    { background: 550, hoverBackground: 500 },
  ),
  blue: same(
    "white",
    { background: 550, hoverBackground: 600 },
    { background: 550, hoverBackground: 500 },
  ),
  cyan: same(
    "white",
    { background: 550, hoverBackground: 600 },
    { background: 550, hoverBackground: 500 },
  ),
  fuchsia: same(
    "white",
    { background: 550, hoverBackground: 600 },
    { background: 550, hoverBackground: 500 },
  ),
  green: same(
    "white",
    { background: 500, hoverBackground: 550 },
    { background: 500, hoverBackground: 450 },
  ),
  grey: same(
    "black",
    { background: 300, hoverBackground: 350 },
    { background: 300, hoverBackground: 250 },
  ),
  indigo: same(
    "white",
    { background: 600, hoverBackground: 650 },
    { background: 600, hoverBackground: 550 },
  ),
  jade: same(
    "white",
    { background: 550, hoverBackground: 600 },
    { background: 550, hoverBackground: 500 },
  ),
  lime: same(
    "black",
    { background: 200, hoverBackground: 250 },
    { background: 200, hoverBackground: 150 },
  ),
  orange: same(
    "white",
    { background: 500, hoverBackground: 550 },
    { background: 500, hoverBackground: 450 },
  ),
  pink: same(
    "white",
    { background: 500, hoverBackground: 550 },
    { background: 500, hoverBackground: 450 },
  ),
  pumpkin: same(
    "black",
    { background: 300, hoverBackground: 350 },
    { background: 300, hoverBackground: 250 },
  ),
  purple: same(
    "white",
    { background: 600, hoverBackground: 650 },
    { background: 600, hoverBackground: 550 },
  ),
  red: same(
    "white",
    { background: 550, hoverBackground: 600 },
    { background: 550, hoverBackground: 500 },
  ),
  sand: same(
    "black",
    { background: 200, hoverBackground: 250 },
    { background: 200, hoverBackground: 150 },
  ),
  slate: same(
    "white",
    { background: 600, hoverBackground: 650 },
    { background: 600, hoverBackground: 550 },
  ),
  violet: same(
    "white",
    { background: 600, hoverBackground: 650 },
    { background: 600, hoverBackground: 550 },
  ),
  // mix(yellow-100, yellow-50) in v2.1.1, as an sRGB literal
  yellow: same(
    "black",
    { background: 100, hoverBackground: 150 },
    { background: 100, hoverBackground: { rgb: [247.5, 232, 96.5] } },
  ),
  zinc: same(
    "white",
    { background: 550, hoverBackground: 600 },
    { background: 550, hoverBackground: 500 },
  ),
};
