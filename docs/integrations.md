# Integrations

Install the package, import it once in your CSS, and the production stylesheet holds only what your app uses. This works like `@import "tailwindcss"`: the integration finds the stylesheet that imports Pico Reforged, reads the project's sources, and compiles the CSS for you.

```css
/* src/app.css */
@import "@rusticstack/pico-reforged";
```

How it picks the rules:

- In development the full stylesheet is served. Nothing is scanned, so there is nothing to wait for.
- In production the project is scanned and a rule is kept when at least one of its selectors could match something in the sources. The check looks at tags, classes, ids and attributes (with their values) only. Pseudo-classes are ignored, so `button:hover` stays when `button` is used.
- Correctness comes first. A scan that finds no file never purges. Classes, tags and attributes that a script sets are read from the script text. `a`, `img` and `h1` to `h6` are always kept, because link and image components (`next/link`, `next/image`, `RouterLink`, `NuxtLink`, Astro `Image`) and run-time heading levels write those tags without them appearing in the sources. When the project writes HTML at run time (Markdown, a rich text or CMS renderer, `marked`, `showdown`, `remark`, `innerHTML`, `v-html`, `dangerouslySetInnerHTML`, `{@html}`, `| safe`, `{{{x}}}`, `mark_safe`, `html_safe`, `Html.Raw`, `template.HTML`, `th:utext`), or fetches server-rendered fragments (`hx-get` and the other htmx attributes, Turbo, Unpoly, Livewire, LiveView, Datastar), the common content and form tags (`p`, `ul`, `table`, `blockquote`, `code`, `button`, `label`, `select`, `dialog`, `input` and so on) are kept. Fragment code also keeps the `type`, `role`, `disabled`, `aria-busy` and `aria-invalid` rules. A file over 1 MB counts as a source that writes HTML at run time. Class names that only appear in markup you cannot scan still need `@source` or a safelist.
- Rules that live outside the Pico layers (your own CSS) are never touched.
- How much you save depends on the page. The root variables, the base reset and the color scheme tokens always stay. A page that uses most of Pico gets about 10% less CSS; a small page (headings, paragraphs, links, a button) gets about 60% less.

