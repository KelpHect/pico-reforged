"use client";

import { useEffect, useRef, useState } from "react";

/** A scaled-down, inert preview of a full example page. */
export function ExampleThumb({ slug, title, eager }: { slug: string; title: string; eager?: boolean }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);

  // The frame can finish loading before hydration, when onLoad has no listener yet
  useEffect(() => {
    const doc = frame.current?.contentDocument;
    if (doc && doc.readyState === "complete" && doc.URL !== "about:blank") setLoaded(true);
  }, []);

  return (
    <div className="thumb" data-state={loaded ? undefined : "loading"}>
      <iframe
        ref={frame}
        title={`Preview of ${title}`}
        src={`/examples/${slug}`}
        loading={eager ? "eager" : "lazy"}
        tabIndex={-1}
        aria-hidden="true"
        inert
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}
