"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type SidebarSection = {
  title: string;
  items: { title: string; url: string }[];
};

export function DocsSidebar({ sections }: { sections: SidebarSection[] }) {
  const pathname = usePathname();
  return (
    <nav className="docs-sidebar" aria-label="Documentation">
      {sections.map((section) => {
        const active = section.items.some((item) => item.url === pathname);
        return (
          <details key={section.title} open={active || undefined}>
            <summary>{section.title}</summary>
            <ul>
              {section.items.map((item) => (
                <li key={item.url}>
                  <Link href={item.url} aria-current={item.url === pathname ? "page" : undefined}>
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        );
      })}
    </nav>
  );
}
