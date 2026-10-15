import type { Metadata } from "next";
import { ExampleThumb } from "../../components/ExampleThumb";
import { CodeIcon } from "../../components/icons";
import examples from "../../lib/examples.json";
import { REPO_URL } from "../../lib/site";

export const metadata: Metadata = {
  title: "Examples",
  description: "Full pages built with Pico Reforged: the kitchen sink, a classless article and the opt-in extras.",
  alternates: { canonical: "/examples" },
};

export default function ExamplesPage() {
  return (
    <main id="main" className="site-container examples-page">
      <header className="page-head">
        <h1>Examples</h1>
        <p className="lead">Full pages you can open, inspect and copy. They follow the theme and color scheme you pick in the header.</p>
      </header>
      <div className="gallery">
        {examples.map((example, index) => (
          <article key={example.slug} className="gallery-card">
            <ExampleThumb slug={example.slug} title={example.title} eager={index < 3} />
            <div className="gallery-body">
              <h2>
                <a href={`/examples/${example.slug}`}>{example.title}</a>
              </h2>
              <p>{example.description}</p>
              <p className="gallery-links">
                <a href={`${REPO_URL}/blob/main/${example.source}`} rel="noopener" aria-label={`View source of ${example.title}`}>
                  <CodeIcon size={14} aria-hidden="true" />
                  Source
                </a>
              </p>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
