import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/base-path";
import { DEMOS } from "@/lib/pages";
import { SANDBOX_SUBURB_NAMES } from "@/lib/sandbox";

/**
 * Served at /demos/sitemap.xml; the main site's sitemap lists /demos, and
 * this one lists every page under it with its public www URL.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const enc = encodeURIComponent;
  return [
    { url: SITE_URL, priority: 0.8 },
    ...DEMOS.map((d) => ({ url: `${SITE_URL}/${d.slug}`, priority: 0.6 })),
    ...SANDBOX_SUBURB_NAMES.flatMap((n) => [
      { url: `${SITE_URL}/suburbs/${enc(n)}`, priority: 0.5 },
      { url: `${SITE_URL}/suburb-report/${enc(n)}`, priority: 0.5 },
    ]),
  ];
}
