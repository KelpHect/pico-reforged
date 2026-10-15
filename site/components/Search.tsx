"use client";

import { useStaticSearch } from "fumadocs-core/search/client";
import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { FileIcon, HashIcon, SearchIcon, TextIcon } from "./icons";

export const OPEN_SEARCH_EVENT = "site:open-search";

type Hit = { id: string; url: string; type: "page" | "heading" | "text"; content: string; breadcrumbs?: string[] };
type Row = { id: string; url: string; kind: "page" | "heading" | "text"; text: string; group: string };

const SUGGESTED = [
  { title: "Quick start", url: "/docs/getting-started/quick-start" },
  { title: "Themes", url: "/docs/customization/themes" },
  { title: "Extras overview", url: "/docs/extras/overview" },
  { title: "CSS variables", url: "/docs/customization/css-variables" },
  { title: "Migration guide", url: "/docs/migration/from-pico-css" },
];

/** Plain text from a Markdown snippet. Inline code keeps its * and _ (as in `modal-is-*`). */
function clean(text: string) {
  const code: string[] = [];
  return text
    .replace(/`([^`]*)`/g, (_, inner: string) => `\u0000${code.push(inner) - 1}\u0000`)
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\s[a-z-]+="[^"]*"/gi, "")
    .replace(/<\/?[a-z][^>]*>/gi, (tag) => tag.replace(/\s.*?>$/, ">"))
    .replace(/(^|[\s(])([*_]{1,3})(\S(?:.*?\S)?)\2(?=[\s.,;:!?)]|$)/g, "$1$3")
    .replace(/\u0000(\d+)\u0000/g, (_, index: string) => code[Number(index)] ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

/** A text hit starts about 40 characters before the first match, on a word boundary. */
function around(text: string, query: string) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const lower = text.toLowerCase();
  const at = Math.min(...terms.map((term) => lower.indexOf(term)).filter((index) => index >= 0));
  if (!Number.isFinite(at) || at <= 40) return text;
  const space = text.indexOf(" ", at - 40);
  const start = space >= 0 && space < at ? space + 1 : at;
  return `…${text.slice(start)}`;
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlight(text: string, query: string): ReactNode {
  const terms = query.trim().split(/\s+/).filter(Boolean).map(escapeRegExp);
  if (terms.length === 0) return text;
  const parts = text.split(new RegExp(`(${terms.join("|")})`, "gi"));
  return parts.map((part, index) => (index % 2 === 1 ? <mark key={index}>{part}</mark> : <Fragment key={index}>{part}</Fragment>));
}

function rank(title: string, query: string, hasHeading: boolean) {
  const t = title.toLowerCase();
  const q = query.trim().toLowerCase();
  if (t === q) return 0;
  if (t.startsWith(q)) return 1;
  if (t.includes(q)) return 2;
  return hasHeading ? 3 : 4;
}

function titleFromUrl(url: string) {
  const slug = url.split("#")[0].split("/").pop() ?? url;
  return slug.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
}

export function Search() {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const router = useRouter();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [mac, setMac] = useState(false);
  const { search, onSearchChange, data, isLoading, error } = useStaticSearch({ from: "/api/search" });

  useEffect(() => {
    setMac(/Mac|iPhone|iPad/.test(navigator.platform));
  }, []);

  const show = useCallback((from?: HTMLElement | null) => {
    opener.current = from ?? (document.activeElement as HTMLElement | null);
    dialog.current?.showModal();
    setOpen(true);
    input.current?.focus();
    input.current?.select();
  }, []);
  const close = () => dialog.current?.close();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (dialog.current?.open) close();
        else show();
      }
    };
    const onOpen = (event: Event) => show((event as CustomEvent<HTMLElement>).detail);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_SEARCH_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_SEARCH_EVENT, onOpen);
    };
  }, [show]);

  const hits = useMemo(
    () => (data?.items ?? []).filter((item): item is typeof item & Hit => "url" in item && "content" in item) as Hit[],
    [data],
  );
  const rows = useMemo<Row[]>(() => {
    if (!search.trim()) {
      return SUGGESTED.map((item) => ({ id: item.url, url: item.url, kind: "page", text: item.title, group: item.url }));
    }
    const groups = new Map<string, { title: string; hits: Row[]; heading: boolean }>();
    for (const hit of hits) {
      const page = hit.url.split("#")[0];
      const group = groups.get(page) ?? { title: "", hits: [], heading: false };
      groups.set(page, group);
      if (hit.type === "page") group.title = clean(hit.content);
      else {
        const text = clean(hit.content);
        group.hits.push({ id: hit.id, url: hit.url, kind: hit.type, text: hit.type === "text" ? around(text, search) : text, group: page });
        if (hit.type === "heading") group.heading = true;
      }
    }
    return [...groups.entries()]
      .map(([page, group]) => ({ page, ...group, title: group.title || titleFromUrl(page) }))
      .sort((a, b) => rank(a.title, search, a.heading) - rank(b.title, search, b.heading))
      .flatMap((group) => [
        { id: `${group.page}-page`, url: group.page, kind: "page" as const, text: group.title, group: group.page },
        ...group.hits.slice(0, 4),
      ]);
  }, [hits, search]);

  useEffect(() => setActive(0), [search]);

  const go = (row: Row | undefined) => {
    if (!row) return;
    close();
    router.push(row.url);
  };

  const onKeyDown = (event: ReactKeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(index + 1, rows.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      go(rows[active]);
    } else if (event.key === "Escape") {
      // A search field clears itself on the first Escape, close at once instead
      event.preventDefault();
      close();
    }
  };

  useEffect(() => {
    dialog.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const optionId = (index: number) => `${listId}-option-${index}`;
  const empty = Boolean(search.trim()) && !isLoading && !error && hits.length === 0;

  return (
    <>
      <button type="button" className="search-trigger" onClick={(event) => show(event.currentTarget)} aria-label="Search docs" aria-haspopup="dialog">
        <SearchIcon size={16} />
        <span className="search-trigger-label">Search docs</span>
        <kbd>{mac ? "⌘ K" : "Ctrl K"}</kbd>
      </button>
      <dialog
        ref={dialog}
        className="search-dialog"
        aria-label="Search the docs"
        onClose={() => {
          setOpen(false);
          opener.current?.focus();
        }}
        onClick={(event) => {
          if (event.target === dialog.current) close();
        }}
      >
        <article>
          <header className="search-head">
            <SearchIcon size={18} />
            <input
              ref={input}
              type="search"
              placeholder="Search the docs"
              aria-label="Search the docs"
              role="combobox"
              aria-expanded={rows.length > 0}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={rows.length ? optionId(active) : undefined}
              autoComplete="off"
              spellCheck={false}
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              onKeyDown={onKeyDown}
            />
            <button type="button" className="search-esc" onClick={close} aria-label="Close search">
              Esc
            </button>
          </header>
          <div className="search-body">
            {!search.trim() ? <p className="search-caption">Suggested</p> : null}
            {error ? <p className="search-caption">Search is not available right now.</p> : null}
            {empty ? (
              <p className="search-empty">
                No results for <strong>{search}</strong>
              </p>
            ) : null}
            {open && rows.length > 0 && !empty ? (
              <ul id={listId} role="listbox" aria-label="Results" className="search-results" tabIndex={0}>
                {rows.map((row, index) => (
                  <li
                    key={row.id}
                    id={optionId(index)}
                    role="option"
                    aria-selected={index === active}
                    data-index={index}
                    data-kind={row.kind}
                    onMouseMove={() => setActive(index)}
                    onClick={() => go(row)}
                  >
                    {row.kind === "page" ? <FileIcon size={16} /> : row.kind === "heading" ? <HashIcon size={15} /> : <TextIcon size={15} />}
                    <span>{search.trim() ? highlight(row.text, search) : row.text}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <footer className="search-foot" aria-hidden="true">
            <span>
              <kbd>&uarr;</kbd>
              <kbd>&darr;</kbd> to move
            </span>
            <span>
              <kbd>Enter</kbd> to open
            </span>
            <span>
              <kbd>Esc</kbd> to close
            </span>
          </footer>
        </article>
      </dialog>
    </>
  );
}
