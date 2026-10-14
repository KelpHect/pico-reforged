# Extras

Generated from `ai/components.json`, do not edit by hand. Extras are opt-in and load after the core build, in the `pico.extras` layer. For the core components see [components.md](components.md).

## tabs

Tabs: [role=tablist] with [role=tab] and [role=tabpanel], or [data-tabs] with radios and labels.

WAI-ARIA tabs, or a no-script variant built from radios.

Opt in. Load `css/extras/tabs.min.css` (or `css/pico.extras.min.css` for every extra), import `@rusticstack/pico-reforged/extras/tabs`, or write `@pico { extras: tabs; }` in the stylesheet. CLI: `pico-reforged build --extras tabs`.

ARIA tabs (needs the script):

```html
<div>
  <div role="tablist" aria-label="Account settings">
    <button type="button" role="tab" id="tab-profile" aria-selected="true" aria-controls="panel-profile">Profile</button>
    <button type="button" role="tab" id="tab-billing" aria-selected="false" aria-controls="panel-billing" tabindex="-1">Billing</button>
  </div>
  <section role="tabpanel" id="panel-profile" aria-labelledby="tab-profile">
    <form>
      <label>
        Full name
        <input name="name" autocomplete="name" value="Ana Ribeiro" />
      </label>
      <label>
        Work email
        <input type="email" name="email" autocomplete="email" value="ana@acme.example" />
      </label>
      <button type="submit">Save changes</button>
    </form>
  </section>
  <section role="tabpanel" id="panel-billing" aria-labelledby="tab-billing" tabindex="0" hidden>
    <p>You are on the <strong>Growth</strong> plan, billed monthly. The next invoice is on 1 November.</p>
    <p><a href="#">Download invoices</a></p>
  </section>
</div>
```

Radio tabs (no script):

```html
<div data-tabs>
  <input type="radio" name="plan-view" id="plan-monthly" checked />
  <label for="plan-monthly">Monthly</label>
  <input type="radio" name="plan-view" id="plan-yearly" />
  <label for="plan-yearly">Yearly</label>
  <section>
    <p>Growth is EUR 24.90 per seat each month. Cancel any time.</p>
  </section>
  <section>
    <p>Growth is EUR 249 per seat each year, two months free.</p>
  </section>
</div>
```

Variants:

- `aria-orientation="vertical" on the tablist`: Tabs beside the panel.
- `data-tabs on a wrapper of radios, labels and sections`: No script. Up to ten tabs per group.

States:

- `aria-selected="true"`: The active tab. Exactly one per list.
- `aria-disabled="true"`: Use this and not disabled, so the tab stays focusable.

Accessibility:

- Roles tablist, tab and tabpanel. aria-controls on each tab points at its panel, aria-labelledby on each panel points back.
- Selected tab has tabindex 0, others -1. Hide inactive panels with hidden.
- Arrow keys, Home and End move the selection (the script does this).

Selection and keyboard handling for the ARIA variant.

```js
document.querySelectorAll('[role="tablist"]').forEach((list) => {
  const tabs = [...list.querySelectorAll('[role="tab"]')];
  const vertical = list.getAttribute("aria-orientation") === "vertical";

  const select = (tab, { focus = true } = {}) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
    });
    if (focus) tab.focus();
    tab.scrollIntoView({ inline: "nearest", block: "nearest" });
  };

  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => {
      if (tab.getAttribute("aria-disabled") !== "true") select(tab, { focus: false });
    });
    tab.addEventListener("keydown", (e) => {
      const rtl = getComputedStyle(list).direction === "rtl";
      const prev = vertical ? "ArrowUp" : rtl ? "ArrowRight" : "ArrowLeft";
      const next = vertical ? "ArrowDown" : rtl ? "ArrowLeft" : "ArrowRight";
      let target = null;
      if (e.key === next) target = tabs[(i + 1) % tabs.length];
      else if (e.key === prev) target = tabs[(i - 1 + tabs.length) % tabs.length];
      else if (e.key === "Home") target = tabs[0];
      else if (e.key === "End") target = tabs[tabs.length - 1];
      if (target) {
        e.preventDefault();
        if (target.getAttribute("aria-disabled") === "true") target.focus();
        else select(target);
      }
    });
  });
});
```

