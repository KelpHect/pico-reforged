import { highlight } from "fumadocs-core/highlight";

export async function CodeBlock({ code, lang = "html" }: { code: string; lang?: string }) {
  const rendered = await highlight(code.trim(), {
    lang,
    themes: { light: "github-light", dark: "github-dark" },
    defaultColor: false,
  });
  return <div className="code-block">{rendered}</div>;
}
