// The hand-maintained part of ai/components.json: what each module is for, how its variants and
// states are triggered, and where its canonical markup comes from. Everything else (summary,
// tokens, file paths, the markup itself) is read from src/ and test/fixtures/ by
// scripts/lib/ai/components.ts, so this file stays small and breaks loudly when the CSS or a
// fixture moves.

export type Category =
  | "base"
  | "layout"
  | "content"
  | "forms"
  | "components"
  | "utilities"
  | "extras";

/** A way to switch the component: an attribute, a class or an element. */
export type Trigger = {
  name: string;
  /** What to write in the markup, for example `class="secondary"`. */
  trigger: string;
  /** Text that must appear in the module's CSS. The generator fails when it does not. */
  selector: string;
  description: string;
};

export type Find = {
  /** Fixture file under test/fixtures, for example `kitchen-sink.html` or `extras/tabs.html`. */
  fixture: string;
  find: string;
  remove?: string[];
  keepStyle?: boolean;
};

export type Example = { label: string; finds: Find[] } | { label: string; html: string };

export type Entry = {
  name: string;
  category: Category;
  /** Path under src/ without the extension, as in the module list of the compiler. */
  module: string;
  /** Off by default: needs a compiler option instead of an import. */
  option?: { how: string };
  use: string;
  /** The first example is the canonical one. */
  markup: Example[];
  variants?: Trigger[];
  states?: Trigger[];
  aria: string[];
  js?:
    | { description: string; code: string }
    | { description: string; fixture: string; nth?: number };
  notes?: string[];
};

const K = "kitchen-sink.html";
const find = (text: string, extra: Partial<Find> = {}): Find => ({
  fixture: K,
  find: text,
  ...extra,
});
const ex = (label: string, ...finds: Find[]): Example => ({ label, finds });