Sets on its own elements: `--pico-tabs-active-color`, `--pico-tabs-border-color`, `--pico-tabs-indicator-color`, `--pico-tabs-indicator-width`, `--pico-tabs-tab-color`, `--pico-tabs-tab-hover-color`.

Reads: `--pico-border-radius`, `--pico-border-width`, `--pico-color`, `--pico-font-weight`, `--pico-form-element-disabled-opacity`, `--pico-line-height`, `--pico-muted-border-color`, `--pico-muted-color`, `--pico-nav-link-spacing-horizontal`, `--pico-nav-link-spacing-vertical`, `--pico-outline-width`, `--pico-primary`, `--pico-primary-background`, `--pico-primary-focus`, `--pico-spacing`, `--pico-transition`.

## alert

Alert: [role=alert], [role=status] and output with a data-variant (info, success, warning, danger).

Inline status message. An element with a role (alert, status or output) and data-variant becomes an alert.

Opt in. Load `css/extras/alert.min.css` (or `css/pico.extras.min.css` for every extra), import `@rusticstack/pico-reforged/extras/alert`, or write `@pico { extras: alert; }` in the stylesheet. CLI: `pico-reforged build --extras alert`.

Info and danger:

```html
<div role="status" data-variant="info">
  <strong>Tip.</strong> You can drag files onto the table to upload them.
</div>
<div role="alert" data-variant="danger">
  <strong>Payment failed.</strong> Your card was declined. Try another payment method.
</div>
```

Dismissible:

```html
<div role="status" data-variant="warning">
  <strong>Heads up.</strong> Your export will take a few minutes to finish.
  <button type="button" data-dismiss aria-label="Dismiss: export notice"></button>
</div>
```

Variants:

- `data-variant="info"`: Default accent.
- `data-variant="success"`: Green accent.
- `data-variant="warning"`: Amber accent.
- `data-variant="danger"`: Red accent.

States:

- `<button data-dismiss aria-label="..."> as a direct child`: Close glyph. Needs the script.
- `hidden`: Hides the alert.

Accessibility:

- Use role="alert" for urgent errors and role="status" for the rest. An alert present at page load is not announced; fill an existing empty container to announce.
- Do not move focus into an alert when it appears and do not auto-dismiss it.

Dismiss with hidden, not remove(), so the alert can come back.

```js
document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-variant] > button[data-dismiss]");
  if (!button) return;
  const alert = button.parentElement;
  const heading = alert.closest("section, article, main")?.querySelector("h1, h2, h3");
  alert.hidden = true;
  if (heading) {
    heading.tabIndex = -1;
    heading.focus();
  }
});
```

Sets on its own elements: `--pico-alert-accent`, `--pico-alert-background-color`, `--pico-alert-color`, `--pico-alert-warning-accent`.

Reads: `--pico-background-color`, `--pico-border-radius`, `--pico-color`, `--pico-form-element-invalid-border-color`, `--pico-form-element-valid-border-color`, `--pico-line-height`, `--pico-muted-border-color`, `--pico-outline-width`, `--pico-primary`, `--pico-primary-background`, `--pico-spacing`, `--pico-transition`, `--pico-typography-spacing-vertical`.

## toast

Toast: <section popover="manual" role="status"> stack with one <article> per notification.

Stack of transient notifications in a popover="manual" section with role="status". One article per toast.

Opt in. Load `css/extras/toast.min.css` (or `css/pico.extras.min.css` for every extra), import `@rusticstack/pico-reforged/extras/toast`, or write `@pico { extras: toast; }` in the stylesheet. CLI: `pico-reforged build --extras toast`.

Toast stack:

```html
<section
  id="toaster"
  popover="manual"
  role="status"
  aria-label="Notifications"
  aria-atomic="false"
  data-placement="bottom-end"
>
  <article>
    <p>Draft saved.</p>
    <button type="button" aria-label="Dismiss notification">&times;</button>
  </article>
</section>
```

Variants:

- `data-placement="top|bottom" + "start|center|end"`: Where the stack sits. Default bottom-end.
- `<button> without aria-label next to the message`: Text action such as Undo.
- `<button aria-label="...">`: Icon-only dismiss.

States:

- `role="alert" on the article`: Red accent. Set --pico-toast-accent yourself for other tones.

Accessibility:

- The stack is a status live region (aria-atomic="false"). Keep it last in body so DOM order is tab order.
- Do not time out a toast that has an action or reports an error.

