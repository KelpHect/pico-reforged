# ADR 0001: Rewrite Pico as plain modern CSS

Status: accepted
Date: 2026-10-14

## Context

Pico CSS v2.1.1 is the final upstream release and the repository is archived. The maintainer listed what a relevant successor would need:

> plain modern CSS instead of Sass, built on features it doesn't use today (OKLCH colors, cascade layers, Popover, anchor positioning) with fallbacks for older browsers, and a native compiler that strips unused CSS and makes customization easy.

The v2.1.1 codebase is about 6,200 lines of SCSS across 57 partials. Sass is used for four things:

1. Build-time switches (`$enable-classes`, `$enable-semantic-container`, `$enable-viewport`, `$parent-selector`, `$enable-responsive-spacings`, `$enable-responsive-typography`, `$enable-transitions`, `$enable-important`, `$modules`).
2. The color palette (20 hues x 19 steps) and the per-theme mapping from palette steps to semantic tokens.
3. Loops for breakpoints and the 20 theme variants.
4. Small helpers (`mix`, `rgba`, SVG data URI encoding).

The shipped output is 238 files in `css/`: 5 variants (default, classless, conditional, classless conditional, fluid classless) times 20 themes plus a plain version, each minified and unminified, plus `pico.colors.css`.

## Decision

Pico Reforged is a fork published as `@rusticstack/pico-reforged`. It does not use the Pico CSS name or logo and does not claim to be the official project.

1. Source is plain CSS in `src/`. Native nesting, custom properties, `@layer`, `light-dark()`, relative color syntax, container queries, `:has()`, `@starting-style` and `@property` are allowed in source.
2. OKLCH is the source of truth for every color. The v2.1.1 hex palette is converted once, by script, to OKLCH and committed. Themes pick palette steps and are generated from data, not written by hand.
3. All framework rules live in a single `pico` layer with ordered sublayers. Unlayered author CSS always wins without `!important` or specificity tricks.
4. Light and dark values are written once with `light-dark()`. `[data-theme]` only sets `color-scheme`.
5. Popover and anchor positioning are added as opt-in patterns. Existing markup (`details.dropdown`, `[data-tooltip]`, `<dialog>`) keeps working with no changes.
6. The compiler is a small Node script on top of Lightning CSS. Lightning CSS handles bundling, nesting lowering, OKLCH and `light-dark()` fallbacks and minification. The script handles module selection, classless filtering, `.pico` scoping, theme generation, content-based purging and the output file matrix.
7. Build-time JavaScript dependencies are fine. The CSS that ships needs no JavaScript.
8. Every public selector, class, attribute hook and `--pico-*` variable from v2.1.1 is kept, or its removal is listed in `docs/migration.md`. `test/api/baseline.json` holds the v2.1.1 surface and a test checks the new build against it.
9. The `css/` output folder and its file names are kept so CDN paths like `css/pico.min.css` and `css/pico.classless.jade.min.css` keep working.

## Consequences

- Users customize with CSS variables or by writing their own `@layer` rules. Sass is no longer needed for anything.
- Cascade layers have no real fallback, since older browsers drop the whole `@layer` block. The compiler can emit an unlayered build for Safari before 15.4 and Chrome before 99. That build is documented, not the default.
- `light-dark()` and OKLCH in custom properties need the compiler's lowering to work in older browsers. The unminified source CSS in `src/` targets current browsers only.
- The old `.modal-is-open` / `.modal-is-opening` / `.modal-is-closing` JS classes keep their styles, but the recommended path is `@starting-style` transitions that need no JS beyond `showModal()`.
- The upstream Sass source is removed from the tree. It stays in git history and the v2.1.1 build output is frozen in `test/reference/v2.1.1/` for visual comparison.

## Amendment, 2026-10-14

Item 3 originally meant one sublayer per module category. In practice that inverted the v2.1.1 cascade wherever a later module relied on specificity to beat an earlier one. The layers are now `pico.tokens`, `pico.theme`, `pico.core` (every module, in v2.1.1 order) and `pico.utilities` (color classes). See the cascade layers section of `docs/architecture.md`.

## Amendment, 2026-10-14: browser floor and toolchain

Two parts of the original decision changed.

Browser floor. The decision listed "fallbacks for older browsers" and the consequences promised an optional unlayered build for Safari before 15.4 and Chrome before 99. Both are withdrawn. Pico Reforged now supports modern browsers only, with the same floor as Tailwind CSS v4: Chrome and Edge 111, Firefox 128, Safari and iOS Safari 16.4. The compiler's default `targets` is that query, exported as `DEFAULT_TARGETS`. The `layers: false` option, the `--no-layers` flag and the code behind them are removed, and so are the hand-written fallbacks for browsers below the floor (the `-webkit-file-upload-button` and `-webkit-input-placeholder` selectors, the `@supports selector(:has(*))` guard). Cascade layers are native at the floor, so the default build keeps them as written. Lightning CSS still flattens nesting and lowers `light-dark()` for the floor, and no longer emits OKLCH fallbacks. The minified full build went from 87,123 to 80,094 bytes (13,170 to 11,970 gzip) and the classless build from 76,671 to 69,613 bytes (12,121 to 10,921 gzip). Anyone who needs an older browser can pass their own `targets`, but nothing below the floor is tested or supported.

Toolchain. Item 7 allowed build-time JavaScript dependencies and left the choice open. The repository now uses Vite+ (`vite-plus` 1.2.0) on pnpm, configured from one `vite.config.ts`: Vitest 5 for tests, Oxlint with type-aware rules for lint, Oxfmt for TypeScript, JSON, Markdown, YAML and hand-written CSS, and tsdown (`vp pack`) to build `dist/cli.js` and `dist/compiler.js` with declarations. TypeScript 7 stays as the type checker. Prettier, `package-lock.json` and `tsconfig.build.json` are gone. The shipped CSS is unchanged in kind: plain, small and usable without a build.
