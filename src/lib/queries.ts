import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";

/** Fields every card needs. Kept in one place so lists stay consistent. */
export const cardSelect = {
  id: true,
  slug: true,
  kind: true,
  title: true,
  subtitle: true,
  coverImage: true,
  body: true,
  views: true,
  publishedAt: true,
  author: { select: { name: true, handle: true, image: true } },
  publication: { select: { name: true, slug: true } },
  topics: { select: { topic: { select: { name: true, slug: true } } } },
  _count: { select: { likes: true, comments: true } },
} as const;

export type Card = Awaited<ReturnType<typeof listPublished>>[number];

export async function listPublished(opts: {
  kind?: string;
  topicSlug?: string;
  authorHandle?: string;
  publicationSlug?: string;
  take?: number;
  orderBy?: "recent" | "popular";
}) {
  const { kind, topicSlug, authorHandle, publicationSlug, take = 30, orderBy = "recent" } = opts;

  return prisma.post.findMany({
    where: {
      status: "PUBLISHED",
      ...(kind ? { kind } : {}),
      ...(topicSlug ? { topics: { some: { topic: { slug: topicSlug } } } } : {}),
      ...(authorHandle ? { author: { handle: authorHandle } } : {}),
      ...(publicationSlug ? { publication: { slug: publicationSlug } } : {}),
    },
    orderBy: orderBy === "popular" ? [{ views: "desc" }] : [{ publishedAt: "desc" }],
    take,
    select: cardSelect,
  });
}

/**
 * Trending: views weighted against age, so a strong new piece can outrank an
 * older one that has simply been up longer.
 */
export async function listTrending(take = 12) {
  const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 45);
  const posts = await prisma.post.findMany({
    where: { status: "PUBLISHED", publishedAt: { gte: since } },
    select: cardSelect,
    take: 120,
  });

  return posts
    .map((p) => {
      const ageDays = p.publishedAt
        ? (Date.now() - p.publishedAt.getTime()) / 86_400_000
        : 999;
      const score = (p.views + p._count.likes * 8 + p._count.comments * 5) / Math.pow(ageDays + 2, 0.7);
      return { ...p, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, take);
}

/** Related pieces: same topics first, then anything else recent by the author. */
export async function listRelated(postId: string, topicIds: string[], take = 4) {
  if (topicIds.length) {
    const byTopic = await prisma.post.findMany({
      where: {
        status: "PUBLISHED",
        id: { not: postId },
        topics: { some: { topicId: { in: topicIds } } },
      },
      orderBy: { publishedAt: "desc" },
      take,
      select: cardSelect,
    });
    if (byTopic.length) return byTopic;
  }
  return prisma.post.findMany({
    where: { status: "PUBLISHED", id: { not: postId } },
    orderBy: { publishedAt: "desc" },
    take,
    select: cardSelect,
  });
}

/** Simple ILIKE search. Swap for Postgres full-text once the corpus is large. */
export async function searchEverything(q: string) {
  const query = q.trim();
  if (!query) return { posts: [], authors: [], publications: [], topics: [] };

  const contains = { contains: query, mode: "insensitive" as const };

  const [posts, authors, publications, topics] = await Promise.all([
    prisma.post.findMany({
      where: {
        status: "PUBLISHED",
        OR: [{ title: contains }, { subtitle: contains }, { body: contains }],
      },
      orderBy: { publishedAt: "desc" },
      take: 25,
      select: cardSelect,
    }),
    prisma.user.findMany({
      where: { OR: [{ name: contains }, { handle: contains }, { bio: contains }] },
      take: 8,
      select: { name: true, handle: true, image: true, bio: true, expertise: true },
    }),
    prisma.publication.findMany({
      where: { OR: [{ name: contains }, { description: contains }] },
      take: 6,
      select: { name: true, slug: true, description: true },
    }),
    prisma.topic.findMany({
      where: { OR: [{ name: contains }, { description: contains }] },
      take: 8,
      select: { name: true, slug: true },
    }),
  ]);

  return { posts, authors, publications, topics };
}


/**
 * Topic lists change only when an editor adds a topic, but they are queried by
 * the right rail, the topic chips and the first-visit page on almost every
 * request. Cached across requests, revalidated hourly, so a reader on the other
 * side of the world is not waiting on a round trip for a list of eight words.
 */
export const cachedTopics = unstable_cache(
  async (take: number) =>
    prisma.topic.findMany({ orderBy: { name: "asc" }, take }),
  ["topics-list"],
  { revalidate: 3600, tags: ["topics"] }
);
