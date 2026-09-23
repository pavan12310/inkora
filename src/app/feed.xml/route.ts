import { prisma } from "@/lib/db";
import { getSettings, siteUrl } from "@/lib/settings";
import { excerpt } from "@/lib/markdown";
import { postHref } from "@/lib/types";

export const revalidate = 3600;

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET() {
  const base = siteUrl();
  const [settings, posts] = await Promise.all([
    getSettings(),
    prisma.post.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take: 40,
      include: {
        author: { select: { name: true, handle: true } },
        topics: { include: { topic: { select: { name: true } } } },
      },
    }),
  ]);

  const items = posts
    .map((p) => {
      const url = `${base}${postHref(p.kind, p.slug)}`;
      const cats = p.topics
        .map((t) => `      <category>${esc(t.topic.name)}</category>`)
        .join("\n");
      return `    <item>
      <title>${esc(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${p.publishedAt?.toUTCString() ?? ""}</pubDate>
      <dc:creator>${esc(p.author.name || p.author.handle)}</dc:creator>
      <description>${esc(p.subtitle || excerpt(p.body))}</description>
${cats}
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(settings.name)}</title>
    <link>${base}</link>
    <description>${esc(settings.tagline)}</description>
    <language>en</language>
    <atom:link href="${base}/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
}
