"use client";

import { useEffect, useState, type ReactNode } from "react";

export type TocItem = { title: ReactNode; url: string; depth: number };

export function Toc({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const ids = items.map((item) => item.url.slice(1));
    const targets = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    if (targets.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length > 0) setActive(visible[0].target.id);
      },
      { rootMargin: "0px 0px -70% 0px" },
    );
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;
  return (
    <nav className="docs-toc" aria-label="On this page">
      <h2>On this page</h2>
      <ul>
        {items.map((item) => (
          <li key={item.url} data-depth={item.depth}>
            <a href={item.url} aria-current={active === item.url.slice(1) ? "location" : undefined}>
              {item.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
