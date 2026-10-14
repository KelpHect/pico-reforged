import type { Selector, SelectorComponent } from "./selector.ts";

/**
 * Selector list factoring, run on the minified output. Lowering nesting writes out the cross
 * product of the parent and child lists (`button:hover,[type=submit]:hover,[type=reset]:hover`),
 * and a list that differs in one place can say the same thing as `:is(a,b,c)` in fewer bytes.
 *
 * A merge never changes what matches or how specific the rule is:
 * - only components with the same specificity are merged, and `:is()` takes the highest of its
 *   branches, so a type selector is never mixed with an attribute, class or pseudo-class.
 * - `:is()` drops a branch it cannot parse instead of failing the whole list, so the merged
 *   components are limited to the ones the browser floor has always understood. A newer
 *   pseudo-class stays in a plain list.
 */

type Merge = { gain: number; index: number; members: number[]; merged: Selector };

const kindOf = (c: SelectorComponent): string => (c as { kind: string }).kind;

/** Pseudo-classes without arguments that every browser in the floor understands. */
const STABLE_PSEUDOS = new Set([
  "hover",
  "active",
  "focus",
  "focus-visible",
  "focus-within",
  "checked",
  "disabled",
  "enabled",
  "indeterminate",
  "link",
  "any-link",
  "visited",
  "required",
  "optional",
  "read-only",
  "read-write",
  "placeholder-shown",
  "default",
  "first-child",
  "last-child",
  "only-child",
  "empty",
  "target",
]);

/** Specificity tier of a component that may sit inside a merged `:is()`, null when it may not. */
function tier(c: SelectorComponent): "id" | "class" | "type" | null {
  switch (c.type) {
    case "id":
      return "id";
    case "class":
    case "attribute":
      return "class";
    case "type":
      return "type";
    case "pseudo-class":
      return STABLE_PSEUDOS.has(kindOf(c)) ? "class" : null;
    default:
      return null;
  }
}

/** Rough serialized length, enough to tell whether a merge pays off. */
function size(sel: Selector): number {
  let total = 0;
  for (const c of sel) {
    switch (c.type) {
      case "id":
      case "class":
        total += c.name.length + 1;
        break;
      case "type":
        total += c.name.length;
        break;
      case "attribute":
        total += c.name.length + 2;
        if (c.operation) total += c.operation.value.length + 2;
        break;
      case "pseudo-class": {
        total += kindOf(c).length + 1;
        const nested = (c as { selectors?: Selector[] }).selectors;
        if (nested) total += nested.reduce((n, s) => n + size(s) + 1, 2);
        break;
      }
      case "pseudo-element":
        total += kindOf(c).length + 2;
        break;
      default:
        total += 1;
    }
  }
  return total;
}

/** Finds the merge that saves the most bytes: selectors equal except at one component. */
function bestMerge(list: Selector[]): Merge | undefined {
  let best: Merge | undefined;
  const longest = Math.max(...list.map((s) => s.length));
  for (let index = 0; index < longest; index++) {
    const groups = new Map<string, number[]>();
    list.forEach((sel, i) => {
      const part = sel[index];
      if (!part || !tier(part)) return;
      const key = JSON.stringify([tier(part), sel.slice(0, index), sel.slice(index + 1)]);
      const group = groups.get(key);
      if (group) group.push(i);
      else groups.set(key, [i]);
    });
    for (const members of groups.values()) {
      if (members.length < 2) continue;
      const branches = new Map<string, SelectorComponent>();
      for (const i of members) {
        const part = (list[i] as Selector)[index] as SelectorComponent;
        branches.set(JSON.stringify(part), part);
      }
      if (branches.size < 2) continue;
      const first = list[members[0] as number] as Selector;
      const rest = size(first) - size([first[index] as SelectorComponent]);
      // k selectors become one: (k - 1) copies of the shared part go, `:is()` costs 5 bytes.
      const gain = (members.length - 1) * rest - 5;
      if (gain > 0 && (!best || gain > best.gain)) {
        const is = {
          type: "pseudo-class",
          kind: "is",
          selectors: [...branches.values()].map((c) => [c]),
        } as unknown as SelectorComponent;
        best = {
          gain,
          index,
          members,
          merged: [...first.slice(0, index), is, ...first.slice(index + 1)],
        };
      }
    }
  }
  return best;
}

/** Merges the selectors of one rule. Returns the same array when nothing could be merged. */
export function factorSelectors(list: Selector[]): Selector[] {
  // Nested rules keep `&`, whose parent is not in this list, so they are left alone.
  if (list.length < 2 || list.some((s) => s.some((c) => c.type === "nesting"))) return list;
  let current = list;
  for (;;) {
    const merge = bestMerge(current);
    if (!merge) return current;
    const first = merge.members[0];
    const drop = new Set(merge.members);
    current = current.flatMap((sel, i) => {
      if (i === first) return [merge.merged];
      return drop.has(i) ? [] : [sel];
    });
    if (current.length < 2) return current;
  }
}