Open the stack once; add articles from your own code.

```js
document.getElementById("toaster").showPopover?.();
```

Sets on its own elements: `--pico-toast-accent`, `--pico-toast-gap`, `--pico-toast-inset`, `--pico-toast-width`.

Reads: `--pico-border-radius`, `--pico-border-width`, `--pico-card-background-color`, `--pico-card-border-color`, `--pico-card-box-shadow`, `--pico-color`, `--pico-font-weight`, `--pico-form-element-invalid-border-color`, `--pico-line-height`, `--pico-muted-color`, `--pico-outline-width`, `--pico-primary`, `--pico-primary-background`, `--pico-primary-focus`, `--pico-primary-hover`, `--pico-primary-underline`, `--pico-spacing`, `--pico-transition`.

## badge

Badge: [data-badge] on data, span, a or button, value picks the color. Gotcha: every direct child span of a badge is visually hidden, because that is how screen reader context is written. Wrap icons or styled text in an inner element other than a span (for example <i> or <b>), or nest them deeper..

Labels, counters and dots. data-badge on span, data or any inline element.

Opt in. Load `css/extras/badge.min.css` (or `css/pico.extras.min.css` for every extra), import `@rusticstack/pico-reforged/extras/badge`, or write `@pico { extras: badge; }` in the stylesheet. CLI: `pico-reforged build --extras badge`.

Variants:

```html
<p>
  <span data-badge>Default</span>
  <span data-badge="secondary">Secondary</span>
  <span data-badge="contrast">Contrast</span>
  <span data-badge="success">Active</span>
  <span data-badge="warning">Pending</span>
  <span data-badge="danger">Failed</span>
</p>
```

Counter:

```html
<data value="42" data-badge="danger">42</data>
```

Dot:

```html
<span data-badge="success" aria-hidden="true"></span>
```

Variants:

- `data-badge`: Primary fill.
- `data-badge="secondary"`: Slate fill.
- `data-badge="contrast"`: Highest contrast fill.
- `data-badge="success"`: Green fill.
- `data-badge="warning"`: Amber fill.
- `data-badge="danger"`: Red fill.

States:

- `empty badge`: A small circle. Mark it aria-hidden and put the meaning in nearby text.
- `hidden`: Hide a zero count.

Accessibility:

- Use data with a value attribute for counters. Add a visually hidden span in front for context, such as "unread messages: ".

Sets on its own elements: `--pico-badge-background-color`, `--pico-badge-color`, `--pico-badge-danger-background-color`, `--pico-badge-danger-color`, `--pico-badge-ring-color`, `--pico-badge-success-background-color`, `--pico-badge-success-color`, `--pico-badge-warning-background-color`, `--pico-badge-warning-color`.

Reads: `--pico-contrast-background`, `--pico-contrast-inverse`, `--pico-primary-background`, `--pico-primary-inverse`, `--pico-secondary-background`, `--pico-secondary-inverse`.

## avatar

Avatar: user images and initials, <span data-avatar>.

Initials or an image in a circle. data-avatar on a span with role="img" and an aria-label.

Opt in. Load `css/extras/avatar.min.css` (or `css/pico.extras.min.css` for every extra), import `@rusticstack/pico-reforged/extras/avatar`, or write `@pico { extras: avatar; }` in the stylesheet. CLI: `pico-reforged build --extras avatar`.

Status dot:

```html
<span data-avatar data-status="online" role="img" aria-label="Ada Lovelace, online">AL</span>
```

Image with initials fallback:

```html
<span data-avatar="lg" role="img" aria-label="Ada Lovelace"
  ><img src="image.svg" alt="" width="56" height="56" />AL</span
>
```

Group:

```html
<div role="group" aria-label="Project members">
  <span data-avatar role="img" aria-label="Ada Lovelace">AL</span>
  <span data-avatar role="img" aria-label="Grace Hopper">GH</span>
  <span data-avatar role="img" aria-label="Alan Turing">AT</span>
  <span data-avatar role="img" aria-label="3 more people">+3</span>
</div>
```

Variants:

- `data-avatar="sm"`: 2rem.
- `data-avatar="lg"`: 3.5rem.
- `data-avatar="xl"`: 5rem.

States:

- `data-status="online|away|busy|offline"`: Dot in the corner. Say the status in the aria-label.

