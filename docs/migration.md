# Coming from Pico CSS v2.1.1

Pico Reforged keeps the public surface of Pico CSS v2.1.1: the CDN file names, the classes, the attribute hooks and the `--pico-*` variables. For most pages the migration is one URL.

## Drop-in path

Change the package and the path:

```html
<!-- before -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css" />

<!-- after -->
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@rusticstack/pico-reforged@1.0.0-alpha.0/css/pico.min.css"
/>
```

Every file of v2.1.1 exists under the same name in `css/`: `pico`, `pico.classless`, `pico.conditional`, `pico.classless.conditional`, `pico.fluid.classless` and `pico.fluid.classless.conditional`, each plain and in the themes: 20 for the first four builds (azure is the file without a theme part), 19 for the two scoped class-less ones, which have no azure file (`pico.jade.min.css`, `pico.classless.jade.min.css`), each minified and not, plus `pico.colors`. The 238 files of v2.1.1 are all there, with 24 more for the extras.

In npm projects, replace `@picocss/pico` with `@rusticstack/pico-reforged` in your imports. The default export is `css/pico.min.css`. `@rusticstack/pico-reforged/classless` and `@rusticstack/pico-reforged/colors` replace the old `css/pico.classless.min.css` and `css/pico.colors.min.css` paths. The old `@picocss/pico/css/...` file paths still work as `@rusticstack/pico-reforged/css/...`.

### API check

`test/api/check.ts` extracts the public surface of the v2.1.1 build (every class, attribute hook, element, `--pico-*` variable and keyframe name) into `test/api/baseline.json` and checks the built `css/pico.css`, `pico.classless.css`, `pico.conditional.css` and `pico.colors.css` against it. All four pass. Nothing from v2.1.1 is missing, and `test/api/removed.json`, the list of deliberate removals, is empty.

The build only adds names: the `popover`, `popover=hint` and `role=tooltip` attribute hooks, the `menu` element, and the variables `--pico-container-max-width` and `--pico-form-label-font-weight`. The classless build also gains the dropdown and grid variables, because those rules now read them.

## What looks different

`pnpm test:visual` renders the same fixtures with the v2.1.1 CSS and the new CSS in Chromium and diffs the screenshots. At 1280px and 375px, light and dark, the kitchen sink and its classless version differ by 0.001% to 0.003% of the pixels, the colors, modal and fluid classless fixtures by 0.000%, and the scoped `.pico` fixture by about 0.005%. Page heights are identical. What remains is rounding in the colors.

- Colors. The hex palette was converted once to OKLCH and rounded to four decimals, so a computed color can differ slightly from v2.1.1. Semantic tokens that v2.1.1 built with Sass `mix()` were converted from the computed result.
- Muted text in dark mode. `--pico-muted-color` in the dark scheme moved one palette step lighter (zinc 450 to zinc 400) so muted text on the dark background passes WCAG AA (4.5:1). v2.1.1 fell just short. Light mode is unchanged.
- Right to left. With `dir="rtl"` the v2.1.1 CSS used physical properties in a few places, and they now use logical ones. In a kitchen sink page set to `dir="rtl"` the differences are the nav spacing, the gap before the file input button, the date input icon (it moves to the inline end) and the rounded corners of `role="group"` (the first and last control round on the correct sides). The first three are visible fixes, not regressions. Pages in `ltr` are unaffected.
- Modal. `.modal-is-open`, `.modal-is-opening` and `.modal-is-closing` still work as before. A `<dialog>` opened with `showModal()` and no classes now animates in and out on its own, using `@starting-style` and `transition-behavior: allow-discrete`. Where those are not supported it opens without animation.
- Accordion. `<details>` opens with an animated height where `::details-content` and `interpolate-size` exist, and instantly elsewhere. `details[name]` groups open one at a time.
- Dropdown, tooltip and popover. The `details.dropdown` and `[data-tooltip]` markup is untouched. New patterns sit next to them, see below.

One more thing you may notice: the stylesheet sits inside cascade layers, see [customization](customization.md).

## Browser floor

v2.1.1 was built for the browsers of its time with a browserslist `defaults` query. Pico Reforged supports Chrome and Edge 111, Firefox 128 and Safari and iOS Safari 16.4, the same floor as Tailwind CSS v4. There is no legacy build and no unlayered build, and browsers below the floor are not tested. If you must support them, stay on v2.1.1 or pass your own `targets` to the compiler. See [browser support](browser-support.md).

## Sass users

The Sass source is gone. Everything it did is either a CSS variable or a compiler option. For a one-off change, write CSS. For a different bundle, use `pico-reforged build` or the `compile()` function from `@rusticstack/pico-reforged/compiler`, with the options in `pico.config.json`, `pico.config.ts` or flags.

| v2.1.1 Sass                     | Pico Reforged                                                                                                          |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `$modules`                      | `modules` or `exclude` option, `--exclude components/modal`                                                            |
| `$theme-color`                  | `theme` option, `--theme jade`, or `--theme "#e5484d"` for a color that is not in the list                             |
| `$enable-classes: false`        | `classes: false`, `--no-classes`, or the classless entry                                                               |
| `$enable-semantic-container`    | `semanticContainer`, `--semantic-container`                                                                            |
| `$enable-viewport: false`       | `fluid: true`, `--fluid`                                                                                               |
| `$parent-selector: ".pico"`     | `scope: ".pico"`, `--scope .pico`                                                                                      |
| `$enable-responsive-typography` | `responsiveTypography: false`, `--no-responsive-typography`                                                            |
| `$enable-responsive-spacings`   | `responsiveSpacings: true`, `--responsive-spacings`                                                                    |
| `$enable-transitions: false`    | `transitions: false`, `--no-transitions`                                                                               |
| `$enable-important: false`      | `important: false`, `--no-important`                                                                                   |
| `$css-var-prefix`               | not kept, `--pico-` is part of the public API                                                                          |
| `$semantic-root-element`        | not kept, the semantic container targets `body`                                                                        |
| `$breakpoints`                  | not an option. Edit the media queries, or override `--pico-container-max-width` and the root font size in your own CSS |

Customizing values, which used to be Sass variable overrides, is now a CSS variable override in your own stylesheet, for example `:root { --pico-border-radius: 0; }`. Colors, spacing, fonts and form tokens all have a `--pico-*` variable. See [customization](customization.md).

A Sass project that did `@use "pico" with ($theme-color: "jade")` becomes a link to `css/pico.jade.min.css`, or a Vite or PostCSS import with `@pico { theme: jade; }`.

## Using the new features

- Extras. Link `css/pico.extras.min.css` after `pico.css`, or one file such as `css/extras/tabs.min.css`. They are tabs, alert, toast, badge, avatar, skeleton, app-shell, data-table, pagination, stepper and empty-state, driven by semantic HTML and ARIA. See `examples/dashboard.html`.
- Popover. A `<button popovertarget="m">` plus `<ul popover id="m">` is a dropdown menu placed under its button with anchor positioning. `<div popover="hint">` or `[popover][role="tooltip"]` is a tooltip. A bare popover with an `<article>` inside looks like a card. See `examples/popover.html`.
- Custom themes. `pico-reforged build --theme "#e5484d"` generates a full theme from one color. Without a build, `examples/custom-theme.html` derives the primary tokens from a `--brand` color with relative color syntax.
- Integrations. Import `@rusticstack/pico-reforged` in your CSS and add the Vite or PostCSS plugin to purge unused rules in production, see [integrations](integrations.md).
- Scoped and classless builds work as before. The CLI is the new way to make one that has no file in `css/`.
