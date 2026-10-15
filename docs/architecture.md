# Architecture

This is the working design for Pico Reforged. The reasons behind it are in [ADR 0001](adr/0001-plain-css-rewrite.md).

## Repository layout

```
src/                     CSS source, plain CSS, loadable in a current browser without a build
  pico.css               full entry
  pico.classless.css     classless entry
  pico.colors.css        color utility entry
  pico.extras.css        opt-in extras entry, usable on its own after pico.css
  layers.css             layer order statement, imported first by every entry
  tokens/
    core.css             fonts, spacing, radius (controls and --pico-card-border-radius), sizes, icons, root size, container widths
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
  extras/                opt-in extras: tabs, alert, toast, badge, avatar, skeleton, app-shell, data-table, pagination, stepper, empty-state
  colors/                color and background utility classes (generated)
scripts/
  cli.ts                 CLI entry (`pico-reforged build`, `matrix`, `purge`, `themes`, `modules`, `extras`)
  dev-build.ts           quick azure build into dist-dev/, used by `pnpm test:api`, `pnpm test:visual` and `pnpm dev`
  lib/compiler/          the compiler: config, bundle, transforms, module-tokens, classless, scope, purge, theme, matrix, report
  data/                  palette.json, themes.ts, scheme.ts (the inputs to generation)
  lib/integrations/      root detector, @pico config, project scanner, Engine, post-build purge (see Integrations)
  integrations/          the Vite and PostCSS plugins
  generate.ts            writes src/tokens/palette.css, scheme.css, src/themes/*.css, src/colors/*.css
vite.config.ts          Vite+ config: test, lint, fmt and pack in one file
css/                     build output, same file names as v2.1.1 so CDN paths keep working
test/
  reference/v2.1.1/      frozen upstream build output
  reference/current/     frozen output of this project, the baseline `pnpm test:visual` gates against
  api/                   baseline.json (v2.1.1 public surface) and the coverage check
  fixtures/              kitchen-sink.html and friends, used by examples and visual tests
  fixtures/extras/       one <name>.html per extra, used by the extras checker
  visual/                Playwright screenshot and pixel diff harness, extras.ts for the extras checker
docs/                    architecture, ADRs, customization, browser support, migration
examples/                small pages that show usage (CDN, modular, custom theme, popover)
site/                    documentation website, deployed to pico.rusticstack.com
```

Module file names match the v2.1.1 `$modules` keys, so `components/modal` in a config means `src/components/modal.css`.

## Cascade layers

Every framework rule is inside the `pico` layer. `src/layers.css` declares the order once:

```css
@layer pico.tokens, pico.theme, pico.core, pico.extras, pico.utilities;
```

Rules:

- Module files contain no `@layer` blocks. Entry files assign layers when importing:
  `@import url("./content/link.css") layer(pico.core);`
- `pico.tokens` holds `src/tokens/*`. `pico.theme` holds one theme file. Putting themes after tokens lets a theme override any neutral token.
- `pico.core` holds every module, imported in the v2.1.1 order. Element-scoped token overrides that v2.1.1 kept in `themes/default/_styles.scss` (for example `h1 { --pico-font-size: 2rem }`) sit at the top of the module that owns them.
- `pico.extras` holds `src/extras/*`, the opt-in components for apps (tabs, alert, toast and so on). It sits after `pico.core` on purpose. Extras restyle things that core already styles (a `table` becomes a data table, a `nav` becomes pagination, an `article` gets an alert role), and they must win over those rules by layer order, not by raising specificity. A later layer wins whatever the selector weight, so an extra can keep `:where()` selectors and still override core. It sits before `pico.utilities` so `.pico-color-*` and `.pico-background-*` can still recolor an extra. Core never needs to know about extras: the default `pico.css` only carries the name in the order statement, with no rules in it.
- `pico.utilities` holds the `.pico-color-*` and `.pico-background-*` classes from `pico.colors.css`, so they win over any module rule.
- Anything a user writes outside a layer beats all of Pico. A user can also slot their own layers before or after `pico`, or add rules to `pico.core` itself.

The first design gave each module category its own sublayer (reset, layout, content, forms, components, utilities). That broke parity. v2.1.1 relies on specificity between modules, for example `[type=submit]` button rules beating the generic `input` rule from forms. A later layer wins regardless of specificity, so every one of those cases flipped. One ordered layer for all modules keeps the v2.1.1 cascade exactly, and users still get the main benefit, which is that unlayered CSS always wins.

## Extras

Extras are opt-in and never part of `pico.css` or `pico.classless.css`. Each one is a single file in `src/extras/<name>.css`, and `src/pico.extras.css` imports all of them into `layer(pico.extras)` after the order statement, so it also works on its own after `pico.css`:

```html
<link rel="stylesheet" href="pico.min.css" />
<link rel="stylesheet" href="pico.extras.min.css" />
```

Rules for an extra:

- Semantic HTML and ARIA first. At most one documented `data-*` hook where semantics cannot say it. No class is required, so the extra survives the classless build.
- Tokens it needs are new `--pico-<extra>-*` custom properties at the top of its own file, declared on `:root, :host, [data-theme]` (same reason as `scheme.css`, see Light and dark). Everything else reuses the existing `--pico-*` tokens.
- Logical properties for RTL, and motion that respects `prefers-reduced-motion`.
- Newer features (popover, `@starting-style`, anchor positioning) only as progressive enhancement, with a usable fallback.

Compiler: the `extras` option takes a list of names, a comma separated string, `"all"` or `true`, and appends those imports to a `pico` or `classless` build. Unknown names are an error. The CLI has `--extras tabs,badge` and `--extras all`, and `pico-reforged extras` lists the names. The `extras` entry (`--entry extras`) builds the extras alone, all of them unless `extras` narrows it. The classless filter, scope, purge and the other passes run over the extras like over any module. `extrasDir` reads the files from another folder, which the tests use.