Accessibility:

- role="img" with an aria-label that names the person, and the status when there is one.

Optional: remove an image that failed to load so the initials show without a broken icon.

```js
// Optional polish. Without it a failed image still leaves the initials readable,
// but some browsers draw a broken-image icon over them. This removes the failed <img>.
// No script? Put onerror="this.remove()" on the <img> instead.
document.addEventListener(
  "error",
  (event) => {
    const img = event.target;
    if (img instanceof HTMLImageElement && img.closest("[data-avatar]")) img.remove();
  },
  true,
);
```

Sets on its own elements: `--pico-avatar-background-color`, `--pico-avatar-color`, `--pico-avatar-overlap`, `--pico-avatar-ring-color`, `--pico-avatar-size`, `--pico-avatar-status-away-color`, `--pico-avatar-status-busy-color`, `--pico-avatar-status-offline-color`, `--pico-avatar-status-online-color`.

Reads: `--pico-background-color`, `--pico-card-background-color`, `--pico-card-sectioning-background-color`, `--pico-del-color`, `--pico-dropdown-background-color`, `--pico-ins-color`, `--pico-muted-color`, `--pico-outline-width`, `--pico-primary`, `--pico-secondary-background`, `--pico-secondary-inverse`.

## skeleton

Skeleton: empty [data-skeleton] placeholders (line, avatar, block) inside an [aria-busy="true"] container.

Loading placeholders. Empty [data-skeleton] elements inside an aria-busy="true" container.

Opt in. Load `css/extras/skeleton.min.css` (or `css/pico.extras.min.css` for every extra), import `@rusticstack/pico-reforged/extras/skeleton`, or write `@pico { extras: skeleton; }` in the stylesheet. CLI: `pico-reforged build --extras skeleton`.

Skeleton card:

```html
<article aria-busy="true" aria-label="Loading invoice">
  <header>
    <div>
      <div data-skeleton="avatar"></div>
      <div>
        <p data-skeleton="line"></p>
        <p data-skeleton="line"></p>
      </div>
    </div>
  </header>
  <p data-skeleton="line"></p>
  <p data-skeleton="line"></p>
  <p data-skeleton="line"></p>
  <div data-skeleton="block"></div>
  <footer>
    <p data-skeleton="line"></p>
  </footer>
</article>
```

Variants:

- `data-skeleton="line"`: A text line. Set inline-size for variety.
- `data-skeleton="avatar"`: A circle.
- `data-skeleton="block"`: A tall block for images or charts.

States:

- `aria-busy="true"`: Replaces the spinner of the loading module. Set aria-busy="false" and swap the content when loaded.

Accessibility:

- Name the busy container with aria-label ("Loading invoice").

Optional htmx wiring that flips aria-busy around a request.

```js
const setBusy = (el, value) => {
  if (el && el.hasAttribute("aria-busy")) el.setAttribute("aria-busy", value);
};
document.addEventListener("htmx:beforeRequest", (e) => setBusy(e.detail.target, "true"));
document.addEventListener("htmx:afterSettle", (e) => setBusy(e.detail.target, "false"));
for (const type of ["htmx:responseError", "htmx:sendError", "htmx:sendAbort"]) {
  document.addEventListener(type, (e) => setBusy(e.detail.target, "false"));
}
```

Sets on its own elements: `--pico-skeleton-avatar-size`, `--pico-skeleton-block-size`, `--pico-skeleton-color`, `--pico-skeleton-duration`, `--pico-skeleton-highlight-color`, `--pico-skeleton-line-height`.

Reads: `--pico-border-radius`, `--pico-form-element-background-color`, `--pico-form-element-selected-background-color`, `--pico-muted-border-color`, `--pico-typography-spacing-vertical`.

## app-shell

App shell: body[data-app-shell] with header, aside nav, main and footer.

Application layout on body[data-app-shell]: header, a sidebar that is a drawer below 1024px, main and footer.

Opt in. Load `css/extras/app-shell.min.css` (or `css/pico.extras.min.css` for every extra), import `@rusticstack/pico-reforged/extras/app-shell`, or write `@pico { extras: app-shell; }` in the stylesheet. CLI: `pico-reforged build --extras app-shell`.

Shell skeleton:

