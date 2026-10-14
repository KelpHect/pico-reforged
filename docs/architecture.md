# Architecture

This is the working design for Pico Reforged. The reasons behind it are in [ADR 0001](adr/0001-plain-css-rewrite.md).

## Repository layout

```
src/                     CSS source, plain CSS, loadable in a current browser without a build
  pico.css               full entry
  pico.classless.css     classless entry
  pico.colors.css        color utility entry
  layers.css             layer order statement, imported first by every entry
  tokens/
    core.css             fonts, spacing, radius, sizes, icons, responsive root size, container widths
    scheme.css           neutral semantic colors (generated, light-dark())
    scheme-images.css    the few non-color values that differ between light and dark
    palette.css          full OKLCH palette (generated, used by pico.colors.css only)
  themes/
    azure.css ...        one file per theme, primary color tokens only (generated)
  reset/                 document.css (html, body defaults)
  layout/                landmarks, section, container, semantic-container, grid, overflow-auto
  content/               typography, link, button, table, embedded, code, figure, misc
  forms/                 basics, checkbox-radio-switch, input-color, input-date, input-file, input-range, input-search
  components/            accordion, card, dropdown, group, loading, modal, nav, progress, tooltip, popover
  utilities/             accessibility, reduce-motion
  colors/                color and background utility classes (generated)
scripts/
  build.ts               CLI entry (`pico-reforged build`)
  lib/                   compiler pieces (bundle, classless filter, scope, purge, themes)
  data/                  palette.json, themes.ts, scheme.ts (the inputs to generation)
  generate.ts            writes src/tokens/palette.css, scheme.css, src/themes/*.css, src/colors/*.css
css/                     build output, same file names as v2.1.1 so CDN paths keep working
test/
  reference/v2.1.1/      frozen upstream build output
  api/                   baseline.json (v2.1.1 public surface) and the coverage check
  fixtures/              kitchen-sink.html and friends, used by examples and visual tests
  visual/                Playwright screenshot and pixel diff harness
docs/                    architecture, ADRs, customization, browser support, migration
examples/                small pages that show usage (CDN, modular, custom theme, popover)
site/                    documentation website, deployed to pico.rusticstack.com
```

Module file names match the v2.1.1 `$modules` keys, so `components/modal` in a config means `src/components/modal.css`.

## Cascade layers

Every framework rule is inside the `pico` layer. `src/layers.css` declares the order once:

```css
@layer pico.tokens, pico.theme, pico.core, pico.utilities;
```

Rules:

- Module files contain no `@layer` blocks. Entry files assign layers when importing:
  `@import url("./content/link.css") layer(pico.core);`
- `pico.tokens` holds `src/tokens/*`. `pico.theme` holds one theme file. Putting themes after tokens lets a theme override any neutral token.
- `pico.core` holds every module, imported in the v2.1.1 order. Element-scoped token overrides that v2.1.1 kept in `themes/default/_styles.scss` (for example `h1 { --pico-font-size: 2rem }`) sit at the top of the module that owns them.
- `pico.utilities` holds the `.pico-color-*` and `.pico-background-*` classes from `pico.colors.css`, so they win over any module rule.
- Anything a user writes outside a layer beats all of Pico. A user can also slot their own layers before or after `pico`, or add rules to `pico.core` itself.

The first design gave each module category its own sublayer (reset, layout, content, forms, components, utilities). That broke parity. v2.1.1 relies on specificity between modules, for example `[type=submit]` button rules beating the generic `input` rule from forms. A later layer wins regardless of specificity, so every one of those cases flipped. One ordered layer for all modules keeps the v2.1.1 cascade exactly, and users still get the main benefit, which is that unlayered CSS always wins.

## Color system

### Palette

`scripts/data/palette.json` holds the 20 hues (amber, azure, blue, cyan, fuchsia, green, grey, indigo, jade, lime, orange, pink, pumpkin, purple, red, sand, slate, violet, yellow, zinc) with 19 steps each (50 to 950 by 50). Each value is an OKLCH triple, converted from the v2.1.1 hex values with culori. Round L to 4 decimals, C to 4 decimals and H to 2 decimals. Check that each one round-trips to the original hex.

Token names stay the same as v2.1.1: `--pico-color-azure-550`, `--pico-color-azure` (the 550 alias), `--pico-color-black`, `--pico-color-white`.

### Semantic tokens

Every semantic color token from v2.1.1 keeps its name (`--pico-background-color`, `--pico-primary-hover-background`, `--pico-form-element-invalid-border-color` and so on). Each one is written once:

```css
:root, :host {
  --pico-muted-color: light-dark(oklch(0.5517 0.0283 264.36), oklch(0.6214 0.0255 264.53));
}
```

