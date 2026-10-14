import { isListPseudo } from "./selector.ts";
import type { Selector, SelectorComponent } from "./selector.ts";

/**
 * Selectors the classless filter keeps although they contain a class outside :not().
 * v2.1.1 built its classless files from Sass sources where these rules did not depend on a
 * class, so the plain "needs a class" test would lose them. Each entry is a predicate on
 * one flattened selector. Found by running the filter over test/reference/v2.1.1/pico.css and
 * diffing the result with test/reference/v2.1.1/pico.classless.css: this is the only entry.
 * v2.1.1 also dropped the unused modal keyframes (pruneKeyframes does that here) and wrote
 * ":not(.outline)" away in two selectors, which makes no difference without classes.
 */
export const CLASSLESS_KEEP: { why: string; test: (sel: Selector) => boolean }[] = [
  {
    // v2.1.1 let the striped table rules through in its classless files, so a classless page
    // can still write <table class="striped">.
    why: "table.striped",
    test: (sel) =>
      sel.some((c) => c.type === "class" && c.name === "striped") &&
      sel.some((c) => c.type === "type" && c.name === "table"),
  },
];

/** Selector with every list pseudo reduced to its classless branches, or null if none is left. */
function reduce(sel: Selector): Selector | null {
  const out: SelectorComponent[] = [];
  for (const c of sel) {
    if (c.type === "class") return null;
    if (isListPseudo(c)) {
      const kept = c.selectors.map(reduce).filter((s): s is Selector => s !== null);
      if (kept.length === 0) return null;
      out.push({ ...c, selectors: kept } as SelectorComponent);
    } else if (c.type === "pseudo-class" && (c as { kind: string }).kind === "host") {
      const inner = (c as { selectors?: Selector | null }).selectors;
      if (inner && reduce(inner) === null) return null;
      out.push(c);
    } else {
      out.push(c);
    }
  }
  return out;
}

/**
 * Classless filter: drops each selector that needs a class (classes inside :not() do not
 * count). Returns the surviving selectors, which is empty when the whole rule goes.
 */
export function filterClassless(list: Selector[]): Selector[] {
  const out: Selector[] = [];
  for (const sel of list) {
    const reduced = reduce(sel);
    if (reduced) out.push(reduced);
    else if (CLASSLESS_KEEP.some((k) => k.test(sel))) out.push(sel);
  }
  return out;
}
