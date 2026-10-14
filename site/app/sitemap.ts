import type { MetadataRoute } from "next";
import { SITE_URL } from "../lib/site";
import { source } from "../lib/source";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["/", "/docs", "/examples", ...source.getPages().map((page) => page.url)];
  return paths.map((path) => ({ url: `${SITE_URL}${path === "/" ? "" : path}` }));
}
