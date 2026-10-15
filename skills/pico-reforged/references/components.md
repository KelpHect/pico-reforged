# Core components

Generated from `ai/components.json`, do not edit by hand. Every module here is in the default build unless the entry says it is off. For the opt-in extras see [extras.md](extras.md).

## document

Document: html, body defaults.

Page defaults for html and body. Nothing to write: it applies to every page.

Part of the core build. Leave it out with the module name `reset/document` in `exclude`.

- Set the language on html (lang) and add the viewport meta tag.
- data-theme="light" or "dark" on html (or on any element) forces a color scheme, otherwise prefers-color-scheme decides.

Reads: `--pico-background-color`, `--pico-color`, `--pico-font-family`, `--pico-font-size`, `--pico-font-weight`, `--pico-line-height`, `--pico-text-underline-offset`.

## landmarks

Landmarks: body > header, body > main, body > footer.

Vertical padding for body > header, body > main and body > footer.

Part of the core build. Leave it out with the module name `layout/landmarks` in `exclude`.

Page landmarks as direct children of body:

```html
<body>
  <header>...</header>
  <main>...</main>
  <footer>...</footer>
</body>
```

Accessibility:

- header, main and footer map to banner, main and contentinfo only as direct children of body.

Reads: `--pico-block-spacing-vertical`.

## section

Section: section.

Bottom margin between sections.

Part of the core build. Leave it out with the module name `layout/section` in `exclude`.

A section with a heading:

```html
<section>
  <h2>Title</h2>
  <p>Text</p>
</section>
```

Accessibility:

- Give a section an accessible name (aria-labelledby) when it should be a region landmark.

Reads: `--pico-block-spacing-vertical`.

## responsive-spacings

Responsive spacings for landmarks, section and article (opt-in, not imported by default).

Spacing of landmarks, section and article grows with the viewport width. Off by default.

Off by default. CLI: --responsive-spacings. CSS: @pico { responsive-spacings: true; }. Compiler option: responsiveSpacings.

Sets on its own elements: `--pico-block-spacing-horizontal`, `--pico-block-spacing-vertical`.

Reads: `--pico-spacing`.

## container

Container: .container, .container-fluid.

Centered column with a max width that grows by breakpoint (.container) or a full width padded column (.container-fluid).

Part of the core build. Leave it out with the module name `layout/container` in `exclude`.

Fixed and fluid container:

```html
<div class="container-fluid">
  <p>This is a .container-fluid inside the page.</p>
</div>
<div class="container">
  <p>This is a .container nested in the page.</p>
</div>
```

Variants:

- `class="container"`: Max width follows --pico-container-max-width.
- `class="container-fluid"`: Full width with side padding.

Reads: `--pico-container-max-width`, `--pico-spacing`.

## semantic-container

Semantic container: body > header, body > main, body > footer as containers (classless only).

Makes body > header, body > main and body > footer centered containers, so class-free pages need no wrapper.

Off by default. On in the classless build. Elsewhere: CLI --semantic-container, CSS @pico { semantic-container: true; }. Add --fluid (@pico { fluid: true; }) for no max width.

Classless page:

```html
<body>
  <header>...</header>
  <main>...</main>
  <footer>...</footer>
</body>
```

Reads: `--pico-block-spacing-horizontal`, `--pico-block-spacing-vertical`, `--pico-container-max-width`.

## grid

Grid: .grid, minimal auto-layout columns.

Equal width auto-fit columns from 768px, stacked below. Children shrink instead of overflowing.

Part of the core build. Leave it out with the module name `layout/grid` in `exclude`.

Three columns:

```html
<div class="grid">
  <div>One</div>
  <div>Two</div>
  <div>Three</div>
</div>
```

Variants:

- `class="grid"`: The only hook. Any children become columns.

Reads: `--pico-grid-column-gap`, `--pico-grid-row-gap`.

## overflow-auto

Overflow auto: .overflow-auto.

Wrap wide tables or code so they scroll inside their box.

Part of the core build. Leave it out with the module name `layout/overflow-auto` in `exclude`.

Scrolling wrapper:

```html
<div class="overflow-auto">
  <div>A wide block inside .overflow-auto, wider than its box.</div>
</div>
```