- Values are inlined OKLCH literals, not `var(--pico-color-slate-500)`. That keeps the default build from shipping the whole palette. The generator writes the literals from palette references in `scripts/data/scheme.ts` and `scripts/data/themes.ts`, so nothing is copied by hand.
- Alpha uses the slash syntax: `oklch(0.5517 0.0283 264.36 / 0.5)`.
- Colors that v2.1.1 built with `mix()` are converted from the computed v2.1.1 value.
- Aliases stay aliases (`--pico-primary-border: var(--pico-primary-background)`).

### Light and dark

```css
:root, :host { color-scheme: light dark; }
[data-theme="light"] { color-scheme: light; }
[data-theme="dark"] { color-scheme: dark; }
```

Natively, `light-dark()` inside a custom property resolves against the `color-scheme` of the element that uses the variable. The compiler's lowered version (`var(--lightningcss-light, a) var(--lightningcss-dark, b)`) resolves where the variable is declared instead. That's why `scheme.css` and the theme files declare their tokens on `:root, :host, [data-theme]` and not just `:root`. The values get recomputed on every `[data-theme]` subtree, and nested themes work in both native and lowered builds. Lightning CSS 1.33 lowers `light-dark()` and OKLCH (to hex plus `lab()` inside `@supports`) for the `defaults` targets, and that was checked before this design was fixed.

`light-dark()` only takes colors. The few scheme-dependent values that are not plain colors (the valid and invalid icon data URIs, the white-icon `filter` on contrast buttons) live in `src/tokens/scheme-images.css`, using this selector set for dark:

```css
[data-theme="dark"] { ... }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ... } }
```

Shadows with colors inside (`--pico-box-shadow`, `--pico-switch-thumb-box-shadow`) put `light-dark()` on the color part, so they stay in `scheme.css`.

### Themes

`scripts/data/themes.ts` maps each of the 20 themes to palette steps for light and dark, taken from `scss/themes/default/_theme-colors.scss`. The generator writes `src/themes/<name>.css` with the primary tokens:

```
--pico-text-selection-color  --pico-primary  --pico-primary-background  --pico-primary-underline
--pico-primary-hover  --pico-primary-hover-background  --pico-primary-focus  --pico-primary-inverse
--pico-switch-thumb-box-shadow
```

Azure is the default theme, as before.

### Custom themes from one color

The compiler accepts `theme: { color: "#e5484d" }` or `theme: { hue: 25, chroma: 0.19 }`. It builds a 19-step scale with that hue and chroma, using the lightness curve of the azure scale and clamping chroma to the sRGB gamut, then applies the azure step mapping. Inverse text picks black or white by contrast.

At runtime, without the compiler, `examples/custom-theme.html` shows the same idea with relative color syntax:

```css
:root {
  --brand: oklch(0.62 0.19 25);
  --pico-primary: light-dark(oklch(from var(--brand) 0.5 c h), oklch(from var(--brand) 0.75 c h));
}
```

## Modules and builds

### Entries

`src/pico.css` imports, in order: `layers.css`, the tokens, `themes/azure.css`, then every module in the v2.1.1 order. `src/pico.classless.css` is the same file list plus `layout/semantic-container.css`. The difference between the two comes from the compiler's classless filter.

### Build switches

The v2.1.1 Sass switches become compiler options:

| v2.1.1 Sass | Reforged config | How it works |
| --- | --- | --- |
| `$modules` | `modules` | files are left out of the bundle |
| `$theme-color` | `theme` | picks a file in `src/themes/` or generates one |
| `$enable-classes: false` | `classes: false` | drops every selector that needs a class, except classes inside `:not()` |
| `$enable-semantic-container` | `semanticContainer` | adds `layout/semantic-container.css` |
| `$enable-viewport: false` | `fluid: true` | sets `--pico-container-max-width: 100%` after the breakpoint values |
| `$parent-selector: ".pico"` | `scope: ".pico"` | prefixes selectors, leaves `:root`, `:host` and `html` rules on the root |
| `$enable-responsive-typography` | `responsiveTypography` | drops the root font size breakpoints |
| `$enable-responsive-spacings` | `responsiveSpacings` | adds `layout/responsive-spacings.css` |
| `$enable-transitions: false` | `transitions: false` | sets `--pico-transition: 0s` |
| `$enable-important: false` | `important: false` | strips `!important` from utilities |
| `$css-var-prefix` | not kept | the prefix is part of the public API |

Breakpoints are literal media queries in source, written with range syntax (`(width >= 768px)`): 576, 768, 1024, 1280 and 1536 px, with container widths of 510, 700, 950, 1200 and 1450 px and root sizes of 106.25%, 112.5%, 118.75%, 125% and 131.25%. Container widths are exposed as `--pico-container-max-width`, set in `tokens/core.css` per breakpoint, so `.container`, the semantic container and the modal all read one variable.

### Compiler pipeline

