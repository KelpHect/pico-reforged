import { highlight } from "fumadocs-core/highlight";
import { CodeFigure, languageLabel } from "./CodeFigure";

export async function highlighted(code: string, lang = "html") {
  return highlight(code, {
    lang,
    themes: { light: "github-light", dark: "github-dark" },
    defaultColor: false,
  });
}

export async function CodeBlock({ code, lang = "html", label, className }: { code: string; lang?: string; label?: string; className?: string }) {
  const rendered = await highlighted(code.trim(), lang);
  return (
    <CodeFigure label={label ?? languageLabel(lang)} className={className}>
      {rendered}
    </CodeFigure>
  );
}