Variants:

- `class="overflow-auto"`: Scrolls on the x axis.

Accessibility:

- A scroll region that can take focus should be reachable by keyboard: add tabindex="0" and a name when it has no focusable content.

## typography

Typography: headings, paragraphs, lists, hgroup, blockquote, mark, abbr, ins, del, sub, sup.

Headings, paragraphs, lists, hgroup, blockquote, mark, ins, del, abbr, sub and sup with no classes.

Part of the core build. Leave it out with the module name `content/typography` in `exclude`.

Heading group:

```html
<hgroup>
  <h3>Grouped heading</h3>
  <p>The paragraph in an hgroup is muted and sits tight under the title.</p>
</hgroup>
```

Blockquote with a citation:

```html
<blockquote>
  Simplicity is prerequisite for reliability.
  <footer><cite>Edsger W. Dijkstra</cite></footer>
</blockquote>
```

Variants:

- `<hgroup>`: A title with a muted subtitle paragraph.

Sets on its own elements: `--pico-color`, `--pico-font-size`, `--pico-font-weight`, `--pico-line-height`, `--pico-typography-spacing-top`.

Reads: `--pico-blockquote-border-color`, `--pico-blockquote-footer-color`, `--pico-del-color`, `--pico-font-family`, `--pico-h1-color`, `--pico-h2-color`, `--pico-h3-color`, `--pico-h4-color`, `--pico-h5-color`, `--pico-h6-color`, `--pico-ins-color`, `--pico-mark-background-color`, `--pico-mark-color`, `--pico-muted-color`, `--pico-spacing`, `--pico-text-selection-color`, `--pico-typography-spacing-vertical`.

## link

Links: a, [role=link] and their .secondary and .contrast variants.

Links are primary colored. .secondary and .contrast switch the color family.

Part of the core build. Leave it out with the module name `content/link` in `exclude`.

Plain, secondary, contrast and current links:

```html
<p>
  Here is <a href="#">a plain link</a>, <a href="#" class="secondary">a secondary link</a>,
  <a href="#" class="contrast">a contrast link</a> and
  <a href="#" aria-current="page">a link marked as current</a>.
</p>
```

Variants:

- `class="secondary"`: Slate link color.
- `class="contrast"`: Highest contrast link color.

States:

- `aria-current="page"`: Styled like hover. aria-current="false" is ignored.

Accessibility:

- Use aria-current="page" on the link to the current page, not a class.

Sets on its own elements: `--pico-background-color`, `--pico-color`, `--pico-text-decoration`, `--pico-underline`.

Reads: `--pico-contrast`, `--pico-contrast-hover`, `--pico-contrast-hover-underline`, `--pico-contrast-underline`, `--pico-outline-width`, `--pico-primary`, `--pico-primary-focus`, `--pico-primary-hover`, `--pico-primary-hover-underline`, `--pico-primary-underline`, `--pico-secondary`, `--pico-secondary-hover`, `--pico-secondary-hover-underline`, `--pico-secondary-underline`, `--pico-text-underline-offset`, `--pico-transition`.

## button

Buttons: button, [type=submit], [type=reset], [type=button], [role=button], file selector button.

button, input type submit/button/reset and a[role=button]. Variants come from classes; there is no size class.

Part of the core build. Leave it out with the module name `content/button` in `exclude`.

Variants as buttons:

```html
<p>
  <button>Primary</button>
  <button class="secondary">Secondary</button>
  <button class="contrast">Contrast</button>
  <button disabled>Disabled</button>
</p>
```

Outline variants:

```html
<p>
  <button class="outline">Primary outline</button>
  <button class="outline secondary">Secondary outline</button>
  <button class="outline contrast">Contrast outline</button>
  <button class="outline" disabled>Disabled outline</button>
</p>
```

Link buttons:

```html
<p>
  <a href="#" role="button">Link button</a>
  <a href="#" role="button" class="secondary">Secondary link</a>
  <a href="#" role="button" class="contrast">Contrast link</a>
  <a href="#" role="button" class="outline">Outline link</a>
  <a href="#" role="button" aria-disabled="true">Disabled link</a>
</p>
```

Variants:

