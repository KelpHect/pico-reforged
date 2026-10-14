# Customization

Most changes need no build: override a CSS variable in your own stylesheet. When you need a different bundle (fewer modules, another theme, a scope), use the CLI or the integrations.

## CSS variables

Every value that matters is a `--pico-*` custom property, declared on `:root`. Override it after the Pico stylesheet:

```css
:root {
  --pico-border-radius: 0;
  --pico-font-family: Georgia, serif;
  --pico-spacing: 0.75rem;
}
```

Overrides can sit on any element and apply to its subtree:

```css
article.compact {
  --pico-spacing: 0.5rem;
  --pico-form-element-spacing-vertical: 0.5rem;
}
```

The tokens are in `src/tokens/` (`core.css` for fonts, spacing, radius and sizes, `scheme.css` for colors) and in the module that owns a component, for example `--pico-modal-overlay-background-color` in `src/components/modal.css`. The names are the same as in v2.1.1. The full OKLCH palette is in `css/pico.colors.css` (`--pico-color-azure-550` and so on) together with the `.pico-color-*` and `.pico-background-*` classes.

## Layers and overriding

Every Pico rule is inside the `pico` layer, in this order:

```css
@layer pico.tokens, pico.theme, pico.core, pico.extras, pico.utilities;
```

Tokens come first, the theme after them, then every component, then the extras, then the color utilities. CSS you write outside a layer always beats all of it, whatever the selector weight, so you never need `!important` or a more specific selector:

```css
button {
  text-transform: uppercase;
}
```

To keep your own rules organized, put them in a layer declared after Pico:

```css
@layer app {
  button {
    text-transform: uppercase;
  }
}
```

A rule in an unlayered block beats a rule in `@layer app`, and `@layer app` beats `pico`. You can also add rules to a Pico layer, for example `@layer pico.core { ... }`, when you want the usual cascade between modules.

Pico selectors use `:where()` in many places to keep specificity low. If one of your rules does not win, check that it is not inside an earlier layer.

## Themes

There are 20 themes: amber, azure (the default), blue, cyan, fuchsia, green, grey, indigo, jade, lime, orange, pink, pumpkin, purple, red, sand, slate, violet, yellow and zinc. A theme only sets the primary tokens: `--pico-primary`, `--pico-primary-background`, `--pico-primary-underline`, `--pico-primary-hover`, `--pico-primary-hover-background`, `--pico-primary-focus`, `--pico-primary-inverse`, `--pico-text-selection-color` and `--pico-switch-thumb-box-shadow`. The neutral colors are shared.

Use a ready-made file, `css/pico.jade.min.css`, or build one:

```sh
pico-reforged build --theme jade --minify --out public/pico.css
```

### A theme from one color

The compiler builds a 19-step scale from one color, using the lightness curve of the azure scale, then maps the steps like a built-in theme. Text on the primary color is black or white, whichever has more contrast.

```sh
pico-reforged build --theme "#e5484d" --minify --out public/pico.css
```

In a config file the same is `theme: { color: "#e5484d" }` or `theme: { hue: 25, chroma: 0.19 }`. In a stylesheet with the Vite or PostCSS integration it is `@pico { theme: "#e5484d"; }`. A `theme` can also be the path of a CSS file: the default theme is used first, then your file, so you only write the tokens you change.

### A theme at run time

Without a build, derive the primary tokens from one color with relative color syntax. [`examples/custom-theme.html`](../examples/custom-theme.html) does this:

```css
:root,
[data-theme] {
  --brand: oklch(0.62 0.19 25);
  --pico-primary: light-dark(oklch(from var(--brand) 0.5 c h), oklch(from var(--brand) 0.75 c h));
  --pico-primary-background: oklch(from var(--brand) 0.5 c h);
  --pico-primary-inverse: oklch(1 0 0);
}
```

Relative color syntax needs Chrome and Edge 119, Firefox 128 or Safari 16.4, so it is newer than the Chrome and Edge 111 floor. On Chrome and Edge 111 to 118 the example above is ignored and the theme falls back to the built-in colors. `light-dark()` in your own CSS is native from Chrome 123, Firefox 120 and Safari 17.5. Below that, the CLI theme is the safer choice, because the compiler lowers `light-dark()` for the floor and your own stylesheet is not compiled.

## Dark mode and `data-theme`

The default is `color-scheme: light dark`, so the page follows the system. Colors are written once with `light-dark()`. To force a scheme, set `data-theme` on `html` or on any element:

```html
<html data-theme="dark"></html>
<section data-theme="light">...</section>
```

`data-theme` only sets `color-scheme`, and the color tokens are recomputed inside that element, so a light card on a dark page works. To let users switch, toggle the attribute in a script and keep it in `localStorage`.

## Scoped builds

The conditional files style only what is inside `.pico`, and leave the rest of the page to your own CSS or another framework:

```html
<link rel="stylesheet" href="css/pico.conditional.min.css" />
<main class="pico">...</main>
```

For another selector, build it: `pico-reforged build --scope .docs --minify --out docs.css`. `:root` and `html` rules, the `*`, `body` and `.container` rules and the `.modal-is-*` classes on `html` stay global, as in v2.1.1.

## A custom bundle

`pico-reforged build` writes one stylesheet. Combine the options you need:

```sh
pico-reforged build \
  --theme "#e5484d" \
  --exclude components/modal,forms/input-range \
  --extras tabs,badge \
  --minify \
  --out public/pico.css
```

| Flag                                 | Effect                                                         |
| ------------------------------------ | -------------------------------------------------------------- |
| `--entry classless`                  | the classless build (`pico`, `classless`, `colors`, `extras`)  |
| `--no-classes`                       | drop every selector that needs a class                         |
| `--semantic-container`, `--fluid`    | style `body > header, main, footer` as a container, full width |
| `--scope <selector>`                 | prefix every rule                                              |
| `--exclude <list>`                   | leave modules out, see `pico-reforged modules`                 |
| `--extras <list>`                    | add extras, or `all`, see `pico-reforged extras`               |
| `--responsive-spacings`              | scale spacings with the viewport                               |
| `--no-responsive-typography`         | keep the root font size fixed                                  |
| `--no-transitions`, `--no-important` | remove motion, strip `!important`                              |
| `--targets <query>`                  | browserslist query, default is the browser floor               |

Put the same options in `pico.config.json`, or a `pico.config.ts` that exports them, and run `pico-reforged build`. The compiler is also a function: `import { compile } from "@rusticstack/pico-reforged/compiler"`.

Excluding a module also drops the custom properties that only it used.

## Purge

Purging removes the rules your pages cannot use. Three ways to do it:

- With the Vite or PostCSS integration, `@pico { purge: safe; }` is the default in production. It drops a rule only when a class, an id or an attribute name it needs is not in your sources. `purge: aggressive` also judges tag names and attribute values, and `purge: off` turns it off. Add run-time names with `@source inline("name")` or `safelist`. See [integrations](integrations.md).
- With the CLI, on a build: `pico-reforged build --purge "site/**/*.html" --safelist modal-is-open`. This judges tags and values too, so list anything a script adds.
- On a built site, `pico-reforged purge public` rewrites the Pico rules in the CSS files of the folder, in `safe` mode unless you pass `--mode aggressive`. Use `--dry-run` first.

Custom properties are never purged, and rules outside the Pico layers, which are your own, are never touched.
