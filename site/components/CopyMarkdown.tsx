"use client";

import { useState } from "react";

type Status = "idle" | "copied" | "failed";

export function CopyMarkdown({ url }: { url: string }) {
  const [status, setStatus] = useState<Status>("idle");

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
    <div className="page-actions" role="group" aria-label="Page as Markdown">
      <button type="button" className="secondary outline" onClick={copy}>
        {status === "copied" ? "Copied" : status === "failed" ? "Copy failed" : "Copy page as Markdown"}
      </button>
      <a href={url} role="button" className="secondary outline">
        View as Markdown
      </a>
    </div>
  );
}