- `class="secondary"`: Slate fill. type=reset is secondary by default.
- `class="contrast"`: Highest contrast fill.
- `class="outline"`: Transparent fill with a colored border. Combine with secondary or contrast.
- `<a href="..." role="button">`: A link that looks like a button. role=button is the hook.

States:

- `disabled`: Native disabled button or fieldset.
- `aria-current`: Styled like hover.

Accessibility:

- Use a real button for actions and a link with role="button" only for navigation that should look like a button.

Sets on its own elements: `--pico-background-color`, `--pico-border-color`, `--pico-box-shadow`, `--pico-color`, `--pico-font-weight`.

Reads: `--pico-border-radius`, `--pico-border-width`, `--pico-button-box-shadow`, `--pico-button-hover-box-shadow`, `--pico-contrast`, `--pico-contrast-background`, `--pico-contrast-border`, `--pico-contrast-focus`, `--pico-contrast-hover`, `--pico-contrast-hover-background`, `--pico-contrast-hover-border`, `--pico-contrast-inverse`, `--pico-form-element-spacing-horizontal`, `--pico-form-element-spacing-vertical`, `--pico-line-height`, `--pico-muted-color`, `--pico-outline-width`, `--pico-primary`, `--pico-primary-background`, `--pico-primary-border`, `--pico-primary-focus`, `--pico-primary-hover`, `--pico-primary-hover-background`, `--pico-primary-hover-border`, `--pico-primary-inverse`, `--pico-secondary`, `--pico-secondary-background`, `--pico-secondary-border`, `--pico-secondary-focus`, `--pico-secondary-hover`, `--pico-secondary-hover-background`, `--pico-secondary-hover-border`, `--pico-secondary-inverse`, `--pico-spacing`, `--pico-transition`.

## table

Tables: table, thead, tbody, tfoot, tr, th, td, table.striped.

Plain tables get borders, padding and header weight. Add .striped for zebra rows.

Part of the core build. Leave it out with the module name `content/table` in `exclude`.

Striped table:

```html
<table class="striped">
  <thead>
    <tr>
      <th scope="col">Name</th>
      <th scope="col">Role</th>
      <th scope="col">Team</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Ana Ribeiro</td>
      <td>Designer</td>
      <td>Product</td>
    </tr>
    <tr>
      <td>Bruno Matos</td>
      <td>Engineer</td>
      <td>Platform</td>
    </tr>
  </tbody>
</table>
```

Variants:

- `class="striped"`: Alternating row background.

Accessibility:

- Use th with scope="col" or scope="row", and a caption when the table needs a title.

Sets on its own elements: `--pico-color`, `--pico-font-weight`.

Reads: `--pico-background-color`, `--pico-border-width`, `--pico-muted-color`, `--pico-spacing`, `--pico-table-border-color`, `--pico-table-row-stripped-background-color`.

## embedded

Embedded content: audio, canvas, iframe, img, svg, video.

img, svg, video, audio, canvas and iframe are fluid by default.

Part of the core build. Leave it out with the module name `content/embedded` in `exclude`.

Image:

```html
<img
  alt="A flat gradient placeholder"
  width="960"
  height="300"
  src="image.svg"
/>
```

Accessibility:

- Give img an alt (empty for decorative images) and svg a role="img" with an aria-label when it carries meaning.

## code

Code: pre, code, kbd, samp.

pre, code, kbd and samp on a quiet code surface.

Part of the core build. Leave it out with the module name `content/code` in `exclude`.

Inline code and a code block:

```html
<p>
  Inline <code>display: grid</code>, a keyboard shortcut <kbd>Alt</kbd> + <kbd>Tab</kbd> and
  program output <samp>Build finished in 1.2s</samp>.
</p>
<pre><code>function greet(name) {
return `Hello, ${name}!`;
}
console.log(greet("world"));</code></pre>
```

Sets on its own elements: `--pico-font-family`, `--pico-font-weight`.

Reads: `--pico-border-radius`, `--pico-code-background-color`, `--pico-code-color`, `--pico-code-kbd-background-color`, `--pico-code-kbd-color`, `--pico-font-family-monospace`, `--pico-line-height`, `--pico-spacing`.

## figure

Figure: figure, figcaption.

