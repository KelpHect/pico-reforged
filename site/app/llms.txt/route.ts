import { llmsIndex } from "../../lib/source";
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from "../../lib/site";

export const dynamic = "force-static";

export async function GET() {
  const index = await llmsIndex();
  const body = `# ${SITE_NAME}\n\n> ${SITE_TAGLINE} npm package @rusticstack/pico-reforged. Not the official Pico CSS.\n\nFull text: ${SITE_URL}/llms-full.txt\nSkill: ${SITE_URL}/skill/SKILL.md\n\n${index}`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
