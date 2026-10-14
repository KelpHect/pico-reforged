import type { Rule } from "lightningcss";

type StyleValue = Extract<Rule, { type: "style" }>["value"];
type MediaValue = Extract<Rule, { type: "media" }>["value"];

/**
 * Appended to the entry, inside pico.core so it beats the token layers whatever the order.
 * With layers: false the wrapper is removed and the end of the file wins instead.
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
 * transitions: false. Drops the animation and transition declarations that carry hard-coded
 * durations (modal, tooltip, switch thumb, progress, open and close transitions). Those that
 * use var(--pico-transition) stay, as the token is already 0s.
 */
export function stripMotion(style: StyleValue): boolean {
  const block = style.declarations;
  if (!block) return false;
  let changed = false;
  for (const key of ["declarations", "importantDeclarations"] as const) {
    const list = block[key];
    if (!list) continue;
    const kept = list.filter((d) => {
      const prop =
        d.property === "unparsed"
          ? (d.value as { propertyId: { property: string } }).propertyId.property
          : d.property;
      if (!MOTION.test(prop)) return true;
      return d.property === "unparsed" && JSON.stringify(d.value).includes("--pico-transition");
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