figure with a muted figcaption.

Part of the core build. Leave it out with the module name `content/figure` in `exclude`.

Figure with caption:

```html
<figure>
  <img
    alt="A flat gradient placeholder"
    width="960"
    height="300"
    src="image.svg"
  />
  <figcaption>A gradient standing in for a photo.</figcaption>
</figure>
```

Reads: `--pico-muted-color`, `--pico-spacing`.

## misc

Misc: hr, [hidden], template, canvas.

hr, [hidden] and template. [hidden] stays hidden even when another rule sets display.

Part of the core build. Leave it out with the module name `content/misc` in `exclude`.

Rule:

```html
<hr />
```

States:

- `hidden`: display: none !important.

Reads: `--pico-muted-border-color`, `--pico-typography-spacing-vertical`.

## form-basics

Form basics: input, select, textarea, label, fieldset, legend.

input, select, textarea, label, fieldset and legend. A label that wraps its control needs no for or id.

Part of the core build. Leave it out with the module name `forms/basics` in `exclude`.

Label wrapping an input, with helper text:

```html
<label>
  Email
  <input type="email" name="email" placeholder="you@example.com" autocomplete="off" />
  <small>We never share your email.</small>
</label>
```

Invalid input with a message:

```html
<input type="text" value="Invalid input" aria-invalid="true" aria-describedby="bad" />
<small id="bad">This value is not allowed.</small>
```

States:

- `aria-invalid="true"`: Red border and icon.
- `aria-invalid="false"`: Green border and icon.
- `disabled`: Native disabled.
- `readonly`: No focus ring change.

Accessibility:

- Set aria-invalid after validation, not before. Link the message with aria-describedby on the control.
- small right after a control is helper text.

Sets on its own elements: `--pico-background-color`, `--pico-border-color`, `--pico-box-shadow`, `--pico-color`, `--pico-form-element-focus-color`, `--pico-form-label-font-weight`, `--pico-icon-height`, `--pico-outline-width`.

Reads: `--pico-border-radius`, `--pico-border-width`, `--pico-del-color`, `--pico-font-weight`, `--pico-form-element-active-background-color`, `--pico-form-element-active-border-color`, `--pico-form-element-background-color`, `--pico-form-element-border-color`, `--pico-form-element-color`, `--pico-form-element-disabled-opacity`, `--pico-form-element-invalid-active-border-color`, `--pico-form-element-invalid-border-color`, `--pico-form-element-invalid-focus-color`, `--pico-form-element-placeholder-color`, `--pico-form-element-selected-background-color`, `--pico-form-element-spacing-horizontal`, `--pico-form-element-spacing-vertical`, `--pico-form-element-valid-active-border-color`, `--pico-form-element-valid-border-color`, `--pico-form-element-valid-focus-color`, `--pico-icon-chevron`, `--pico-icon-invalid`, `--pico-icon-valid`, `--pico-ins-color`, `--pico-line-height`, `--pico-muted-color`, `--pico-primary-background`, `--pico-primary-focus`, `--pico-spacing`, `--pico-transition`.

## checkbox-radio-switch

Checkbox, radio and switch: [type=checkbox], [type=radio], [type=checkbox][role=switch].

Checkbox and radio are native. A checkbox with role="switch" becomes a switch.

Part of the core build. Leave it out with the module name `forms/checkbox-radio-switch` in `exclude`.

Checkbox:

```html
<label><input type="checkbox" name="c1" checked /> Checked</label>
```

Radio:

```html
<label><input type="radio" name="r" checked /> Radio one</label>
```

Switch:

```html
<label><input type="checkbox" role="switch" name="s2" checked /> Switch on</label>
```

Variants:

- `role="switch"`: Checkbox drawn as a switch.

States:

- `input.indeterminate = true (script)`: Dash instead of a check.
- `aria-invalid="true"`: Filled red background (checkbox, switch) or red border.

Accessibility:

- role="switch" is announced as an on/off control, so use it only for settings that apply at once.

Sets on its own elements: `--pico-background-color`, `--pico-border-color`, `--pico-border-width`, `--pico-color`.