export const entries: Entry[] = [
  {
    name: "document",
    category: "base",
    module: "reset/document",
    use: "Page defaults for html and body. Nothing to write: it applies to every page.",
    markup: [],
    aria: [],
    notes: [
      "Set the language on html (lang) and add the viewport meta tag.",
      'data-theme="light" or "dark" on html (or on any element) forces a color scheme, otherwise prefers-color-scheme decides.',
    ],
  },
  {
    name: "landmarks",
    category: "layout",
    module: "layout/landmarks",
    use: "Vertical padding for body > header, body > main and body > footer.",
    markup: [
      {
        label: "Page landmarks as direct children of body",
        html: "<body>\n  <header>...</header>\n  <main>...</main>\n  <footer>...</footer>\n</body>",
      },
    ],
    aria: [
      "header, main and footer map to banner, main and contentinfo only as direct children of body.",
    ],
  },
  {
    name: "section",
    category: "layout",
    module: "layout/section",
    use: "Bottom margin between sections.",
    markup: [
      {
        label: "A section with a heading",
        html: "<section>\n  <h2>Title</h2>\n  <p>Text</p>\n</section>",
      },
    ],
    aria: [
      "Give a section an accessible name (aria-labelledby) when it should be a region landmark.",
    ],
  },
  {
    name: "responsive-spacings",
    category: "layout",
    module: "layout/responsive-spacings",
    option: {
      how: "CLI: --responsive-spacings. CSS: @pico { responsive-spacings: true; }. Compiler option: responsiveSpacings.",
    },
    use: "Spacing of landmarks, section and article grows with the viewport width. Off by default.",
    markup: [],
    aria: [],
  },
  {
    name: "container",
    category: "layout",
    module: "layout/container",
    use: "Centered column with a max width that grows by breakpoint (.container) or a full width padded column (.container-fluid).",
    markup: [
      ex(
        "Fixed and fluid container",
        find('<div class="container-fluid"'),
        find('<div class="container"'),
      ),
    ],
    variants: [
      {
        name: "container",
        trigger: 'class="container"',
        selector: ".container",
        description: "Max width follows --pico-container-max-width.",
      },
      {
        name: "container-fluid",
        trigger: 'class="container-fluid"',
        selector: ".container-fluid",
        description: "Full width with side padding.",
      },
    ],
    aria: [],
  },
  {
    name: "semantic-container",
    category: "layout",
    module: "layout/semantic-container",
    option: {
      how: "On in the classless build. Elsewhere: CLI --semantic-container, CSS @pico { semantic-container: true; }. Add --fluid (@pico { fluid: true; }) for no max width.",
    },
    use: "Makes body > header, body > main and body > footer centered containers, so class-free pages need no wrapper.",
    markup: [
      {
        label: "Classless page",
        html: "<body>\n  <header>...</header>\n  <main>...</main>\n  <footer>...</footer>\n</body>",
      },
    ],
    aria: [],
  },
  {
    name: "grid",
    category: "layout",
    module: "layout/grid",
    use: "Equal width auto-fit columns from 768px, stacked below. Children shrink instead of overflowing.",
    markup: [ex("Three columns", find('<div class="grid">'))],
    variants: [
      {
        name: "grid",
        trigger: 'class="grid"',
        selector: ".grid",
        description: "The only hook. Any children become columns.",
      },
    ],
    aria: [],
  },
  {
    name: "overflow-auto",
    category: "layout",
    module: "layout/overflow-auto",
    use: "Wrap wide tables or code so they scroll inside their box.",
    markup: [ex("Scrolling wrapper", find('<div class="overflow-auto" style'))],
    variants: [
      {
        name: "overflow-auto",
        trigger: 'class="overflow-auto"',
        selector: ".overflow-auto",
        description: "Scrolls on the x axis.",
      },
    ],
    aria: [
      'A scroll region that can take focus should be reachable by keyboard: add tabindex="0" and a name when it has no focusable content.',
    ],
  },
  {
    name: "typography",
    category: "content",
    module: "content/typography",
    use: "Headings, paragraphs, lists, hgroup, blockquote, mark, ins, del, abbr, sub and sup with no classes.",
    markup: [
      ex("Heading group", find("<hgroup><h3>Grouped heading")),
      ex("Blockquote with a citation", find("<blockquote> Simplicity")),
    ],
    variants: [
      {
        name: "hgroup",
        trigger: "<hgroup>",
        selector: "hgroup",
        description: "A title with a muted subtitle paragraph.",
      },
    ],
    aria: [],
  },
  {
    name: "link",
    category: "content",
    module: "content/link",
    use: "Links are primary colored. .secondary and .contrast switch the color family.",
    markup: [
      ex(
        "Plain, secondary, contrast and current links",
        find('<p> Here is <a href="#">a plain link'),
      ),
    ],
    variants: [
      {
        name: "secondary",
        trigger: 'class="secondary"',
        selector: ".secondary",
        description: "Slate link color.",
      },
      {
        name: "contrast",
        trigger: 'class="contrast"',
        selector: ".contrast",
        description: "Highest contrast link color.",
      },
    ],
    states: [
      {
        name: "current",
        trigger: 'aria-current="page"',
        selector: "[aria-current]",
        description: 'Styled like hover. aria-current="false" is ignored.',
      },
    ],
    aria: ['Use aria-current="page" on the link to the current page, not a class.'],
  },
  {
    name: "button",
    category: "content",
    module: "content/button",
    use: "button, input type submit/button/reset and a[role=button]. Variants come from classes; there is no size class.",
    markup: [
      ex("Variants as buttons", find("<p> <button>Primary</button>")),
      ex("Outline variants", find('<p> <button class="outline">Primary outline')),
      ex("Link buttons", find('<p> <a href="#" role="button">Link button')),
    ],
    variants: [
      {
        name: "secondary",
        trigger: 'class="secondary"',
        selector: ".secondary",
        description: "Slate fill. type=reset is secondary by default.",
      },
      {
        name: "contrast",
        trigger: 'class="contrast"',
        selector: ".contrast",
        description: "Highest contrast fill.",
      },
      {
        name: "outline",
        trigger: 'class="outline"',
        selector: ".outline",
        description: "Transparent fill with a colored border. Combine with secondary or contrast.",
      },
      {
        name: "link-button",
        trigger: '<a href="..." role="button">',
        selector: '[role="button"]',
        description: "A link that looks like a button. role=button is the hook.",
      },
    ],
    states: [
      {
        name: "disabled",
        trigger: "disabled",
        selector: "[disabled]",
        description: "Native disabled button or fieldset.",
      },
      {
        name: "current",
        trigger: "aria-current",
        selector: "[aria-current]",
        description: "Styled like hover.",
      },
    ],
    aria: [
      'Use a real button for actions and a link with role="button" only for navigation that should look like a button.',
    ],
  },
  {
    name: "table",
    category: "content",
    module: "content/table",
    use: "Plain tables get borders, padding and header weight. Add .striped for zebra rows.",
    markup: [
      ex(
        "Striped table",
        find('<table class="striped">', {
          remove: ["<tr> <td>Carla Sousa", "<tr> <td>Diogo Faria"],
        }),
      ),
    ],
    variants: [
      {
        name: "striped",
        trigger: 'class="striped"',
        selector: "table.striped",
        description: "Alternating row background.",
      },
    ],
    aria: ['Use th with scope="col" or scope="row", and a caption when the table needs a title.'],
  },
  {
    name: "embedded",
    category: "content",
    module: "content/embedded",
    use: "img, svg, video, audio, canvas and iframe are fluid by default.",
    markup: [ex("Image", find('<img alt="A flat gradient placeholder"'))],
    aria: [
      'Give img an alt (empty for decorative images) and svg a role="img" with an aria-label when it carries meaning.',
    ],
  },
  {
    name: "code",
    category: "content",
    module: "content/code",
    use: "pre, code, kbd and samp on a quiet code surface.",
    markup: [
      ex(
        "Inline code and a code block",
        find("<p> Inline <code>display"),
        find("<pre><code>function greet"),
      ),
    ],
    aria: [],
  },
  {
    name: "figure",
    category: "content",
    module: "content/figure",
    use: "figure with a muted figcaption.",
    markup: [ex("Figure with caption", find("<figure> <img"))],
    aria: [],
  },
  {
    name: "misc",
    category: "content",
    module: "content/misc",
    use: "hr, [hidden] and template. [hidden] stays hidden even when another rule sets display.",
    markup: [ex("Rule", find("<hr />"))],
    states: [
      {
        name: "hidden",
        trigger: "hidden",
        selector: "[hidden]",
        description: "display: none !important.",
      },
    ],
    aria: [],
  },
  {
    name: "form-basics",
    category: "forms",
    module: "forms/basics",
    use: "input, select, textarea, label, fieldset and legend. A label that wraps its control needs no for or id.",
    markup: [
      ex("Label wrapping an input, with helper text", find('<label> Email <input type="email"')),
      ex(
        "Invalid input with a message",
        find('<input type="text" value="Invalid input"'),
        find('<small id="bad">'),
      ),
    ],
    states: [
      {
        name: "invalid",
        trigger: 'aria-invalid="true"',
        selector: '[aria-invalid="true"]',
        description: "Red border and icon.",
      },
      {
        name: "valid",
        trigger: 'aria-invalid="false"',
        selector: '[aria-invalid="false"]',
        description: "Green border and icon.",
      },
      {
        name: "disabled",
        trigger: "disabled",
        selector: "[disabled]",
        description: "Native disabled.",
      },
      {
        name: "readonly",
        trigger: "readonly",
        selector: "[readonly]",
        description: "No focus ring change.",
      },
    ],
    aria: [
      "Set aria-invalid after validation, not before. Link the message with aria-describedby on the control.",
      "small right after a control is helper text.",
    ],
  },
  {
    name: "checkbox-radio-switch",
    category: "forms",
    module: "forms/checkbox-radio-switch",
    use: 'Checkbox and radio are native. A checkbox with role="switch" becomes a switch.',
    markup: [
      ex("Checkbox", find('<label><input type="checkbox" name="c1"')),
      ex("Radio", find('<label><input type="radio" name="r" checked')),
      ex("Switch", find('<label><input type="checkbox" role="switch" name="s2"')),
    ],
    variants: [
      {
        name: "switch",
        trigger: 'role="switch"',
        selector: '[role="switch"]',
        description: "Checkbox drawn as a switch.",
      },
    ],
    states: [
      {
        name: "indeterminate",
        trigger: "input.indeterminate = true (script)",
        selector: ":indeterminate",
        description: "Dash instead of a check.",
      },
      {
        name: "invalid",
        trigger: 'aria-invalid="true"',
        selector: '[aria-invalid="true"]',
        description: "Filled red background (checkbox, switch) or red border.",
      },
    ],
    aria: [
      'role="switch" is announced as an on/off control, so use it only for settings that apply at once.',
    ],
  },
  {
    name: "input-color",
    category: "forms",
    module: "forms/input-color",
    use: "Color swatch input.",
    markup: [ex("Color input", find('<label>Color <input type="color"'))],
    aria: [],
  },
  {
    name: "input-date",
    category: "forms",
    module: "forms/input-date",
    use: "date, datetime-local, month, time and week inputs with a drawn picker icon.",
    markup: [ex("Date input", find('<label>Date <input type="date"'))],
    aria: [],
  },
  {
    name: "input-file",
    category: "forms",
    module: "forms/input-file",
    use: "File input whose button is styled like a secondary button.",
    markup: [ex("File input", find('<label>File <input type="file"'))],
    aria: [],
  },
  {
    name: "input-range",
    category: "forms",
    module: "forms/input-range",
    use: "Range slider with a styled track and thumb.",
    markup: [ex("Range input", find('<label>Range <input type="range"'))],
    aria: [],
  },
  {
    name: "input-search",
    category: "forms",
    module: "forms/input-search",
    use: "Search input with a pill shape and a drawn icon.",
    markup: [
      ex("Search input", find('<label> Search <input type="search" name="search" placeholder')),
    ],
    aria: [],
  },
  {
    name: "accordion",
    category: "components",
    module: "components/accordion",
    use: "details and summary. Open and close are animated where the browser supports ::details-content.",
    markup: [
      ex("Accordion item", find("<details> <summary>Closed accordion item")),
      ex("Summary as a button", find('<details> <summary role="button">Summary as a button')),
    ],
    variants: [
      {
        name: "button-summary",
        trigger: '<summary role="button">',
        selector: '&[role="button"]',
        description: "Summary looks like a button. Add secondary, contrast or outline.",
      },
    ],
    states: [
      { name: "open", trigger: "open", selector: "[open]", description: "Native open attribute." },
    ],
    aria: [
      "details and summary are keyboard accessible and announce expanded state natively. Do not add roles.",
    ],
  },
  {
    name: "card",
    category: "components",
    module: "components/card",
    use: "article is a card. header and footer as direct children get their own bands.",
    markup: [ex("Card with header and footer", find("<article> <header>Card header"))],
    aria: ["article is a landmark-free sectioning element, so repeat it freely in lists."],
  },
  {
    name: "dropdown",
    category: "components",
    module: "components/dropdown",
    use: "details.dropdown with a list. Select-like and multi-choice menus put radios or checkboxes in the items.",
    markup: [
      ex("Dropdown menu", find('<details class="dropdown"> <summary>Dropdown')),
      ex(
        "Select-like dropdown with radios",
        find('<details class="dropdown" open style="margin-top: 12rem"> <summary>Select-like', {
          keepStyle: false,
        }),
      ),
    ],
    variants: [
      {
        name: "dropdown",
        trigger: 'class="dropdown"',
        selector: "details.dropdown",
        description: "The hook on details.",
      },
      {
        name: "button-summary",
        trigger: '<summary role="button">',
        selector: '[role="button"]',
        description: "Summary looks like a button.",
      },
    ],
    states: [
      {
        name: "current item",
        trigger: 'aria-current="true"',
        selector: "[aria-current]",
        description: "Highlights the chosen link.",
      },
    ],
    aria: [
      "It is a disclosure, not an ARIA menu: no role=menu. It does not close on outside click or Escape by itself.",
    ],
    notes: [
      "For menus that close on outside click and anchor to their button, use the popover pattern.",
    ],
  },
  {
    name: "group",
    category: "components",
    module: "components/group",
    use: 'Joins controls into one bar: fieldset or div with role="group", or a form with role="search".',
    markup: [
      ex(
        "Input and button",
        find('<fieldset role="group"> <input type="email" placeholder="Enter your email"'),
      ),
      ex("Button group", find('<div role="group"> <button>Save')),
      ex("Search form", find('<form role="search"')),
    ],
    variants: [
      {
        name: "group",
        trigger: 'role="group"',
        selector: '[role="group"]',
        description: "Controls share borders and one focus ring.",
      },
      {
        name: "search",
        trigger: 'role="search"',
        selector: '[role="search"]',
        description: "Same as a group with pill ends.",
      },
    ],
    aria: ["Name a group with aria-label or a legend when the controls need shared context."],
  },
  {
    name: "loading",
    category: "components",
    module: "components/loading",
    use: 'aria-busy="true" shows a spinner before the content. An empty element shows only the spinner.',
    markup: [
      ex(
        "Busy button and busy card",
        find('<button aria-busy="true">Please wait'),
        find('<article aria-busy="true"></article>'),
      ),
    ],
    states: [
      {
        name: "busy",
        trigger: 'aria-busy="true"',
        selector: '[aria-busy="true"]',
        description:
          "Spinner before the content. Not applied to inputs, selects, textareas, html or forms.",
      },
    ],
    aria: ["aria-busy is the state, not a class. An icon-only busy button needs an aria-label."],
  },
  {
    name: "modal",
    category: "components",
    module: "components/modal",
    use: "dialog with an article inside. Opened with showModal() or the open attribute.",
    markup: [{ label: "Modal dialog", finds: [{ fixture: "modal.html", find: "<dialog open>" }] }],
    variants: [
      {
        name: "close button",
        trigger: '<button aria-label="Close" rel="prev">',
        selector: '[rel="prev"]',
        description: "Close icon in the article header.",
      },
    ],
    states: [
      {
        name: "open",
        trigger: "open",
        selector: ":not([open])",
        description: "Closed dialogs are display: none.",
      },
      {
        name: "page locked",
        trigger: 'class="modal-is-open" on html',
        selector: ".modal-is-open",
        description: "Stops page scroll while a dialog is open. showModal() alone does not set it.",
      },
    ],
    aria: [
      "Use dialog and showModal(). The browser traps focus and handles Escape.",
      "Give the close button an aria-label and put the title in the header.",
    ],
    js: {
      description:
        "Open and close with the dialog API. The page class is optional and only locks scrolling.",
      code: 'const dialog = document.querySelector("dialog");\ndialog.showModal();\n// later\ndialog.close();',
    },
  },
  {
    name: "nav",
    category: "components",
    module: "components/nav",
    use: "nav with two ul lists: brand on the left, links on the right. nav[aria-label=breadcrumb] is a breadcrumb.",
    markup: [
      ex("Navigation bar", find("<nav> <ul> <li><strong>Acme Corp")),
      ex(
        "Breadcrumb",
        find(
          '<nav aria-label="breadcrumb"> <ul> <li><a href="#">Home</a></li> <li><a href="#">Docs</a>',
        ),
      ),
    ],
    variants: [
      {
        name: "breadcrumb",
        trigger: 'aria-label="breadcrumb"',
        selector: 'nav[aria-label="breadcrumb"]',
        description: "Slash separated trail.",
      },
      {
        name: "vertical nav",
        trigger: "<aside><nav>",
        selector: "aside nav",
        description: "Stacked links in a sidebar.",
      },
    ],
    states: [
      {
        name: "current",
        trigger: 'aria-current="page"',
        selector: "[aria-current]",
        description: "Marks the current link.",
      },
    ],
    aria: ["Name each nav with aria-label when a page has more than one."],
  },
  {
    name: "progress",
    category: "components",
    module: "components/progress",
    use: "progress with value and max. Without value it is an indeterminate bar.",
    markup: [ex("Progress", find('<progress value="35" max="100">'))],
    states: [
      {
        name: "indeterminate",
        trigger: "no value attribute",
        selector: ":indeterminate",
        description: "Sliding bar. Static when reduced motion is requested.",
      },
    ],
    aria: ["Label it with aria-label or a label element."],
  },
  {
    name: "tooltip",
    category: "components",
    module: "components/tooltip",
    use: "data-tooltip on any element shows a bubble on hover and focus. Not for essential information.",
    markup: [ex("Tooltip on a link", find('<a href="#" data-tooltip="On the bottom"'))],
    variants: [
      {
        name: "placement",
        trigger: 'data-placement="top|bottom|left|right"',
        selector: "[data-placement",
        description: "Where the bubble opens. Default is top.",
      },
    ],
    aria: [
      "The text is not a name or description for assistive technology. Put the same text in the element or in aria-label.",
    ],
  },
  {
    name: "popover",
    category: "components",
    module: "components/popover",
    use: "Native popover API: menus, hint tooltips and cards, anchored with CSS anchor positioning. Not in Pico CSS v2.1.1.",
    markup: [
      {
        label: "Dropdown menu",
        finds: [
          { fixture: "popover.html", find: '<button id="menu-invoker"' },
          { fixture: "popover.html", find: "<ul popover" },
        ],
      },
      {
        label: "Hint tooltip",
        finds: [
          { fixture: "popover.html", find: '<button id="hint-invoker"' },
          { fixture: "popover.html", find: '<div popover="hint"' },
        ],
      },
      {
        label: "Card popover",
        finds: [
          { fixture: "popover.html", find: '<button id="card-invoker"' },
          { fixture: "popover.html", find: '<div popover="manual" id="card"', keepStyle: false },
        ],
      },
    ],
    variants: [
      {
        name: "menu",
        trigger: '<ul popover id="m"> with <button popovertarget="m">',
        selector: ":is(ul, menu)[popover]",
        description: "Anchored list menu.",
      },
      {
        name: "hint",
        trigger: 'popover="hint"',
        selector: '[popover="hint"]',
        description: "Tooltip bubble.",
      },
      {
        name: "tooltip role",
        trigger: 'popover role="tooltip"',
        selector: '[popover][role="tooltip"]',
        description: 'Same bubble for popover="manual".',
      },
      {
        name: "card",
        trigger: "popover with an article inside",
        selector: ":has(> article)",
        description: "The article is the card.",
      },
    ],
    aria: [
      "Needs no script: popovertarget wires the button. The browser handles light dismiss and Escape for auto popovers.",
      "Where anchor positioning is missing, popovers are centered by the browser.",
    ],
  },
  {
    name: "accessibility",
    category: "utilities",
    module: "utilities/accessibility",
    use: 'Cursor and touch-action rules driven by ARIA and disabled attributes, plus dir="rtl".',
    markup: [],
    aria: ["Style state with aria-* and native attributes, which this module relies on."],
  },
  {
    name: "reduce-motion",
    category: "utilities",
    module: "utilities/reduce-motion",
    use: "Turns transitions and animations off for prefers-reduced-motion: reduce.",
    markup: [],
    aria: [],
  },

  // Extras
  {
    name: "tabs",
    category: "extras",
    module: "extras/tabs",
    use: "WAI-ARIA tabs, or a no-script variant built from radios.",
    markup: [
      ex("ARIA tabs (needs the script)", {
        fixture: "extras/tabs.html",
        find: '<div> <div role="tablist" aria-label="Account settings">',
        remove: [
          '<button type="button" role="tab" id="tab-team"',
          '<button type="button" role="tab" id="tab-api"',
          '<section role="tabpanel" id="panel-team"',
          '<section role="tabpanel" id="panel-api"',
        ],
      }),
      ex("Radio tabs (no script)", {
        fixture: "extras/tabs.html",
        find: "<div data-tabs>",
        remove: [
          '<input type="radio" name="plan-view" id="plan-compare"',
          '<label for="plan-compare">',
          '<input type="radio" name="plan-view" id="plan-legacy"',
          '<label for="plan-legacy">',
          "<section> <p>Starter has 3 seats",
          "<section> <p>Legacy plans",
        ],
      }),
    ],
    variants: [
      {
        name: "vertical",
        trigger: 'aria-orientation="vertical" on the tablist',
        selector: '[aria-orientation="vertical"]',
        description: "Tabs beside the panel.",
      },
      {
        name: "radio tabs",
        trigger: "data-tabs on a wrapper of radios, labels and sections",
        selector: "[data-tabs]",
        description: "No script. Up to ten tabs per group.",
      },
    ],
    states: [
      {
        name: "selected",
        trigger: 'aria-selected="true"',
        selector: '[aria-selected="true"]',
        description: "The active tab. Exactly one per list.",
      },
      {
        name: "disabled",
        trigger: 'aria-disabled="true"',
        selector: '[aria-disabled="true"]',
        description: "Use this and not disabled, so the tab stays focusable.",
      },
    ],
    aria: [
      "Roles tablist, tab and tabpanel. aria-controls on each tab points at its panel, aria-labelledby on each panel points back.",
      "Selected tab has tabindex 0, others -1. Hide inactive panels with hidden.",
      "Arrow keys, Home and End move the selection (the script does this).",
    ],
    js: {
      description: "Selection and keyboard handling for the ARIA variant.",
      fixture: "extras/tabs.html",
      nth: 0,
    },
  },
  {
    name: "alert",
    category: "extras",
    module: "extras/alert",
    use: "Inline status message. An element with a role (alert, status or output) and data-variant becomes an alert.",
    markup: [
      ex(
        "Info and danger",
        { fixture: "extras/alert.html", find: '<div role="status" data-variant="info">' },
        { fixture: "extras/alert.html", find: '<div role="alert" data-variant="danger">' },
      ),
      ex("Dismissible", {
        fixture: "extras/alert.html",
        find: '<div role="status" data-variant="warning"> <strong>Heads up.</strong> Your export',
      }),
    ],
    variants: [
      {
        name: "info",
        trigger: 'data-variant="info"',
        selector: "[data-variant]",
        description: "Default accent.",
      },
      {
        name: "success",
        trigger: 'data-variant="success"',
        selector: '[data-variant="success"]',
        description: "Green accent.",
      },
      {
        name: "warning",
        trigger: 'data-variant="warning"',
        selector: '[data-variant="warning"]',
        description: "Amber accent.",
      },
      {
        name: "danger",
        trigger: 'data-variant="danger"',
        selector: '[data-variant="danger"]',
        description: "Red accent.",
      },
    ],
    states: [
      {
        name: "dismiss button",
        trigger: '<button data-dismiss aria-label="..."> as a direct child',
        selector: "data-dismiss",
        description: "Close glyph. Needs the script.",
      },
      { name: "hidden", trigger: "hidden", selector: "[hidden]", description: "Hides the alert." },
    ],
    aria: [
      'Use role="alert" for urgent errors and role="status" for the rest. An alert present at page load is not announced; fill an existing empty container to announce.',
      "Do not move focus into an alert when it appears and do not auto-dismiss it.",
    ],
    js: {
      description: "Dismiss with hidden, not remove(), so the alert can come back.",
      code: 'document.addEventListener("click", (event) => {\n  const button = event.target.closest("[data-variant] > button[data-dismiss]");\n  if (!button) return;\n  const alert = button.parentElement;\n  const heading = alert.closest("section, article, main")?.querySelector("h1, h2, h3");\n  alert.hidden = true;\n  if (heading) {\n    heading.tabIndex = -1;\n    heading.focus();\n  }\n});',
    },
  },
  {
    name: "toast",
    category: "extras",
    module: "extras/toast",
    use: 'Stack of transient notifications in a popover="manual" section with role="status". One article per toast.',
    markup: [
      {
        label: "Toast stack",
        finds: [
          {
            fixture: "extras/toast.html",
            find: '<section id="toaster"',
            remove: [
              '<article data-tone="success">',
              '<article data-tone="danger">',
              "<article> <p>Message archived.",
            ],
          },
        ],
      },
    ],
    variants: [
      {
        name: "placement",
        trigger: 'data-placement="top|bottom" + "start|center|end"',
        selector: "data-placement",
        description: "Where the stack sits. Default bottom-end.",
      },
      {
        name: "action button",
        trigger: "<button> without aria-label next to the message",
        selector: '[popover][role="status"] > article > :is(button',
        description: "Text action such as Undo.",
      },
      {
        name: "dismiss button",
        trigger: '<button aria-label="...">',
        selector: "[aria-label]",
        description: "Icon-only dismiss.",
      },
    ],
    states: [
      {
        name: "danger",
        trigger: 'role="alert" on the article',
        selector: '&[role="alert"]',
        description: "Red accent. Set --pico-toast-accent yourself for other tones.",
      },
    ],
    aria: [
      'The stack is a status live region (aria-atomic="false"). Keep it last in body so DOM order is tab order.',
      "Do not time out a toast that has an action or reports an error.",
    ],
    js: {
      description: "Open the stack once; add articles from your own code.",
      code: 'document.getElementById("toaster").showPopover?.();',
    },
  },
  {
    name: "badge",
    category: "extras",
    module: "extras/badge",
    use: "Labels, counters and dots. data-badge on span, data or any inline element.",
    markup: [
      ex("Variants", { fixture: "extras/badge.html", find: "<p> <span data-badge>Default" }),
      ex("Counter", {
        fixture: "extras/badge.html",
        find: '<data value="42" data-badge="danger">',
      }),
      ex("Dot", {
        fixture: "extras/badge.html",
        find: '<span data-badge="success" aria-hidden="true"></span>',
      }),
    ],
    variants: [
      {
        name: "default",
        trigger: "data-badge",
        selector: "[data-badge]",
        description: "Primary fill.",
      },
      {
        name: "secondary",
        trigger: 'data-badge="secondary"',
        selector: '[data-badge="secondary"]',
        description: "Slate fill.",
      },
      {
        name: "contrast",
        trigger: 'data-badge="contrast"',
        selector: '[data-badge="contrast"]',
        description: "Highest contrast fill.",
      },
      {
        name: "success",
        trigger: 'data-badge="success"',
        selector: '[data-badge="success"]',
        description: "Green fill.",
      },
      {
        name: "warning",
        trigger: 'data-badge="warning"',
        selector: '[data-badge="warning"]',
        description: "Amber fill.",
      },
      {
        name: "danger",
        trigger: 'data-badge="danger"',
        selector: '[data-badge="danger"]',
        description: "Red fill.",
      },
    ],
    states: [
      {
        name: "dot",
        trigger: "empty badge",
        selector: ":empty",
        description: "A small circle. Mark it aria-hidden and put the meaning in nearby text.",
      },
      {
        name: "hidden",
        trigger: "hidden",
        selector: "[hidden]",
        description: "Hide a zero count.",
      },
    ],
    aria: [
      'Use data with a value attribute for counters. Add a visually hidden span in front for context, such as "unread messages: ".',
    ],
  },
  {
    name: "avatar",
    category: "extras",
    module: "extras/avatar",
    use: 'Initials or an image in a circle. data-avatar on a span with role="img" and an aria-label.',
    markup: [
      ex("Status dot", {
        fixture: "extras/avatar.html",
        find: '<span data-avatar data-status="online"',
      }),
      ex("Image with initials fallback", {
        fixture: "extras/avatar.html",
        find: '<span data-avatar="lg" role="img" aria-label="Ada Lovelace" ><img',
      }),
      ex("Group", {
        fixture: "extras/avatar.html",
        find: '<div role="group" aria-label="Project members">',
      }),
    ],
    variants: [
      {
        name: "sm",
        trigger: 'data-avatar="sm"',
        selector: '[data-avatar="sm"]',
        description: "2rem.",
      },
      {
        name: "lg",
        trigger: 'data-avatar="lg"',
        selector: '[data-avatar="lg"]',
        description: "3.5rem.",
      },
      {
        name: "xl",
        trigger: 'data-avatar="xl"',
        selector: '[data-avatar="xl"]',
        description: "5rem.",
      },
    ],
    states: [
      {
        name: "status",
        trigger: 'data-status="online|away|busy|offline"',
        selector: "[data-status",
        description: "Dot in the corner. Say the status in the aria-label.",
      },
    ],
    aria: [
      'role="img" with an aria-label that names the person, and the status when there is one.',
    ],
    js: {
      description:
        "Optional: remove an image that failed to load so the initials show without a broken icon.",
      fixture: "extras/avatar.html",
      nth: 0,
    },
  },
  {
    name: "skeleton",
    category: "extras",
    module: "extras/skeleton",
    use: 'Loading placeholders. Empty [data-skeleton] elements inside an aria-busy="true" container.',
    markup: [
      ex("Skeleton card", {
        fixture: "extras/skeleton.html",
        find: '<article aria-busy="true" aria-label="Loading invoice">',
      }),
    ],
    variants: [
      {
        name: "line",
        trigger: 'data-skeleton="line"',
        selector: '[data-skeleton="line"]',
        description: "A text line. Set inline-size for variety.",
      },
      {
        name: "avatar",
        trigger: 'data-skeleton="avatar"',
        selector: '[data-skeleton="avatar"]',
        description: "A circle.",
      },
      {
        name: "block",
        trigger: 'data-skeleton="block"',
        selector: '[data-skeleton="block"]',
        description: "A tall block for images or charts.",
      },
    ],
    states: [
      {
        name: "busy container",
        trigger: 'aria-busy="true"',
        selector: '[aria-busy="true"]',
        description:
          'Replaces the spinner of the loading module. Set aria-busy="false" and swap the content when loaded.',
      },
    ],
    aria: ['Name the busy container with aria-label ("Loading invoice").'],
    js: {
      description: "Optional htmx wiring that flips aria-busy around a request.",
      fixture: "extras/skeleton.html",
      nth: 0,
    },
  },
  {
    name: "app-shell",
    category: "extras",
    module: "extras/app-shell",
    use: "Application layout on body[data-app-shell]: header, a sidebar that is a drawer below 1024px, main and footer.",
    markup: [
      {
        label: "Shell skeleton",
        html: '<body data-app-shell>\n  <a href="#main">Skip to content</a>\n  <header>\n    <button type="button" popovertarget="app-nav"><span>Menu</span></button>\n    <strong>Brand</strong>\n    <nav aria-label="Account">...</nav>\n  </header>\n  <aside id="app-nav" popover aria-label="Sidebar">\n    <nav aria-label="Main">\n      <ul>\n        <li><a href="#home" aria-current="page">Home</a></li>\n      </ul>\n    </nav>\n  </aside>\n  <main id="main" tabindex="-1">...</main>\n</body>',
      },
    ],
    variants: [
      {
        name: "shell",
        trigger: "data-app-shell on body",
        selector: "body[data-app-shell]",
        description: "The only hook.",
      },
    ],
    states: [
      {
        name: "current link",
        trigger: 'aria-current="page"',
        selector: "[aria-current]",
        description: "Highlights the link of the page.",
      },
    ],
    aria: [
      'The first child is a skip link. Give each nav an aria-label and main tabindex="-1" so the skip link can focus it.',
      "The menu button uses popovertarget on the aside; below 1024px the aside is a drawer.",
    ],
    js: {
      description:
        "Optional: focus the first link when the drawer opens and close it on a tap on the scrim.",
      fixture: "extras/app-shell.html",
      nth: 0,
    },
  },
  {
    name: "data-table",
    category: "extras",
    module: "extras/data-table",
    use: "Sortable, selectable, sticky-header tables. data-table on the table, optionally inside a focusable region wrapper.",
    markup: [
      ex("Sortable, selectable table in a scroll region", {
        fixture: "extras/data-table.html",
        find: '<div role="region" aria-labelledby="orders-caption"',
        keepStyle: true,
        remove: [
          '<tr> <td><input type="checkbox" aria-label="Select order #1046"',
          '<tr> <td><input type="checkbox" aria-label="Select order #1044"',
          '<tr> <td><input type="checkbox" aria-label="Select order #1043"',
          '<tr> <td><input type="checkbox" aria-label="Select order #1042"',
          '<tr aria-selected="true"> <td><input type="checkbox" aria-label="Select order #1041"',
          '<tr> <td><input type="checkbox" aria-label="Select order #1040"',
          '<tr> <td><input type="checkbox" aria-label="Select order #1039"',
          '<tr> <td><input type="checkbox" aria-label="Select order #1038"',
          '<tr> <td><input type="checkbox" aria-label="Select order #1037"',
        ],
      }),
    ],
    variants: [
      {
        name: "data-table",
        trigger: "data-table on table",
        selector: "table[data-table]",
        description: "Opt in. Without it the table keeps core styling.",
      },
      {
        name: "compact",
        trigger: 'data-density="compact" on the table',
        selector: 'table[data-density="compact"]',
        description: "Tighter cell padding.",
      },
      {
        name: "numeric",
        trigger: 'data-type="numeric" on th and td',
        selector: '[data-type="numeric"]',
        description: "Right aligned, tabular numbers.",
      },
    ],
    states: [
      {
        name: "sortable",
        trigger: 'aria-sort="none|ascending|descending" on th with a button',
        selector: "th[aria-sort]",
        description: "Arrow glyph from the state. Sort in your own code.",
      },
      {
        name: "selected row",
        trigger: 'aria-selected="true" on tr',
        selector: "aria-selected",
        description: "Row highlight. Keep the row checkbox in step.",
      },
    ],
    aria: [
      'The scroll wrapper needs role="region", a name (aria-labelledby the caption) and tabindex="0".',
      "A sortable th holds a button; aria-sort goes on the th, only one column ascending or descending at a time.",
      "The row checkbox is the accessible control; aria-selected on tr is styling only.",
    ],
  },
  {
    name: "pagination",
    category: "extras",
    module: "extras/pagination",
    use: "nav[aria-label=pagination] holding an ol of links. nav[data-pagination] for another label.",
    markup: [
      ex("Pagination", {
        fixture: "extras/pagination.html",
        find: '<nav aria-label="Pagination"> <ol>',
      }),
    ],
    variants: [
      {
        name: "custom label",
        trigger: "data-pagination on nav",
        selector: "[data-pagination]",
        description: "For navs whose label is not Pagination.",
      },
    ],
    states: [
      {
        name: "current page",
        trigger: 'aria-current="page" on the link',
        selector: "aria-current",
        description: "Filled item.",
      },
      {
        name: "disabled",
        trigger: 'aria-disabled="true"',
        selector: "aria-disabled",
        description: "First page previous and last page next.",
      },
    ],
    aria: [
      'Use rel="prev" and rel="next" and aria-label="Page N" on number links. The ellipsis li is aria-hidden.',
    ],
  },
  {
    name: "stepper",
    category: "extras",
    module: "extras/stepper",
    use: 'Progress through steps: ol[data-stepper] with aria-current="step" on the current li or its link.',
    markup: [
      ex("Steps", { fixture: "extras/stepper.html", find: '<ol data-stepper="horizontal"' }),
      ex("Navigable steps", {
        fixture: "extras/stepper.html",
        find: '<nav aria-label="Onboarding">',
      }),
    ],
    variants: [
      {
        name: "horizontal",
        trigger: 'data-stepper or data-stepper="horizontal"',
        selector: "ol[data-stepper]",
        description: "Default row. Turns vertical below 576px.",
      },
      {
        name: "vertical",
        trigger: 'data-stepper="vertical"',
        selector: '[data-stepper="vertical"]',
        description: "Column with a line down the markers.",
      },
    ],
    states: [
      {
        name: "current",
        trigger: 'aria-current="step"',
        selector: "aria-current",
        description: "Marks the current step. Earlier steps show as complete.",
      },
      {
        name: "unreachable",
        trigger: 'aria-disabled="true" or an anchor without href',
        selector: '[aria-disabled="true"]',
        description: "A step the user cannot open yet.",
      },
    ],
    aria: [
      "Put the status in a label or text for screen readers; the number span is aria-hidden. Wrap the list in a nav when the steps are links.",
    ],
  },
  {
    name: "empty-state",
    category: "extras",
    module: "extras/empty-state",
    use: "Placeholder shown instead of a list, table or search result with no rows. data-empty on a section.",
    markup: [
      ex("Empty state with an action", {
        fixture: "extras/empty-state.html",
        find: "<section data-empty> <figure aria-hidden",
      }),
    ],
    variants: [
      {
        name: "compact",
        trigger: 'data-empty="compact"',
        selector: '[data-empty="compact"]',
        description: "Smaller padding and icon, for cards and panels.",
      },
    ],
    states: [
      {
        name: "hidden",
        trigger: "hidden",
        selector: "[hidden]",
        description: "Hide it while rows exist.",
      },
    ],
    aria: [
      "The icon figure is aria-hidden. Use a heading for the title and a real link or button for the action.",
    ],
  },
];
