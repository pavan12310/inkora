import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { compact, formatDate } from "@/components/Byline";
import { readingTime } from "@/lib/markdown";
import { postHref } from "@/lib/types";

export const metadata: Metadata = {
  title: "Stats",
  robots: { index: false, follow: false },
};

const DAYS = 30;

/** YYYY-MM-DD in UTC, n days back from today. Matches how views are bucketed. */
function dayKey(back: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - back);
  return d.toISOString().slice(0, 10);
}

export default async function StatsPage() {
  const user = await currentUser();
  if (!user) redirect("/signin?next=/stats");

  const since = dayKey(DAYS - 1);

  const [posts, daily, followers] = await Promise.all([
    prisma.post.findMany({
      where: { authorId: user.id, status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      select: {
        id: true, slug: true, kind: true, title: true, body: true,
        views: true, publishedAt: true,
        _count: { select: { likes: true, comments: true } },
      },
    }),
    prisma.postDay.findMany({
      where: { day: { gte: since }, post: { authorId: user.id } },
      select: { day: true, views: true },
    }),
    prisma.follow.count({ where: { userId: user.id } }),
  ]);

  // Fill every day in the window, including the zeros — a chart that skips
  // empty days implies traffic on dates that had none.
  const byDay = new Map<string, number>();
  for (let i = DAYS - 1; i >= 0; i--) byDay.set(dayKey(i), 0);
  for (const row of daily) {
    if (byDay.has(row.day)) byDay.set(row.day, (byDay.get(row.day) ?? 0) + row.views);
  }
  const series = [...byDay.entries()];
  const windowViews = series.reduce((n, [, v]) => n + v, 0);

  const totals = {
    views: posts.reduce((n, p) => n + p.views, 0),
    likes: posts.reduce((n, p) => n + p._count.likes, 0),
    comments: posts.reduce((n, p) => n + p._count.comments, 0),
  };

  const peak = Math.max(1, ...series.map(([, v]) => v));

  // Inline SVG rather than a charting library: one line of data does not
  // justify shipping a dependency to every reader's browser.
  const W = 720;
  const H = 150;
  const step = series.length > 1 ? W / (series.length - 1) : W;
  const points = series.map(([, v], i) => `${i * step},${H - (v / peak) * H}`).join(" ");
  const area = `0,${H} ${points} ${W},${H}`;

  return (
    <>
      <div className="section-head">
        <h1>Stats</h1>
        <Link href="/me" className="count">Your pieces</Link>
      </div>

      {posts.length === 0 ? (
        <div className="empty-state">
          <p>
            Nothing is published yet, so there is nothing to measure. Numbers appear
            here once a piece is live.
          </p>
          <Link href="/write" className="btn primary">Write something</Link>
        </div>
      ) : (
        <>
          <div className="stat-grid">
            <div className="stat">
              <span className="n">{compact(posts.length)}</span>
              <span className="l">published</span>
            </div>
            <div className="stat">
              <span className="n">{compact(totals.views)}</span>
              <span className="l">views, all time</span>
            </div>
            <div className="stat">
              <span className="n">{compact(windowViews)}</span>
              <span className="l">views, last {DAYS} days</span>
            </div>
            <div className="stat">
              <span className="n">{compact(totals.likes)}</span>
              <span className="l">likes</span>
            </div>
            <div className="stat">
              <span className="n">{compact(totals.comments)}</span>
              <span className="l">responses</span>
            </div>
            <div className="stat">
              <span className="n">{compact(followers)}</span>
              <span className="l">followers</span>
            </div>
          </div>

          <section className="chart-block">
            <h2 className="sub-head">Views, last {DAYS} days</h2>

            {windowViews === 0 ? (
              <p className="muted-note">
                No views recorded in this window. Counting began when the piece went
                live, so a piece published earlier will show all-time views above but
                nothing here.
              </p>
            ) : (
              <>
                <svg
                  className="chart"
                  viewBox={`0 0 ${W} ${H}`}
                  preserveAspectRatio="none"
                  role="img"
                  aria-label={`Daily views over the last ${DAYS} days. Peak ${peak}, total ${windowViews}.`}
                >
                  <polygon points={area} className="chart-fill" />
                  <polyline points={points} className="chart-line" />
                </svg>
                <div className="chart-axis">
                  <span>{series[0][0].slice(5)}</span>
                  <span className="peak">peak {peak}/day</span>
                  <span>{series[series.length - 1][0].slice(5)}</span>
                </div>
              </>
            )}
          </section>

          <section className="chart-block">
            <h2 className="sub-head">By piece</h2>
            <table className="stats-table">
              <thead>
                <tr>
                  <th scope="col">Piece</th>
                  <th scope="col" className="num">Views</th>
                  <th scope="col" className="num">Likes</th>
                  <th scope="col" className="num">Responses</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link href={postHref(p.kind, p.slug)}>{p.title}</Link>
                      <span className="row-meta">
                        {readingTime(p.body)}
                        <span className="sep" aria-hidden="true">&middot;</span>
                        {formatDate(p.publishedAt)}
                      </span>
                    </td>
                    <td className="num">{compact(p.views)}</td>
                    <td className="num">{compact(p._count.likes)}</td>
                    <td className="num">{compact(p._count.comments)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </>
  );
}
