import Link from "next/link";
import { prisma } from "@/lib/db";
import { cachedTopics } from "@/lib/queries";
import { listPublished } from "@/lib/queries";
import { postHref } from "@/lib/types";
import { compact, formatDate } from "@/components/Byline";
import { Avatar } from "@/components/Icon";

export default async function RightRail() {
  const [recent, topics, queued, publishedCount] = await Promise.all([
    listPublished({ take: 40 }),
    cachedTopics(6),
    prisma.post.count({ where: { status: "PENDING" } }),
    prisma.post.count({ where: { status: "PUBLISHED" } }),
  ]);

  // Before anything is published there are no picks and nothing trending, and
  // returning an empty aside left a third of a wide screen blank — which read
  // as an unfinished layout rather than a new site. The rail still has useful
  // things to say: what the queue looks like, and what it is open to.
  if (!recent.length) {
    return (
      <aside className="rail-right" aria-label="About this site">
        <section className="rail-block">
          <h2>The desk</h2>
          <p className="rail-note">
            {queued > 0
              ? `${queued} ${queued === 1 ? "piece is" : "pieces are"} with an editor now.`
              : "The queue is empty. A piece sent today gets read today."}
          </p>
          <p className="rail-note">
            {publishedCount === 0
              ? "Nothing has been published yet."
              : `${publishedCount} published so far.`}
          </p>
          <Link href="/record" className="rail-more">
            See the record
          </Link>
        </section>

        <section className="rail-block">
          <h2>Open for submissions</h2>
          <div className="chips">
            {topics.map((t) => (
              <Link key={t.slug} href={`/topic/${t.slug}`} className="chip">
                {t.name}
              </Link>
            ))}
          </div>
          <Link href="/write" className="rail-more">
            Start a piece
          </Link>
        </section>
      </aside>
    );
  }

  const picks = [...recent].sort((a, b) => b._count.likes - a._count.likes).slice(0, 3);
  const read = [...recent].sort((a, b) => b.views - a.views).slice(0, 3);

  return (
    <aside className="rail-right" aria-label="Highlights">
      <section className="rail-block">
        <h2>Chosen at the desk</h2>
        {picks.map((p) => (
          <Link key={p.id} href={postHref(p.kind, p.slug)} className="rail-item">
            <span className="who">
              <Avatar name={p.author.name} handle={p.author.handle} image={p.author.image} />
              <span>
                {p.publication ? `In ${p.publication.name} by ${p.author.name}` : p.author.name}
              </span>
            </span>
            <h3>{p.title}</h3>
            <span className="when">{formatDate(p.publishedAt)}</span>
          </Link>
        ))}
      </section>

      <section className="rail-block">
        <h2>Most read this month</h2>
        {read.map((p) => (
          <Link key={p.id} href={postHref(p.kind, p.slug)} className="rail-item">
            <span className="who">
              <Avatar name={p.author.name} handle={p.author.handle} image={p.author.image} />
              <span>{p.author.name}</span>
            </span>
            <h3>{p.title}</h3>
            <span className="when">{compact(p.views)} views</span>
          </Link>
        ))}
      </section>

      {topics.length > 0 && (
        <section className="rail-block">
          <h2>Open for submissions</h2>
          <div className="chips">
            {topics.map((t) => (
              <Link key={t.slug} href={`/topic/${t.slug}`} className="chip">
                {t.name}
              </Link>
            ))}
          </div>
          <div style={{ marginTop: 14 }}>
            <Link href="/topics" className="btn quiet">See all topics</Link>
          </div>
        </section>
      )}
    </aside>
  );
}
