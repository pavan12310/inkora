import Link from "next/link";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { listPublished, cardSelect } from "@/lib/queries";
import StoryList from "@/components/StoryList";
import SetupNotice from "@/components/SetupNotice";
import FirstVisit from "@/components/FirstVisit";
import Landing from "@/components/Landing";

export const dynamic = "force-dynamic";

export default async function HomePage(
  { searchParams }: { searchParams: Promise<{ tab?: string }> }
) {
  const { tab } = await searchParams;
  const following = tab === "following";
  const user = await currentUser();

  // The following feed is filtered in the query, not in memory, so it stays
  // correct once there is more than one page of posts.
  const posts =
    following && user
      ? await prisma.post.findMany({
          where: {
            status: "PUBLISHED",
            OR: [
              { author: { followers: { some: { followerId: user.id } } } },
              { publication: { follows: { some: { followerId: user.id } } } },
              { topics: { some: { topic: { follows: { some: { followerId: user.id } } } } } },
            ],
          },
          orderBy: { publishedAt: "desc" },
          take: 30,
          select: cardSelect,
        })
      : await listPublished({ take: 30 });

  const queued = await prisma.post.count({ where: { status: "PENDING" } });

  // Before anything is published there is no feed to show, and a bare
  // "nothing here" line is a wasted first impression.
  const nothingPublished = !following && posts.length === 0;

  // Someone who has not signed in gets the landing page, not a feed they have
  // no context for. The root layout drops the app chrome for this one case.
  if (!user) return <Landing />;

  return (
    <>
      <SetupNotice />

      {nothingPublished ? (
        <FirstVisit />
      ) : (
        <>
          <nav className="feedtabs">
            <Link href="/" className={!following ? "active" : ""}>For you</Link>
            <Link href="/?tab=following" className={following ? "active" : ""}>Following</Link>
          </nav>

          <div className="desk-strip">
            <span className="say">
              <strong>Read before published.</strong>
              {queued > 0 && ` ${queued} ${queued === 1 ? "piece is" : "pieces are"} in the queue now.`}
            </span>
            <Link href="/record" className="go">See the record</Link>
          </div>

          <StoryList
            posts={posts}
            empty="Follow a writer, a publication or a topic and their pieces collect here."
          />
        </>
      )}
    </>
  );
}
