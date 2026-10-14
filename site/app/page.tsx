import Link from "next/link";
import { CodeBlock } from "../components/CodeBlock";
import { Example } from "../components/Example";
import { CDN_URL, PACKAGE_NAME, REPO_URL } from "../lib/site";

const FEATURES = [
  {
    title: "Semantic first",
    text: "Style the HTML you already write. Buttons, forms, tables, dialogs and details look right with no classes.",
    href: "/docs/getting-started/quick-start",
  },
  {
    title: "Classless",
    text: "A build with every class selector removed, for content sites, Markdown output and quick prototypes.",
    href: "/docs/getting-started/class-less-version",
  },
  {
    title: "20 themes and your own",
    text: "Twenty ready-made color themes, or one hex color that becomes a full 19-step OKLCH scale.",
    href: "/docs/customization/color-schemes",
  },
  {
    title: "Modern CSS",
    text: "Cascade layers, light-dark(), OKLCH, native popover and anchor positioning. No Sass, no polyfills.",
    href: "/docs/getting-started/browser-support",
  },
  {
    title: "Opt-in extras",
    text: "Tabs, alert, toast, badge, avatar, skeleton, app shell, data table, pagination, stepper and empty state.",
    href: "/docs/extras/overview",
  },
  {
    title: "Safe purge",
    text: "Vite and PostCSS plugins drop unused rules at build time. Safe mode never removes a rule it cannot prove unused.",
    href: "/docs/integrations/overview",
  },
  {
    title: "AI ready",
    text: "llms.txt, llms-full.txt, a Markdown copy of every page and an agent skill that knows the rules.",
    href: "/docs/ai/llms-txt",
  },
];

const HERO_EXAMPLE = `<form>
  <fieldset role="group">
    <input type="email" placeholder="Enter your email" aria-label="Email" />
    <input type="submit" value="Subscribe" />
  </fieldset>
  <label>
    <input type="checkbox" role="switch" checked />
    Send me release notes
  </label>
</form>`;

export default function Home() {
  return (
    <main id="main">
      <section className="hero">
        <div className="container">
          <p className="eyebrow">Open source, MIT</p>
          <h1>Minimal CSS for semantic HTML</h1>
          <p className="lead">A plain modern CSS rewrite of Pico CSS. Write the markup, get a clean, accessible, themeable page.</p>
          <p className="hero-actions">
            <Link href="/docs/getting-started/quick-start" role="button">
              Get started
            </Link>
            <a href={REPO_URL} role="button" className="secondary outline" rel="noopener">
              View on GitHub
            </a>
          </p>
        </div>
      </section>

      <section className="container quick-install" aria-labelledby="install">
        <h2 id="install">Quick install</h2>
        <div className="grid">
          <div>
            <h3>CDN</h3>
            <CodeBlock lang="html" code={`<link rel="stylesheet" href="${CDN_URL}" />`} />
          </div>
          <div>
            <h3>npm</h3>
            <CodeBlock lang="shellscript" code={`npm install ${PACKAGE_NAME}@next`} />
          </div>
        </div>
      </section>

      <section className="container" aria-labelledby="preview">
        <h2 id="preview">Plain HTML in, good looking page out</h2>
        <Example title="A form with no classes" code={HERO_EXAMPLE} />
      </section>

      <section className="container features" aria-labelledby="features">
        <h2 id="features">What you get</h2>
        <div className="feature-grid">
          {FEATURES.map((feature) => (
            <article key={feature.title}>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
              <p>
                <Link href={feature.href}>Learn more</Link>
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="container origin" aria-labelledby="origin">
        <h2 id="origin">Where it comes from</h2>
        <p>
          Pico Reforged is a rewrite of{" "}
          <a href="https://picocss.com" rel="noopener">
            Pico CSS
          </a>{" "}
          v2.1.1 by Lucas Larroche, released under the MIT license. The upstream project is archived. This one keeps
          the same class names, tokens and CDN file names so existing pages keep working, and moves the source from Sass
          to plain CSS.{" "}
          <Link href="/docs/migration/from-pico-css">Migration guide</Link>
        </p>
      </section>
    </main>
  );
}
