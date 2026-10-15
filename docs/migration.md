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
  href="https://cdn.jsdelivr.net/npm/@rusticstack/pico-reforged@2.0.0/css/pico.min.css"
/>
```

Every file of v2.1.1 exists under the same name in `css/`: `pico`, `pico.classless`, `pico.conditional`, `pico.classless.conditional`, `pico.fluid.classless` and `pico.fluid.classless.conditional`, each plain and in the themes: 20 files for `pico`, `pico.classless`, `pico.conditional` and `pico.fluid.classless` (azure is the file without a theme part), and 19 for `pico.classless.conditional` and `pico.fluid.classless.conditional`, which have no azure file. Each is minified and not, plus `pico.colors`. The 238 files of v2.1.1 are all there, with 24 more for the extras.

In npm projects, replace `@picocss/pico` with `@rusticstack/pico-reforged` in your imports. The default export is `css/pico.min.css`. `@rusticstack/pico-reforged/classless` and `@rusticstack/pico-reforged/colors` replace the old `css/pico.classless.min.css` and `css/pico.colors.min.css` paths. The old `@picocss/pico/css/...` file paths still work as `@rusticstack/pico-reforged/css/...`.

### API check

`test/api/check.ts` extracts the public surface of the v2.1.1 build (every class, attribute hook, element, `--pico-*` variable and keyframe name) into `test/api/baseline.json` and checks the built `css/pico.css`, `pico.classless.css`, `pico.conditional.css` and `pico.colors.css` against it. All four pass. Nothing from v2.1.1 is missing, and `test/api/removed.json`, the list of deliberate removals, is empty.

The build only adds names: the `popover`, `popover=hint` and `role=tooltip` attribute hooks, the `menu` element, and the variables `--pico-container-max-width`, `--pico-form-label-font-weight`, `--pico-card-border-radius`, `--pico-primary-subtle-background` and `--pico-primary-subtle-border` (the tint behind selected and current items). The classless build also gains the dropdown and grid variables, because those rules now read them.

## What looks different

The markup, the class names and the variables are the same, but the default look is not. This release replaces the v2.1.1 look with a denser, quieter one on purpose, see [ADR 0002](adr/0002-modern-default-look.md). Pages keep working; they look newer.

| Area             | v2.1.1                                                | This release                                                                               |
| ---------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Root font size   | grows at every breakpoint, 131.25% (21px) from 1536px | 100%, one step to 106.25% from 1536px                                                      |
| Density          | controls 62px tall at 1440px, 0.75rem by 1rem padding | controls 42px tall, 0.5rem by 0.75rem padding; cards and sections pad 1.25rem              |
| Radius           | 0.25rem                                               | 0.5rem on controls, 0.75rem (`--pico-card-border-radius`) on cards, menus and alerts       |
| Shadows          | seven soft grey layers                                | a 1px ring plus two short drops; cards have no CSS border                                  |
| Dark scheme      | navy background, cards without a visible edge         | near-neutral background with lighter surfaces for fields, cards, code and menus            |
| Secondary button | solid slate with white text                           | tonal: light grey fill, dark text, a visible border                                        |
| Focus            | translucent ring on `:focus`                          | solid outline on `:focus-visible` for buttons and links, a soft ring plus border on fields |
| Headings         | 700, h1 2rem                                          | 600, h1 2.25rem, tighter letter spacing, balanced wrapping                                 |
| Lists            | square markers                                        | disc markers in the muted color                                                            |
| Tables           | bold header, 3px rule                                 | muted 0.875em header at 500, 1px rule, tabular numbers                                     |
| Badges, alerts   | solid pills, a 4px stripe on alerts                   | soft tinted badges (`data-badge="contrast"` stays solid), bordered and tinted alerts       |

Accessibility improved along the way: field borders reach 3:1 against the page (v2.1.1 did not), focus colors are opaque and reach 3:1 in every theme, and muted text reaches 6:1.

Other changes you may notice:

- Right to left. With `dir="rtl"` the v2.1.1 CSS used physical properties in a few places, and they now use logical ones: the nav spacing, the gap before the file input button, the date input icon and the rounded corners of `role="group"`.
- Modal. `.modal-is-open`, `.modal-is-opening` and `.modal-is-closing` still work. A `<dialog>` opened with `showModal()` and no classes now animates in and out on its own, using `@starting-style` and `transition-behavior: allow-discrete`. Where those are not supported it opens without animation.
- Accordion. `<details>` opens with an animated height where `::details-content` and `interpolate-size` exist, and instantly elsewhere. `details[name]` groups open one at a time.
- Dropdown, tooltip and popover. The `details.dropdown` and `[data-tooltip]` markup is untouched. New patterns sit next to them, see below.
- Nav. `nav` and its lists wrap on a narrow screen instead of running off it, and a dropdown summary in a nav keeps its label and chevron on one line.
- Media. `video`, `canvas` and `iframe` never grow wider than their container. Video and canvas keep their aspect ratio, an iframe keeps its `height`. An element that is meant to be wider than its container, like a scaled preview frame, needs `max-inline-size: none`.
- Disabled buttons. A filled button with `disabled` (or inside a disabled fieldset) turns a neutral grey in both schemes instead of a faded primary. Outline buttons still fade.
- Read-only fields get a muted fill so they do not look editable.
- Full-width controls. As in v2.1.1, `input[type="submit"]`, `[type="button"]`, `[type="reset"]` and `button[type="submit"]` take the full width of their container. This is kept for compatibility. For a content-width submit button, set `inline-size: auto` on it, or put it in a `role="group"`.
- The stylesheet sits inside cascade layers, see [customization](customization.md).

`pnpm test:visual:parity` still renders the fixtures with the v2.1.1 CSS and the new CSS and writes a diff report. It is informational: the differences are expected.

### Getting the v2.1.1 look back

Load this after Pico Reforged. It restores the sizes, spacing, radius, fonts and motion:

```css
/* Classic v2.1.1 look, as close as tokens allow. Load after Pico Reforged. */
:root {
  --pico-border-radius: 0.25rem;
  --pico-card-border-radius: 0.25rem;
  --pico-form-element-spacing-vertical: 0.75rem;
  --pico-form-element-spacing-horizontal: 1rem;
  --pico-block-spacing-vertical: var(--pico-spacing);
  --pico-block-spacing-horizontal: var(--pico-spacing);
  --pico-nav-link-spacing-vertical: 0.5rem;
  --pico-nav-link-spacing-horizontal: 0.5rem;
  --pico-nav-element-spacing-vertical: 1rem;
  --pico-nav-breadcrumb-divider: ">";
  --pico-font-family-sans-serif:
    system-ui, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, Helvetica, Arial, "Helvetica Neue",
    sans-serif, var(--pico-font-family-emoji);
  --pico-font-family-monospace:
    ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace,
    var(--pico-font-family-emoji);
  --pico-form-label-font-weight: var(--pico-font-weight);
  --pico-transition: 0.2s ease-in-out;
  --pico-text-underline-offset: 0.1rem;
  --pico-button-box-shadow: 0 0 0 transparent;
  --pico-button-hover-box-shadow: 0 0 0 transparent;
  --pico-group-box-shadow-focus-with-button: 0 0 0 var(--pico-outline-width)
    var(--pico-primary-focus);
  --pico-group-box-shadow-focus-with-input: 0 0 0 0.0625rem var(--pico-form-element-border-color);
}
@media (width >= 576px) {
  :root {
    --pico-font-size: 106.25%;
  }
}
@media (width >= 768px) {
  :root {
    --pico-font-size: 112.5%;
  }
}
@media (width >= 1024px) {
  :root {
    --pico-font-size: 118.75%;
  }
}
@media (width >= 1280px) {
  :root {
    --pico-font-size: 125%;
  }
}
@media (width >= 1536px) {
  :root {
    --pico-font-size: 131.25%;
  }
}
```

The colors are a second block: the v2.1.1 values of every core color token that changed, plus the azure focus color and the switch thumb shadow. The extras (badge, alert, avatar and the others) also changed their own `--pico-<extra>-*` values; this block does not cover them. It uses `light-dark()` as written, which needs Chrome 123, Firefox 120 or Safari 17.5. For older browsers in the support range, put it through the compiler or split it into a light and a dark block. Other themes than azure had their own `--pico-primary-focus`, at the 400 step with alpha 0.5 in light and the 350 step with alpha 0.375 in dark.

```css
/* v2.1.1 colors. Load after Pico Reforged. */
:root,
:host,
[data-theme] {
  --pico-background-color: light-dark(oklch(1 0 0), oklch(0.203 0.017 266));
  --pico-color: light-dark(oklch(0.355 0.016 260), oklch(0.829 0.014 262));
  --pico-muted-color: light-dark(oklch(0.527 0.024 264), oklch(0.656 0.03 265));
  --pico-muted-border-color: light-dark(oklch(0.936 0.008 263), oklch(0.268 0.024 264));
  --pico-secondary-background: oklch(0.485 0.047 265);
  --pico-secondary-border: var(--pico-secondary-background);
  --pico-secondary-hover-background: light-dark(oklch(0.442 0.042 266), oklch(0.528 0.05 265));
  --pico-secondary-hover-border: var(--pico-secondary-hover-background);
  --pico-secondary-focus: light-dark(oklch(0.528 0.05 265 / 0.25), oklch(0.699 0.05 267 / 0.25));
  --pico-secondary-inverse: oklch(1 0 0);
  --pico-contrast-background: light-dark(oklch(0.227 0.019 266), oklch(0.958 0.0046 258));
  --pico-contrast-hover-background: light-dark(oklch(0 0 0), oklch(1 0 0));
  --pico-contrast-focus: light-dark(oklch(0.528 0.05 265 / 0.25), oklch(0.872 0.019 266 / 0.25));
  --pico-contrast-inverse: light-dark(oklch(1 0 0), oklch(0 0 0));
  --pico-box-shadow: 0.0145rem 0.029rem 0.174rem light-dark(oklch(0.657 0.057 266 / 0.01698), oklch(0.1369 0.0084 264.67 / 0.01698)), 0.0335rem 0.067rem 0.402rem light-dark(oklch(0.657 0.057 266 / 0.024), oklch(0.1369 0.0084 264.67 / 0.024)), 0.0625rem 0.125rem 0.75rem light-dark(oklch(0.657 0.057 266 / 0.03), oklch(0.1369 0.0084 264.67 / 0.03)), 0.1125rem 0.225rem 1.35rem light-dark(oklch(0.657 0.057 266 / 0.036), oklch(0.1369 0.0084 264.67 / 0.036)), 0.2085rem 0.417rem 2.502rem light-dark(oklch(0.657 0.057 266 / 0.04302), oklch(0.1369 0.0084 264.67 / 0.04302)), 0.5rem 1rem 6rem light-dark(oklch(0.657 0.057 266 / 0.06), oklch(0.1369 0.0084 264.67 / 0.06)), 0 0 0 0.0625rem light-dark(oklch(0.657 0.057 266 / 0.015), oklch(0.1369 0.0084 264.67 / 0.015));
  --pico-h1-color: light-dark(oklch(0.312 0.014 262), oklch(0.958 0.003 265));
  --pico-h2-color: light-dark(oklch(0.355 0.016 260), oklch(0.915 0.006 255));
  --pico-h3-color: light-dark(oklch(0.397 0.018 264), oklch(0.829 0.014 262));
  --pico-h4-color: light-dark(oklch(0.44 0.02 263), oklch(0.785 0.018 264));
  --pico-h5-color: light-dark(oklch(0.498 0.023 263), oklch(0.743 0.022 262));
  --pico-h6-color: light-dark(oklch(0.527 0.024 264), oklch(0.656 0.03 265));
  --pico-table-row-stripped-background-color: oklch(0.57 0.026 261 / 0.0375);
  --pico-code-background-color: light-dark(oklch(0.9681 0.0034 258.32), oklch(0.2371 0.02 265.5));
  --pico-code-color: light-dark(oklch(0.527 0.024 264), oklch(0.656 0.03 265));
  --pico-form-element-background-color: light-dark(oklch(0.989 0.001 258), oklch(0.248 0.0214 265));
  --pico-form-element-selected-background-color: light-dark(oklch(0.915 0.012 265), oklch(0.313 0.029 265));
  --pico-form-element-border-color: light-dark(oklch(0.872 0.019 266), oklch(0.313 0.029 265));
  --pico-form-element-color: light-dark(oklch(0.268 0.012 264), oklch(0.915 0.006 255));
  --pico-form-element-placeholder-color: light-dark(var(--pico-muted-color), oklch(0.656 0.03 265));
  --pico-form-element-active-background-color: light-dark(oklch(1 0 0), oklch(0.2371 0.02 265.5));
  --pico-form-element-active-border-color: var(--pico-primary-border);
  --pico-form-element-focus-color: var(--pico-primary-border);
  --pico-switch-background-color: light-dark(oklch(0.829 0.027 267), oklch(0.356 0.034 264));
  --pico-range-border-color: light-dark(oklch(0.915 0.012 265), oklch(0.268 0.024 264));
  --pico-range-active-border-color: light-dark(oklch(0.829 0.027 267), oklch(0.313 0.029 265));
  --pico-range-thumb-color: var(--pico-secondary-background);
  --pico-accordion-open-summary-color: var(--pico-muted-color);
  --pico-card-background-color: light-dark(var(--pico-background-color), oklch(0.227 0.019 266));
  --pico-card-border-color: light-dark(var(--pico-muted-border-color), var(--pico-card-background-color));
  --pico-card-sectioning-background-color: light-dark(oklch(0.989 0.001 258), oklch(0.2371 0.02 265.5));
  --pico-dropdown-background-color: light-dark(oklch(1 0 0), oklch(0.227 0.019 266));
  --pico-dropdown-border-color: light-dark(oklch(0.958 0.0046 258), oklch(0.268 0.024 264));
  --pico-dropdown-box-shadow: var(--pico-box-shadow);
  --pico-dropdown-hover-background-color: light-dark(oklch(0.958 0.0046 258), oklch(0.268 0.024 264));
  --pico-modal-overlay-background-color: light-dark(oklch(0.936 0.005 258 / 0.75), oklch(0.1365 0.004 256.38 / 0.75));
  --pico-progress-background-color: light-dark(oklch(0.915 0.012 265), oklch(0.268 0.024 264));
  --pico-tooltip-background-color: var(--pico-contrast-background);
  --pico-tooltip-color: var(--pico-contrast-inverse);
  --pico-primary-focus: light-dark(oklch(0.658 0.1564 242.2 / 0.5), oklch(0.707 0.1679 242.1 / 0.375));
  --pico-switch-thumb-box-shadow: 0 0 0 oklch(0 0 0 / 0);
}
```

Variables cannot bring back:

- The heading weights and scale, and the per-heading letter spacing.
- Square list markers and the bold table header with its thick rule.
- The focus behavior: buttons and links now show their ring on `:focus-visible` only, not after a mouse click, and fields show a wide soft ring instead of a 1px line.
- The solid default badges and the alert stripe (the extras).
- The tooltip size and padding.

Write rules for these in your own unlayered CSS if you need them.

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
