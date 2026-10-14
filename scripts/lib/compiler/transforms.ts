import type { Rule } from "lightningcss";

type StyleValue = Extract<Rule, { type: "style" }>["value"];
type MediaValue = Extract<Rule, { type: "media" }>["value"];

/**
 * Appended to the entry, inside pico.core so it beats the token layers whatever the order.
 */
export function overrideCss(options: {
  transitions: boolean;
  fluid: boolean;
  semanticContainer: boolean;
}): string {
  const parts: string[] = [];
  if (!options.transitions) parts.push(":root,\n:host {\n  --pico-transition: 0s;\n}");
  if (options.fluid) {
    // Fluid replaces the container width. semantic-container.css also zeroes the side padding
    // from 576px up because it expects a max width; v2.1.1 fluid kept the padding.
    parts.push(":root,\n:host {\n  --pico-container-max-width: 100%;\n}");
    if (options.semanticContainer) {
      parts.push(
        "body > header,\nbody > main,\nbody > footer {\n  padding-inline: var(--pico-block-spacing-horizontal);\n}",
      );
    }
  }
  return parts.length ? `\n@layer pico.core {\n${parts.join("\n\n")}\n}\n` : "";
}

/** important: false. Moves !important declarations into the normal block. */
export function stripImportant(style: StyleValue): boolean {
  const block = style.declarations;
  if (!block?.importantDeclarations?.length) return false;
  block.declarations = [...(block.declarations ?? []), ...block.importantDeclarations];
  block.importantDeclarations = [];
  return true;
}

const MOTION = /^(animation|transition)(-|$)/;

/**
 * transitions: false, as $enable-transitions: false was in v2.1.1. Removes every animation and
 * transition declaration, including the ones that read var(--pico-transition) (the token is
 * also set to 0s for rules a user adds). The indeterminate progress bar keeps its animation
 * because it is the only thing that shows the bar is busy, and v2.1.1 kept it too.
 */
export function stripMotion(style: StyleValue): boolean {
  const block = style.declarations;
  if (!block) return false;
  if (JSON.stringify(style.selectors).includes('"indeterminate"')) return false;
  let changed = false;
  for (const key of ["declarations", "importantDeclarations"] as const) {
    const list = block[key];
    if (!list) continue;
    const kept = list.filter((d) => {
      const prop =
        d.property === "unparsed"
          ? (d.value as { propertyId: { property: string } }).propertyId.property
          : d.property;
      return !MOTION.test(prop);
    });
    if (kept.length !== list.length) {
      block[key] = kept;
      changed = true;
    }
  }
  return changed;
}

/**
 * responsiveTypography: false. The root font size changes per breakpoint inside
 * `@media { :root, :host { --pico-font-size } }` blocks; the base 100% stays.
 */
export function dropRootFontSizeSteps(media: MediaValue): boolean {
  let changed = false;
  for (const rule of media.rules) {
    if (rule.type !== "style") continue;
    const block = rule.value.declarations;
    if (!block) continue;
    for (const key of ["declarations", "importantDeclarations"] as const) {
      const list = block[key];
      if (!list) continue;
      const kept = list.filter(
        (d) =>
          !(d.property === "custom" && (d.value as { name: string }).name === "--pico-font-size"),
      );
      if (kept.length !== list.length) {
        block[key] = kept;
        changed = true;
      }
    }
  }
  return changed;
}

/**
 * Lightning CSS 1.33 reports unset optional fields as null (var() has from: null) but
 * refuses them when a visitor returns the node. Dropping the null keys fixes the round trip.
 */
export function clean<T>(node: T): T {
  if (Array.isArray(node)) {
    node.forEach(clean);
  } else if (node && typeof node === "object") {
    const obj = node as Record<string, unknown>;
    for (const key of Object.keys(obj)) {
      if (obj[key] === null) delete obj[key];
      else clean(obj[key]);
    }
  }
  return node;
}