```html
<body data-app-shell>
  <a href="#main">Skip to content</a>
  <header>
    <button type="button" popovertarget="app-nav"><span>Menu</span></button>
    <strong>Brand</strong>
    <nav aria-label="Account">...</nav>
  </header>
  <aside id="app-nav" popover aria-label="Sidebar">
    <nav aria-label="Main">
      <ul>
        <li><a href="#home" aria-current="page">Home</a></li>
      </ul>
    </nav>
  </aside>
  <main id="main" tabindex="-1">...</main>
</body>
```

Variants:

- `data-app-shell on body`: The only hook.

States:

- `aria-current="page"`: Highlights the link of the page.

Accessibility:

- The first child is a skip link. Give each nav an aria-label and main tabindex="-1" so the skip link can focus it.
- The menu button uses popovertarget on the aside; below 1024px the aside is a drawer.

Optional: focus the first link when the drawer opens and close it on a tap on the scrim.

```js
const drawer = document.querySelector("body[data-app-shell] > aside[popover]");
const toggle = document.querySelector("body[data-app-shell] > header > button[popovertarget]");
if (drawer && toggle) {
  drawer.addEventListener("toggle", (e) => {
    if (e.newState === "open") drawer.querySelector("a")?.focus();
  });
  // A tap on the scrim lands on the aside itself, which light dismiss ignores
  drawer.addEventListener("click", (e) => {
    if (e.target === drawer) drawer.hidePopover();
  });
}
```

Sets on its own elements: `--pico-app-shell-background-color`, `--pico-app-shell-border-color`, `--pico-app-shell-header-height`, `--pico-app-shell-nav-background-color`, `--pico-app-shell-nav-current-background-color`, `--pico-app-shell-nav-current-color`, `--pico-app-shell-nav-hover-background-color`, `--pico-app-shell-nav-muted-color`, `--pico-app-shell-nav-width`, `--pico-app-shell-scrim-color`.

Reads: `--pico-background-color`, `--pico-block-spacing-horizontal`, `--pico-block-spacing-vertical`, `--pico-border-radius`, `--pico-border-width`, `--pico-card-sectioning-background-color`, `--pico-color`, `--pico-contrast`, `--pico-form-element-selected-background-color`, `--pico-grid-column-gap`, `--pico-grid-row-gap`, `--pico-line-height`, `--pico-modal-overlay-background-color`, `--pico-muted-border-color`, `--pico-muted-color`, `--pico-nav-element-spacing-vertical`, `--pico-nav-link-spacing-horizontal`, `--pico-nav-link-spacing-vertical`, `--pico-outline-width`, `--pico-primary-focus`, `--pico-secondary-focus`, `--pico-spacing`, `--pico-transition`.

## data-table

Data table: opt in with data-table on the table. Sortable (aria-sort), selectable (checkbox, aria-selected as styling hook) tables, optionally in a scroll region. Without data-table the only rules that apply are the aria-sort button, data-type and data-density hooks..

Sortable, selectable, sticky-header tables. data-table on the table, optionally inside a focusable region wrapper.

Opt in. Load `css/extras/data-table.min.css` (or `css/pico.extras.min.css` for every extra), import `@rusticstack/pico-reforged/extras/data-table`, or write `@pico { extras: data-table; }` in the stylesheet. CLI: `pico-reforged build --extras data-table`.

Sortable, selectable table in a scroll region:

```html
<div role="region" aria-labelledby="orders-caption" tabindex="0" style="--pico-data-table-scroll-max-block-size: 22rem; --pico-data-table-scroll-padding-block-start: 3rem">
  <table data-table style="min-inline-size: 44rem">
    <caption id="orders-caption">Orders, last 30 days</caption>
    <thead>
      <tr>
        <th scope="col"><input type="checkbox" aria-label="Select all orders" /></th>
        <th scope="col" aria-sort="ascending"><button type="button">Order</button></th>
        <th scope="col" aria-sort="none"><button type="button">Customer</button></th>
        <th scope="col" aria-sort="none"><button type="button">Plan</button></th>
        <th scope="col" aria-sort="none"><button type="button">Date</button></th>
        <th scope="col">Status</th>
        <th scope="col" aria-sort="none" data-type="numeric"><button type="button">Total</button></th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><input type="checkbox" aria-label="Select order #1048" /></td>
        <th scope="row">#1048</th>
        <td>Marta Cunha</td>
        <td>Pro, annual</td>
        <td>2026-10-12</td>
        <td>Paid</td>
        <td data-type="numeric">2,340.00</td>
      </tr>
      <tr>
        <td><input type="checkbox" aria-label="Select order #1047" /></td>
        <th scope="row">#1047</th>
        <td>Tiago Neves</td>
        <td>Team, monthly</td>
        <td>2026-10-11</td>
        <td>Pending</td>
        <td data-type="numeric">189.00</td>
      </tr>
      <tr aria-selected="true">
        <td><input type="checkbox" aria-label="Select order #1045" checked /></td>
        <th scope="row">#1045</th>
        <td>Bruno Lacerda</td>
        <td>Pro, monthly</td>
        <td>2026-10-09</td>
        <td>Failed</td>
        <td data-type="numeric">79.00</td>
      </tr>
    </tbody>
  </table>
</div>
```

