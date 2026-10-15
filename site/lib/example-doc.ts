import { DEFAULT_THEME } from "./themes";
import type { Scheme, ThemeState } from "./theme";

export type ExampleVariant = "class" | "classless";

export type ExampleDocOptions = {
  code: string;
  variant?: ExampleVariant;
  /** Extra stylesheets from public/css, without the .min.css suffix, for example "pico.extras" or "extras/tabs". */
  css?: string[];
  /** No padding around the example. */
  bare?: boolean;
  /** Open the first dialog (not modal) or dropdown, so the preview shows the open state. */
  showOpen?: boolean;
};

const STEM: Record<ExampleVariant, string> = { class: "pico", classless: "pico.classless" };

/** The stylesheet the iframe starts with. The page swaps it when the theme changes. */
export function baseHref(variant: ExampleVariant, theme = DEFAULT_THEME) {
  return `/css/${STEM[variant]}${theme === DEFAULT_THEME ? "" : `.${theme}`}.min.css`;
}

// The frame reports its height to the page. It measures the body box, not the scroll height,
// because an iframe's scroll height never drops below the frame's own height and the frame
// could then only grow. The page canvas shows through the transparent root unless the frame
// uses a color scheme of its own, in which case it paints its own background.
const FRAME_SCRIPT = (stem: string, fallback: string) => `
(function () {
  var link = document.getElementById("pico-base");
  var root = document.documentElement;
  var loaded = false;
  // Before load the stylesheet may not apply yet, and an unstyled body reports a wrong height
  function report() {
    if (!loaded || !link.sheet || innerWidth === 0) return;
    var body = document.body;
    var style = getComputedStyle(body);
    var height = body.getBoundingClientRect().height + parseFloat(style.marginTop) + parseFloat(style.marginBottom);
    window.parent.postMessage({ type: "pico-height", height: Math.ceil(height), ready: true }, "*");
  }
  function apply(state, own) {
    var theme = state.theme === ${JSON.stringify(fallback)} ? "" : "." + state.theme;
    var href = "/css/" + ${JSON.stringify(stem)} + theme + ".min.css";
    if (link.getAttribute("href") !== href) {
      link.onload = report;
      link.setAttribute("href", href);
    }
    if (state.scheme === "light" || state.scheme === "dark") root.setAttribute("data-theme", state.scheme);
    else root.removeAttribute("data-theme");
    if (own) root.setAttribute("data-own-scheme", "");
    else root.removeAttribute("data-own-scheme");
    requestAnimationFrame(report);
  }
  window.addEventListener("message", function (event) {
    if (event.source !== window.parent) return;
    var data = event.data;
    if (!data) return;
    if (data.type === "pico-state") apply(data.state, data.own);
    if (data.type === "pico-measure") report();
  });
  if (typeof ResizeObserver === "function") new ResizeObserver(report).observe(document.body);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(report);
  window.addEventListener("load", function () {
    loaded = true;
    window.parent.postMessage({ type: "pico-ready" }, "*");
    report();
  });
})();
`;

// The open state, without showModal() so the frame does not take focus or scroll the page.
// The first dialog, dropdown or popover of the demo starts open.
const OPEN_SCRIPT = `(function(){
  var d = document.querySelector("dialog");
  if (d) { if (!d.open) d.setAttribute("open", ""); return; }
  var m = document.querySelector("details.dropdown");
  if (m) { m.setAttribute("open", ""); return; }
  var b = document.querySelector("[popovertarget]");
  var p = b && document.getElementById(b.getAttribute("popovertarget"));
  if (p && p.showPopover && p.getAttribute("popover") !== "manual") {
    window.addEventListener("load", function () {
      try { p.showPopover({ source: b }); } catch (e) { try { p.showPopover(); } catch (e2) {} }
    });
  }
})()`;

// Buttons written one after another in a demo get a gap, as they would in a toolbar. The
// framework keeps the v2.1.1 spacing, so this lives in the demo page only.
const DEMO_ROW =
  'body>:is(button,[role="button"],input:is([type="button"],[type="submit"],[type="reset"])){margin-inline-end:.5rem;margin-block-end:.5rem}';

export function buildExampleDoc({ code, variant = "class", css = [], bare, showOpen }: ExampleDocOptions) {
  const extra = css.map((name) => `<link rel="stylesheet" href="/css/${name}.min.css">`).join("\n");
  const padding = bare
    ? "body{padding:0}"
    : "body{padding:1.5rem}@media (max-width:575px){body{padding:.75rem}}";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link id="pico-base" rel="stylesheet" href="${baseHref(variant)}">
${extra}
<style>html:not([data-own-scheme]){background:transparent}${padding}${DEMO_ROW}body>:nth-last-child(1 of :not(script,style)){margin-bottom:0}</style>
</head>
<body>
${code}
${showOpen ? `<script>${OPEN_SCRIPT}</script>` : ""}
<script>${FRAME_SCRIPT(STEM[variant], DEFAULT_THEME)}</script>
</body>
</html>`;
}

/** A standalone copy of an example for "Open in new tab": absolute stylesheet URLs, the current theme. */
export function buildStandaloneDoc(options: ExampleDocOptions, origin: string, state: ThemeState, scheme: Scheme) {
  const variant = options.variant ?? "class";
  const extra = (options.css ?? [])
    .map((name) => `<link rel="stylesheet" href="${origin}/css/${name}.min.css">`)
    .join("\n");
  const themeAttr = scheme === "light" || scheme === "dark" ? ` data-theme="${scheme}"` : "";
  return `<!doctype html>
<html lang="en"${themeAttr}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pico Reforged example</title>
<link rel="stylesheet" href="${origin}${baseHref(variant, state.theme)}">
${extra}
</head>
<body>
<main class="container">
${options.code}
</main>
</body>
</html>`;
}
