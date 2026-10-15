import type { ComponentProps, ReactNode } from "react";
import { CopyButton } from "./CopyButton";

const LABELS: Record<string, string> = {
  html: "HTML",
  css: "CSS",
  js: "JavaScript",
  javascript: "JavaScript",
  ts: "TypeScript",
  typescript: "TypeScript",
  tsx: "TSX",
  jsx: "JSX",
  json: "JSON",
  bash: "Terminal",
  sh: "Terminal",
  shell: "Terminal",
  shellscript: "Terminal",
  md: "Markdown",
  mdx: "MDX",
  scss: "SCSS",
  yaml: "YAML",
  txt: "Text",
  text: "Text",
  diff: "Diff",
};

export function languageLabel(lang?: string) {
  if (!lang) return undefined;
  return LABELS[lang] ?? lang.toUpperCase();
}

/** A code block with a bar that names the language and a copy button. */
export function CodeFigure({ label, children, className }: { label?: string; children: ReactNode; className?: string }) {
  return (
    <figure className={className ? `code-figure ${className}` : "code-figure"}>
      <div className="code-bar">
        <span>{label}</span>
        <CopyButton />
      </div>
      {children}
    </figure>
  );
}

type PreProps = ComponentProps<"pre"> & { "data-language"?: string; icon?: string; title?: string };

/** The MDX `pre`: fumadocs renders the highlighted block, this wraps it in a figure. */
export function MdxPre({ icon: _icon, title, ...props }: PreProps) {
  const label = title ?? languageLabel(props["data-language"]);
  return (
    <CodeFigure label={label}>
      <pre {...props} />
    </CodeFigure>
  );
}
