import { VERSION_LABEL } from "../lib/build-info";
import { REPO_URL } from "../lib/site";
import { getSidebar } from "../lib/sidebar";
import { Brand } from "./Brand";
import { HeaderLinks } from "./HeaderLinks";
import { GitHubIcon } from "./icons";
import { NavDrawer } from "./NavDrawer";
import { Search } from "./Search";
import { ThemeMenu } from "./ThemeMenu";

export const TOP_LINKS = [
  { href: "/docs", label: "Docs", match: "/docs" },
  { href: "/examples", label: "Examples", match: "/examples" },
  { href: "/docs/customization/themes", label: "Themes", match: "/docs/customization/themes" },
];

export function Header() {
  const sections = getSidebar();
  return (
    <header className="site-header">
      <div className="site-container header-row">
        <NavDrawer sections={sections} links={TOP_LINKS} />
        <Brand />
        <span className="version-pill" data-badge="secondary">
          {VERSION_LABEL}
        </span>
        <HeaderLinks links={TOP_LINKS} />
        <div className="header-tools">
          <Search />
          <a href={REPO_URL} rel="noopener" className="icon-button" aria-label="GitHub" title="GitHub">
            <GitHubIcon />
          </a>
          <ThemeMenu />
        </div>
      </div>
    </header>
  );
}
