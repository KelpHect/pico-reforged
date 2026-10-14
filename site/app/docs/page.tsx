import type { Metadata } from "next";
import Link from "next/link";
import { getSidebar } from "../../lib/sidebar";

export const metadata: Metadata = {
  title: "Documentation",
  description: "Guides for installing, theming, building and purging Pico Reforged.",
  alternates: { canonical: "/docs" },
};

export default function DocsIndex() {
  const sections = getSidebar();
  return (
    <main id="main" className="container docs-index">
      <h1>Documentation</h1>
      <p className="lead">Pick a section. Every page has a Markdown version for tools and assistants.</p>
      <div className="grid">
        {sections.map((section) => (
          <article key={section.title}>
            <header>
              <h2>{section.title}</h2>
            </header>
            <ul>
              {section.items.map((item) => (
                <li key={item.url}>
                  <Link href={item.url}>{item.title}</Link>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </main>
  );
}
