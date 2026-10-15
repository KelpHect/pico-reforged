import Link from "next/link";
import { CodeBlock } from "../components/CodeBlock";
import { CopyButton } from "../components/CopyButton";
import { Example } from "../components/Example";
import { CodeIcon, LayersIcon, PaletteIcon, PuzzleIcon, ScissorsIcon, SparkIcon, DocumentIcon } from "../components/icons";
import { InstallTabs } from "../components/InstallTabs";
import { ThemeSwatches } from "../components/ThemeMenu";
import { VERSION_LABEL, gzipKb } from "../lib/build-info";
import { PACKAGE_NAME } from "../lib/site";

const FEATURES = [
  {
    title: "Semantic first",
    text: "Style the HTML you already write. Buttons, forms, tables, dialogs and details look right with no classes.",
    href: "/docs/getting-started/quick-start",
    Icon: CodeIcon,
  },
  {
    title: "Classless build",
    text: "A build with every class selector removed, for content sites, Markdown output and quick prototypes.",
    href: "/docs/getting-started/class-less-version",
    Icon: DocumentIcon,
  },
  {
    title: "20 themes and your own",
    text: "Twenty ready-made color themes, or one hex color that becomes a full 19-step OKLCH scale.",
    href: "/docs/customization/themes",
    Icon: PaletteIcon,
  },
  {
    title: "Modern CSS",
    text: "Cascade layers, light-dark(), OKLCH, native popover and anchor positioning. No Sass, no polyfills.",
    href: "/docs/getting-started/browser-support",
    Icon: LayersIcon,
  },
  {
    title: "Opt-in extras",
    text: "Tabs, alert, toast, badge, avatar, skeleton, app shell, data table, pagination, stepper and empty state.",
    href: "/docs/extras/overview",
    Icon: PuzzleIcon,
  },
  {
    title: "Safe purge",
    text: "Vite and PostCSS plugins drop unused rules at build time. Safe mode never removes a rule it cannot prove unused.",
    href: "/docs/integrations/overview",
    Icon: ScissorsIcon,
  },
];

const heroPreview = (sizes: string[]) => `<article>
  <header><strong>Join the beta</strong></header>
  <form>
    <label>
      Email
      <input type="email" placeholder="you@example.com" />
    </label>
    <label>
      <input type="checkbox" role="switch" checked />
      Send me release notes
    </label>
    <button type="submit">Request access</button>
  </form>
  <p>
    <span data-badge>New</span>
    <span data-badge="success">Stable</span>
    <span data-badge="warning">Beta</span>
    <span data-badge="contrast">20 themes</span>
  </p>
  <table>
    <thead><tr><th>Build</th><th data-type="numeric">Size</th><th>Status</th></tr></thead>
    <tbody>
      <tr><td>pico.min.css</td><td data-type="numeric" style="white-space: nowrap">${sizes[0]} kB</td><td><span data-badge="success">Ready</span></td></tr>
      <tr><td>classless</td><td data-type="numeric" style="white-space: nowrap">${sizes[1]} kB</td><td><span data-badge="success">Ready</span></td></tr>
      <tr><td>extras</td><td data-type="numeric" style="white-space: nowrap">${sizes[2]} kB</td><td><span data-badge>Opt-in</span></td></tr>
    </tbody>
  </table>
</article>`;

const PLAIN_HTML = `<form>
  <fieldset role="group">
    <input type="email" placeholder="Enter your email" aria-label="Email" />
    <input type="submit" value="Subscribe" />
  </fieldset>
  <fieldset>
    <label>
      <input type="checkbox" role="switch" checked />
      Send me release notes
    </label>
  </fieldset>
  <details>
    <summary>What do I get?</summary>
    <p>One short email per release. No tracking.</p>
  </details>
</form>`;

export default function Home() {
  const size = gzipKb();
  const install = `pnpm add ${PACKAGE_NAME}`;
  return (
    <main id="main" className="home">
      <section className="hero">
        <div className="site-container hero-grid">
          <div className="hero-copy">
            <p>
              <Link href="/docs/extras/overview" className="hero-chip">
                <span data-badge>New in {VERSION_LABEL}</span>
                Opt-in extras and safe purge
                <span aria-hidden="true" className="hero-chip-arrow">
                  &rsaquo;
                </span>
              </Link>
            </p>
            <h1>Minimal CSS for semantic HTML</h1>
            <p className="hero-lead">
              A plain modern CSS rewrite of Pico CSS. Write the markup, get a clean, accessible, themeable page. No classes required, no JavaScript.
            </p>
            <p className="hero-actions">
              <Link href="/docs/getting-started/quick-start" role="button">
                Get started
              </Link>
              <Link href="/docs/components/accordion" role="button" className="secondary">
                Browse components
              </Link>
            </p>
            <div className="install-line">
              <code>
                <span aria-hidden="true">$ </span>
                {install}
              </code>
              <CopyButton text={install} label="Copy install command" />
            </div>
          </div>
          <div className="hero-preview">
            <Example title="Live preview" code={heroPreview([size, gzipKb("pico.classless.min.css"), gzipKb("pico.extras.min.css")])} css={["pico.extras"]} eager preview height={520} />
            <div className="hero-themes">
              <span className="hero-themes-label" aria-hidden="true">
                Try a theme
              </span>
              <ThemeSwatches label="Try a theme" className="swatches hero-swatches" />
            </div>
          </div>
        </div>
      </section>

      <section className="stats" aria-label="At a glance">
        <div className="site-container">
          <dl>
            <div>
              <dt>Core, gzip</dt>
              <dd>{size} kB</dd>
            </div>
            <div>
              <dt>JavaScript</dt>
              <dd>0 kB</dd>
            </div>
            <div>
              <dt>Color themes</dt>
              <dd>20</dd>
            </div>
            <div>
              <dt>Browser floor</dt>
              <dd>Chrome 111+</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="site-container home-section" aria-labelledby="features">
        <h2 id="features">What you get</h2>
        <p className="section-lead">The look of a component library, from the HTML elements you already know.</p>
        <div className="card-grid three">
          {FEATURES.map(({ title, text, href, Icon }) => (
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
          <article className="link-card wide">
            <span className="icon-tile">
              <SparkIcon size={18} />
            </span>
            <div>
              <h3>
                <Link href="/docs/ai/overview">Ready for AI tools</Link>
              </h3>
              <p>llms.txt, llms-full.txt, a Markdown copy of every page and an agent skill that knows the rules, so assistants write markup that fits.</p>
            </div>
          </article>
        </div>
      </section>

      <section className="site-container home-section" aria-labelledby="plain-html">
        <h2 id="plain-html">Plain HTML in, styled page out</h2>
        <p className="section-lead">No classes in this form. The elements and ARIA roles carry the look.</p>
        <div className="split">
          <CodeBlock code={PLAIN_HTML} lang="html" />
          <Example title="Result" code={PLAIN_HTML} eager preview height={300} />
        </div>
      </section>

      <section className="site-container home-section" aria-labelledby="install">
        <h2 id="install">Install</h2>
        <InstallTabs />
      </section>

      <section className="site-container home-section">
        <div className="callout" data-variant="note" role="note">
          <p className="callout-title">Coming from Pico CSS?</p>
          <p>
            Pico Reforged keeps the class names, variables and CDN file names of Pico CSS v2.1.1 by Lucas Larroche, so most pages switch with one link.{" "}
            <Link href="/docs/migration/from-pico-css">Read the migration guide</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
