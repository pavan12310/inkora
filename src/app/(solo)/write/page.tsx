import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { signInWithGoogle } from "@/app/auth-actions";
import { createDraft } from "@/app/actions";
import { KIND_LABEL, POST_KINDS, STATUS_LABEL } from "@/lib/types";
import { formatDate } from "@/components/Byline";

export const metadata: Metadata = {
  title: "Write",
  robots: { index: false, follow: true },
};

const BLURB: Record<string, string> = {
  ARTICLE: "An essay, an argument, a write-up of something you did.",
  TUTORIAL: "Step-by-step instructions with prerequisites, tools and a time estimate.",
  RESEARCH: "Original data with an abstract, a methodology and sources.",
};

export default async function WritePage() {
  const user = await currentUser();

  if (!user) {
    return (
      <>
        <div className="section-head">
          <h1>Write on Inkora</h1>
        </div>
        <div className="empty">
          <h2>Sign in to start</h2>
          <p>
            One account per writer. You&rsquo;ll get a profile at /author/your-handle and can
            track everything you&rsquo;ve sent in.
          </p>
          <form action={signInWithGoogle}>
            <input type="hidden" name="redirectTo" value="/write" />
            <button type="submit" className="btn primary">
              Continue with Google
            </button>
          </form>
        </div>
      </>
    );
  }

  const drafts = await prisma.post.findMany({
    where: { authorId: user.id, status: { in: ["DRAFT", "REJECTED"] } },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

  return (
    <>
      <div className="section-head">
        <h1>Write</h1>
      </div>

      <p className="page-intro">
        Pick what you&rsquo;re writing. The type changes the fields you get and how the
        piece describes itself to search engines.
      </p>

      <div className="kind-grid">
        {POST_KINDS.map((k) => (
          <form action={createDraft} key={k}>
            <input type="hidden" name="kind" value={k} />
            <button type="submit" className="kind-card">
              <span className={`kind kind-${k.toLowerCase()}`}>{KIND_LABEL[k]}</span>
              <span className="kind-blurb">{BLURB[k]}</span>
            </button>
          </form>
        ))}
      </div>

      {drafts.length > 0 && (
        <section style={{ marginTop: 44 }}>
          <div className="section-head">
            <h2>In progress</h2>
            <span className="count">{drafts.length} {drafts.length === 1 ? "draft" : "drafts"}</span>
          </div>
          <ul className="index">
            {drafts.map((d) => (
              <li key={d.id} className="card-row">
                <div className="card-main">
                  <Link href={`/write/${d.id}`} className="entry">
                    <h3>{d.title || "Untitled"}</h3>
                    {d.subtitle && <p>{d.subtitle}</p>}
                  </Link>
                  <div className="byline">
                    <span className={`status ${d.status.toLowerCase()}`}>
                      {STATUS_LABEL[d.status]}
                    </span>
                    <span className="sep" />
                    <span>{KIND_LABEL[d.kind]}</span>
                    <span className="sep" />
                    <span>edited {formatDate(d.updatedAt)}</span>
                  </div>
                  {d.status === "REJECTED" && d.reviewNote && (
                    <div className="note-box">
                      <strong>From the editor: </strong>
                      {d.reviewNote}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
