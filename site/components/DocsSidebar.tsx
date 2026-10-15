"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export type SidebarSection = {
  title: string;
  items: { title: string; url: string }[];
};

export function DocsSidebar({ sections, variant }: { sections: SidebarSection[]; variant?: "drawer" }) {
  const pathname = usePathname();
  const nav = useRef<HTMLElement>(null);

  useEffect(() => {
    if (variant === "drawer") return;
    const link = nav.current?.querySelector<HTMLElement>("[aria-current='page']");
    // The sticky aside is the scroll box, and the offset parent of the links
    const box = nav.current?.closest<HTMLElement>(".docs-aside");
    if (!link || !box || link.offsetParent !== box) return;
    const top = link.offsetTop;
    if (top < box.scrollTop || top + link.offsetHeight > box.scrollTop + box.clientHeight) {
      box.scrollTop = top - box.clientHeight / 2;
    }
  }, [pathname, variant]);

  return (
    <nav ref={nav} className={variant === "drawer" ? "docs-sidebar is-drawer" : "docs-sidebar"} aria-label="Documentation">
      <ul>
        <li>
          <Link href="/docs" aria-current={pathname === "/docs" ? "page" : undefined}>
            Overview
          </Link>
        </li>
      </ul>
      {sections.map((section) => (
        <section key={section.title} aria-label={section.title}>
          <p className="sidebar-title">{section.title}</p>
          <ul>
            {section.items.map((item) => (
              <li key={item.url}>
                <Link href={item.url} aria-current={item.url === pathname ? "page" : undefined}>
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </nav>
  );
}
