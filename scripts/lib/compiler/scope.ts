import { transform } from "lightningcss";
import { firstCompound, isRootLike } from "./selector.ts";
import type { Selector, SelectorComponent } from "./selector.ts";

/** Parses a scope such as ".pico" or "#app main" into selector components. */
export function parseScope(scope: string): Selector {
  let found: Selector[] | undefined;
  try {
    transform({
      filename: "scope.css",
      code: Buffer.from(`${scope} {}`),
      visitor: {
        Rule: {
          style(rule) {
            found ??= rule.value.selectors;
          },
        },
      },
    });
  } catch (error) {
    throw new Error(`Invalid scope selector "${scope}": ${(error as Error).message}`);
  }
  if (!found || found.length !== 1 || (found[0] as Selector).length === 0) {
    throw new Error(`Invalid scope selector "${scope}": give exactly one selector`);
  }
  return found[0] as Selector;
}

const DESCENDANT: SelectorComponent = { type: "combinator", value: "descendant" };

const isDataTheme = (c: SelectorComponent): boolean =>
  c.type === "attribute" && (c as { name: string }).name === "data-theme";

/**
 * Same rules as the v2.1.1 $parent-selector, checked against pico.conditional.css:
 * - a selector that is only :root, :host, html or a lone [data-theme] stays (token blocks)
 * - when such an ancestor compound is followed by more, or the compound is [dir], the scope goes
 *   after it: ":root:not([data-theme]) .pico details", "[dir=rtl] .pico select"
 * - isGlobal picks the selectors that stay unscoped (see scope-global.ts)
 * - everything else is prefixed with the scope and a descendant combinator
 */
export function scopeSelector(
  sel: Selector,
  scope: Selector,
  isGlobal: (sel: Selector) => boolean,
): Selector {
  const { compound, end } = firstCompound(sel);
  const rooted = compound.some((c) => isRootLike(c) || (c.type === "type" && c.name === "html"));
  const themed =
    compound.length > 0 &&
    compound.every(
      (c) => isDataTheme(c) || (c.type === "attribute" && (c as { name: string }).name === "dir"),
    );
  if (end >= sel.length) {
    // single compound
    if (rooted || (compound.length > 0 && compound.every(isDataTheme))) return sel;
  } else if (rooted || themed) {
    return [...sel.slice(0, end + 1), ...scope, DESCENDANT, ...sel.slice(end + 1)];
  }
  if (isGlobal(sel)) return sel;
  return [...scope, DESCENDANT, ...sel];
}
