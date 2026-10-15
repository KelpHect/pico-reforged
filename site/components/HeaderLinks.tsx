"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type TopLink = { href: string; label: string; match: string };

/** The current section of a path: the most specific top link that matches it. */
export function currentLink(links: TopLink[], pathname: string | null) {
  if (!pathname) return undefined;
  return links
    .filter((link) => pathname === link.match || pathname.startsWith(`${link.match}/`))
    .sort((a, b) => b.match.length - a.match.length)[0];
}

export function HeaderLinks({ links }: { links: TopLink[] }) {
  const pathname = usePathname();
  const current = currentLink(links, pathname);
  return (
    <nav className="header-links" aria-label="Main">
      <ul>
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} aria-current={current === link ? "page" : undefined}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