Variants:

- `data-table on table`: Opt in. Without it the table keeps core styling.
- `data-density="compact" on the table`: Tighter cell padding.
- `data-type="numeric" on th and td`: Right aligned, tabular numbers.

States:

- `aria-sort="none|ascending|descending" on th with a button`: Arrow glyph from the state. Sort in your own code.
- `aria-selected="true" on tr`: Row highlight. Keep the row checkbox in step.

Accessibility:

- The scroll wrapper needs role="region", a name (aria-labelledby the caption) and tabindex="0".
- A sortable th holds a button; aria-sort goes on the th, only one column ascending or descending at a time.
- The row checkbox is the accessible control; aria-selected on tr is styling only.

Sets on its own elements: `--pico-data-table-compact-padding-block`, `--pico-data-table-compact-padding-inline`, `--pico-data-table-head-background-color`, `--pico-data-table-row-hover-background-color`, `--pico-data-table-row-selected-background-color`, `--pico-data-table-scroll-max-block-size`, `--pico-data-table-scroll-padding-block-start`, `--pico-data-table-sort-idle-opacity`.

Reads: `--pico-background-color`, `--pico-border-radius`, `--pico-card-sectioning-background-color`, `--pico-color`, `--pico-dropdown-hover-background-color`, `--pico-outline-width`, `--pico-primary-background`, `--pico-primary-focus`, `--pico-primary-hover`, `--pico-spacing`, `--pico-typography-spacing-vertical`.

## pagination

Pagination: nav[aria-label=pagination] (or nav[data-pagination]) with ol, li, a and aria-disabled items.

nav[aria-label=pagination] holding an ol of links. nav[data-pagination] for another label.

Opt in. Load `css/extras/pagination.min.css` (or `css/pico.extras.min.css` for every extra), import `@rusticstack/pico-reforged/extras/pagination`, or write `@pico { extras: pagination; }` in the stylesheet. CLI: `pico-reforged build --extras pagination`.

Pagination:

```html
<nav aria-label="Pagination">
  <ol>
    <li><a href="?page=1" rel="prev">Previous</a></li>
    <li><a href="?page=1" aria-label="Page 1">1</a></li>
    <li><a href="?page=2" aria-label="Page 2" aria-current="page">2</a></li>
    <li><a href="?page=3" aria-label="Page 3">3</a></li>
    <li aria-hidden="true">&hellip;</li>
    <li><a href="?page=10" aria-label="Page 10">10</a></li>
    <li><a href="?page=3" rel="next">Next</a></li>
  </ol>
</nav>
```

Variants:

- `data-pagination on nav`: For navs whose label is not Pagination.

States:

- `aria-current="page" on the link`: Filled item.
- `aria-disabled="true"`: First page previous and last page next.

Accessibility:

- Use rel="prev" and rel="next" and aria-label="Page N" on number links. The ellipsis li is aria-hidden.

Sets on its own elements: `--pico-pagination-gap`, `--pico-pagination-item-size`.

Reads: `--pico-border-radius`, `--pico-border-width`, `--pico-dropdown-hover-background-color`, `--pico-form-element-disabled-opacity`, `--pico-muted-color`, `--pico-nav-link-spacing-horizontal`, `--pico-outline-width`, `--pico-primary`, `--pico-primary-background`, `--pico-primary-border`, `--pico-primary-focus`, `--pico-primary-hover`, `--pico-primary-hover-background`, `--pico-primary-hover-border`, `--pico-primary-inverse`, `--pico-typography-spacing-vertical`.

