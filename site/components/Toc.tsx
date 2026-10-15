"use client";

import { useEffect, useState, type ReactNode } from "react";

export type TocItem = { title: ReactNode; url: string; depth: number };

// The active item is the last heading above a line just under the sticky header, computed on
// scroll (once per frame), so a fast scroll or a jump never leaves a stale or empty highlight.
function useActiveHeading(items: TocItem[]) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const targets = items
      .map((item) => document.getElementById(item.url.slice(1)))
      .filter(Boolean) as HTMLElement[];
    if (targets.length === 0) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const header = document.querySelector(".site-header")?.getBoundingClientRect().height ?? 56;
      const line = header + 16;
      let current = targets[0];
      for (const target of targets) {
        if (target.getBoundingClientRect().top <= line) current = target;
        else break;
      }
      // At the very bottom the last headings can never reach the line
      if (innerHeight + scrollY >= document.documentElement.scrollHeight - 2) {
        const last = targets.findLast((target) => target.getBoundingClientRect().top < innerHeight);
        if (last) current = last;
      }
      setActive(current.id);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
    };
  }, [items]);
  return active;
}

function TocList({ items, active }: { items: TocItem[]; active?: string | null }) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.url} data-depth={item.depth}>
          <a href={item.url} aria-current={active === item.url.slice(1) ? "location" : undefined}>
            {item.title}
          </a>
        </li>
      ))}
    </ul>
  );
}

/** The sticky table of contents beside the article, from 1280px. */
export function Toc({ items }: { items: TocItem[] }) {
  const active = useActiveHeading(items);
  if (items.length === 0) return null;
  return (
    <nav className="docs-toc" aria-label="On this page">
      <p className="toc-title">On this page</p>
      <TocList items={items} active={active} />
    </nav>
  );
}

/** The collapsed table of contents under the page header, below 1280px. */
export function TocInline({ items }: { items: TocItem[] }) {
  if (items.length === 0) return null;
  return (
    <details className="docs-toc-inline">
      <summary>On this page</summary>
      <nav aria-label="On this page">
        <TocList items={items} />
      </nav>
    </details>
  );
}
