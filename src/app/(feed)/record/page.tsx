import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getSettings, siteUrl } from "@/lib/settings";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    title: "The record",
    description: `What ${s.name} has published, what it has turned down, and how long decisions take.`,
    alternates: { canonical: "/record" },
  };
}

/**
 * The public record.
 *
 * Almost no platform publishes what it rejected. Doing so is the strongest
 * possible evidence that the gate is real — and it is cheap, because the data
 * already exists.
 *
 * Deliberately anonymous: counts and the editor's reasons, never the writer's
 * name or the title of a piece that was turned down. Publishing those would
 * punish people for submitting, which is the opposite of the point.
 */
export default async function RecordPage() {
  const settings = await getSettings();

  const [published, pending, rejected, decided] = await Promise.all([
    prisma.post.count({ where: { status: "PUBLISHED" } }),
    prisma.post.count({ where: { status: "PENDING" } }),
    prisma.post.count({ where: { status: "REJECTED" } }),
    prisma.post.findMany({
      where: { reviewedAt: { not: null }, submittedAt: { not: null } },
      select: { submittedAt: true, reviewedAt: true },
    }),
  ]);

  const reasons = await prisma.post.findMany({
    where: { status: "REJECTED", reviewNote: { not: "" } },
    select: { id: true, reviewNote: true, reviewedAt: true },
    orderBy: { reviewedAt: "desc" },
    take: 20,
  });

  const decisions = published + rejected;
  const rate = decisions ? Math.round((published / decisions) * 100) : null;

  const days = decided
    .map((p) => (p.reviewedAt!.getTime() - p.submittedAt!.getTime()) / 86_400_000)
    .sort((a, b) => a - b);
  const median = days.length ? days[Math.floor(days.length / 2)] : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "The record",
    url: `${siteUrl()}/record`,
    description: `Moderation figures for ${settings.name}.`,
    isPartOf: { "@id": `${siteUrl()}/#website` },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="page-head">
        <h1>The record</h1>
      </div>

      <p className="page-intro">
        Most platforms keep their moderation private. These are {settings.name}&rsquo;s actual
        figures, updated as decisions are made.
      </p>

      <div className="figures" style={{ marginTop: 26 }}>
        <div>
          <span className="n">{published}</span>
          <span className="l">published</span>
        </div>
        <div>
          <span className="n">{rejected}</span>
          <span className="l">sent back</span>
        </div>
        <div>
          <span className="n">{pending}</span>
          <span className="l">in review now</span>
        </div>
        {rate !== null && (
          <div>
            <span className="n">{rate}%</span>
            <span className="l">acceptance rate</span>
          </div>
        )}
        {median !== null && (
          <div>
            <span className="n">{median < 1 ? "<1" : Math.round(median)}</span>
            <span className="l">days to a decision, median</span>
          </div>
        )}
      </div>

      <section style={{ marginTop: 44 }}>
        <h2 className="sub-head">Why pieces were turned down</h2>
        <p className="muted-note" style={{ marginTop: 0 }}>
          The editor&rsquo;s own words, most recent first. No names and no titles &mdash; nobody
          should be penalised for having submitted something.
        </p>

        {reasons.length === 0 ? (
          <p className="muted-note">Nothing has been turned down yet.</p>
        ) : (
          <ul className="reasons">
            {reasons.map((r) => (
              <li key={r.id}>{r.reviewNote}</li>
            ))}
          </ul>
        )}
      </section>

      <section style={{ marginTop: 44 }}>
        <h2 className="sub-head">What this is for</h2>
        <p className="muted-note" style={{ marginTop: 0, maxWidth: "62ch" }}>
          If you are deciding whether to send something in, the acceptance rate and the reasons
          above will tell you more than a submissions page ever could. If they put you off, that
          is a useful outcome too.
        </p>
        <div className="btn-row" style={{ marginTop: 18 }}>
          <Link href="/write" className="btn primary">
            Send something in
          </Link>
          <Link href="/about" className="btn">
            What gets published
          </Link>
        </div>
      </section>
    </>
  );
}