1. Read config (`pico.config.ts` or `pico.config.json`, CLI flags, or the built-in matrix).
2. Pick the entry, then drop modules turned off in config.
3. Pick or generate the theme.
4. Bundle with Lightning CSS (`bundleAsync`), which resolves `@import ... layer()`.
5. Run selector passes with a Lightning CSS visitor: classless filter, scope prefix, purge.
6. Lower and minify with Lightning CSS for the targets (browserslist `defaults` by default). This handles nesting, `light-dark()`, OKLCH fallbacks, range media queries and vendor prefixes.
7. Optionally strip `@layer` (`layers: false`) for the legacy build.
8. Write the file plus a size report.

The default `npm run build` writes the full v2.1.1 file matrix into `css/`: `pico`, `pico.classless`, `pico.conditional`, `pico.classless.conditional`, `pico.fluid.classless` and `pico.fluid.classless.conditional`, each for the plain build and the 20 themes, each with a `.min.css`, plus `pico.colors(.min).css`.

### Purge

`purge: { content: ["site/**/*.html"], safelist: [] }` scans the content files for tag names, class names, `id`, `role`, `type` and every `aria-*` and `data-*` attribute with its value. A rule is kept if at least one of its selectors could match, judged only by its type, class and attribute parts. Pseudo-classes and pseudo-elements are ignored. `:root`, `:host`, `html`, `body`, `*` and `::backdrop` always stay. Custom properties are never purged, since they are cheap and users reference them.

## Popover and anchor positioning

All of these are additive. The v2.1.1 markup keeps working in every browser.

| Component | v2.1.1 markup (kept) | New option | Fallback |
| --- | --- | --- | --- |
| Dropdown | `<details class="dropdown">` | `<button popovertarget="m">` plus `<ul popover id="m">`, anchored under the button with `position-area` and `position-try-fallbacks: flip-block` | without anchor positioning the popover still opens in the top layer, placed with fixed fallback styles |
| Tooltip | `[data-tooltip]` with `[data-placement]` | `[popover="hint"]` or `[role="tooltip"][popover]` anchored to its invoker | the `data-tooltip` pattern needs nothing new |
| Modal | `<dialog>` with `.modal-is-*` classes | `<dialog>` with `showModal()` only, opened and closed with `@starting-style` and `transition-behavior: allow-discrete` | no animation, dialog still opens |
| Accordion | `<details>` | `details[name]` exclusive groups, animated height with `::details-content` and `interpolate-size` | instant open and close |

Anchor rules sit in `@supports (anchor-name: --a)` blocks. Popover rules use `:popover-open` and `[popover]`, which are ignored where unsupported.

## Fallback strategy

| Feature | Source uses | Older browsers get |
| --- | --- | --- |
| Nesting | native `&` | flattened by the compiler |
| OKLCH | `oklch()` | compiler adds rgb or lab fallbacks, including inside custom properties |
| `light-dark()` | everywhere colors differ by scheme | compiler lowering with `color-scheme` variables |
| Range media queries | `(width >= 768px)` | rewritten to `min-width` |
| Cascade layers | `@layer pico.*` | no fallback in the default build, `layers: false` gives an unlayered build |
| `:has()` | group focus rings | same as v2.1.1, no ring change where unsupported |
| Popover | opt-in patterns | content shows as normal flow when the attribute is ignored |
| Anchor positioning | opt-in patterns | top-layer popover with fixed placement |
| `@starting-style` | dialog and popover entry | no entry animation |
| `::details-content` | accordion animation | no animation |

Target support for the default build is browserslist `defaults` plus `@layer` (Chrome 99, Edge 99, Firefox 97, Safari 15.4). The full table is in `docs/browser-support.md`.

## Testing

- `test/api/check.ts` compares the built `css/pico.css`, `pico.classless.css`, `pico.conditional.css` and `pico.colors.css` against `test/api/baseline.json`. Every class, attribute hook, `--pico-*` variable and keyframe name from v2.1.1 must exist, unless it is listed as removed in `docs/migration.md`.
- `test/visual/run.ts` loads each fixture with the v2.1.1 CSS and the new CSS in Chromium at 1280px light, 1280px dark and 375px light, and writes a pixel diff report to `test/visual/report/`. Differences are reviewed by hand. The goal is near-identical output, except where a change is a deliberate improvement listed in the migration guide.

## Conventions for source files

- Use logical properties (`margin-inline-start`, `inset-inline-end`, `padding-block`) so RTL works without `[dir=rtl]` overrides where possible. Keep `[dir=rtl]` rules only where logical properties can't express it (background positions, rotated chevrons).
- Use `:where()` to keep specificity at the v2.1.1 level or lower, never higher.
- Use native nesting, but no deeper than three levels.
- Reference tokens only. No raw colors in module files.
- Short `/* */` comments, only where the reason is not obvious. Each file starts with a one-line comment naming the elements it styles, as v2.1.1 did.
