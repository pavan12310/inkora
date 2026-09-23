import Link from "next/link";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { signOutAction } from "@/app/auth-actions";
import Icon, { Avatar } from "@/components/Icon";

const ITEMS = [
  { label: "Home", href: "/", icon: "home" },
  { label: "Explore", href: "/explore", icon: "compass" },
  { label: "Topics", href: "/topics", icon: "hash" },
  { label: "Publications", href: "/publications", icon: "stack" },
  { label: "The record", href: "/record", icon: "scale" },
];

export default async function LeftRail() {
  const user = await currentUser();

  const [queued, following] = await Promise.all([
    user?.isAdmin ? prisma.post.count({ where: { status: "PENDING" } }) : Promise.resolve(0),
    user
      ? prisma.follow.findMany({
          where: { followerId: user.id, userId: { not: null } },
          include: { user: { select: { name: true, handle: true, image: true } } },
          take: 8,
        })
      : Promise.resolve([]),
  ]);

  return (
    <aside className="rail-left">
      <nav className="nav" aria-label="Sections">
        {ITEMS.map((i) => (
          <Link key={i.href} href={i.href}>
            <Icon name={i.icon} size={21} />
            <span>{i.label}</span>
          </Link>
        ))}

        <div className="nav-rule" />

        <Link href="/write">
          <Icon name="pen" size={21} />
          <span>Write</span>
        </Link>
        {user && (
          <Link href="/me">
            <Icon name="chart" size={21} />
            <span>Your pieces</span>
          </Link>
        )}
        {user?.isAdmin && (
          <Link href="/desk">
            <Icon name="inbox" size={21} />
            <span>Editor&rsquo;s desk</span>
            {queued > 0 && <span className="queue-pill">{queued}</span>}
          </Link>
        )}

        <div className="nav-rule" />

        <Link href="/about">
          <Icon name="info" size={21} />
          <span>About</span>
        </Link>

        {following.length > 0 && (
          <>
            <div className="nav-head">Following</div>
            {following.map((f) => (
              <Link key={f.id} href={`/author/${f.user!.handle}`}>
                <Avatar name={f.user!.name} handle={f.user!.handle} image={f.user!.image} />
                <span>{f.user!.name || `@${f.user!.handle}`}</span>
              </Link>
            ))}
          </>
        )}
      </nav>

      <div className="desk-state">
        {user?.isAdmin ? (
          <>
            <strong>
              {queued
                ? `${queued} ${queued === 1 ? "piece" : "pieces"} waiting. `
                : "Queue is clear. "}
            </strong>
            <Link href="/desk">{queued ? "Open the desk" : "View the desk"}</Link>
          </>
        ) : (
          <>
            <strong>An editor reads everything here. </strong>
            <Link href="/record">See the record</Link>
          </>
        )}
      </div>

      {user && (
        <div className="rail-foot">
          <div className="who-line">
            <Avatar name={user.name} handle={user.handle} image={user.image} />
            <Link href={`/author/${user.handle}`}>{user.name || `@${user.handle}`}</Link>
            {user.isAdmin && <span className="role-tag">Editor</span>}
          </div>
          <form action={signOutAction}>
            <button type="submit" className="link-button">Sign out</button>
          </form>
        </div>
      )}
    </aside>
  );
}
