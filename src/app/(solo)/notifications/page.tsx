import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { markAllRead } from "@/app/actions";
import { formatDate } from "@/components/Byline";
import Icon, { Avatar } from "@/components/Icon";

export const metadata: Metadata = {
  title: "Notifications",
  robots: { index: false, follow: false },
};

const ICON: Record<string, string> = {
  comment: "reply",
  follow: "home",
  published: "check",
  rejected: "inbox",
  submission: "inbox",
};

export default async function NotificationsPage() {
  const user = await currentUser();
  if (!user) redirect("/signin?next=/notifications");

  const items = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 60,
    include: { actor: { select: { name: true, handle: true, image: true } } },
  });

  const unread = items.filter((n) => !n.readAt).length;

  return (
    <>
      <div className="section-head">
        <h1>Notifications</h1>
        {unread > 0 && (
          <form action={markAllRead}>
            <button type="submit" className="btn quiet">
              Mark all read
            </button>
          </form>
        )}
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <p>
            Nothing yet. Responses to your pieces, new followers and editorial
            decisions all arrive here.
          </p>
          <Link href="/explore" className="btn primary">
            Find something to read
          </Link>
        </div>
      ) : (
        <ul className="notes">
          {items.map((n) => {
            const inner = (
              <>
                <span className="note-face">
                  {n.actor ? (
                    <Avatar name={n.actor.name} handle={n.actor.handle} image={n.actor.image} />
                  ) : (
                    <span className="note-icon">
                      <Icon name={ICON[n.kind] ?? "info"} size={17} />
                    </span>
                  )}
                </span>
                <span className="note-body">
                  {n.body}
                  <time dateTime={n.createdAt.toISOString()}>{formatDate(n.createdAt)}</time>
                </span>
              </>
            );

            return (
              <li key={n.id} className={n.readAt ? "note" : "note new"}>
                {n.href ? (
                  <Link href={n.href} className="note-link">
                    {inner}
                  </Link>
                ) : (
                  <span className="note-link">{inner}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