The matrix writes `pico.extras(.min).css` (all extras) and `extras/<name>(.min).css` (one each, layered, with the extra's own tokens). It adds 24 files to the 238 of v2.1.1. The layer order statement is the only thing the default builds gain, about a dozen bytes. `test/compiler/extras.test.ts` checks that a build without `extras` is byte-identical to one with an empty list, and `test/api/check.ts` fails if an extras token or an `@layer pico.extras` block shows up in a default file. `CompileStats.extras` and the CLI size line name the extras that went into a build.

`pnpm test:extras` (`test/visual/extras.ts`) builds `pico.css` and each extra into a temp folder, loads `test/fixtures/extras/<name>.html` (`__CSS__` is `pico.css`, `__EXTRA__` the extra) in Chromium, saves screenshots at 1280 light, 1280 dark, 375 light and 1280 light with `dir="rtl"` to `test/visual/extras-report/<name>/`, and runs axe-core on each page. It exits 1 on serious or critical violations. `--only <name>` limits it to one extra.

## Color system

### Palette

`scripts/data/palette.json` holds the 20 hues (amber, azure, blue, cyan, fuchsia, green, grey, indigo, jade, lime, orange, pink, pumpkin, purple, red, sand, slate, violet, yellow, zinc) with 19 steps each (50 to 950 by 50). Each value is an OKLCH triple, converted from the v2.1.1 hex values with culori. The generator writes the shortest literal (`compactTriple` in `scripts/lib/color.ts`) whose sRGB channels are all within 0.4 of an 8-bit step of the original, so it converts back to the same hex. It tries 2 to 4 decimals for L, 1 to 4 for C and 0 to 2 for H, and falls back to 4, 4 and 2. The result reads like `oklch(0.355 0.016 260)`.

Token names stay the same as v2.1.1: `--pico-color-azure-550`, `--pico-color-azure` (the 550 alias), `--pico-color-black`, `--pico-color-white`.

### Semantic tokens

Every semantic color token from v2.1.1 keeps its name (`--pico-background-color`, `--pico-primary-hover-background`, `--pico-form-element-invalid-border-color` and so on). Each one is written once:

```css
:root, :host {
  --pico-muted-color: light-dark(oklch(0.527 0.024 264), oklch(0.656 0.03 265));
}
```

- Values are inlined OKLCH literals, not `var(--pico-color-slate-500)`. That keeps the default build from shipping the whole palette. The generator writes the literals from palette references in `scripts/data/scheme.ts` and `scripts/data/themes.ts`, so nothing is copied by hand.
- Alpha uses the slash syntax: `oklch(0.527 0.024 264 / 0.5)`.
- Colors that v2.1.1 built with `mix()` are converted from the computed v2.1.1 value.
- Aliases stay aliases (`--pico-primary-border: var(--pico-primary-background)`).

### Light and dark

```css
:root, :host { color-scheme: light dark; }
[data-theme="light"] { color-scheme: light; }
[data-theme="dark"] { color-scheme: dark; }
```

Natively, `light-dark()` inside a custom property resolves against the `color-scheme` of the element that uses the variable. The compiler's lowered version (`var(--lightningcss-light, a) var(--lightningcss-dark, b)`) resolves where the variable is declared instead. That's why `scheme.css` and the theme files declare their tokens on `:root, :host, [data-theme]` and not just `:root`. The values get recomputed on every `[data-theme]` subtree, and nested themes work in both native and lowered builds. Lightning CSS 1.33 lowers `light-dark()` and OKLCH (to hex plus `lab()` inside `@supports`) for the floor targets (see Browser floor), and that was checked before this design was fixed.

`light-dark()` only takes colors. The few scheme-dependent values that are not plain colors (the valid and invalid icon data URIs, the white-icon `filter` on contrast buttons) live in `src/tokens/scheme-images.css`, using this selector set for dark:

```css
[data-theme="dark"] { ... }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ... } }
```

Shadows with colors inside (`--pico-box-shadow`, `--pico-dropdown-box-shadow`) put `light-dark()` on the color of each layer, so they stay in `scheme.css`. The `stack()` helper in `scripts/data/scheme.ts` takes one row per layer: x, y, blur and spread shared by both schemes, then a light and a dark color. A dark layer that should not show uses alpha 0, so the geometry never differs between schemes. `--pico-box-shadow` is a 1px ring, a short drop and a soft drop. The ring outlines cards in both schemes, so cards draw no CSS border. `--pico-dropdown-box-shadow` has the same ring and a deeper drop for menus, dialogs, toasts and tooltips. `--pico-switch-thumb-box-shadow` comes from the theme generator and is the same in both schemes.

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

| v2.1.1 Sass                     | Reforged config        | How it works                                                                                                                                                                                       |
| ------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `$modules`                      | `modules`              | files are left out of the bundle                                                                                                                                                                   |
| `$theme-color`                  | `theme`                | picks a file in `src/themes/` or generates one                                                                                                                                                     |
| `$enable-classes: false`        | `classes: false`       | drops every selector that needs a class, except classes inside `:not()`                                                                                                                            |
| `$enable-semantic-container`    | `semanticContainer`    | adds `layout/semantic-container.css`                                                                                                                                                               |
| `$enable-viewport: false`       | `fluid: true`          | sets `--pico-container-max-width: 100%` after the breakpoint values                                                                                                                                |
| `$parent-selector: ".pico"`     | `scope: ".pico"`       | prefixes selectors, leaves `:root`, `:host` and `html` rules on the root                                                                                                                           |
| `$enable-responsive-typography` | `responsiveTypography` | drops the root font size step at 1536px                                                                                                                                                            |
| `$enable-responsive-spacings`   | `responsiveSpacings`   | adds `layout/responsive-spacings.css`                                                                                                                                                              |
| `$enable-transitions: false`    | `transitions: false`   | sets `--pico-transition: 0s`, removes every `transition-*` and `animation-*` declaration (the indeterminate progress bar keeps its animation, as in v2.1.1) and drops the `@starting-style` blocks |
| `$enable-important: false`      | `important: false`     | strips `!important` from utilities                                                                                                                                                                 |
| `$css-var-prefix`               | not kept               | the prefix is part of the public API                                                                                                                                                               |

Breakpoints are literal media queries in source, written with range syntax (`(width >= 768px)`): 576, 768, 1024, 1280 and 1536 px, with container widths of 510, 700, 950, 1200 and 1450 px and one root size step: 100% up to 1535px, 106.25% from 1536px (v2.1.1 grew the root at every breakpoint, up to 131.25%). Container widths are exposed as `--pico-container-max-width`, set in `tokens/core.css` per breakpoint, so `.container`, the semantic container and the modal all read one variable.

### Compiler pipeline

1. Read config (`pico.config.ts` or `pico.config.json`, CLI flags, or the built-in matrix).
2. Pick the entry, then drop modules turned off in config.
3. Pick or generate the theme, and add the chosen extras.
4. Bundle with Lightning CSS (`bundleAsync`), which resolves `@import ... layer()`.
5. Run selector passes with a Lightning CSS visitor: classless filter, scope prefix, purge.
6. Lower for the targets (`DEFAULT_TARGETS`, see Browser floor) in one last Lightning CSS pass, and minify when asked. This handles nesting and `light-dark()` lowering and the vendor prefixes the floor still needs. Lowering runs once, at the end: the earlier passes are given no targets, because every pass that lowers writes its own copy of the prefixed declarations and the `--lightningcss-*` toggles. A minified build then runs a second small pass that factors selector lists (see Selector factoring).
7. Drop the custom properties that only an excluded module read (`module-tokens.ts`), then drop rules with an empty `:is()`, `:where()` or `:has()` list.
8. Write the file plus a size report.

The default `pnpm build` writes the full v2.1.1 file matrix into `css/`: `pico`, `pico.classless`, `pico.conditional`, `pico.classless.conditional`, `pico.fluid.classless` and `pico.fluid.classless.conditional`, each for the plain build and the 20 themes, each with a `.min.css`, plus `pico.colors(.min).css`.

### Purge

`purge: { content: ["site/**/*.html"], safelist: [] }` scans the content files for tag names, class names, `id`, `role`, `type` and every `aria-*` and `data-*` attribute with its value. A rule is kept if at least one of its selectors could match, judged only by its type, class and attribute parts. Pseudo-classes and pseudo-elements are ignored. `:root`, `:host`, `html`, `body`, `*` and `::backdrop` always stay. Custom properties are never purged, since they are cheap and users reference them.

### Compiler notes

How the pieces behave where the plan left room:

- Entry text is edited before bundling. Disabled modules are bundled as an empty file by the resolver, modules the entry does not import (`layout/semantic-container`, `layout/responsive-spacings`) are inserted after their anchor import, and the theme import is replaced with the chosen theme. The themes option takes a name, `{ color }`, `{ hue, chroma }` or a CSS file path (the default theme followed by that file).
- Nesting is lowered first (`Features.Nesting` is forced on whenever the targets lack native nesting, or scope or purge is on), so every selector pass sees flat selectors. With `targets: "modern"` and neither scope nor purge, nesting is left in the output; the classless filter judges one selector at a time and gives the same result nested. Lightning CSS 1.33 cannot hand a style rule back from a visitor (var() fails to deserialize), so selectors go through the per-selector `Selector` hook, which also drops a rule once all its selectors are gone. Nodes that must be returned (`!important` stripping, motion stripping) go through `clean()` in `transforms.ts`.
- Classless: a selector goes if it has a class outside `:not()`; `:is()`, `:where()` and `:has()` lists are filtered branch by branch. Checked by running the filter over the v2.1.1 `pico.css` and diffing with the v2.1.1 `pico.classless.css`. The only rule v2.1.1 kept that the filter drops is `table.striped`, which is the one entry in `CLASSLESS_KEEP`. v2.1.1 also wrote `:not(.outline)` away in two selectors (no effect without classes) and dropped the unused modal keyframes, which `pruneKeyframes` does here.
- Scope: checked the same way against `pico.conditional.css`. `:root`, `:host`, `html` and a lone `[data-theme]` stay; when one of them or `[dir]` is followed by a descendant, the scope goes after it (`[dir=rtl] .pico select`); `@keyframes`, `@media` and `@supports` are untouched. Kept global, as in v2.1.1: `*`, `::before`, `::after`, `body`, `main`, `.container`, `.container-fluid`, `.grid` and the `.modal-is-*` classes on `<html>` (see `scope-global.ts`). Not reproduced, because they were accidents: v2.1.1 left the element-level token overrides (`a`, `h1`, `[role=group] button` and so on) and `[type=reset].outline` unscoped. Here they are scoped.
- Fluid: sets `--pico-container-max-width: 100%` in `pico.core` and, when the semantic container is on, puts the side padding back (semantic-container.css zeroes it from 576px up, v2.1.1 fluid kept it). Checked against `pico.fluid.classless.css` with the visual harness: 0 px difference.
- `important: false` also leaves out `utilities/reduce-motion` and so does `transitions: false`, as v2.1.1 built it only when both were on.
- `important: false` strips `!important` everywhere. v2.1.1 also left out the `textarea[aria-invalid]` icon block and the Firefox date and time block; here they stay, without `!important`. This is intended: the textarea icon sits at the top right and the Firefox date inputs lose their calendar icon padding, which keeps the same look as the default build.
- `@scope` is not supported in theme files: the selector passes also rewrite its prelude.
- `transitions: false` follows `$enable-transitions: false` from v2.1.1 (checked against `git show a07563dd:scss/...`): every `transition-*` and `animation-*` declaration goes, including those that read `var(--pico-transition)`, the modal and tooltip keyframes go with them, and the `@starting-style` blocks are dropped since nothing transitions. `--pico-transition` is still set to `0s` for rules a user adds. The one exception is `progress:indeterminate`, whose animation is the only sign of a busy state and which v2.1.1 also left alone.
- Unknown config keys do not fail the build. `resolveOptions` collects a warning per key into `stats.warnings`, which the CLI prints. `exclude` is accepted as a shorthand for `modules: { name: false }`, as a list or a comma separated string. A module name that does not exist is still an error.
- Excluding a module also drops the custom properties only it reads. `module-tokens.ts` maps each module to token name prefixes (for example `components/modal` to `--pico-modal-`, `--pico-icon-close` and `--pico-scrollbar-width`). A candidate is removed only when no remaining `var()` reads it, and the pass repeats until nothing more goes, so alias chains collapse.
- A selector with an empty `:is()`, `:where()` or `:has()` list matches nothing, so the rule is dropped. Rules that put `:is([aria-current]...)` after `::file-selector-button` were dead too, since only user-action pseudo-classes parse there and the browser drops the whole rule. That branch is gone from `src/content/button.css`.
- Source cleanups for the floor: the `::-webkit-file-upload-button`, `::-webkit-input-placeholder` and `-webkit-appearance` hand-written prefixes are replaced by their standard forms, the `::-moz-list-bullet` rule on accordion summaries is gone (the summary already has `list-style-type: none`), and the `@supports selector(:has(*))` wrapper around the group focus ring is gone.
- Banner: the readable files start with the four line comment (name and version, the original copyright of Lucas Larroche and the Pico CSS authors, the Pico Reforged copyright, MIT). The minified files get the same facts on one line. `compileBoth` takes the minified banner as its second argument.
- Purge: classes are collected from `class` attributes and from every quoted string in the scanned files, so `classList.add("modal-is-open")` counts. Attributes are collected with their values; one set from script by name only matches any value. `data-theme` and `dir` always count as present. A safelisted name keeps every selector that mentions it. Unused `@keyframes` go with the rules. The tag scanner reads quoted values and `{...}` expressions, so `>` inside `x-data="a > b"` or `() => go()` does not end a tag. Attributes bound to an expression (`aria-busy={x}`, `:aria-busy`, `v-bind:`, `x-bind:`, `${x}`) count as present with any value. `open` always counts as present because the browser toggles it. Lowercase words in quoted strings count as tags (`createElement("dialog")`). A content glob that matches no file is reported in `stats.warnings`, printed by the CLI.
- The matrix writes the same names as v2.1.1, which has no plain `pico.classless.conditional.css` and no plain `pico.fluid.classless.conditional.css`, and no `pico.azure.css` (azure is the plain file).
- `pnpm pack` and `npm publish` ship `dist/`, built by `vp pack` (tsdown): `dist/cli.js` (the `pico-reforged` binary), `dist/compiler.js` (the `./compiler` export), `dist/vite.js` and `dist/postcss.js` (the `./vite` and `./postcss` exports), their `.d.ts` files and a few shared chunks that the entries import. Node does not strip types inside `node_modules`, so the packed files are plain JavaScript and the CLI runs on Node 22.18+ and 24 with `--no-experimental-strip-types`. The compiler reads `src/` at run time, so `src/` is in the package too, and finds the package root by walking up from its own file, so the same code works from `scripts/lib/compiler/` and from `dist/`.
- The tarball is about 2.9 MB packed (20 MB unpacked), mostly the 262 prebuilt files in `css/`. That is the cost of shipping the whole theme matrix. `src/` and the CLI can build any of them on demand.

## Integrations

The package works like `@import "tailwindcss"`: a user imports it once and the production CSS holds only what the app uses. Setup per framework is in [integrations.md](integrations.md). This section is the design.

### Parts

```
scripts/lib/integrations/
  css-scan.ts       top-level statement scanner for CSS (comments, strings and url() safe)
  glob.ts           brace expansion, glob to RegExp, .gitignore parser
  pico-config.ts    the @pico block and the @source rules
  detect.ts         root detection: which stylesheets import the package, what to cut out
  scanner.ts        project walk, ignore rules, per-file cache, content index
  process.ts        Engine: detect, scan, compile, cache, assemble; also the package-file roots
  purge-output.ts   post-build purge of a built folder (the CLI command)
scripts/integrations/
  vite.ts           "@rusticstack/pico-reforged/vite"
  postcss.ts        "@rusticstack/pico-reforged/postcss"
```

The two plugins are thin. Both hand the stylesheet text and its path to `Engine.process()` and put the result back.

### Root detector

A root is a stylesheet with a top-level `@import` of the package: `@rusticstack/pico-reforged`, `/classless`, `/colors`, `/extras` or `/extras/<name>`, with a string or `url()` specifier and an optional `layer()`, `supports()` or media suffix. `detect.ts` bails on a plain `includes()` check before it parses anything, so other stylesheets cost nothing. Unknown subpaths and unknown extra names are errors.

The compiled CSS goes after the leading `@charset`, `@import` and layer-order statements of the file, and the Pico imports, `@pico` blocks and `@source` rules are cut out. The other imports of the file stay where they were and the bundler handles them. A file that also imports Tailwind keeps its `@source` rules, since Tailwind reads them.

A script that imports the package gets the pre-built `css/pico*.css` file. Both plugins recognise the package's own `css/` and `src/` stylesheets and treat them as a root with a synthetic `@import` line, so `import "@rusticstack/pico-reforged"` in a JS entry is purged too.

### Configuration syntax

The config lives in the stylesheet, as CSS that stays valid without the plugin. Tailwind v4 puts options after the specifier (`@import "tailwindcss" theme(static)`), but `theme(jade)` is not a valid import condition, so the file would be invalid CSS for every tool that does not run the plugin. Unknown at-rules are valid CSS, so the choice is:

- `@pico { name: value; }` for compiler options. The names are the compiler options in kebab-case (`theme`, `extras`, `classless`, `scope`, `fluid`, `exclude`, `targets`, `minify` and so on) plus `purge: safe | aggressive | off` (`auto` is read as `safe`), `safelist` and `source`. Values are the CSS form of the option: `extras: tabs badge;`, `scope: none;`, a theme name, a color or a quoted path to a CSS file. Unknown names warn, bad values throw with the list of valid ones.
- `@source "path-or-glob";`, `@source not "path-or-glob";` and `@source inline("a b {c,d}");` with Tailwind v4's meaning. Paths are relative to the stylesheet. Inline names are added to the safelist, so a name that a script adds at run time keeps every rule that mentions it.

### Scanner

With no `@source`, the scan walks the project folder: the nearest `package.json` folder above the stylesheet, the integration's `root` option or the Vite or PostCSS root, or the folder named by `@pico { source: "..." }`. `source: none` turns the automatic walk off.

- `.gitignore` files are read as the walk meets them, nested ones included. Ancestors are read up to the repository root when a `.git` folder exists. Deeper files win over shallower ones, `!` re-includes, and an ignored folder is not entered.
- Folder names skipped at any depth: `node_modules`, `.git`, `.next`, `.astro`, `.svelte-kit`, `.nuxt`, `.output` and a few cache folders. `dist`, `build`, `out`, `coverage`, `target` and `venv` are skipped only directly under the scan root, so `src/app/build/page.tsx` is still read. Lock files, style sheets (`css`, `scss`, `sass`, `less`, `styl`, `pcss`), binary extensions, files over 1 MB and files with a NUL byte are skipped. Everything else is read as text. Symlinked folders are skipped, since they loop.
- `@source` entries are scanned without `.gitignore` and extension rules, and a folder named in the path is entered even when its name is on the skip list, so `@source "node_modules/ui-lib"` works. `@source not` prunes the walk.
- Each file is parsed once with the purge content extractor (`scanText`). The scanner keeps the parsed entry per path, keyed by size and mtime, and builds a fresh index from the current entries on every scan. Nothing is accumulated: a class that leaves the sources leaves the index on the next scan. The compile cache is keyed by the options and by a hash of the index, so unchanged content reuses the compiled output.
- Markdown files, and code that writes HTML from a string (`innerHTML`, `dangerouslySetInnerHTML`, `v-html`, `{@html}`, `set:html`, `| safe`, `DOMParser`), add the content tag set (`p`, `a`, `ul`, `table`, `blockquote`, `code`, headings, sectioning tags and so on) to the index, because those tags exist at run time without being in the sources. In `aggressive` mode only; `safe` keeps every rule that lacks only tags anyway.
- Script property forms are understood: `el.ariaBusy` counts as `aria-busy`, `el.dataset.fooBar` as `data-foo-bar`.

If the scan reads no file the purge is skipped with a warning, so a wrong root never turns into an empty stylesheet.

### Dependencies

The Engine returns `config` (a theme file), `files` (every scanned file) and `dirs` (every folder that holds a scanned file). Vite registers the theme file with `addWatchFile` in dev and build, and the scanned files only when `build.watch` is set, because the dev server does not scan. PostCSS pushes `dependency` messages for files and `dir-dependency` messages with a `*` glob for folders, and skips the project folder itself (Next.js recursed on that when `distDir` was not the default; Tailwind skips it too).

### Plugins

- Vite: one plugin, `enforce: "pre"`, a `transform` with an id filter like `@tailwindcss/vite` (`.css`, `&lang.css`, minus worker, raw, url, commonjs-proxy and `.vite`). `serve` compiles the full stylesheet, `build` compiles with the scanner. The build output folder and the cache folder are added to the ignore list. `configResolved` clears the caches.
- PostCSS: `Once(root)` with a quick bail on `@import` params, `root.toString()` into the Engine, then the result is parsed and appended after `root.removeAll()`. It purges when `NODE_ENV` is `production` unless `purge` says otherwise. `module.exports` is also exported so `require()` of the ESM file returns the plugin, which is how Next.js loads plugin names.
- Package: `exports` has `style` conditions (`.`, `./classless`, `./colors`, `./extras`, `./extras/*`) that resolve to the unminified built files in `css/` in bundlers (layered and lowered for the floor, unlike the raw sources) and `default` conditions that resolve to `css/*.min.css`. `vite` and `postcss` are optional peer dependencies, and both plugin files only import types from them, so they never load at run time. `autoInstallPeers: false` in `pnpm-workspace.yaml` keeps pnpm from installing a real `vite` next to Vite+, which breaks `vp pack`.

### Post-build purge

`pico-reforged purge <outDir>` is for outputs without a bundler plugin (Hugo, Jekyll, Eleventy, Bun). It scans the folder (all text files up to 32 MB, no `.gitignore`, only `node_modules` and `.git` skipped), then rewrites the built CSS. Only the bodies of `@layer pico` and `@layer pico.*` blocks are rewritten, at the top level or inside wrapper layers, `@media` or `@supports` blocks. Each body goes through Lightning CSS with the same purge visitor as the compiler, so a rule is judged the same way in both places. Keyframes that nothing uses any more go with their rules. The text outside those bodies is copied byte for byte. This is why the framework keeps every rule inside `pico.*` layers: the layer name is the mark that says a rule came from Pico.

### Differences from Tailwind

The integrations have three modes. `safe` is the default and sets `conservative` on the content index: type selectors never drop a rule (`keepTypes`), and attribute selectors are judged by name only. The names in `RUNTIME_ATTRS` in `purge.ts` (`role`, `type`, `disabled`, `hidden`, `open`, `popover`, `value`, `href` and so on) and every `aria-*` count as present without a scan hit. Only a class, an id or another attribute name (`data-tabs`, `data-tooltip`) that is absent from the content removes a rule, and unused keyframes go with their rules. This saves less, but a framework component, a router or a script cannot make it drop a rule the page needs. `aggressive` is the earlier behavior: tags and attribute values are judged too, with the scanner's heuristics standing in for what the sources cannot show. It saves more and needs safelists or `@source` for run-time markup. `off` never purges. `auto` is kept as an alias for `safe`. The post-build command has the same default (`--mode`). The plain compiler option (`purge: { content }`, `build --purge`) does not use these modes: it stays explicit, tags and values are judged, and `keepTypes` is opt-in.

Tailwind generates utilities from candidates. Pico ships fixed CSS and removes what the content cannot match, which is the riskier direction, so the defaults lean to keeping: a rule is judged on its type, class, id and attribute parts only, all identifiers in scripts count as classes, bound attributes count as any value, and an empty scan never purges. The Tailwind candidate set is never cleared while a dev server runs. Here the index is rebuilt on every scan.

## Popover and anchor positioning

All of these are additive. The v2.1.1 markup keeps working in every browser.

| Component | v2.1.1 markup (kept)                     | New option                                                                                                                                       | Fallback                                                                                               |
| --------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Dropdown  | `<details class="dropdown">`             | `<button popovertarget="m">` plus `<ul popover id="m">`, anchored under the button with `position-area` and `position-try-fallbacks: flip-block` | without anchor positioning the popover still opens in the top layer, placed with fixed fallback styles |
| Tooltip   | `[data-tooltip]` with `[data-placement]` | `[popover="hint"]` or `[role="tooltip"][popover]` anchored to its invoker                                                                        | the `data-tooltip` pattern needs nothing new                                                           |
| Modal     | `<dialog>` with `.modal-is-*` classes    | `<dialog>` with `showModal()` only, opened and closed with `@starting-style` and `transition-behavior: allow-discrete`                           | no animation, dialog still opens                                                                       |
| Accordion | `<details>`                              | `details[name]` exclusive groups, animated height with `::details-content` and `interpolate-size`                                                | instant open and close                                                                                 |

Anchor rules sit in `@supports (anchor-name: --a)` blocks. Popover rules use `:popover-open` and `[popover]`, which are ignored where unsupported.

## Browser floor

The default `targets` is the exported constant `DEFAULT_TARGETS` in `scripts/lib/compiler/config.ts`:

```
chrome >= 111, edge >= 111, firefox >= 128, safari >= 16.4, ios_saf >= 16.4
```

This is the same floor as Tailwind CSS v4. There is no legacy support: no unlayered build and no fallback for browsers below it. The `targets` option and `--targets` still take any browserslist query for people who want something else. `targets: "modern"` selects `MODERN_TARGETS` (Baseline 2024), which keeps native nesting and `light-dark()` and makes `pico.min.css` 10% smaller raw and 3% smaller in brotli (see File size). Scope and purge flatten nesting first because they judge whole selectors. The full table is in `docs/browser-support.md`.

| Feature                                  | Source uses                        | At the floor                                                                                       |
| ---------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------- |
| Cascade layers                           | `@layer pico.*`                    | native (Chrome 99, Firefox 97, Safari 15.4), kept as written                                       |
| `:has()`                                 | group focus rings                  | native (Chrome 105, Firefox 121, Safari 15.4), no `@supports` guard                                |
| Range media queries                      | `(width >= 768px)`                 | native (Chrome 104, Firefox 63, Safari 16.4), kept as written                                      |
| OKLCH                                    | `oklch()`                          | native (Chrome 111, Firefox 113, Safari 15.4), no fallback is emitted                              |
| Nesting                                  | native `&`                         | flattened by the compiler (native from Chrome 120, Firefox 117, Safari 17.2)                       |
| `light-dark()`                           | everywhere colors differ by scheme | compiler lowering with `color-scheme` variables (native from Chrome 123, Firefox 120, Safari 17.5) |
| Popover                                  | opt-in patterns                    | content shows as normal flow where the attribute is ignored                                        |
| Anchor positioning                       | opt-in patterns                    | top-layer popover with fixed placement where unsupported                                           |
| `@starting-style`, `transition-behavior` | dialog and popover entry           | no entry animation where unsupported                                                               |
| `::details-content`, `interpolate-size`  | accordion animation                | no animation                                                                                       |

Moving from browserslist `defaults` to the floor shrank the matrix (minified, gzip -9, header without file name):

| File                     | Before raw | Before gzip | After raw | After gzip |
| ------------------------ | ---------- | ----------- | --------- | ---------- |
| `pico.min.css`           | 87,123     | 13,170      | 80,094    | 11,970     |
| `pico.classless.min.css` | 76,671     | 12,121      | 69,613    | 10,921     |

Most of the saving is the dropped OKLCH to `lab()` fallbacks and prefixes. The source cleanups for the floor account for about 500 bytes of it.

## File size

Sizes of the shipped minified files, banner included (raw / gzip -9 / brotli q11):

| File                       | v2.1.1                   | Before the size work     | Now                      | Now, `targets: "modern"` |
| -------------------------- | ------------------------ | ------------------------ | ------------------------ | ------------------------ |
| `pico.min.css`             | 83,319 / 11,654 / 10,097 | 80,106 / 12,013 / 10,533 | 80,995 / 12,152 / 10,695 | 72,759 / 11,852 / 10,462 |
| `pico.classless.min.css`   | 71,040 / 10,323 / 8,964  | 69,625 / 10,962 / 9,635  | 70,681 / 11,090 / 9,792  | 63,395 / 10,856 / 9,597  |
| `pico.conditional.min.css` | none                     | 83,580 / 12,250 / 10,688 | 83,961 / 12,322 / 10,809 | 81,125 / 12,220 / 10,727 |
| `pico.extras.min.css`      | none                     | 44,846 / 7,385 / 6,560   | 47,062 / 7,657 / 6,809   | 39,259 / 7,330 / 6,546   |

"Now" includes the modern default look ([ADR 0002](adr/0002-modern-default-look.md)), which added about 4% gzipped to each file (`pico.min.css` was 77,969 / 11,663 / 10,281 before it). The budget for that change was 5%.

The v2.1.1 files are the ones published on npm (`@picocss/pico@2.1.1`). Against them the raw file is 3% smaller (classless 0.5%). Compressed it is larger: `pico` by 4% gzipped and 6% with brotli, classless by 7% and 9%. Pico Reforged also ships things v2.1.1 does not have: the popover module (about 400 bytes in brotli), anchor positioning, `interpolate-size`, `::details-content` and `@starting-style` blocks. The modern file is smaller because the compiler no longer lowers nesting and `light-dark()`. `pico.conditional` gains less from it because scope flattens nesting.

What the size work changed:

- Shortest OKLCH literals (see Palette). Every theme and every build carries them.
- Lowering runs once. Before, three passes each lowered the output and repeated the declarations they generate (`-webkit-text-decoration` three times in `:before,:after`, the `--lightningcss-light` and `--lightningcss-dark` toggles twice in each scheme block).
- Selector factoring, see below.
- The icon data URIs drop the spaces inside `rgb()`.
- The minified banner is one comment line. The readable files keep the long one.

### Selector factoring

Lowering nesting writes out the cross product of the parent and child lists, for example `button:hover,[type=submit]:hover,[type=reset]:hover`. On a minified build, `factor.ts` runs as a second Lightning CSS pass after the lowering pass and merges the selectors of a list that differ in one component into `:is()`. A merge never changes what matches or its specificity: only components of the same specificity tier are merged, and only pseudo-classes that every browser of the floor understands (`:is()` drops a branch it cannot parse, where a plain list would drop only that selector). Rules that contain `&` (nested output of the modern preset) are left alone. The pass excludes vendor prefixing and `light-dark()` lowering, because the rules a visitor hands back are already lowered.

In the compiler, purge never sees factored lists. It runs in `finalize`, before `minifyStage`, so an unused branch is gone before any merge. The post-build purge (`pico-reforged purge`, which also runs on the minified files in `css/`) reads factored output, and `purgeSelectors` judges every branch of an `:is()` list on its own: the rule stays when at least one branch could match, the same as the unmerged list would. The integrations (Vite, PostCSS) call the compiler, so they purge first as well.

Post-build purge also flattens native nesting before it judges selectors, so a file built with `targets: "modern"` gives the same result as the floor build. The output stays flat. It does not lower again, so prefixed declarations and `light-dark()` toggles are not repeated.

### Serving

Precompress the files with brotli at quality 11 when you serve them yourself. Measured on the file before the size work, `pico.min.css` was 10,438 bytes at q11, 11,462 at q5 (about 1 KB more) and 12,697 at q4, which is what many CDNs use when they compress on the fly.

Compression dictionaries (RFC 9842, `Content-Encoding: dcb` or `dcz`) pay off when a visitor already has one Pico file and fetches another from the same origin. With `pico.min.css` as the dictionary, a theme file such as `pico.jade.min.css` brotli-compresses from 10,438 to 120 bytes, and `pico.extras.min.css` from 6,560 to 5,637. It needs server or CDN support, works in Chromium only for now, and only for same-origin dictionaries. It does nothing for a first visit.

## Toolchain

One tool, [Vite+](https://viteplus.dev) 1.2.0 (`vite-plus`, command `vp`), runs everything. It bundles Vitest 5, Oxlint with tsgolint, Oxfmt and tsdown, and reads one `vite.config.ts`. There is no Vite build: the CSS in `src/` is plain and the compiler is the build. The package manager is pnpm (`packageManager` in `package.json`), the runtime is Node 22.18+ (24 recommended), and TypeScript 7 (`tsc`) does the standalone type check.

| Script                    | Runs                                                                  | What it does                                                                                                                                                               |
| ------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm build`              | `generate.ts`, then `cli.ts matrix css`                               | regenerates tokens, themes and color classes, then writes the 262 files into `css/` (238 from v2.1.1 plus the extras)                                                      |
| `pnpm dev`                | `dev-build.ts` under `node --watch-path`                              | rebuilds `dist-dev/` on change                                                                                                                                             |
| `pnpm test`               | `vp test`                                                             | Vitest over `test/**/*.test.ts`                                                                                                                                            |
| `pnpm test:api`           | `dev-build.ts`, then `test/api/check.ts`                              | v2.1.1 API coverage check                                                                                                                                                  |
| `pnpm test:visual`        | `dev-build.ts`, then `test/visual/run.ts`                             | Playwright pixel diff against `test/reference/current`, fails above 0.05% of pixels or 2px of height                                                                       |
| `pnpm test:visual:parity` | `dev-build.ts`, then `test/visual/run.ts --ref test/reference/v2.1.1` | informational pixel diff against v2.1.1, never gated                                                                                                                       |
| `pnpm test:extras`        | `test/visual/extras.ts`                                               | screenshots and axe-core checks for each extra fixture                                                                                                                     |
| `pnpm lint`               | `vp lint`                                                             | Oxlint, type-aware, over `scripts/`, `test/` and `vite.config.ts`                                                                                                          |
| `pnpm fmt`                | `vp fmt`                                                              | Oxfmt for TS, JSON, Markdown, YAML and `src/**/*.css`                                                                                                                      |
| `pnpm check`              | `vp check`                                                            | format check, lint and type check together                                                                                                                                 |
| `pnpm typecheck`          | `tsc -p .`                                                            | TypeScript 7 type check                                                                                                                                                    |
| `pnpm run pack`           | `vp pack`                                                             | tsdown build of `dist/cli.js`, `dist/compiler.js`, `dist/vite.js` and `dist/postcss.js` plus `.d.ts`. Use `pnpm run pack`: plain `pnpm pack` is pnpm's own tarball command |

Notes on the setup:

- Lint runs the `correctness`, `suspicious` and `perf` categories plus the type-aware rules (`no-floating-promises`, `no-misused-promises`, `await-thenable`, `no-unsafe-*`, `restrict-template-expressions` and others) with `typeCheck` on. The few rules turned off, and why, are commented in `vite.config.ts`.
- Oxfmt formats `src/**/*.css` except the files `scripts/generate.ts` writes (`tokens/palette.css`, `tokens/scheme.css`, `themes/`, `colors/`). It only changes whitespace: with the formatted sources, the minified output of ten build variants is byte-identical to the output of the unformatted sources, and the readable output differs only in whitespace inside custom property values. Markdown code samples are left as written.
- Tests moved from `node:test` to Vitest. The assertions still use `node:assert/strict`. The CLI test builds `dist/` with `vp pack` and runs it with `--no-experimental-strip-types`.
- `pnpm-workspace.yaml` holds `minimumReleaseAgeExclude` entries for Vite+ 1.2.0 and Playwright, which pnpm added because those versions are newer than its release age gate. Remove them once the versions are old enough. No dependency needs a build script: Lightning CSS ships prebuilt binaries as optional packages, so nothing needs approving.
- `pnpm-workspace.yaml` sets `autoInstallPeers: false`. The package has optional peers (`vite`, `postcss`), and with auto install pnpm adds a real `vite` that conflicts with the Vite+ alias.
- `.gitattributes` forces LF (`* text=auto eol=lf`) and `.editorconfig` sets the same for editors.

## Testing

- `pnpm test` runs the Vitest suites in `test/integrations/` (root detection, `@pico` and `@source` parsing, the scanner on a fixture tree with `.gitignore` files, the PostCSS plugin, the Vite plugin through `vite build` and `createServer`, the purge command on a fixture folder) and in `test/compiler/`: classless, purge, scope, options, extras, CLI, the review regressions and the browser floor leftovers.
- `test/api/check.ts` compares the built `css/pico.css`, `pico.classless.css`, `pico.conditional.css` and `pico.colors.css` against `test/api/baseline.json`. Every class, attribute hook, `--pico-*` variable and keyframe name from v2.1.1 must exist, unless it is listed as removed in `docs/migration.md`.
- `test/visual/run.ts` loads each fixture with a reference CSS and the new CSS in Chromium at 1280px light, 1280px dark and 375px light, and writes a pixel diff report to `test/visual/report/`. `pnpm test:visual` compares against `test/reference/current`, the reviewed output of this project, with `--gate`: more than 0.05% of differing pixels, or a page height that moved by more than 2px, fails the run. After a deliberate visual change, review the report, then run `node test/visual/freeze.ts` to copy the new `dist-dev` CSS into the baseline. `pnpm test:visual:parity` still compares against v2.1.1, as a report only: since the modern default look ([ADR 0002](adr/0002-modern-default-look.md)) the two differ on purpose.
- `node test/visual/contrast-probe.ts css/pico.*.css` prints the contrast of the key pairs for every theme file in both schemes (buttons, links, muted text on the page, on cards and on menus, secondary text on its fill, the field border and the focus color) and exits 1 when a text pair is under 4.5:1 or a border or focus pair under 3:1.
- The visual harnesses build readable CSS by default, and selector factoring only runs on minified output. To test the shipped form, build with `node scripts/dev-build.ts --minify --out dist-dev-min` and run `node test/visual/run.ts --new dist-dev-min --suffix min`, or run `node test/visual/extras.ts --minify`. Both builds also take `--targets modern`.

## Conventions for source files

- Use logical properties (`margin-inline-start`, `inset-inline-end`, `padding-block`) so RTL works without `[dir=rtl]` overrides where possible. Keep `[dir=rtl]` rules only where logical properties can't express it (background positions, rotated chevrons).
- Use `:where()` to keep specificity at the v2.1.1 level or lower, never higher.
- Use native nesting, but no deeper than three levels.
- Reference tokens only. No raw colors in module files.
- Short `/* */` comments, only where the reason is not obvious. Each file starts with a one-line comment naming the elements it styles, as v2.1.1 did.
