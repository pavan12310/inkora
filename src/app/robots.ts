import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/settings";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Utility routes and the search page. Search results generate unlimited
        // near-duplicate URLs, which is a classic crawl-budget sink.
        disallow: ["/desk", "/me", "/write", "/search", "/api/"],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}
