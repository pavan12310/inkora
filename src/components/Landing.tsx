import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";

/**
 * What a signed-out visitor sees at the root.
 *
 * The feed is useless to someone who has never heard of the site, and a wall of
 * nav is worse. This does one job: say what the place is, prove the editorial
 * gate is real with live numbers, and offer exactly two doors — read, or start
 * writing.
 */
export default async function Landing() {
  const [settings, published, queued, rejected] = await Promise.all([
    getSettings(),
    prisma.post.count({ where: { status: "PUBLISHED" } }),
    prisma.post.count({ where: { status: "PENDING" } }),
    prisma.post.count({ where: { status: "REJECTED" } }),
  ]);

  const decided = published + rejected;
  const rate = decided > 0 ? Math.round((published / decided) * 100) : null;

  return (
    <div className="landing">
      <section className="hero">
        <div className="hero-text">
          <h1>
            Read before
            <br />
            published.
          </h1>
          <p className="hero-stand">{settings.tagline}</p>
          <div className="hero-act">
            <Link href="/explore" className="btn primary big">
              Start reading
            </Link>
            <Link href="/signin?next=/write" className="btn big">
              Start writing
            </Link>
          </div>
        </div>

        <div className="hero-mark" aria-hidden="true">
          <svg viewBox="0 0 260 260" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="130" cy="112" r="86" fill="var(--mark)" opacity="0.13" />
            <path
              d="M86 44h88v96a26 26 0 0 1-4.7 15L130 212l-39.3-57A26 26 0 0 1 86 140V44Z"
              fill="var(--mark)"
            />
            <circle cx="130" cy="98" r="19" fill="var(--bg)" />
            <path d="M130 121v64" stroke="var(--bg)" strokeWidth="9" strokeLinecap="round" />
            <path
              d="M44 214c40-16 62-16 86-16s46 0 86 16"
              stroke="var(--mark)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="2 12"
            />
          </svg>
        </div>
      </section>

      <section className="landing-how">
        <h2 className="sub-head">How it works</h2>
        <ol className="fv-steps">
          <li>
            <strong>You write and send it.</strong> An article, a tutorial, or research
            with real data behind it.
          </li>
          <li>
            <strong>An editor reads it.</strong> A person, not a score — and you hear back
            either way, with a reason.
          </li>
          <li>
            <strong>It goes live</strong> with a permanent URL, in the sitemap and the feed.
          </li>
        </ol>
      </section>

      <section className="landing-numbers">
        <div className="fig">
          <strong>{published}</strong>
          <span>published</span>
        </div>
        <div className="fig">
          <strong>{queued}</strong>
          <span>in the queue</span>
        </div>
        <div className="fig">
          <strong>{rate === null ? "—" : `${rate}%`}</strong>
          <span>accepted</span>
        </div>
        <p className="landing-record">
          Every decision is counted, including the rejections.{" "}
          <Link href="/record">See the record</Link>.
        </p>
      </section>
    </div>
  );
}
