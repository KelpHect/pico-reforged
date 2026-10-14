import Link from "next/link";
import { NPM_URL, PICO_URL, REPO_URL } from "../lib/site";

export function Footer() {
  return (
    <footer className="site-footer container">
      <nav aria-label="Footer">
        <ul>
          <li>
            <Link href="/docs/getting-started/quick-start">Docs</Link>
          </li>
          <li>
            <Link href="/examples">Examples</Link>
          </li>
          <li>
            <Link href="/docs/ai/llms-txt">AI</Link>
          </li>
          <li>
            <a href={REPO_URL} rel="noopener">
              GitHub
            </a>
          </li>
          <li>
            <a href={NPM_URL} rel="noopener">
              npm
            </a>
          </li>
        </ul>
      </nav>
      <p>
        <small>
          Pico Reforged is MIT licensed. It is a rewrite of{" "}
          <a href={PICO_URL} rel="noopener">
            Pico CSS
          </a>{" "}
          by Lucas Larroche (MIT) and is not the official Pico CSS.
        </small>
      </p>
    </footer>
  );
}