Reads: `--pico-border-radius`, `--pico-font-weight`, `--pico-form-element-invalid-border-color`, `--pico-form-element-valid-border-color`, `--pico-icon-checkbox`, `--pico-icon-minus`, `--pico-outline-width`, `--pico-primary-background`, `--pico-primary-border`, `--pico-primary-focus`, `--pico-primary-inverse`, `--pico-switch-background-color`, `--pico-switch-checked-background-color`, `--pico-switch-color`, `--pico-switch-thumb-box-shadow`, `--pico-transition`.

## input-color

Color input swatch: [type=color].

Color swatch input.

Part of the core build. Leave it out with the module name `forms/input-color` in `exclude`.

Color input:

```html
<label>Color <input type="color" name="color" value="#4b6bfb" /></label>
```

Reads: `--pico-border-radius`.

## input-date

Date and time inputs: [type=date], [type=datetime-local], [type=month], [type=time], [type=week].

date, datetime-local, month, time and week inputs with a drawn picker icon.

Part of the core build. Leave it out with the module name `forms/input-date` in `exclude`.

Date input:

```html
<label>Date <input type="date" name="date" value="2024-03-15" /></label>
```

Sets on its own elements: `--pico-icon-position`, `--pico-icon-width`.

Reads: `--pico-form-element-spacing-horizontal`, `--pico-icon-date`, `--pico-icon-time`.

## input-file

File input: [type=file].

File input whose button is styled like a secondary button.

Part of the core build. Leave it out with the module name `forms/input-file` in `exclude`.

File input:

```html
<label>File <input type="file" name="file" /></label>
```

Sets on its own elements: `--pico-background-color`, `--pico-border-color`, `--pico-color`.

Reads: `--pico-form-element-spacing-horizontal`, `--pico-form-element-spacing-vertical`, `--pico-muted-color`, `--pico-outline-width`, `--pico-secondary-focus`, `--pico-secondary-hover-background`, `--pico-secondary-hover-border`.

## input-range

Range input: [type=range].

Range slider with a styled track and thumb.

Part of the core build. Leave it out with the module name `forms/input-range` in `exclude`.

Range input:

```html
<label>Range <input type="range" name="range" min="0" max="100" value="40" /></label>
```

Sets on its own elements: `--pico-range-border-color`, `--pico-range-thumb-color`.

Reads: `--pico-outline-width`, `--pico-primary-background`, `--pico-primary-focus`, `--pico-range-active-border-color`, `--pico-range-thumb-active-color`, `--pico-range-thumb-border-color`, `--pico-transition`.

## input-search

Search input: [type=search].

Search input with a pill shape and a drawn icon.

Part of the core build. Leave it out with the module name `forms/input-search` in `exclude`.

Search input:

```html
<label>
  Search
  <input type="search" name="search" placeholder="Search" />
</label>
```

Sets on its own elements: `--pico-border-radius`.

Reads: `--pico-form-element-spacing-horizontal`, `--pico-icon-invalid`, `--pico-icon-search`, `--pico-icon-valid`.

## accordion

Accordion: details, summary.

details and summary. Open and close are animated where the browser supports ::details-content.

Part of the core build. Leave it out with the module name `components/accordion` in `exclude`.

Accordion item:

```html
<details>
  <summary>Closed accordion item</summary>
  <p>This content is hidden until the summary is opened.</p>
</details>
```

Summary as a button:

```html
<details>
  <summary role="button">Summary as a button</summary>
  <p>A details element with a button-styled summary.</p>
</details>
```

Variants:

- `<summary role="button">`: Summary looks like a button. Add secondary, contrast or outline.

States:

- `open`: Native open attribute.

Accessibility:

- details and summary are keyboard accessible and announce expanded state natively. Do not add roles.

Reads: `--pico-accordion-active-summary-color`, `--pico-accordion-border-color`, `--pico-accordion-close-summary-color`, `--pico-accordion-open-summary-color`, `--pico-border-width`, `--pico-icon-chevron`, `--pico-line-height`, `--pico-outline-width`, `--pico-primary-focus`, `--pico-spacing`, `--pico-transition`.

## card

Card: article, with header and footer as direct children.

article is a card. header and footer as direct children get their own bands.

Part of the core build. Leave it out with the module name `components/card` in `exclude`.

