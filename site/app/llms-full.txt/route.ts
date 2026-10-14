import { docsLlms } from "../../lib/source";
import { SITE_URL } from "../../lib/site";

export const dynamic = "force-static";

export async function GET() {
  const full = (await docsLlms.full()).replace(/\]\(\/(?!\/)/g, `](${SITE_URL}/`);
  return new Response(full, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
