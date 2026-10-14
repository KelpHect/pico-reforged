"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildExampleDoc, type ExampleDocOptions } from "../lib/example-doc";
import { useThemeState } from "../lib/use-theme";

type Props = ExampleDocOptions & { title: string; height?: number };

export function ExampleFrame({ title, height, code, variant, css, bare }: Props) {
  const frame = useRef<HTMLIFrameElement>(null);
  const state = useThemeState();
  const [auto, setAuto] = useState<number | null>(null);
  const [ready, setReady] = useState(0);
  const cssKey = css?.join(",");
  const srcDoc = useMemo(
    () => buildExampleDoc({ code, variant, css: cssKey ? cssKey.split(",") : [], bare }),
    [code, variant, cssKey, bare],
  );

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return;
      const data = event.data as { type?: string; height?: number } | null;
      if (data?.type === "pico-ready") setReady((n) => n + 1);
      if (data?.type === "pico-height" && typeof data.height === "number") setAuto(data.height);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

// The sandbox has no same-origin access, so the theme travels as a message. The frame can
  // finish loading before React hydrates, so send on mount, on load and when it says it is ready.
  const send = useCallback(() => {
    frame.current?.contentWindow?.postMessage({ type: "pico-state", state }, "*");
  }, [state]);

  useEffect(() => {
    send();
  }, [send, ready]);

  const fixed = typeof height === "number";
  return (
    <iframe
      ref={frame}
      className="example-frame"
      title={`Live example: ${title}`}
      sandbox="allow-scripts"
      loading="lazy"
      srcDoc={srcDoc}
      onLoad={send}
      style={{ height: fixed ? height : (auto ?? 160) }}
    />
  );
}