Card with header and footer:

```html
<article>
  <header>Card header</header>
  Card body with some text inside it.
  <footer>Card footer</footer>
</article>
```

Accessibility:

- article is a landmark-free sectioning element, so repeat it freely in lists.

Reads: `--pico-block-spacing-horizontal`, `--pico-block-spacing-vertical`, `--pico-border-width`, `--pico-card-background-color`, `--pico-card-border-color`, `--pico-card-border-radius`, `--pico-card-box-shadow`, `--pico-card-sectioning-background-color`.

## dropdown

Dropdown: details.dropdown.

details.dropdown with a list. Select-like and multi-choice menus put radios or checkboxes in the items.

Part of the core build. Leave it out with the module name `components/dropdown` in `exclude`.

Dropdown menu:

```html
<details class="dropdown">
  <summary>Dropdown</summary>
  <ul>
    <li><a href="#">Solid</a></li>
    <li><a href="#">Liquid</a></li>
    <li><a href="#" aria-current="true">Gas</a></li>
    <li><a href="#">Plasma</a></li>
  </ul>
</details>
```

Select-like dropdown with radios:

```html
<details class="dropdown" open>
  <summary>Select-like dropdown</summary>
  <ul>
    <li>
      <label><input type="radio" name="phase" value="solid" checked /> Solid</label>
    </li>
    <li>
      <label><input type="radio" name="phase" value="liquid" /> Liquid</label>
    </li>
    <li>
      <label><input type="radio" name="phase" value="gas" /> Gas</label>
    </li>
  </ul>
</details>
```

Variants:

- `class="dropdown"`: The hook on details.
- `<summary role="button">`: Summary looks like a button.

States:

- `aria-current="true"`: Highlights the chosen link.

Accessibility:

- It is a disclosure, not an ARIA menu: no role=menu. It does not close on outside click or Escape by itself.

- For menus that close on outside click and anchor to their button, use the popover pattern.

Sets on its own elements: `--pico-form-element-active-border-color`, `--pico-form-element-border-color`, `--pico-form-element-focus-color`, `--pico-outline-width`.

Reads: `--pico-border-radius`, `--pico-border-width`, `--pico-card-border-radius`, `--pico-dropdown-background-color`, `--pico-dropdown-border-color`, `--pico-dropdown-box-shadow`, `--pico-dropdown-color`, `--pico-dropdown-hover-background-color`, `--pico-form-element-active-background-color`, `--pico-form-element-background-color`, `--pico-form-element-invalid-border-color`, `--pico-form-element-invalid-focus-color`, `--pico-form-element-placeholder-color`, `--pico-form-element-spacing-horizontal`, `--pico-form-element-spacing-vertical`, `--pico-form-element-valid-border-color`, `--pico-form-element-valid-focus-color`, `--pico-icon-chevron`, `--pico-line-height`, `--pico-nav-element-spacing-vertical`, `--pico-nav-link-spacing-horizontal`, `--pico-primary-focus`, `--pico-spacing`, `--pico-transition`.

## group

Group: [role=group], [role=search].

Joins controls into one bar: fieldset or div with role="group", or a form with role="search".

Part of the core build. Leave it out with the module name `components/group` in `exclude`.

Input and button:

```html
<fieldset role="group">
  <input type="email" placeholder="Enter your email" autocomplete="off" />
  <input type="submit" value="Subscribe" />
</fieldset>
```

Button group:

```html
<div role="group">
  <button>Save</button>
  <button class="secondary">Save as</button>
  <button class="contrast">Share</button>
</div>
```

Search form:

```html
<form role="search" onsubmit="return false">
  <input name="q" type="search" placeholder="Search" />
  <input type="submit" value="Search" />
</form>
```

Variants:

- `role="group"`: Controls share borders and one focus ring.
- `role="search"`: Same as a group with pill ends.

Accessibility:

- Name a group with aria-label or a legend when the controls need shared context.

Sets on its own elements: `--pico-border-radius`, `--pico-button-box-shadow`, `--pico-button-hover-box-shadow`, `--pico-form-element-spacing-horizontal`, `--pico-group-box-shadow`, `--pico-group-box-shadow-focus-with-button`.

