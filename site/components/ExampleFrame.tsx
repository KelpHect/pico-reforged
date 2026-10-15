"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildExampleDoc, type ExampleDocOptions } from "../lib/example-doc";
import type { Scheme } from "../lib/theme";
import { useThemeState } from "../lib/use-theme";

type Props = ExampleDocOptions & {
  title: string;
  /** Starting height in px. The frame then fits its content, unless `overlay` keeps it as a minimum. */
  height?: number;
  /** For demos that draw outside the flow (dialogs, popovers, menus, toasts). */
  overlay?: boolean;
  /** Load at once instead of when scrolled near. */
  eager?: boolean;
  /** "full" gives the frame an 800px minimum width so it scrolls on narrow pages. */
  width?: "full";
  /** Light or dark for this frame only. */
  scheme?: Exclude<Scheme, "auto"> | null;
};

export function ExampleFrame({ title, height, overlay, eager, width, scheme, code, variant, css, bare }: Props) {
  const frame = useRef<HTMLIFrameElement>(null);
  const site = useThemeState();
  const [auto, setAuto] = useState<number | null>(null);
  const [ready, setReady] = useState(0);
  // Heights posted before the frame says it is ready come from an unstyled page
  const isReady = useRef(false);
  const cssKey = css?.join(",");
  const srcDoc = useMemo(
    () =>
      buildExampleDoc({
        code,
        variant,
        css: cssKey ? cssKey.split(",") : [],
        bare,
        showOpen: overlay && /<dialog[\s>]|class="dropdown"|popovertarget=/.test(code),
      }),
    [code, variant, cssKey, bare, overlay],
  );

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return;
      const data = event.data as { type?: string; height?: number; ready?: boolean } | null;
      if (data?.type === "pico-ready") {
        isReady.current = true;
        setReady((n) => n + 1);
      }
      // The frame can say it is ready before this listener exists (an eager frame that loads
      // before hydration), so a height that comes after load says so itself
      if (data?.ready) isReady.current = true;
      if (
        isReady.current &&
        data?.type === "pico-height" &&
        typeof data.height === "number" &&
        data.height > 0
      )
        setAuto(data.height);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // The frame keeps its own origin (allow-same-origin) so its stylesheet requests carry the
  // visitor cookies, which a protected Vercel deployment needs to serve /css. The demo code is
  // written by us, not by visitors. The theme still travels as a message. The frame can
  // finish loading before React hydrates, so send on mount, on load and when it says it is
  // ready, and ask it to measure again each time.
  const send = useCallback(() => {
    const target = frame.current?.contentWindow;
    if (!target) return;
    const state = scheme ? { ...site, scheme } : site;
    target.postMessage({ type: "pico-state", state, own: Boolean(scheme) }, "*");
    target.postMessage({ type: "pico-measure" }, "*");
  }, [site, scheme]);

  useEffect(() => {
    send();
  }, [send, ready]);

  const loading = auto === null;
  return (
    <div className="example-stage" data-state={loading ? "loading" : undefined} data-width={width}>
      <iframe
        ref={frame}
        className="example-frame"
        title={`Live example: ${title}`}
        sandbox="allow-scripts allow-same-origin"
        loading={eager ? "eager" : "lazy"}
        srcDoc={srcDoc}
        onLoad={send}
        style={{ height: auto ?? height ?? 160, minHeight: overlay ? height : undefined }}
      />
    </div>
  );
}