## stepper

Stepper: ol[data-stepper] with aria-current="step" on the current li (or its link).

Progress through steps: ol[data-stepper] with aria-current="step" on the current li or its link.

Opt in. Load `css/extras/stepper.min.css` (or `css/pico.extras.min.css` for every extra), import `@rusticstack/pico-reforged/extras/stepper`, or write `@pico { extras: stepper; }` in the stylesheet. CLI: `pico-reforged build --extras stepper`.

Steps:

```html
<ol data-stepper="horizontal" aria-label="Checkout progress">
  <li><span aria-hidden="true">1</span>Cart</li>
  <li><span aria-hidden="true">2</span>Shipping</li>
  <li aria-current="step"><span aria-hidden="true">3</span>Payment</li>
  <li><span aria-hidden="true">4</span>Review</li>
</ol>
```

Navigable steps:

```html
<nav aria-label="Onboarding">
  <ol data-stepper>
    <li>
      <a href="#account"><span aria-hidden="true">1</span>Account</a>
    </li>
    <li>
      <a href="#workspace"><span aria-hidden="true">2</span>Workspace</a>
    </li>
    <li>
      <a href="#team" aria-current="step"><span aria-hidden="true">3</span>Invite team</a>
    </li>
    <li>
      <a aria-disabled="true"><span aria-hidden="true">4</span>Billing</a>
    </li>
  </ol>
</nav>
```

Variants:

- `data-stepper or data-stepper="horizontal"`: Default row. Turns vertical below 576px.
- `data-stepper="vertical"`: Column with a line down the markers.

States:

- `aria-current="step"`: Marks the current step. Earlier steps show as complete.
- `aria-disabled="true" or an anchor without href`: A step the user cannot open yet.

Accessibility:

- Put the status in a label or text for screen readers; the number span is aria-hidden. Wrap the list in a nav when the steps are links.

Sets on its own elements: `--pico-stepper-complete-background`, `--pico-stepper-complete-color`, `--pico-stepper-complete-line-color`, `--pico-stepper-current-color`, `--pico-stepper-current-ring-color`, `--pico-stepper-gap`, `--pico-stepper-label-color`, `--pico-stepper-line-color`, `--pico-stepper-line-width`, `--pico-stepper-marker-size`, `--pico-stepper-ring-width`.

Reads: `--pico-background-color`, `--pico-border-radius`, `--pico-color`, `--pico-form-element-border-color`, `--pico-form-element-disabled-opacity`, `--pico-muted-color`, `--pico-outline-width`, `--pico-primary-background`, `--pico-primary-focus`, `--pico-primary-inverse`, `--pico-spacing`, `--pico-text-underline-offset`, `--pico-transition`.

## empty-state

Empty state: [data-empty] block shown in place of a list, table or result set with no rows.

Placeholder shown instead of a list, table or search result with no rows. data-empty on a section.

Opt in. Load `css/extras/empty-state.min.css` (or `css/pico.extras.min.css` for every extra), import `@rusticstack/pico-reforged/extras/empty-state`, or write `@pico { extras: empty-state; }` in the stylesheet. CLI: `pico-reforged build --extras empty-state`.

Empty state with an action:

```html
<section data-empty>
  <figure aria-hidden="true">
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      focusable="false"
    >
      <path
        d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
      />
    </svg>
  </figure>
  <h3>No projects yet</h3>
  <p>Create a project to start tracking your work here.</p>
  <footer>
    <a href="/projects/new" role="button">Create project</a>
  </footer>
</section>
```

Variants:

- `data-empty="compact"`: Smaller padding and icon, for cards and panels.

States:

- `hidden`: Hide it while rows exist.

Accessibility:

- The icon figure is aria-hidden. Use a heading for the title and a real link or button for the action.

Sets on its own elements: `--pico-empty-state-border-color`, `--pico-empty-state-icon-background`, `--pico-empty-state-icon-color`, `--pico-empty-state-icon-size`, `--pico-empty-state-max-inline-size`, `--pico-empty-state-padding-block`.

Reads: `--pico-block-spacing-horizontal`, `--pico-block-spacing-vertical`, `--pico-border-radius`, `--pico-border-width`, `--pico-card-sectioning-background-color`, `--pico-form-element-border-color`, `--pico-muted-color`, `--pico-spacing`.
