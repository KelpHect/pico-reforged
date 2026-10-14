import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CopyMarkdown } from "../../../components/CopyMarkdown";
import { DocsSidebar } from "../../../components/DocsSidebar";
import { Toc } from "../../../components/Toc";
import { getSidebar } from "../../../lib/sidebar";
import { mdUrl, source } from "../../../lib/source";
import { getMDXComponents } from "../../../mdx-components";

type Props = { params: Promise<{ slug: string[] }> };

export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page) return {};
  const url = `/docs/${page.slugs.join("/")}`;
  return {
    title: page.data.title,
    description: page.data.description,
    alternates: { canonical: url, types: { "text/markdown": mdUrl(page) } },
    openGraph: { type: "article", url, title: page.data.title, description: page.data.description },
  };
}

export default async function DocsPage({ params }: Props) {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page) notFound();

  const Body = page.data.body;
  const sections = getSidebar();
  const all = sections.flatMap((section) => section.items);
  const index = all.findIndex((item) => item.url === page.url);
  const previous = index > 0 ? all[index - 1] : undefined;
  const next = index >= 0 && index < all.length - 1 ? all[index + 1] : undefined;
  const section = sections.find((entry) => entry.items.some((item) => item.url === page.url));

  return (
    <div className="container docs-shell">
      <DocsSidebar sections={sections} />
      <main id="main" className="docs-main">
        <div className="docs-article">
          <header>
            {section && <p className="eyebrow">{section.title}</p>}
            <h1>{page.data.title}</h1>
            {page.data.description && <p className="lead">{page.data.description}</p>}
            <CopyMarkdown url={mdUrl(page)} />
          </header>
          <Body components={getMDXComponents()} />
          <nav className="pager" aria-label="Pagination">
            {previous ? (
              <a href={previous.url} rel="prev">
                <small>Previous</small>
                <span>{previous.title}</span>
              </a>
            ) : (
              <span />
            )}
            {next ? (
              <a href={next.url} rel="next">
                <small>Next</small>
                <span>{next.title}</span>
              </a>
            ) : null}
          </nav>
        </div>
      </main>
      <Toc items={page.data.toc} />
    </div>
  );
}
