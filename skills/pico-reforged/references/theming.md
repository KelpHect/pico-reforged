# Tokens, themes and dark mode

## Cascade layers

All framework rules are inside `@layer pico.tokens, pico.theme, pico.core, pico.extras, pico.utilities`. CSS you write outside a layer beats all of them, without `!important`.

## Colors

Colors are OKLCH. Light and dark values are written once with `light-dark()`, resolved by `color-scheme`. `html` follows the system. `data-theme="light"` or `data-theme="dark"` on any element forces its scheme, and nested elements can differ from the page.

The tokens are declared on `:root, :host, [data-theme]`. An element with `data-theme` declares them again, so a token override should use the same selectors:

```css
:root,
[data-theme] {
  --pico-primary-background: oklch(0.55 0.19 25);
}
```

## What to override

Semantic tokens (a few of many, the rest is in `ai/tokens.json`):

- Page: `--pico-background-color`, `--pico-color`, `--pico-muted-color`, `--pico-muted-border-color`.
- Primary set (a theme defines these nine): `--pico-primary`, `--pico-primary-background`, `--pico-primary-underline`, `--pico-primary-hover`, `--pico-primary-hover-background`, `--pico-primary-focus`, `--pico-primary-inverse`, `--pico-text-selection-color`, `--pico-switch-thumb-box-shadow`. Aliases such as `--pico-primary-border` follow them.
- Secondary and contrast have the same shape (`--pico-secondary-background`, `--pico-contrast-inverse` and so on).
- Forms: `--pico-form-element-background-color`, `-border-color`, `-invalid-border-color`, `-valid-border-color`.
- Surfaces: `--pico-card-background-color`, `--pico-dropdown-background-color`, `--pico-modal-overlay-background-color`.
- Size and shape: `--pico-spacing`, `--pico-border-radius`, `--pico-border-width`, `--pico-outline-width`, `--pico-transition`, `--pico-line-height`, `--pico-font-family`.
- Palette, only in `pico.colors.css`: `--pico-color-<hue>-<step>`, for example `--pico-color-azure-550`.

Each opt-in extra has its own tokens named `--pico-<extra>-*` (for example `--pico-tabs-indicator-color`, `--pico-badge-background-color`). The list per extra is under `tokens` in `ai/components.json`.

## Themes

20 built-in themes pick palette steps for the primary set. Choose one at build time with the file name or `@pico { theme: jade; }`. A custom theme from one color is computed by the compiler: `@pico { theme: #e5484d; }`, `pico-reforged build --theme "#e5484d"`, or `theme: { color: "#e5484d" }` in the compiler API. It builds a 19-step scale from that hue and chroma and picks black or white for the inverse text.

Without the compiler, set the primary tokens yourself. Relative color syntax derives a set from one brand color:

```css
:root {
  --brand: oklch(0.62 0.19 25);
  --pico-primary-background: oklch(from var(--brand) 0.55 c h);
  --pico-primary-hover-background: oklch(from var(--brand) 0.48 c h);
  --pico-primary-focus: oklch(from var(--brand) 0.62 c h / 0.5);
}
```

Relative color syntax needs Chrome 119, Firefox 128 or Safari 16.4 or newer.

## tokens.json

`ai/tokens.json` (import `@rusticstack/pico-reforged/tokens.json`) lists the root tokens in the W3C Design Tokens format:

- Names are the property without `--pico-`: `color.primary-background`.
- `$value` is the light value. The dark value is in `$extensions["com.rusticstack.pico-reforged"].dark`, next to the `cssVar`.
- Groups: `color`, `dimension`, `number`, `font-family`, `font-weight`, `transition`, `shadow`, `palette`, `theme` (one per built-in theme) and `extras`.
- Values with no token type (percentages, icons, `calc()`) are under the root extension `cssOnly`, with the CSS as written.

## Responsive sizes

`--pico-font-size` and `--pico-container-max-width` change at 576, 768, 1024, 1280 and 1536px. Turn the font steps off with `responsive-typography: false`. `.container` is as wide as its parent below 576px.

## Motion

`--pico-transition` is `0.2s ease-in-out`. `transitions: false` in the build sets it to `0s` and removes the transition and animation declarations. Motion also stops for `prefers-reduced-motion: reduce`.