Contents: [Vite](#vite), [Astro](#astro), [SvelteKit](#sveltekit), [Nuxt](#nuxt), [React Router and other Vite apps](#react-router-and-other-vite-apps), [Next.js](#nextjs), [Plain HTML and CDN](#plain-html-and-cdn), [Static generators](#static-generators-and-bun), [Configuration](#configuration), [What the scan reads](#what-the-scan-reads), [Safelist and `@source` for scripts](#scripts-that-toggle-things), [Checking the result](#checking-the-result).

## Vite

```shell
npm install @rusticstack/pico-reforged
```

```ts
// vite.config.ts
import { defineConfig } from "vite";
import pico from "@rusticstack/pico-reforged/vite";

export default defineConfig({
  plugins: [pico()],
});
```

```css
/* src/app.css, imported from your entry file */
@import "@rusticstack/pico-reforged";
```

Vite 6.3 or newer (Vite 8 included). The plugin runs before Vite's own CSS handling (`enforce: "pre"`), replaces the import with the compiled stylesheet, and removes the `@pico` and `@source` rules from the file.

Options:

| Option   | Default  | What it does                                                                                   |
| -------- | -------- | ---------------------------------------------------------------------------------------------- |
| `purge`  | `"auto"` | `"auto"` purges in `vite build` only, `true` always, `false` never                             |
| `root`   | detected | folder the automatic scan starts from (nearest `package.json` above the stylesheet by default) |
| `ignore` | none     | extra folder names or paths the scan skips (the build output folder is skipped for you)        |
| `minify` | `false`  | Vite minifies CSS itself, so leave this off                                                    |

A script can import the package too. `import "@rusticstack/pico-reforged";` is treated as a root with the default settings, so it is purged as well. Use a stylesheet when you need `@pico` or `@source`.

Without the plugin the same `@import` still works: the `style` export condition points bundlers at `src/pico.css`. You get the full, unpurged stylesheet. That file is the plain source: it still holds nesting and `light-dark()`, which are below the Chrome 111 and Safari 16.4 floor unless your bundler lowers them. The plugin compiles for the floor itself.

## Astro

```js
// astro.config.mjs
import { defineConfig } from "astro/config";
import pico from "@rusticstack/pico-reforged/vite";

export default defineConfig({
  vite: { plugins: [pico()] },
});
```

```astro
---
// src/layouts/Base.astro
import "../styles/app.css";
---
```

`.astro`, `.md` and `.mdx` files are scanned. Markdown renders to tags that are not in the source, so the content tags stay.

## SvelteKit

```ts
// vite.config.ts
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import pico from "@rusticstack/pico-reforged/vite";

export default defineConfig({
  plugins: [pico(), sveltekit()],
});
```

```svelte
<!-- src/routes/+layout.svelte -->
<script>
  import "../app.css";
</script>
<slot />
```

## Nuxt

```ts
// nuxt.config.ts
import pico from "@rusticstack/pico-reforged/vite";

export default defineNuxtConfig({
  css: ["~/assets/css/app.css"],
  vite: { plugins: [pico()] },
});
```

```css
/* assets/css/app.css */
@import "@rusticstack/pico-reforged";
```

## React Router and other Vite apps

React Router (framework mode), TanStack Start, Remix on Vite, Solid Start, Qwik and anything else that is configured through `vite.config.ts` take the same plugin:

```ts
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import pico from "@rusticstack/pico-reforged/vite";

export default defineConfig({
  plugins: [pico(), reactRouter()],
});
```

Put `pico()` first. Server and client builds both compile the stylesheet, and the second one reuses the first one's work.

## Next.js

Next.js 16 (Turbopack and webpack) reads `postcss.config.mjs`. Put the plugin first and do not add `postcss-import` before it.

```shell
npm install @rusticstack/pico-reforged postcss
```

```js
// postcss.config.mjs
export default {
  plugins: {
    "@rusticstack/pico-reforged/postcss": {},
  },
};
```

```css
/* app/globals.css */
@import "@rusticstack/pico-reforged";
```

```tsx
// app/layout.tsx
import "./globals.css";
```

The plugin purges when `NODE_ENV` is `production` (`next build`) and gives the full stylesheet in `next dev`. Options go in the object: `{ "@rusticstack/pico-reforged/postcss": { purge: true } }`. `purge` is `"auto"`, `true` or `false`. `base` sets the scan folder, `ignore` adds skipped folders.

Notes:

- The plugin reports every scanned file as a `dependency` message and every folder that holds one as a `dir-dependency` with a flat `*` glob. The project folder itself is never reported as a folder, because Next.js recursed without end on that when `distDir` was not the default (Tailwind skips it for the same reason).
- Other PostCSS tools (Parcel, webpack with `postcss-loader`, Vite with `css.postcss`) use the same plugin. In Vite prefer the Vite plugin.

## Plain HTML and CDN

No build step: link the CDN file or a copy of `css/pico.min.css`.

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@rusticstack/pico-reforged/css/pico.min.css" />
```

Opt-in extras are separate files (`pico.extras.min.css`, `extras/tabs.min.css`). To trim the file before you deploy, use the [purge command](#static-generators-and-bun) on the folder you publish. It works on the CDN copy too, because that file keeps its `@layer pico.*` blocks.

## Static generators and Bun

Hugo, Jekyll, Eleventy, Zola, Bun builds, or anything that writes a folder of HTML. Build the site, then purge the output:

```shell
# 1. Get the CSS into your site once (copy a file, or compile with options)
npx pico-reforged build --theme jade --extras tabs --minify --out static/css/pico.css

# 2. Build the site (hugo, jekyll build, eleventy, bun build ...), then:
npx pico-reforged purge public
```

`pico-reforged purge <outDir>` reads every text file in the folder (HTML, JS and so on, up to 32 MB each) and rewrites the built CSS files in place.

| Flag                | What it does                                                                                         |
| ------------------- | ---------------------------------------------------------------------------------------------------- |
| `--css <glob>`      | stylesheets to rewrite, relative to `outDir`. Default `**/*.css`. Repeatable                         |
| `--content <glob>`  | more files to read names from, for templates that are not in `outDir` (a server's views). Repeatable |
| `--safelist <name>` | keep a class, id, tag or attribute. `/regex/` works. Repeatable                                      |
| `--keep-types`      | keep rules that only lack tags in the content. Use it when the HTML comes from a CMS or a database   |
| `--dry-run`         | print what would change, write nothing                                                               |

The command only touches rules inside `@layer pico.*` blocks, at the top level or inside a wrapper layer such as `@layer base { @layer pico.core { ... } }`. Everything else in the file, your own CSS above all, is written back exactly as it was. A file without a Pico layer is skipped. If a minifier or bundler removed the layers, the command changes nothing and says so.

In a Bun project with `Bun.build`, run the purge command after the build step in your `package.json` script: `"build": "bun run build.ts && pico-reforged purge dist"`.

## Configuration

Configuration sits in the stylesheet that imports Pico Reforged, next to the import. It is plain CSS: an unknown at-rule is valid CSS, and the plugin removes these rules from the output.

```css
@import "@rusticstack/pico-reforged";

@pico {
  theme: jade;
  extras: tabs badge;
  classless: false;
  scope: none;
  purge: auto;
  safelist: aria-busy /^htmx-/;
}

@source "../content";
@source not "../src/legacy";
@source inline("modal-is-open aria-busy");
```

### Imports

| Import                                   | Gives you                                            |
| ---------------------------------------- | ---------------------------------------------------- |
| `@rusticstack/pico-reforged`             | the full build (`pico.css`)                          |
| `@rusticstack/pico-reforged/classless`   | the class-less build                                 |
| `@rusticstack/pico-reforged/colors`      | the `.pico-color-*` and `.pico-background-*` classes |
| `@rusticstack/pico-reforged/extras`      | all opt-in extras                                    |
| `@rusticstack/pico-reforged/extras/tabs` | one extra                                            |

The imports can sit in one file or be combined. `layer(name)`, `supports(...)` and a media query after the specifier wrap the compiled CSS.

### `@pico`

`name: value;` pairs. Later blocks win over earlier ones.

| Property                                                                                                             | Value                                                                                           |
| -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `theme`                                                                                                              | a theme name, a color such as `#e5484d`, or a quoted path to a CSS file (relative to this file) |
| `extras`                                                                                                             | names separated by spaces or commas, `all` or `none`                                            |
| `classless`                                                                                                          | `true` or `false`                                                                               |
| `classes`, `fluid`, `semantic-container`, `responsive-spacings`, `responsive-typography`, `transitions`, `important` | `true` or `false`, as the compiler options of the same name                                     |
| `scope`                                                                                                              | a selector such as `.pico`, or `none`                                                           |
| `exclude`                                                                                                            | modules to leave out, for example `components/modal forms/input-range`                          |
| `targets`                                                                                                            | a browserslist query                                                                            |
| `minify`                                                                                                             | `true` or `false`                                                                               |
| `purge`                                                                                                              | `auto` (default), `safe` or `off`                                                               |
| `safelist`                                                                                                           | names to always keep: classes, ids, tags, attribute names, `name=value` or `/regex/`            |
| `source`                                                                                                             | `none` turns the automatic scan off, a quoted path sets the folder it starts from               |

`purge: safe` keeps every rule that only lacks tags in the content. Classes, ids and attribute rules are still checked, so a class or an `[aria-invalid=true]` that only appears in templates the scan cannot see is removed. Use it when you cannot trust the tags in your sources, and add those templates with `@source`. `purge: off` never purges this stylesheet.

### `@source`

Paths are relative to the stylesheet. Without any `@source`, the scan covers the project folder.

| Rule                           | Meaning                                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------------------ |
| `@source "../content";`        | also scan this folder or file, even when it is git-ignored or inside `node_modules`        |
| `@source "../app/**/*.html";`  | a glob; `{a,b}` works                                                                      |
| `@source not "../legacy";`     | never scan this folder, file or glob                                                       |
| `@source inline("a b {c,d}");` | names that count as used, as if a file held them. Braces expand: `{c,d}` gives `c` and `d` |

`@source not inline(...)` is not supported (Pico ships fixed CSS, so there is nothing to block) and gives a warning.

If the file also imports Tailwind, `@source` rules are left in place for Tailwind to read. List `pico()` before the Tailwind plugin so `@pico` is gone before Tailwind sees it.

## What the scan reads

With no `@source`, the scan walks the project folder: the nearest folder with a `package.json` above the stylesheet (or the Vite and PostCSS root).

- It respects every `.gitignore` it meets, including nested ones and the ones above the project when a `.git` folder exists.
- It skips `node_modules`, `.git`, `.next`, `.astro`, `.svelte-kit`, `.nuxt`, `.output` and a few more tool cache folders at any depth, and `dist`, `build`, `out`, `coverage`, `target` and `venv` in the scan folder only, so `src/app/build` is scanned. A folder that holds `BUILD_ID` or `build-manifest.json` is build output and is skipped, and the `distDir` named in `next.config.*` is skipped as well, which covers a custom Next.js `distDir` on a clean build. A sibling like `dist-full` or `build-old` next to `dist` is skipped in the scan folder too. Other output folders belong in `.gitignore` or in the `ignore` option.
- It also skips lock files, CSS and Sass files, images, fonts, archives and other binaries, files over 1 MB (reported as a warning) and any file with a NUL byte. A file named by `@source` can be up to 32 MB.
- Packages the project links to are scanned too: any dependency whose `node_modules` entry points to a folder outside `node_modules`, whatever its version range (`workspace:*`, `*`, `^1.0.0`, `link:`, `file:`). Their own linked dependencies are followed. Paths that are not dependencies (tsconfig paths, `../../` imports) need `@source`. Folder links are followed once.
- Markup inside JSON or an escaped JS string (`role=\"button\"`) is read after unescaping. Template languages without angle brackets (Pug, Slim, Haml) and tag helpers (`van.tags`) work because a bare word that is an HTML tag name counts as a tag. Attributes set from a variable (`el.type = kind`, `[type]="kind"`, `type="{kind}"`) keep every value of that attribute. `aria-current`, `aria-selected` and `aria-disabled` are always kept, because routers and UI libraries set them.
- It reads everything else as text: HTML, JSX, TSX, JS, TS, Vue, Svelte, Astro, Markdown, MDX, PHP, ERB, Nunjucks, Liquid, Handlebars, Twig, Templ, Python, Ruby, Go, Rust, JSON and more.

**Components that live in `node_modules` or in another workspace package are not scanned.** If a UI kit or a shared package renders `<dialog>`, `<details>` or Pico classes for you, add it, or its rules are removed:

```css
@source "../../packages/ui";
@source "../node_modules/some-ui-kit/dist";
```

The cache is per stylesheet. Each file is read again only when its size or modification time changes, and the index is rebuilt from the current files on every pass. A class removed from the sources leaves the output on the next build. This is a difference from Tailwind, which keeps every candidate it has seen until the dev server restarts.

## Scripts that toggle things

A static scan cannot see a name that a script builds from pieces. These are read for you:

- quoted strings in any scanned file (`classList.add("modal-is-open")`, `setAttribute("aria-busy", "true")`)
- attribute names in markup, with and without values, including `:attr`, `v-bind:attr` and `x-bind:attr` (a bound attribute counts as any value)
- `el.ariaBusy = ...` (read as `aria-busy`) and `el.dataset.tooltip` (read as `data-tooltip`)
- properties that reflect to attributes: `btn.disabled = true`, `input.readOnly`, `el.hidden`, `el.popover`, `el.open`, `checked`, `required`
- values assigned as `type: "date"`, `{ role: "switch" }` or `input.type = "range"`, so config-driven forms and `createElement` calls keep their `[type=...]` rules
- server tags such as `<input type="<?= $t ?>">` and `<button <% if (busy) { %>aria-busy<% } %>>` (PHP, EJS, ERB); the value counts as any value
- tags written by Rails helpers (`link_to`, `image_tag`, `button_to`) turn on the content tags
- Svelte `class:name` directives and Vue or Alpine `:class` objects
- `data-theme`, `dir` and `open` are always present, because the framework and the browser set them

Attributes set by a library in `node_modules` (`aria-current` from `NavLink`, `aria-invalid` from a form library) are not visible to the scan; list them with `@source inline("aria-current=page aria-invalid=true")`.

A name assembled at run time is not found: `"aria-" + state`, `` `data-${name}` ``. Keep a full string somewhere in the sources, or list the name.

**htmx.** Pico does not style htmx's own classes (`htmx-request`, `htmx-swapping`). What matters is the markup the server sends back, and the classes and attributes it carries. If the server templates are inside the project, they are scanned. If they live elsewhere, add them. Pico's loading state is `aria-busy="true"`, which htmx can set through your own `htmx:beforeRequest` handler or a template, so keep it listed when it is not written anywhere in the sources:

```css
@source "../../backend/templates";
@pico {
  safelist: aria-busy;
}
```

**Alpine.** `:class`, `x-bind:class` and `x-show` expressions are read as identifiers, and bound attributes count as any value. If a class name only appears inside a computed string, add it with `@source inline("name")`.

**Attributes toggled by JavaScript** such as `aria-expanded`, `aria-invalid`, `aria-current`, `aria-busy`, `aria-disabled` and `data-*`: when the name appears in a string or in markup, the rule stays. When the attribute is written through a variable, add it:

```css
@source inline("aria-expanded=true aria-invalid=true");
```

**HTML that comes from somewhere else** (a CMS, a database, a Markdown file outside the project, another repository): add the files with `@source`, or use `purge: safe`. A renderer that the scan does not recognise by name is the case `purge: safe` is for.

**Monorepos.** Components in another workspace package are scanned when the app depends on the package (any version range) and the package manager links it into `node_modules`. Otherwise add them with `@source`. The build warns when the scan finds no markup or script file at all.

## Checking the result

Correctness comes before size, so check the result once per project:

1. Build twice, once with `purge: off` and once with the default, and diff the pages. Render every route in a browser and compare screenshots or computed styles.
2. Run the purge command with `--dry-run` to see the counts per file.
3. Look at the warnings. The plugins report an empty scan (`purge skipped`), unknown `@pico` properties and unsupported rules.

Some differences between a purged and an unpurged build are not purge errors:

- Vite's CSS minifier writes `0px 0px` for `0% 0%` and drops a space in `oklch(... / .5)`. Computed styles of the purged and unpurged builds of the same plugin match.
- `aria-busy` uses an animated SVG (`--pico-icon-loading`). Screenshots of a busy element differ from run to run. Override the variable with a static icon in both pages when you diff pixels.
- Two dev servers on one project can make each other log a restart. Start one.

Tested with Vite 7 and 8, Astro 6 and Next.js 16. The entry for the PostCSS plugin exports `"module.exports"`, which TypeScript older than 5.6 reads only with `skipLibCheck`.

The Vite plugin and the PostCSS plugin report warnings through the bundler. The purge command prints them to stderr.
