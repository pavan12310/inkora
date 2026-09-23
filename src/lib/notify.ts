import { prisma } from "@/lib/db";

/**
 * In-app notifications.
 *
 * Every function here swallows its own failures, for the same reason email.ts
 * does: a notification is a side effect of something that already succeeded.
 * If writing one fails, the comment was still posted and the piece was still
 * approved — throwing here would roll back work the person can see happened.
 */

type Kind = "comment" | "follow" | "published" | "rejected" | "submission";

async function notify(input: {
  userId: string;
  kind: Kind;
  body: string;
  href?: string;
  actorId?: string | null;
}): Promise<void> {
  // Nobody needs telling about their own action.
  if (input.actorId && input.actorId === input.userId) return;

  try {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        kind: input.kind,
        body: input.body.slice(0, 300),
        href: input.href ?? "",
        actorId: input.actorId ?? null,
      },
    });
  } catch (err) {
    console.error("[notification failed]", err);
  }
}

/** Someone responded to a piece. */
export async function notifyComment(
  postAuthorId: string,
  actorId: string,
  actorName: string,
  postTitle: string,
  href: string
) {
  await notify({
    userId: postAuthorId,
    actorId,
    kind: "comment",
    body: `${actorName} responded to “${postTitle}”.`,
    href: `${href}#responses`,
  });
}

/** Someone followed you. */
export async function notifyFollow(userId: string, actorId: string, actorName: string, handle: string) {
  await notify({
    userId,
    actorId,
    kind: "follow",
    body: `${actorName} followed you.`,
    href: `/author/${handle}`,
  });
}

/** An editor approved a piece. */
export async function notifyApproved(authorId: string, postTitle: string, href: string) {
  await notify({
    userId: authorId,
    kind: "published",
    body: `“${postTitle}” is published.`,
    href,
  });
}

/** An editor sent a piece back, with a reason. */
export async function notifyReturned(authorId: string, postTitle: string, note: string, postId: string) {
  await notify({
    userId: authorId,
    kind: "rejected",
    body: `“${postTitle}” was sent back: ${note}`,
    href: `/write/${postId}`,
  });
}

/** A piece arrived in the queue — for editors. */
export async function notifyEditors(
  editorIds: string[],
  actorId: string,
  actorName: string,
  postTitle: string
) {
  await Promise.all(
    editorIds.map((id) =>
      notify({
        userId: id,
        actorId,
        kind: "submission",
        body: `${actorName} sent “${postTitle}” for review.`,
        href: "/desk",
      })
    )
  );
}

/** Unread count for the bell. */
export async function unreadCount(userId: string): Promise<number> {
  try {
    return await prisma.notification.count({ where: { userId, readAt: null } });
  } catch {
    return 0;
  }
}
