"use client";

import { SearchIcon } from "./icons";
import { OPEN_SEARCH_EVENT } from "./Search";

/** A large field-shaped button that opens the search dialog. */
export function DocsSearchField() {
  return (
    <button
      type="button"
      className="search-field"
      aria-haspopup="dialog"
      onClick={(event) => window.dispatchEvent(new CustomEvent(OPEN_SEARCH_EVENT, { detail: event.currentTarget }))}
    >
      <SearchIcon size={18} />
      <span>Search the docs</span>
    </button>
  );
}
