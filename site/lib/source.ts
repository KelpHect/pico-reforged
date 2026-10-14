import { loader } from "fumadocs-core/source";
import { llms } from "fumadocs-core/source/llms";
import { renderPlaceholder } from "fumadocs-core/mdx-plugins/remark-llms.runtime";
import { docs } from "../.source/server";
import { SITE_URL } from "./site";

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

/** Markdown of a page, with its title on top. Used by llms.txt, llms-full.txt and the /md routes. */
export async function pageMarkdown(page: DocPage): Promise<string> {
  const body = await renderPlaceholder(await page.data.getText("processed"), placeholders);
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
