import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { join } from "node:path";
import { CopyMarkdown } from "../../../components/CopyMarkdown";
import { DocsSidebar } from "../../../components/DocsSidebar";
import { ArrowLeftIcon, ArrowRightIcon } from "../../../components/icons";
import { Toc, TocInline } from "../../../components/Toc";
import { lastUpdated } from "../../../lib/build-info";
import { getSidebar } from "../../../lib/sidebar";
import { REPO_URL } from "../../../lib/site";
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
  const file = `site/content/docs/${page.path}`;
  const updated = lastUpdated(join(process.cwd(), "content", "docs", page.path));

  return (
    <>
      <div className="docs-bar">
        <div className="site-container">
          <p>
            {section ? <span>{section.title}</span> : null}
            {section ? <span aria-hidden="true">/</span> : null}
            <strong>{page.data.title}</strong>
          </p>
        </div>
      </div>
      <div className="site-container docs-shell">
        <div className="docs-aside">
          <DocsSidebar sections={sections} />
        </div>
        <main id="main" className="docs-main">
          <div className="docs-article">
            <header className="docs-header">
              <nav aria-label="breadcrumb" className="docs-breadcrumb">
                <ul>
                  <li>
                    <Link href="/docs">Docs</Link>
                  </li>
                  {section ? (
                    <li>
                      <Link href={section.items[0].url}>{section.title}</Link>
                    </li>
                  ) : null}
                  <li>
                    <span aria-current="page">{page.data.title}</span>
                  </li>
                </ul>
              </nav>
              <div className="docs-title-row">
                <h1>{page.data.title}</h1>
                <CopyMarkdown url={mdUrl(page)} />
              </div>
              {page.data.description ? <p className="lead">{page.data.description}</p> : null}
              <TocInline items={page.data.toc} />
            </header>
            <Body components={getMDXComponents()} />
          </div>
          <footer className="docs-footer">
            <p className="docs-meta">
              <a href={`${REPO_URL}/blob/main/${file}`} rel="noopener">
                Edit this page on GitHub
              </a>
              {updated ? <span>Last updated {updated}</span> : null}
            </p>
            <nav className="pager" aria-label="Previous and next page">
              {previous ? (
                <Link href={previous.url} rel="prev">
                  <small>
                    <ArrowLeftIcon size={14} /> Previous
                  </small>
                  <span>{previous.title}</span>
                </Link>
              ) : (
                <span />
              )}
              {next ? (
                <Link href={next.url} rel="next">
                  <small>
                    Next <ArrowRightIcon size={14} />
                  </small>
                  <span>{next.title}</span>
                </Link>
              ) : null}
            </nav>
          </footer>
        </main>
        <div className="docs-toc-aside">
          <Toc items={page.data.toc} />
        </div>
      </div>
    </>
  );
}
