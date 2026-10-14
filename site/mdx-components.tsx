import type { MDXComponents } from "mdx/types";
import Link from "next/link";
import type { ComponentProps } from "react";
import { Example } from "./components/Example";
import { PropsTable, Tokens } from "./components/Tokens";

function Anchor({ href = "", ...props }: ComponentProps<"a">) {
  // Files such as /llms.txt are not pages, so a router link would prefetch a route that 404s
  const isFile = /\.[a-z0-9]+$/i.test(href.split(/[?#]/)[0]);
  if ((href.startsWith("/") && !isFile) || href.startsWith("#")) return <Link href={href} {...props} />;
  const external = /^https?:/.test(href);
  return <a href={href} {...(external ? { rel: "noopener" } : {})} {...props} />;
}

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    a: Anchor,
    table: (props: ComponentProps<"table">) => (
      <div className="overflow-auto">
        <table {...props} />
      </div>
    ),
    Example,
    Tokens,
    PropsTable,
    ...components,
  };
}

export const useMDXComponents = getMDXComponents;
