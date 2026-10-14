# Setup

Four ways to get Pico Reforged into a page. The full guide with every framework is `docs/integrations.md` in the repository.

## CDN or a copied file

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@rusticstack/pico-reforged@1.0.0-alpha.0/css/pico.min.css"
/>
```

Files in `css/`, with the same names as Pico CSS v2.1.1:

- `pico.css`, `pico.min.css`: class based, azure theme.
- `pico.<theme>.min.css`: the same with another theme. There is no `pico.azure.css`, azure is the plain file.
- `pico.classless.min.css`, `pico.classless.<theme>.min.css`: no classes, semantic container on.
- `pico.conditional.min.css`, `pico.classless.conditional.<theme>.min.css`: every rule scoped under `.pico`. The classless conditional build has no azure file, only per-theme files such as `pico.classless.conditional.jade.min.css`.
- `pico.fluid.classless.min.css`, `pico.fluid.classless.conditional.<theme>.min.css`: classless with no max width. The fluid classless conditional build also has per-theme files only, such as `pico.fluid.classless.conditional.jade.min.css`.
- `pico.colors.min.css`: `.pico-color-*` and `.pico-background-*`.
- `pico.extras.min.css`: all extras. `extras/<name>.min.css`: one extra.

Themes: amber, azure, blue, cyan, fuchsia, green, grey, indigo, jade, lime, orange, pink, pumpkin, purple, red, sand, slate, violet, yellow, zinc.

Load an extras file after the core file:

```html
<link rel="stylesheet" href=".../css/pico.min.css" />
<link rel="stylesheet" href=".../css/extras/tabs.min.css" />
```

## npm with Vite

```shell
npm install @rusticstack/pico-reforged@next
```

```ts
// vite.config.ts, plugin first
import pico from "@rusticstack/pico-reforged/vite";
export default defineConfig({ plugins: [pico()] });
```

```css
/* the stylesheet your entry imports */
@import "@rusticstack/pico-reforged";

@pico {
  theme: jade;
  extras: tabs badge;
  classless: false;
  scope: none;
  purge: safe;
}

@source "../content";
```

Vite 6.3 or newer. Plugin options: `purge` (`"auto"` purges in `vite build` only, `true`, `false`), `root`, `ignore`, `minify` (leave it off, Vite minifies). The same plugin works for Astro, SvelteKit, Nuxt, React Router, TanStack Start, Solid Start and Qwik. Put `pico()` first.

Without the plugin the same `@import` still resolves to `src/pico.css` through the `style` export condition. You get the full, unpurged file.

Imports:

- `@rusticstack/pico-reforged`: full build.
- `@rusticstack/pico-reforged/classless`, `/colors`, `/extras`, `/extras/tabs`.

## npm with PostCSS (Next.js and others)

```js
// postcss.config.mjs
export default {
  plugins: { "@rusticstack/pico-reforged/postcss": {} },
};
```

Do not put `postcss-import` before it. It purges when `NODE_ENV` is `production`. Options: `purge` (`"auto"`, `true`, `false`), `base`, `ignore`.

## Static generators and the CLI

```shell
npx pico-reforged build --theme jade --extras tabs --minify --out static/css/pico.css
# build the site (hugo, jekyll, eleventy, bun ...), then
npx pico-reforged purge public
```

Commands: `build` (one stylesheet), `matrix [outDir]` (the whole file set), `purge <outDir>`, `themes`, `modules`, `extras`.

Build options: `--config`, `--entry pico|classless|colors|extras`, `--theme <name|#color|file>`, `--extras <list|all>`, `--no-classes`, `--semantic-container`, `--fluid`, `--scope <selector>`, `--exclude <modules>`, `--purge <glob>`, `--safelist <name>`, `--responsive-spacings`, `--no-responsive-typography`, `--no-transitions`, `--no-important`, `--targets <query>`, `--minify`, `--source-map`, `--out <file>`.

Purge options: `--css <glob>`, `--content <glob>`, `--safelist <name>`, `--mode safe|aggressive`, `--keep-types`, `--dry-run`. Only rules inside `@layer pico.*` change.

## `@pico` properties

- `theme`: a name, a color such as `#e5484d`, or a quoted CSS file path.
- `extras`: names, `all` or `none`.
- `classless`, `classes`, `fluid`, `semantic-container`, `responsive-spacings`, `responsive-typography`, `transitions`, `important`: `true` or `false`.
- `scope`: a selector such as `.pico`, or `none`.
- `exclude`: module names such as `components/modal`.
- `targets`: a browserslist query. `minify`: `true` or `false`.
- `purge`: `safe`, `aggressive` or `off`.
- `safelist`: names, `name=value` or `/regex/`.
- `source`: `none` or a quoted folder.

`@source "path"` adds a folder or glob to the scan, `@source not "path"` skips one, `@source inline("a b {c,d}")` names things that count as used. Components in `node_modules` or other workspace packages are not scanned, so add them with `@source`.

## Browser floor

Chrome and Edge 111, Firefox 128, Safari and iOS 16.4. The compiled files lower nesting and `light-dark()` for that floor. There is no legacy build.
