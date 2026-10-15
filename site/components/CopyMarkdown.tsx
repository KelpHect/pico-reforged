"use client";

import { useState } from "react";
import { SITE_URL } from "../lib/site";
import { CheckIcon, ChevronDownIcon, CopyIcon } from "./icons";

type Status = "idle" | "copied" | "failed";

/** "Copy page" split button: copies the page as Markdown, the menu opens it elsewhere. */
export function CopyMarkdown({ url }: { url: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const absolute = `${SITE_URL}${url}`;
  const prompt = encodeURIComponent(`Read ${absolute} so I can ask questions about it.`);

  const copy = async () => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(String(response.status));
      await navigator.clipboard.writeText(await response.text());
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
    setTimeout(() => setStatus("idle"), 2000);
  };

  return (
    <div className="page-actions">
      <button type="button" className="page-action" onClick={copy}>
        {status === "copied" ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
        <span aria-live="polite">{status === "copied" ? "Copied" : status === "failed" ? "Copy failed" : "Copy page"}</span>
      </button>
      <button type="button" className="page-action page-action-more" popoverTarget="page-menu" aria-label="More page options">
        <ChevronDownIcon size={14} />
      </button>
      <ul id="page-menu" popover="auto" className="page-menu">
        <li>
          <a href={url}>View as Markdown</a>
        </li>
        <li>
          <a href={`https://chatgpt.com/?q=${prompt}`} rel="noopener" target="_blank">
            Open in ChatGPT
          </a>
        </li>
        <li>
          <a href={`https://claude.ai/new?q=${prompt}`} rel="noopener" target="_blank">
            Open in Claude
          </a>
        </li>
      </ul>
    </div>
  );
}
