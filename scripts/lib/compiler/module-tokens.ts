/**
 * Custom properties that belong to one module, by name prefix. When a module is left out its
 * tokens go with it, unless something that stays still reads them with var(). The prefixes are
 * a shortlist, not a guarantee: dropOrphanTokens checks the references itself.
 */
export const MODULE_TOKENS: Record<string, string[]> = {
  "content/typography": [
    "--pico-h1-",
    "--pico-h2-",
    "--pico-h3-",
    "--pico-h4-",
    "--pico-h5-",
    "--pico-h6-",
    "--pico-mark-",
    "--pico-blockquote-",
  ],
  "content/link": [
    "--pico-primary-underline",
    "--pico-primary-hover-underline",
    "--pico-secondary-underline",
    "--pico-secondary-hover-underline",
    "--pico-contrast-underline",
    "--pico-contrast-hover-underline",
  ],
  "content/table": ["--pico-table-"],
  "content/code": ["--pico-code-"],
  "layout/grid": ["--pico-grid-"],
  "forms/checkbox-radio-switch": ["--pico-switch-", "--pico-icon-checkbox", "--pico-icon-minus"],
  "forms/input-date": ["--pico-icon-date", "--pico-icon-time"],
  "forms/input-range": ["--pico-range-"],
  "forms/input-search": ["--pico-icon-search"],
  "components/accordion": ["--pico-accordion-"],
  "components/card": ["--pico-card-"],
  "components/dropdown": ["--pico-dropdown-"],
  "components/group": ["--pico-group-"],
  "components/loading": ["--pico-icon-loading", "--pico-loading-"],
  "components/modal": ["--pico-modal-", "--pico-icon-close", "--pico-scrollbar-width"],
  "components/nav": ["--pico-nav-"],
  "components/progress": ["--pico-progress-"],
  "components/tooltip": ["--pico-tooltip-"],
};

/** Prefixes of the tokens that the excluded modules owned. */
export function orphanCandidates(excluded: string[]): string[] {
  return excluded.flatMap((name) => MODULE_TOKENS[name] ?? []);
}

/** The names a stylesheet reads with var(). */
export function referencedTokens(css: string): Set<string> {
  return new Set([...css.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1] as string));
}

/**
 * A visitor that removes the custom properties starting with one of the prefixes that nothing
 * reads. Counts what it removed so the caller can run it again, since one dropped token can
 * have been the only reader of another.
 */
export function orphanVisitor(
  prefixes: string[],
  css: string,
  removed: { count: number },
): { Declaration: { custom: (decl: { name: string }) => [] | undefined } } {
  const used = referencedTokens(css);
  return {
    Declaration: {
      custom(decl) {
        const name = decl.name;
        if (used.has(name) || !prefixes.some((p) => name.startsWith(p))) return undefined;
        removed.count++;
        return [];
      },
    },
  };
}
