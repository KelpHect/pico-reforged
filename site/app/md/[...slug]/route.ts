import { notFound } from "next/navigation";
import { pageMarkdown, source } from "../../../lib/source";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return source.getPages().map((page) => ({
    slug: [...page.slugs.slice(0, -1), `${page.slugs[page.slugs.length - 1]}.md`],
  }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const last = slug[slug.length - 1].replace(/\.md$/, "");
  const page = source.getPage([...slug.slice(0, -1), last]);
  if (!page) notFound();
  return new Response(await pageMarkdown(page), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
