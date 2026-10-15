import type { MDXComponents } from "mdx/types";
import Link from "next/link";
import type { ComponentProps } from "react";
import { Callout } from "./components/Callout";
import { MdxPre } from "./components/CodeFigure";
import { Example } from "./components/Example";
import { ExamplePreview } from "./components/ExamplePreview";
import { InlineCode } from "./components/InlineCode";
import { InstallTabs } from "./components/InstallTabs";
import { TokenFilter } from "./components/TokenFilter";
import { PropsTable, Tokens } from "./components/Tokens";
import { VersionPicker } from "./components/VersionPicker";

function Anchor({ href = "", ...props }: ComponentProps<"a">) {
  // Files such as /llms.txt are not pages, so a router link would prefetch a route that 404s
  const isFile = /\.[a-z0-9]+$/i.test(href.split(/[?#]/)[0]);
  if ((href.startsWith("/") && !isFile) || href.startsWith("#")) return <Link href={href} {...props} />;
  const external = /^https?:/.test(href);
  return <a href={href} {...(external ? { rel: "noopener" } : {})} {...props} />;
}

/** Headings get a hover link to themselves. */
function heading(Tag: "h2" | "h3" | "h4") {
  return function Heading({ id, children, ...props }: ComponentProps<"h2">) {
    if (!id) return <Tag {...props}>{children}</Tag>;
    return (
      <Tag id={id} {...props}>
        {children}
        <a href={`#${id}`} className="heading-anchor" aria-hidden="true" tabIndex={-1}>
          #
        </a>
      </Tag>
    );
  };
}

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    a: Anchor,
    h2: heading("h2"),
    h3: heading("h3"),
    h4: heading("h4"),
    pre: MdxPre,
    code: InlineCode,
    table: (props: ComponentProps<"table">) => (
      <div className="overflow-auto table-wrap">
        <table {...props} />
      </div>
    ),
    Example,
    ExamplePreview,
    Tokens,
    PropsTable,
    Callout,
    InstallTabs,
    TokenFilter,
    VersionPicker,
    ...components,
  };
}

export const useMDXComponents = getMDXComponents;