Reads: `--pico-background-color`, `--pico-border-width`, `--pico-contrast-focus`, `--pico-group-box-shadow-focus-with-input`, `--pico-outline-width`, `--pico-primary-border`, `--pico-primary-hover-border`, `--pico-secondary-focus`, `--pico-spacing`, `--pico-transition`.

## loading

Loading: [aria-busy=true].

aria-busy="true" shows a spinner before the content. An empty element shows only the spinner.

Part of the core build. Leave it out with the module name `components/loading` in `exclude`.

Busy button and busy card:

```html
<button aria-busy="true">Please wait</button>
<article aria-busy="true"></article>
```

States:

- `aria-busy="true"`: Spinner before the content. Not applied to inputs, selects, textareas, html or forms.

Accessibility:

- aria-busy is the state, not a class. An icon-only busy button needs an aria-label.

Reads: `--pico-icon-loading`, `--pico-spacing`.

## modal

Modal: dialog.

dialog with an article inside. Opened with showModal() or the open attribute.

Part of the core build. Leave it out with the module name `components/modal` in `exclude`.

Modal dialog:

```html
<dialog open>
  <article>
    <header>
      <button aria-label="Close" rel="prev"></button>
      <p><strong>Confirm your order</strong></p>
    </header>
    <p>
      Your cart has three items and ships on Friday. You can still change the address until
      then.
    </p>
    <footer>
      <button class="secondary">Cancel</button>
      <button>Confirm</button>
    </footer>
  </article>
</dialog>
```

Variants:

- `<button aria-label="Close" rel="prev">`: Close icon in the article header.

States:

- `open`: Closed dialogs are display: none.
- `class="modal-is-open" on html`: Stops page scroll while a dialog is open. showModal() alone does not set it.

Accessibility:

- Use dialog and showModal(). The browser traps focus and handles Escape.
- Give the close button an aria-label and put the title in the header.

Open and close with the dialog API. The page class is optional and only locks scrolling.

```js
const dialog = document.querySelector("dialog");
dialog.showModal();
// later
dialog.close();
```

Sets on its own elements: `--pico-block-spacing-horizontal`, `--pico-block-spacing-vertical`, `--pico-card-background-color`, `--pico-card-box-shadow`, `--pico-card-sectioning-background-color`.

Reads: `--pico-border-radius`, `--pico-card-border-radius`, `--pico-color`, `--pico-dropdown-background-color`, `--pico-dropdown-box-shadow`, `--pico-icon-close`, `--pico-modal-overlay-backdrop-filter`, `--pico-modal-overlay-background-color`, `--pico-scrollbar-width`, `--pico-spacing`, `--pico-transition`.

## nav

Nav: nav, aside nav, nav[aria-label=breadcrumb].

nav with two ul lists: brand on the left, links on the right. nav[aria-label=breadcrumb] is a breadcrumb.

Part of the core build. Leave it out with the module name `components/nav` in `exclude`.

Navigation bar:

```html
<nav>
  <ul>
    <li><strong>Acme Corp</strong></li>
  </ul>
  <ul>
    <li><a href="#">About</a></li>
    <li><a href="#">Services</a></li>
    <li><a href="#" role="button">Contact</a></li>
  </ul>
</nav>
```

Breadcrumb:

```html
<nav aria-label="breadcrumb">
  <ul>
    <li><a href="#">Home</a></li>
    <li><a href="#">Docs</a></li>
    <li><a href="#" aria-current="page">Current page</a></li>
  </ul>
</nav>
```

Variants:

- `aria-label="breadcrumb"`: Slash separated trail.
- `<aside><nav>`: Stacked links in a sidebar.

States:

- `aria-current="page"`: Marks the current link.

Accessibility:

- Name each nav with aria-label when a page has more than one.

Reads: `--pico-border-radius`, `--pico-color`, `--pico-form-element-spacing-vertical`, `--pico-muted-color`, `--pico-nav-breadcrumb-divider`, `--pico-nav-element-spacing-horizontal`, `--pico-nav-element-spacing-vertical`, `--pico-nav-link-spacing-horizontal`, `--pico-nav-link-spacing-vertical`, `--pico-spacing`.

## progress

Progress: progress.

