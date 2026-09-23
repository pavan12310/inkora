import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import Link from "next/link";
import StoryCard from "@/components/StoryCard";

type Story = React.ComponentProps<typeof StoryCard>["post"];

/**
 * Loads the viewer's likes and bookmarks for the whole list in two queries,
 * rather than one pair per card.
 */
export default async function StoryList({
  posts,
  empty = "Nothing here yet.",
  action,
}: {
  posts: Story[];
  empty?: string;
  /** Somewhere to go from an empty list, so it is not a dead end. */
  action?: { href: string; label: string };
}) {
  if (!posts.length) {
    return (
      <div className="empty-state">
        <p>{empty}</p>
        {action && (
          <Link href={action.href} className="btn primary">
            {action.label}
          </Link>
        )}
      </div>
    );
  }

  const user = await currentUser();
  const ids = posts.map((p) => p.id);

  const [likes, saves] = user
    ? await Promise.all([
        prisma.like.findMany({ where: { userId: user.id, postId: { in: ids } }, select: { postId: true } }),
        prisma.bookmark.findMany({ where: { userId: user.id, postId: { in: ids } }, select: { postId: true } }),
      ])
    : [[], []];

  const liked = new Set(likes.map((l) => l.postId));
  const saved = new Set(saves.map((b) => b.postId));

  return (
    <ul className="stories">
      {posts.map((p) => (
        <StoryCard
          key={p.id}
          post={p}
          signedIn={Boolean(user)}
          liked={liked.has(p.id)}
          saved={saved.has(p.id)}
        />
      ))}
    </ul>
  );
}
