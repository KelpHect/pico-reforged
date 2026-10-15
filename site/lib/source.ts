import { loader } from "fumadocs-core/source";
import { llms } from "fumadocs-core/source/llms";
import { renderPlaceholder } from "fumadocs-core/mdx-plugins/remark-llms.runtime";
import { docs } from "../.source/server";
import { CDN_URL, SITE_URL } from "./site";

export const source = loader({
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),
});

export type DocPage = (typeof source)["$inferPage"];

type Attributes = Record<string, unknown>;

/** Expression attributes arrive as source text. The content is ours, so it is safe to evaluate. */
function attribute(attributes: Attributes, name: string): unknown {
  const value = attributes[name];
  if (value && typeof value === "object" && "value" in value) {
    return new Function(`return (${String((value as { value: unknown }).value)})`)();
  }
  return value;
}

function cell(text: unknown) {
  return String(text ?? "").replaceAll("|", "\|");
}

function table(headers: string[], rows: string[][]) {
  const line = (cells: string[]) => `| ${cells.join(" | ")} |`;
  return [line(headers), line(headers.map(() => "---")), ...rows.map(line)].join("\n");
}

const placeholders = {
  InstallTabs: () =>
    [
      "```bash",
      "pnpm add @rusticstack/pico-reforged",
      "```",
      "",
      "Or from a CDN:",
      "",
      "```html",
      `<link rel="stylesheet" href="${CDN_URL}" />`,
      "```",
    ].join("\n"),
  TokenFilter: () => "",
  ExamplePreview: ({ attributes }: { attributes: Attributes }) =>
    `See it working in the [${attributes.title} example](${SITE_URL}/examples/${attributes.slug}).`,
  VersionPicker: () =>
    [
      "A file name is the build stem, the theme part (none for azure) and `.min` for the minified file. For example:",
      "",
      "```html",
      '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@rusticstack/pico-reforged@1/css/pico.classless.jade.min.css" />',
      "```",
    ].join("\n"),
  Example: ({ attributes }: { attributes: Attributes }) => {
    const lang = String(attributes.lang ?? "html");
    return `**Example: ${attributes.title}**\n\n\`\`\`${lang}\n${attributes.code ?? ""}\n\`\`\``;
  },
  Tokens: ({ attributes }: { attributes: Attributes }) => {
    const items = attribute(attributes, "items") as Record<string, string>[];
    return table(
      ["Variable", "Default", "Description"],
      items.map((item) => [`\`${item.name}\``, item.value ? `\`${cell(item.value)}\`` : "", cell(item.description)]),
    );
  },
  PropsTable: ({ attributes }: { attributes: Attributes }) => {
    const items = attribute(attributes, "items") as Record<string, string>[];
    return table(
      ["Name", "Type", "Default", "Description"],
      items.map((item) => [
        `\`${item.name}\``,
        item.type ? `\`${cell(item.type)}\`` : "",
        item.default ? `\`${cell(item.default)}\`` : "",
        cell(item.description),
      ]),
    );
  },
};

/** <Callout> blocks become Markdown quotes with a bold title. */
function callouts(markdown: string) {
  return markdown.replace(/<Callout([^>]*)>\n?([\s\S]*?)\n?<\/Callout>/g, (_, attrs: string, text: string) => {
    const variant = /variant="(\w+)"/.exec(attrs)?.[1] ?? "note";
    const title = /title="([^"]*)"/.exec(attrs)?.[1] ?? variant.charAt(0).toUpperCase() + variant.slice(1);
    const lines = text
      .trim()
      .split("\n")
      .map((line) => `> ${line}`.trimEnd());
    return [`> **${title}**`, ">", ...lines].join("\n");
  });
}

/** Markdown of a page, with its title on top. Used by llms.txt, llms-full.txt and the /md routes. */
export async function pageMarkdown(page: DocPage): Promise<string> {
  const body = callouts(await renderPlaceholder(await page.data.getText("processed"), placeholders));
  const desc = page.data.description ? `\n\n> ${page.data.description}` : "";
  return `# ${page.data.title}${desc}\n\nPage: ${SITE_URL}/docs/${page.slugs.join("/")}\n\n${body}\n`;
}

export const docsLlms = llms(source, { renderPage: pageMarkdown });

export function mdUrl(page: DocPage): string {
  return `/md/${page.slugs.join("/")}.md`;
}

/** Index with absolute links to the Markdown version of each page. */
export async function llmsIndex(): Promise<string> {
  const index = await docsLlms.index();
  return index.replace(/\]\(\/docs\/([^)]+)\)/g, `](${SITE_URL}/md/$1.md)`);
}
