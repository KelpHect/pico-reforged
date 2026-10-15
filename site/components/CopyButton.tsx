"use client";

import { useRef, useState } from "react";
import { CheckIcon, CopyIcon } from "./icons";

type Props = {
  /** Text to copy. Without it the button copies the nearest code figure's pre. */
  text?: string;
  label?: string;
  className?: string;
};

export function CopyButton({ text, label = "Copy code", className = "icon-button" }: Props) {
  const button = useRef<HTMLButtonElement>(null);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const value =
      text ?? button.current?.closest(".code-figure")?.querySelector("pre")?.textContent ?? "";
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button ref={button} type="button" className={className} aria-label={label} title={label} onClick={copy}>
      {copied ? <CheckIcon size={15} /> : <CopyIcon size={15} />}
      <span className="visually-hidden" aria-live="polite">
        {copied ? "Copied" : ""}
      </span>
    </button>
  );
}
