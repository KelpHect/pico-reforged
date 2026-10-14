import type { Metadata } from "next";
import examples from "../../lib/examples.json";

export const metadata: Metadata = {
  title: "Examples",
  description:
    "Full pages built with Pico Reforged: the kitchen sink, a classless article and the opt-in extras.",
  alternates: { canonical: "/examples" },
};

export default function ExamplesPage() {
  return (
    <main id="main" className="container examples-page">
      <h1>Examples</h1>
      <p className="lead">
        Full pages you can open, inspect and copy. They follow the theme and color scheme you pick
        in the header.
      </p>
      <div className="example-cards">
        {examples.map((example) => (
          <article key={example.slug}>
            <header>
              <h2>{example.title}</h2>
              <p>{example.description}</p>
            </header>
            <iframe
              title={`Preview of ${example.title}`}
              src={`/examples/${example.slug}.html`}
              loading="lazy"
              sandbox="allow-scripts allow-same-origin"
              className="example-preview"
            />
            <footer>
              <a
                href={`/examples/${example.slug}.html`}
                role="button"
                className="secondary outline"
              >
                Open full page
              </a>
            </footer>
          </article>
        ))}
      </div>
    </main>
  );
}
