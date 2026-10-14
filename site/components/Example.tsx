import { highlight } from "fumadocs-core/highlight";
import { ExampleFrame } from "./ExampleFrame";
import type { ExampleVariant } from "../lib/example-doc";

type Props = {
  title: string;
  /** The markup. The remark plugin fills it from a fenced block inside <Example>. */
  code?: string;
  /** Fixed iframe height in px. Leave it out and the frame fits its content. */
  height?: number;
  variant?: ExampleVariant;
  /** Extra stylesheets from public/css, without .min.css, for example ["pico.extras"]. */
  css?: string[];
  bare?: boolean;
  /** Language of the listing, html by default. */
  lang?: string;
};

export async function Example({ title, code = "", height, variant, css, bare, lang = "html" }: Props) {
  const source = code.replace(/^\n+|\s+$/g, "");
  const listing = await highlight(source, {
    lang,
    themes: { light: "github-light", dark: "github-dark" },
    defaultColor: false,
  });

  return (
    <figure className="example">
      <figcaption>{title}</figcaption>
      <ExampleFrame
        title={title}
        code={source}
        height={height}
        variant={variant}
        css={css}
        bare={bare}
      />
      <div className="example-code">{listing}</div>
    </figure>
  );
}
