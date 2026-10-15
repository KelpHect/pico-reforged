---
name: pico-reforged
description: Write and style web pages with Pico Reforged (@rusticstack/pico-reforged), a plain modern CSS framework for semantic HTML, forked from Pico CSS. Use when a project links pico.min.css or imports @rusticstack/pico-reforged, when the user asks for a minimal classless or semantic-HTML CSS framework without utility classes, or when you need buttons, forms, cards, modals, dropdowns, popovers, tooltips, tabs, alerts, toasts, badges, data tables, pagination, steppers, light and dark themes, OKLCH colors or --pico-* custom properties. Covers CDN, Vite and PostCSS setup, classless and conditional builds, data-theme dark mode, theming from one color, the opt-in extras and the common mistakes.
---

# Pico Reforged

Pico Reforged is a CSS framework for semantic HTML. You write `<button>`, `<article>`, `<details>` and `<dialog>`, and they look right. There are almost no classes and no utility classes. It is a fork of Pico CSS v2.1.1 by Lucas Larroche (MIT), rewritten as plain modern CSS. It is not the official Pico CSS and it does not use the Pico name or logo as its own brand. Say "Pico Reforged" when you name it.

## When to use it

- A page, prototype or app where semantic HTML should carry the design.
- Server-rendered or static sites, htmx apps, docs, dashboards, admin tools.
- The user asks for Pico Reforged, or the project already loads `pico*.css` files or `@rusticstack/pico-reforged`.

Do not reach for it when the user wants utility classes (Tailwind style) or a large component kit with JavaScript widgets. It ships almost no JavaScript.

## Setup

Pick one. Details and every file name are in [references/setup.md](references/setup.md).

CDN, no build step. Pin a version in real projects:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@rusticstack/pico-reforged@2.0.0/css/pico.min.css" />
```

The file names are those of Pico CSS v2.1.1:

- `pico.min.css`: class based, default theme (azure).
- `pico.classless.min.css`: no classes at all, `body > header`, `main` and `footer` act as containers.
- `pico.conditional.min.css`: every rule scoped to `.pico`, so Pico styles only the part of a page that has `<div class="pico">`.
- `pico.fluid.classless.min.css`: classless with no max width.
- `pico.<theme>.min.css`, `pico.classless.<theme>.min.css` and so on for the 20 themes.
- `pico.colors.min.css`: `.pico-color-*` and `.pico-background-*` classes.
- Extras: `pico.extras.min.css` (all) or `extras/tabs.min.css` (one). Load after the core file.

npm with Vite (also Astro, SvelteKit, Nuxt, React Router and others on Vite):

```shell
npm install @rusticstack/pico-reforged
```

```ts
// vite.config.ts
import pico from "@rusticstack/pico-reforged/vite";
export default defineConfig({ plugins: [pico()] });
```

```css
/* src/app.css */
@import "@rusticstack/pico-reforged";

