"use client";

import { useStaticSearch } from "fumadocs-core/search/client";
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";

export function Search() {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const { search, onSearchChange, data, isLoading, error } = useStaticSearch({
    from: "/api/search",
  });

  const close = () => {
    dialog.current?.close();
    setOpen(false);
  };
  const show = () => {
    dialog.current?.showModal();
    setOpen(true);
    input.current?.focus();
  };

  // Arrow keys walk the input and the result links, Enter on the input opens the first hit.
  const onDialogKey = (event: ReactKeyboardEvent) => {
    const links = Array.from(
      dialog.current?.querySelectorAll<HTMLAnchorElement>(".search-results a") ?? [],
    );
    const stops: HTMLElement[] = input.current ? [input.current, ...links] : links;
    const at = stops.indexOf(document.activeElement as HTMLElement);
    if (event.key === "ArrowDown" && at >= 0 && at < stops.length - 1) {
      event.preventDefault();
      stops[at + 1].focus();
    } else if (event.key === "ArrowUp" && at > 0) {
      event.preventDefault();
      stops[at - 1].focus();
    } else if (event.key === "Enter" && at === 0 && links.length > 0) {
      event.preventDefault();
      links[0].click();
    }
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        show();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const items = (data?.items ?? []).filter((item) => "url" in item && "content" in item);

  return (
    <>
      <button type="button" className="secondary outline search-button" onClick={show}>
        Search
        <kbd>Ctrl K</kbd>
      </button>
      <dialog ref={dialog} className="search-dialog" onClose={() => setOpen(false)} onKeyDown={onDialogKey} onClick={(event) => {
        if (event.target === dialog.current) close();
      }}>
        <article>
          <header>
            <button type="button" aria-label="Close" rel="prev" onClick={close} />
            <input
              ref={input}
              autoFocus
              type="search"
              placeholder="Search the docs"
              aria-label="Search the docs"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </header>
          {open && search && (
            <ul className="search-results">
              {isLoading && items.length === 0 && <li aria-busy="true">Searching</li>}
              {error && <li>Search is not available right now.</li>}
              {!isLoading && !error && items.length === 0 && <li>No results.</li>}
              {items.map((item) => {
                const result = item as { id: string; url: string; content: string; type: string; breadcrumbs?: string[] };
                return (
                  <li key={result.id}>
                    <a href={result.url} onClick={close}>
                      <small>{(result.breadcrumbs ?? []).join(" / ")}</small>
                      <span>{result.content}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </article>
      </dialog>
    </>
  );
}
