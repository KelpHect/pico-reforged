"use client";

import { useEffect, useState } from "react";

/** Filters every reference row on the page by name or description. */
export function TokenFilter() {
  const [query, setQuery] = useState("");
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const needle = query.trim().toLowerCase();
    const rows = document.querySelectorAll<HTMLElement>(".docs-article .ref-row");
    let shown = 0;
    rows.forEach((row) => {
      const match = !needle || (row.dataset.ref ?? "").includes(needle);
      row.hidden = !match;
      if (match) shown += 1;
    });
    document.querySelectorAll<HTMLElement>(".docs-article .ref-list").forEach((list) => {
      list.hidden = !list.querySelector(".ref-row:not([hidden])");
    });
    setCount(needle ? shown : null);
  }, [query]);

  return (
    <div className="token-filter">
      <input
        type="search"
        placeholder="Filter variables, for example border or primary"
        aria-label="Filter variables"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <p aria-live="polite" className="token-filter-count">
        {count === null ? "" : `${count} ${count === 1 ? "variable" : "variables"} match`}
      </p>
    </div>
  );
}
