import Link from "next/link";
import { prisma } from "@/lib/db";
import { cachedTopics } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import Icon from "@/components/Icon";

/**
 * What a visitor sees before anything has been published.
 *
 * A blank index with one line of apology is the worst first impression a new
 * site can make — it tells a reader nothing about what this place is or why
 * they should come back. This does the job the empty feed can't: states the
 * premise, shows the moderation is real, and gives both a reader and a writer
 * somewhere to go.
 */
export default async function FirstVisit() {
  const [settings, topics, queued] = await Promise.all([
    getSettings(),
    cachedTopics(8),
    prisma.post.count({ where: { status: "PENDING" } }),
  ]);

  return (
    <div className="first-visit">
      <section className="fv-lead">
        <h1>{settings.name} is open, and empty.</h1>
        <p className="fv-stand">
          Nothing has been published yet. That is the honest state of a new
          publication, and it is a better first impression than a page of filler.
        </p>
      </section>

      <section className="fv-how">
        <h2 className="sub-head">How this works</h2>
        <ol className="fv-steps">
          <li>
            <strong>Anyone can write here.</strong> Articles, tutorials, or
            research with real data behind it.
          </li>
          <li>
            <strong>An editor reads every submission.</strong> Not a filter, not a
            score — a person, who replies either way.
          </li>
          <li>
            <strong>Approved pieces go live</strong> with a permanent URL, in the
            sitemap and the feed.
          </li>
        </ol>
        <p className="fv-note">
          {queued > 0
            ? `${queued} ${queued === 1 ? "piece is" : "pieces are"} in the queue right now.`
            : "The queue is empty, so a submission today gets read today."}{" "}
          <Link href="/record">See what has been turned down, and why</Link>.
        </p>
      </section>

      {topics.length > 0 && (
        <section className="fv-topics">
          <h2 className="sub-head">Open for submissions</h2>
          <div className="chips">
            {topics.map((t) => (
              <Link key={t.slug} href={`/topic/${t.slug}`} className="chip">
                {t.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="fv-act">
        <Link href="/write" className="btn primary">
          <Icon name="pen" size={18} />
          Write the first piece
        </Link>
        <Link href="/about" className="btn">
          What gets published
        </Link>
      </section>
    </div>
  );
}
