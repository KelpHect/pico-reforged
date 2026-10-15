"use client";

import { useEffect, useState, type ReactNode } from "react";
import { buildStandaloneDoc, type ExampleVariant } from "../lib/example-doc";
import { useThemeState } from "../lib/use-theme";
import { CopyButton } from "./CopyButton";
import { ExampleFrame } from "./ExampleFrame";
import { ExternalIcon, MoonIcon, SunIcon } from "./icons";

type Props = {
  title: string;
  code: string;
  variant?: ExampleVariant;
  css?: string[];
  bare?: boolean;
  height?: number;
  overlay?: boolean;
  eager?: boolean;
  width?: "full";
  /** Number of lines in the listing, to decide whether it starts collapsed. */
  lines: number;
  /** The highlighted listing, or nothing for a preview only. */
  listing?: ReactNode;
};

const COLLAPSE_AT = 12;

export function ExampleView({ title, code, variant, css, bare, height, overlay, eager, width, lines, listing }: Props) {
  const site = useThemeState();
  const [scheme, setScheme] = useState<"light" | "dark" | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [siteDark, setSiteDark] = useState(false);

  // The site scheme is only known in the browser. A change of it drops the per-frame choice.
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSiteDark(site.scheme === "dark" || (site.scheme === "auto" && media.matches));
    update();
    setScheme(null);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [site.scheme]);

  const dark = scheme ? scheme === "dark" : siteDark;

  const open = () => {
    const html = buildStandaloneDoc({ code, variant, css }, window.location.origin, site, scheme ?? site.scheme);
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const collapsible = Boolean(listing) && lines > COLLAPSE_AT;
  return (
    <figure className="example">
      <div className="example-bar">
        <figcaption>{title}</figcaption>
        <div className="example-actions">
          <button
            type="button"
            className="icon-button"
            onClick={() => setScheme(dark ? "light" : "dark")}
            aria-label={dark ? "Show this preview in light mode" : "Show this preview in dark mode"}
            title={dark ? "Light preview" : "Dark preview"}
          >
            {dark ? <SunIcon size={15} /> : <MoonIcon size={15} />}
          </button>
          <button type="button" className="icon-button" onClick={open} aria-label="Open in a new tab" title="Open in a new tab">
            <ExternalIcon size={15} />
          </button>
          {listing ? <CopyButton text={code} /> : null}
        </div>
      </div>
      <ExampleFrame
        title={title}
        code={code}
        variant={variant}
        css={css}
        bare={bare}
        height={height}
        overlay={overlay}
        eager={eager}
        width={width}
        scheme={scheme}
      />
      {listing ? (
        <div className="example-code" data-collapsed={collapsible && !expanded ? "" : undefined}>
          {listing}
          {collapsible ? (
            <button type="button" className="example-expand" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
              {expanded ? "Show less" : `Show all ${lines} lines`}
            </button>
          ) : null}
        </div>
      ) : null}
    </figure>
  );
}
