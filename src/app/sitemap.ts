import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { siteUrl } from "@/lib/settings";
import { postHref } from "@/lib/types";

export const revalidate = 3600;

/**
 * Only PUBLISHED content and entity pages that actually have content behind
 * them. A topic page with nothing on it is a thin page: listing it invites
 * exactly the "discovered, currently not indexed" outcome you don't want.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();

  const [posts, topics, authors, publications] = await Promise.all([
    prisma.post.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, kind: true, publishedAt: true, updatedAt: true },
      orderBy: { publishedAt: "desc" },
    }),
    prisma.topic.findMany({
      where: { posts: { some: { post: { status: "PUBLISHED" } } } },
      select: { slug: true },
    }),
    prisma.user.findMany({
      where: { posts: { some: { status: "PUBLISHED" } } },
      select: { handle: true },
    }),
    prisma.publication.findMany({
      where: { posts: { some: { status: "PUBLISHED" } } },
      select: { slug: true },
    }),
  ]);

  return [
    { url: `${base}/`, lastModified: posts[0]?.publishedAt ?? new Date(), priority: 1 },
    { url: `${base}/explore`, changeFrequency: "daily", priority: 0.7 },
    { url: `${base}/topics`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/publications`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${base}/record`, changeFrequency: "daily", priority: 0.6 },
    ...posts.map((p) => ({
      url: `${base}${postHref(p.kind, p.slug)}`,
      lastModified: p.updatedAt ?? p.publishedAt ?? new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.9,
    })),
    ...topics.map((t) => ({
      url: `${base}/topic/${t.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...authors.map((a) => ({
      url: `${base}/author/${a.handle}`,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
    ...publications.map((p) => ({
      url: `${base}/publication/${p.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