progress with value and max. Without value it is an indeterminate bar.

Part of the core build. Leave it out with the module name `components/progress` in `exclude`.

Progress:

```html
<progress value="35" max="100"></progress>
```

States:

- `no value attribute`: Sliding bar. Static when reduced motion is requested.

Accessibility:

- Label it with aria-label or a label element.

Reads: `--pico-primary`, `--pico-progress-background-color`, `--pico-progress-color`, `--pico-spacing`, `--pico-transition`.

## tooltip

Tooltip: [data-tooltip] with [data-placement].

data-tooltip on any element shows a bubble on hover and focus. Not for essential information.

Part of the core build. Leave it out with the module name `components/tooltip` in `exclude`.

Tooltip on a link:

```html
<a href="#" data-tooltip="On the bottom" data-placement="bottom">Bottom</a>
```

Variants:

- `data-placement="top|bottom|left|right"`: Where the bubble opens. Default is top.

Accessibility:

- The text is not a name or description for assistive technology. Put the same text in the element or in aria-label.

Sets on its own elements: `--pico-tooltip-caret-slide-to`, `--pico-tooltip-slide-to`.

Reads: `--pico-border-radius`, `--pico-dropdown-box-shadow`, `--pico-line-height`, `--pico-muted-color`, `--pico-text-underline-offset`, `--pico-tooltip-background-color`, `--pico-tooltip-color`.

## popover

Popover: [popover] menus, tooltips and cards, opt-in and not part of v2.1.1.

Native popover API: menus, hint tooltips and cards, anchored with CSS anchor positioning. Not in Pico CSS v2.1.1.

Part of the core build. Leave it out with the module name `components/popover` in `exclude`.

Dropdown menu:

```html
<button id="menu-invoker" popovertarget="menu">Actions</button>
<ul popover id="menu">
  <li><a href="#">Edit</a></li>
  <li><a href="#" aria-current="page">Duplicate</a></li>
  <li><a href="#">Archive</a></li>
</ul>
```

Hint tooltip:

```html
<button id="hint-invoker" popovertarget="hint-tip" class="secondary">Hint tooltip</button>
<div popover="hint" id="hint-tip">Saved to your account</div>
```

Card popover:

```html
<button id="card-invoker" popovertarget="card">Card popover</button>
<div popover="manual" id="card">
  <article>
    <header><strong>Heads up</strong></header>
    <p>A bare popover with an article inside looks like a card.</p>
    <footer><button popovertarget="card" popovertargetaction="hide">Got it</button></footer>
  </article>
</div>
```

Variants:

- `<ul popover id="m"> with <button popovertarget="m">`: Anchored list menu.
- `popover="hint"`: Tooltip bubble.
- `popover role="tooltip"`: Same bubble for popover="manual".
- `popover with an article inside`: The article is the card.

Accessibility:

- Needs no script: popovertarget wires the button. The browser handles light dismiss and Escape for auto popovers.
- Where anchor positioning is missing, popovers are centered by the browser.

Reads: `--pico-block-spacing-horizontal`, `--pico-block-spacing-vertical`, `--pico-border-radius`, `--pico-border-width`, `--pico-card-background-color`, `--pico-card-border-color`, `--pico-card-border-radius`, `--pico-card-box-shadow`, `--pico-color`, `--pico-dropdown-background-color`, `--pico-dropdown-border-color`, `--pico-dropdown-box-shadow`, `--pico-dropdown-color`, `--pico-dropdown-hover-background-color`, `--pico-line-height`, `--pico-spacing`, `--pico-tooltip-background-color`, `--pico-tooltip-color`, `--pico-transition`.

## accessibility

Accessibility: [aria-*], [disabled], [tabindex], touch-action.

Cursor and touch-action rules driven by ARIA and disabled attributes, plus dir="rtl".

Part of the core build. Leave it out with the module name `utilities/accessibility` in `exclude`.

Accessibility:

- Style state with aria-* and native attributes, which this module relies on.

## reduce-motion

Reduced motion: prefers-reduced-motion.

Turns transitions and animations off for prefers-reduced-motion: reduce.

Part of the core build. Leave it out with the module name `utilities/reduce-motion` in `exclude`.
