"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { DocsSidebar, type SidebarSection } from "./DocsSidebar";
import { currentLink, type TopLink } from "./HeaderLinks";
import { CloseIcon, MenuIcon } from "./icons";

export const OPEN_NAV_EVENT = "site:open-nav";

/** Opens the drawer from anywhere, for example the docs bar on small screens. */
export function MenuButton({ className = "icon-button menu-button" }: { className?: string }) {
  return (
    <button
      type="button"
      className={className}
      aria-label="Menu"
      aria-haspopup="dialog"
      onClick={(event) => window.dispatchEvent(new CustomEvent(OPEN_NAV_EVENT, { detail: event.currentTarget }))}
    >
      <MenuIcon size={18} />
    </button>
  );
}

/** The navigation drawer for screens below 1024px: a modal dialog from the inline start. */
export function NavDrawer({ sections, links }: { sections: SidebarSection[]; links: TopLink[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const pathname = usePathname();
  const current = currentLink(links, pathname);

  const close = useCallback(() => dialog.current?.close(), []);

  useEffect(() => {
    const onOpen = (event: Event) => {
      opener.current = (event as CustomEvent<HTMLElement>).detail ?? null;
      const box = dialog.current;
      if (!box) return;
      box.showModal();
      // Start with the current page in view
      const links = box.querySelectorAll<HTMLElement>(".docs-sidebar [aria-current='page']");
      const link = links[0];
      if (link) box.scrollTop = Math.max(0, link.offsetTop - box.clientHeight / 2);
    };
    window.addEventListener(OPEN_NAV_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_NAV_EVENT, onOpen);
  }, []);

  // Navigating closes the drawer
  useEffect(() => {
    close();
  }, [pathname, close]);

  return (
    <>
      <MenuButton />
      <dialog
        ref={dialog}
        className="nav-drawer"
        aria-label="Site navigation"
        onClose={() => opener.current?.focus()}
        onClick={(event) => {
          if (event.target === dialog.current) close();
          if ((event.target as HTMLElement).closest("a")) close();
        }}
      >
        <div className="nav-drawer-head">
          <span className="nav-drawer-title">Menu</span>
          <button type="button" className="icon-button" aria-label="Close menu" onClick={close}>
            <CloseIcon size={18} />
          </button>
        </div>
        <nav aria-label="Main" className="nav-drawer-links">
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
        <DocsSidebar sections={sections} variant="drawer" />
      </dialog>
    </>
  );
}
