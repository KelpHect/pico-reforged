import { highlighted } from "./CodeBlock";
import { ExampleView } from "./ExampleView";
import type { ExampleVariant } from "../lib/example-doc";

type Props = {
  title: string;
  /** The markup. The remark plugin fills it from a fenced block inside <Example>. */
  code?: string;
  /** Starting iframe height in px. The frame then fits its content. */
  height?: number;
  variant?: ExampleVariant;
  /** Extra stylesheets from public/css, without .min.css, for example ["pico.extras"]. */
  css?: string[];
  bare?: boolean;
  /** Language of the listing, html by default. */
  lang?: string;
  /** Keep `height` as a minimum, for dialogs, popovers, menus and toasts. Set by the remark plugin. */
  overlay?: boolean;
  /** Load the frame at once. The remark plugin sets it on the first two examples of a page. */
  eager?: boolean;
  /** "full" keeps the frame at least 800px wide, so the 768px breakpoint shows on narrow pages. */
  width?: "full";
  /** Show only the preview, no listing. */
  preview?: boolean;
};

export async function Example({ title, code = "", height, variant, css, bare, lang = "html", overlay, eager, width, preview }: Props) {
  const source = code.replace(/^\n+|\s+$/g, "");
  const listing = preview ? undefined : await highlighted(source, lang);
  return (
    <ExampleView
      title={title}
      code={source}
      variant={variant}
      css={css}
      bare={bare}
      height={height}
      overlay={overlay}
      eager={eager}
      width={width}
      lines={source.split("\n").length}
      listing={listing}
    />
  );
}
