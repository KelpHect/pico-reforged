import { compoundsOf } from "./selector.ts";
import type { Selector, SelectorComponent } from "./selector.ts";

/** Classes the modal script puts on <html>, outside any scope. */
const HTML_CLASSES = new Set(["modal-is-open", "modal-is-opening", "modal-is-closing"]);
/**
 * Classes v2.1.1 never scoped. They are often on the same element as the scope itself
 * (<main class="pico container">), which a ".pico .container" prefix would not match.
 */
const LAYOUT_CLASSES = new Set(["container", "container-fluid", "grid"]);

function hasClass(c: SelectorComponent, names: Set<string>): boolean {
  if (c.type === "class") return names.has(c.name);
  if (c.type !== "pseudo-class") return false;
  const inner = (c as { selectors?: unknown }).selectors;
  return (
    Array.isArray(inner) &&
    inner.some((s) => Array.isArray(s) && s.some((x: SelectorComponent) => hasClass(x, names)))
  );
}

/**
 * Selectors left outside the scope, matching what v2.1.1 did with $parent-selector where that
 * is needed to work (box-sizing reset, body and main, the <html> modal classes, the layout
 * classes). v2.1.1 also left a few rules unscoped by accident: the element-level token
 * overrides (a, h1, pre, [role=group] button and so on, custom properties only) and
 * `[type=reset].outline`. Those are scoped here.
 */
export const SCOPE_GLOBAL = (sel: Selector): boolean => {
  const compounds = compoundsOf(sel);
  const first = compounds[0] ?? [];
  if (compounds.length === 1) {
    const nonUniversal = first.filter((c) => c.type !== "universal");
    if (nonUniversal.length === 0) return true;
    if (nonUniversal.length === 1) {
      const c = nonUniversal[0] as SelectorComponent;
      if (c.type === "pseudo-element" && (c.kind === "before" || c.kind === "after")) return true;
      if (c.type === "type" && (c.name === "body" || c.name === "main")) return true;
    }
  }
  if (first.some((c) => hasClass(c, HTML_CLASSES))) return true;
  // .container, .grid, .grid > *: the class has to be the first compound
  return (
    first.some((c) => hasClass(c, LAYOUT_CLASSES)) &&
    compounds.slice(1).every((c) => c.every((x) => x.type === "universal"))
  );
};
