import Link from "next/link";
import { VERSION } from "../lib/build-info";
import { NPM_URL, PICO_URL, REPO_URL, SITE_NAME } from "../lib/site";
import { Mark } from "./icons";

const COLUMNS = [
  {
    title: "Docs",
    links: [
      { label: "Quick start", href: "/docs/getting-started/quick-start" },
      { label: "Components", href: "/docs/components/accordion" },
      { label: "Extras", href: "/docs/extras/overview" },
      { label: "Themes", href: "/docs/customization/themes" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Examples", href: "/examples" },
      { label: "llms.txt", href: "/llms.txt", file: true },
      { label: "Releases", href: `${REPO_URL}/releases` },
      { label: "npm", href: NPM_URL },
    ],
  },
  {
    title: "Project",
    links: [
      { label: "GitHub", href: REPO_URL },
      { label: "Issues", href: `${REPO_URL}/issues` },
      { label: "Migration", href: "/docs/migration/from-pico-css" },
      { label: "License", href: `${REPO_URL}/blob/main/LICENSE.md` },
    ],
  },
];

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-container">
        <div className="footer-grid">
          <div className="footer-brand">
            <p className="footer-name">
              <Mark size={22} />
              <span>{SITE_NAME}</span>
            </p>
            <p>Minimal CSS for semantic HTML, in plain modern CSS.</p>
            <p>
              Version {VERSION}. MIT licensed.
            </p>
          </div>
          {COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <p className="footer-title">{column.title}</p>
              <ul>
                {column.links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith("/") && !("file" in link) ? (
                      <Link href={link.href}>{link.label}</Link>
                    ) : (
                      <a href={link.href} {...(link.href.startsWith("http") ? { rel: "noopener" } : {})}>
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <p className="footer-bottom">
          Based on{" "}
          <a href={PICO_URL} rel="noopener">
            Pico CSS
          </a>{" "}
          by Lucas Larroche (MIT). Pico Reforged is not the official Pico CSS.
        </p>
      </div>
    </footer>
  );
}
