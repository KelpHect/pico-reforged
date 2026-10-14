import type { Selector, SelectorComponent } from "lightningcss";

export type { Selector, SelectorComponent };

/** Pseudo-classes that take a selector list and match when any branch matches. */
const LIST_PSEUDOS = new Set(["is", "where", "any", "has"]);

type WithList = Extract<SelectorComponent, { type: "pseudo-class" }> & { selectors: Selector[] };

export const isListPseudo = (c: SelectorComponent): c is WithList =>
  c.type === "pseudo-class" &&
  LIST_PSEUDOS.has((c as { kind: string }).kind) &&
  Array.isArray((c as { selectors?: unknown }).selectors);

export const isNot = (c: SelectorComponent): boolean =>
  c.type === "pseudo-class" && (c as { kind: string }).kind === "not";

/** Splits a complex selector into its compound selectors, dropping the combinators. */
export function compoundsOf(sel: Selector): SelectorComponent[][] {
  const out: SelectorComponent[][] = [[]];
  for (const c of sel) {
    if (c.type === "combinator") out.push([]);
    else (out[out.length - 1] as SelectorComponent[]).push(c);
  }
  return out;
}

/** The leading compound of a selector and the index where it ends (at the first combinator). */
export function firstCompound(sel: Selector): { compound: SelectorComponent[]; end: number } {
  let end = 0;
  while (end < sel.length && (sel[end] as SelectorComponent).type !== "combinator") end++;
  return { compound: sel.slice(0, end), end };
}

export const isRoot = (c: SelectorComponent): boolean =>
  c.type === "pseudo-class" && ["root", "host"].includes((c as { kind: string }).kind);

/** True for `:root`, `:host`, `:host(...)` and `:where(:root)` style components. */
export function isRootLike(c: SelectorComponent): boolean {
  if (isRoot(c)) return true;
  if (isListPseudo(c)) {
    return c.selectors.length > 0 && c.selectors.every((s) => s.length > 0 && s.every(isRootLike));
  }
  return false;
}

/** Runs `fn` on every style rule's selector list; `fn` returns the replacement list. */
export type SelectorPass = (list: Selector[]) => Selector[];
