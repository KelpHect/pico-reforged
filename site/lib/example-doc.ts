import { DEFAULT_THEME } from "./themes";

export type ExampleVariant = "class" | "classless";

export type ExampleDocOptions = {
  code: string;
  variant?: ExampleVariant;
  /** Extra stylesheets from public/css, without the .min.css suffix, for example "pico.extras" or "extras/tabs". */
  css?: string[];
  /** No padding around the example. */
  bare?: boolean;
};

const STEM: Record<ExampleVariant, string> = { class: "pico", classless: "pico.classless" };

/** The stylesheet the iframe starts with. The page swaps it when the theme changes. */
export function baseHref(variant: ExampleVariant) {
  return `/css/${STEM[variant]}.min.css`;
}

const FRAME_SCRIPT = (stem: string, fallback: string) => `
(function () {
  var link = document.getElementById("pico-base");
  function apply(state) {
    var theme = state.theme === ${JSON.stringify(fallback)} ? "" : "." + state.theme;
    var href = "/css/" + ${JSON.stringify(stem)} + theme + ".min.css";
    if (link.getAttribute("href") !== href) link.setAttribute("href", href);
    var root = document.documentElement;
    if (state.scheme === "light" || state.scheme === "dark") root.setAttribute("data-theme", state.scheme);
    else root.removeAttribute("data-theme");
  }
  window.addEventListener("message", function (event) {
    if (event.source !== window.parent) return;
    var data = event.data;
    if (data && data.type === "pico-state") apply(data.state);
  });
  function report() {
    var height = Math.ceil(document.body.getBoundingClientRect().height);
    window.parent.postMessage({ type: "pico-height", height: height }, "*");
  }
  if (typeof ResizeObserver === "function") new ResizeObserver(report).observe(document.body);
  window.addEventListener("load", function () {
    report();
    window.parent.postMessage({ type: "pico-ready" }, "*");
    setTimeout(function () { window.parent.postMessage({ type: "pico-ready" }, "*"); }, 400);
  });
})();
`;

export function buildExampleDoc({ code, variant = "class", css = [], bare }: ExampleDocOptions) {
  const extra = css.map((name) => `<link rel="stylesheet" href="/css/${name}.min.css">`).join("\n");
  const padding = bare ? "" : "body{padding:1rem}";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link id="pico-base" rel="stylesheet" href="${baseHref(variant)}">
${extra}
<style>${padding}</style>
</head>
<body>
${code}
<script>${FRAME_SCRIPT(STEM[variant], DEFAULT_THEME)}</script>
</body>
</html>`;
}
