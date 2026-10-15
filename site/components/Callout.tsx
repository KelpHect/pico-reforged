import type { ReactNode } from "react";

type Variant = "note" | "tip" | "warning";

const TITLES: Record<Variant, string> = { note: "Note", tip: "Tip", warning: "Warning" };

/** A static note in the look of the alert extra. Not a live region and not a landmark, so it is a note. */
export function Callout({ variant = "note", title, children }: { variant?: Variant; title?: string; children: ReactNode }) {
  return (
    <div className="callout" data-variant={variant} role="note">
      <p className="callout-title">{title ?? TITLES[variant]}</p>
      {children}
    </div>
  );
}
