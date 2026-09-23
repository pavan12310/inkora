import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Topics",
  description: "Every topic published on Inkora.",
  alternates: { canonical: "/topics" },
};

export default async function TopicsPage() {
  const topics = await prisma.topic.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { posts: true, follows: true } } },
  });

  return (
    <>
      <div className="section-head">
        <h1>Topics</h1>
        <span className="count">{topics.length} {topics.length === 1 ? "topic" : "topics"}</span>
      </div>

      {topics.length === 0 ? (
        <p className="muted-note">No topics yet. An editor can add them from the desk.</p>
      ) : (
        <ul className="index">
          {topics.map((t) => (
            <li key={t.id} className="card-row">
              <div className="card-main">
                <Link href={`/topic/${t.slug}`} className="entry">
                  <h3>{t.name}</h3>
                  {t.description && <p>{t.description}</p>}
                </Link>
                <div className="byline">
                  <span>
                    {t._count.posts} {t._count.posts === 1 ? "piece" : "pieces"}
                  </span>
                  <span className="sep" aria-hidden="true">·</span>
                  <span>{t._count.follows} following</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
