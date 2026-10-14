import Link from "next/link";
import { REPO_URL } from "../lib/site";
import { Brand } from "./Brand";
import { Search } from "./Search";
import { ThemeMenu } from "./ThemeMenu";

export function Header() {
  return (
    <header className="site-header">
      <nav className="container">
        <ul>
          <li>
            <Brand />
          </li>
        </ul>
        <ul className="site-links">
          <li>
            <Link href="/docs/getting-started/quick-start">Docs</Link>
          </li>
          <li>
            <Link href="/examples">Examples</Link>
          </li>
          <li>
            <a href={REPO_URL} rel="noopener">
              GitHub
            </a>
          </li>
        </ul>
        <ul className="site-tools">
          <li>
            <Search />
          </li>
          <li>
            <ThemeMenu />
          </li>
        </ul>
      </nav>
    </header>
  );
}
