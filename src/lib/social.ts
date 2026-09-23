import { prisma } from "@/lib/db";

export type Engagement = {
  likes: number;
  liked: boolean;
  bookmarked: boolean;
};

export async function engagementFor(postId: string, userId?: string): Promise<Engagement> {
  const [likes, liked, bookmarked] = await Promise.all([
    prisma.like.count({ where: { postId } }),
    userId
      ? prisma.like.findUnique({ where: { userId_postId: { userId, postId } } })
      : Promise.resolve(null),
    userId
      ? prisma.bookmark.findUnique({ where: { userId_postId: { userId, postId } } })
      : Promise.resolve(null),
  ]);
  return { likes, liked: Boolean(liked), bookmarked: Boolean(bookmarked) };
}

export async function isFollowingUser(followerId: string | undefined, userId: string) {
  if (!followerId || followerId === userId) return false;
  const row = await prisma.follow.findUnique({
    where: { followerId_userId: { followerId, userId } },
  });
  return Boolean(row);
}

export async function isFollowingTopic(followerId: string | undefined, topicId: string) {
  if (!followerId) return false;
  const row = await prisma.follow.findUnique({
    where: { followerId_topicId: { followerId, topicId } },
  });
  return Boolean(row);
}

export async function isFollowingPublication(followerId: string | undefined, publicationId: string) {
  if (!followerId) return false;
  const row = await prisma.follow.findUnique({
    where: { followerId_publicationId: { followerId, publicationId } },
  });
  return Boolean(row);
}
