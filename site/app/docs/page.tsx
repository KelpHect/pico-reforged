import type { Metadata } from "next";
import Link from "next/link";
import { DocsSearchField } from "../../components/DocsSearchField";
import { LayersIcon, PaletteIcon, PlugIcon, RocketIcon } from "../../components/icons";
import { getSidebar } from "../../lib/sidebar";

export const metadata: Metadata = {
  title: "Documentation",
  description: "Guides for installing, theming, building and purging Pico Reforged.",
  alternates: { canonical: "/docs" },
};

const START = [
  { title: "Quick start", text: "One link tag, then write plain HTML.", href: "/docs/getting-started/quick-start", Icon: RocketIcon },
  { title: "Themes", text: "Twenty color themes, or one from your brand color.", href: "/docs/customization/themes", Icon: PaletteIcon },
  { title: "Extras", text: "Tabs, alerts, toasts, data tables and more, opt-in.", href: "/docs/extras/overview", Icon: LayersIcon },
  { title: "Integrations", text: "Vite, PostCSS, Next.js and a purge that keeps what you use.", href: "/docs/integrations/overview", Icon: PlugIcon },
];

export default function DocsIndex() {
  const sections = getSidebar();
  // Migration has a single page, so it sits with Getting started here
  const migration = sections.find((section) => section.title === "Migration");
  const groups = sections
    .filter((section) => section !== migration)
    .map((section) =>
      section.title === "Getting started" && migration ? { ...section, items: [...section.items, ...migration.items] } : section,
    );

  return (
    <main id="main" className="site-container docs-index">
      <header className="docs-index-head">
        <h1>Documentation</h1>
        <p className="lead">
          Everything about Pico Reforged: install it, write semantic HTML, pick a theme and trim the CSS to what you use. Every page has a Markdown copy for tools and assistants.
        </p>
        <DocsSearchField />
      </header>

      <section aria-labelledby="start-here">
        <h2 id="start-here" className="section-label">
          Start here
        </h2>
        <div className="card-grid four">
          {START.map(({ title, text, href, Icon }) => (
            <article key={title} className="link-card">
              <span className="icon-tile">
                <Icon size={18} />
              </span>
              <h3>
                <Link href={href}>{title}</Link>
              </h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="all-sections">
        <h2 id="all-sections" className="docs-index-h2">
          All sections
        </h2>
        <div className="section-columns">
          {groups.map((section) => (
            <nav key={section.title} aria-label={section.title}>
              <p className="sidebar-title">{section.title}</p>
              <ul>
                {section.items.map((item) => (
                  <li key={item.url}>
                    <Link href={item.url}>{item.title}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </section>
    </main>
  );
}