@pico {
  theme: jade;
  extras: tabs badge;
}
@source "../content";
```

Next.js and other PostCSS tools use `"@rusticstack/pico-reforged/postcss": {}` in `postcss.config.mjs`. Plain static generators run `npx pico-reforged purge public` after the build.

In production the integrations purge unused rules. The default mode is `safe`: it drops a rule only when a class, id or attribute name is missing from your sources. `purge: aggressive` also judges tags and attribute values and can drop markup that only exists at run time. Add `@source inline("name")` or `safelist` for those names.

Set `lang` on `<html>` and add the viewport tag in the head:

```html
<meta name="viewport" content="width=device-width, initial-scale=1" />
```

## Core rules

1. Semantic HTML first. Use the element that fits, and style comes with it. Reach for a class only when the cheat sheet below lists one.
2. No utility classes and no made-up component classes. There is no `.btn`, `.card`, `.row`, `.col` or `.mt-4`. If a class is not documented here or in the references, it does nothing.
3. Variants are classes or ARIA and data attributes, never nested wrappers. `class="secondary"`, `class="outline"`, `aria-invalid="true"`, `aria-busy="true"`, `aria-current="page"`, `role="switch"`, `data-tooltip="..."`.
4. State is an attribute, not a class. Use `disabled`, `aria-disabled`, `aria-invalid`, `aria-current`, `aria-selected`, `aria-busy`, `open`, `hidden`.
5. A label wraps its control: `<label>Name <input name="name" /></label>`. No `for` and `id` needed.
6. Spacing, color and size come from `--pico-*` custom properties. Override tokens, do not hardcode colors. Do not scatter inline `style` attributes.
7. Do not edit the files in `css/` or `dist/`. They are build output.
8. Never write the framework's name as "Pico CSS" for this project, and do not add the Pico logo.

## Dark mode and themes

Dark mode follows `prefers-color-scheme` with no setup. Force a scheme with `data-theme` on `html` or on any element:

```html
<html data-theme="dark">
<article data-theme="light">A light card on a dark page</article>
```

To let users switch, set `document.documentElement.dataset.theme = "dark" | "light"`, and remove the attribute to follow the system again.

There are 20 themes (amber, azure, blue, cyan, fuchsia, green, grey, indigo, jade, lime, orange, pink, pumpkin, purple, red, sand, slate, violet, yellow, zinc). Azure is the default. Pick one with the file name (`pico.jade.min.css`) or `@pico { theme: jade; }`. A custom theme from one color needs the compiler: `@pico { theme: #e5484d; }` or `pico-reforged build --theme "#e5484d"`.

Overriding tokens at run time, with your own unlayered CSS (it always beats the `pico` layer):

```css
:root,
[data-theme] {
  --pico-border-radius: 0.5rem;
  --pico-primary-background: oklch(0.55 0.19 25);
  --pico-primary-hover-background: oklch(0.48 0.19 25);
}
```

Your own CSS is not compiled, so `light-dark()` there needs a current browser (Chrome 123, Firefox 120, Safari 17.5). For the floor browsers, set separate values under `[data-theme="dark"]` and `@media (prefers-color-scheme: dark)`.

Include `[data-theme]` in the selector: any element with that attribute declares the color tokens again, so a bare `:root` override does not reach inside it. The primary set is `--pico-primary`, `-background`, `-underline`, `-hover`, `-hover-background`, `-focus`, `-inverse` and `--pico-text-selection-color`. More in [references/theming.md](references/theming.md).

## Component cheat sheet

The exact markup for each is in [references/components.md](references/components.md) and, as data, in `ai/components.json`.

Layout

- `<main class="container">`, `class="container-fluid"` for full width. Classless: `body > main` is already a container.
- `<div class="grid">` puts its children in equal columns from 768px.
- `<div class="overflow-auto">` around a wide table.

Content

- Headings, `p`, lists, `blockquote`, `<hgroup><h1>..</h1><p>..</p></hgroup>` for a title with a muted subtitle.
- `<a>`, `<a class="secondary">`, `<a class="contrast">`, `aria-current="page"` on the current link.
- `<button>`, `class="secondary"`, `class="contrast"`, `class="outline"` (combine: `class="outline secondary"`), `<a role="button">`, `<input type="submit">`.
- `<table class="striped">` with `th scope`, optional `<caption>`.
- `<pre><code>`, `<kbd>`, `<mark>`, `<ins>`, `<del>`, `<hr>`, `<figure><img><figcaption>`.

Forms

- `<label>Text <input type="text" /></label>`, `<small>` right after a control is helper text.
- `aria-invalid="true"` or `"false"` colors and decorates the control. Link the message with `aria-describedby`.
- Native `select`, `textarea`, `type=date`, `color`, `file`, `range`, `search` are styled. `<input type="checkbox" role="switch">` is a switch.
- `<fieldset role="group">` joins controls into one bar, `<form role="search">` is a search bar.

Components

- Accordion: `<details><summary>Title</summary>...</details>`. `<summary role="button">` looks like a button.
- Card: `<article>` with optional `<header>` and `<footer>` children.
- Dropdown: `<details class="dropdown"><summary>Menu</summary><ul><li><a>..</a></li></ul></details>`. Radios or checkboxes in the items make a select-like menu.
- Modal: `<dialog><article><header><button aria-label="Close" rel="prev"></button><p>Title</p></header>...</article></dialog>`, open with `dialog.showModal()`.
- Nav: `<nav><ul>brand</ul><ul>links</ul></nav>`. `<nav aria-label="breadcrumb">` is a breadcrumb.
- Loading: `aria-busy="true"` on a button, article, section or paragraph.
- Progress: `<progress value="35" max="100">`, no value is indeterminate.
- Tooltip: `data-tooltip="Text"`, `data-placement="bottom|left|right"`.
- Popover: `<button popovertarget="m">` with `<ul popover id="m">` (menu), `popover="hint"` (tooltip) or `popover` with an `<article>` (card).

Extras (opt-in, load them first, see [references/extras.md](references/extras.md))

- Tabs: `role="tablist"`, `role="tab"`, `role="tabpanel"` (needs a small script), or `<div data-tabs>` with radios and labels (no script).
- Alert: `<div role="status" data-variant="info|success|warning|danger">`. Without `data-variant` it is not an alert.
- Toast: `<section popover="manual" role="status">` with one `<article>` per toast.
- Badge: `data-badge`, `="secondary|contrast|success|warning|danger"`, on `span`, `data` or a link.
- Avatar: `<span data-avatar role="img" aria-label="Ada Lovelace">AL</span>`, sizes `sm`, `lg`, `xl`, `data-status`.
- Skeleton: empty `data-skeleton="line|avatar|block"` inside an `aria-busy="true"` container.
- App shell: `<body data-app-shell>` with header, `aside[popover]` sidebar, main.
- Data table: `<table data-table>`, `aria-sort` on `th`, `data-density="compact"`, `data-type="numeric"`.
- Pagination: `<nav aria-label="Pagination"><ol><li><a>..</a></li></ol></nav>`, `aria-current="page"`.
- Stepper: `<ol data-stepper>` with `aria-current="step"`.
- Empty state: `<section data-empty>`.

Browser floor: Chrome and Edge 111, Firefox 128, Safari and iOS 16.4. Popover, anchor positioning and the animated accordion are additive: without them the page still works.

## Common mistakes

- Using Bootstrap or Tailwind names. Nothing styles `class="btn btn-primary"`, `class="card"` or `class="row"`. Use `button`, `article` and `class="grid"`.
- Wrapping every control in a `div`. Wrap a label around the control instead.
- Expecting classes in the classless build. It removes every class rule, so `.container`, `.grid`, `.striped` and `.secondary` do nothing there. The conditional build is the class based one that stays inside `.pico`.
- Loading an extra without its file. Extras are not part of `pico.css`. Add `pico.extras.min.css`, `extras/<name>.min.css`, or `@pico { extras: ...; }`.
- Putting `disabled` on a tab. Use `aria-disabled="true"` so the tab stays focusable.
- Leaving out `data-variant` on an alert. A `role="status"` without it stays plain text.
- Treating `details.dropdown` as an ARIA menu or expecting it to close on an outside click. For menus that close on their own, use the popover pattern.
- Putting essential information in `data-tooltip`. The text is not an accessible name or description.
- Toggling a theme with a `.dark` class. Use `data-theme`.
- Setting `aria-invalid="false"` on every untouched field. Set it after validation, because it shows a green state.
- Using a Sass variable like `$primary`. There is no Sass. Set `--pico-*` properties or use `@pico { theme: ...; }`.
- Overriding with `!important` or a higher specificity. All framework rules sit in `@layer pico.*`, so plain unlayered CSS wins.
- Writing `.container` around everything in classless pages. `body > header`, `main` and `footer` already center their content.
- Aggressive purge with markup that only appears at run time (router `aria-current`, JS-set `disabled`). Keep `purge: safe` or list those names.

## Files in the package

- `ai/tokens.json`: every token in the W3C Design Tokens format (import `@rusticstack/pico-reforged/tokens.json`). Light value in `$value`, dark value in the extension. See [references/theming.md](references/theming.md).
- `ai/components.json`: the component manifest (`@rusticstack/pico-reforged/components.json`).
- `skills/pico-reforged/references/`: setup, theming, and the per-component references.
- `AGENTS.md`: for people and agents working on the repository itself, not on pages that use it.

Credit: Pico Reforged is a fork of Pico CSS by Lucas Larroche, MIT licensed. Source: github.com/rusticstack/pico-reforged. Site: pico.rusticstack.com.
