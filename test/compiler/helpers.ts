import { transform } from "lightningcss";
import type { Selector } from "lightningcss";

/** Runs `fn` over every selector of a stylesheet and prints the result. */
export function mapSelectors(css: string, fn: (sel: Selector) => Selector[]): string {
  const result = transform({
    filename: "test.css",
    code: Buffer.from(css),
    visitor: { Selector: (sel: Selector) => fn(sel) },
  });
  return new TextDecoder().decode(result.code);
}

/** Collapses whitespace so assertions do not depend on formatting. */
export const squash = (css: string): string => css.replace(/\s+/g, " ");

/** The text of every rule header (selector list) in a stylesheet. */
export function headers(css: string): string[] {
  return [...squash(css).matchAll(/(?:^|[{};])\s*([^{};@\s][^{};]*)\{/g)].map((m) =>
    (m[1] as string).trim(),
  );
}
