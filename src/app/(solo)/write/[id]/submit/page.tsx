import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { submitForReview, saveSubmissionMeta, publishOwn } from "@/app/actions";
import { readingTime, wordCount } from "@/lib/markdown";
import { seoReport } from "@/lib/seo";
import { KIND_LABEL } from "@/lib/types";

export const metadata: Metadata = {
  title: "Ready to send",
  robots: { index: false, follow: false },
};

const MIN_WORDS = 300;
const MAX_OPEN = 2;

/**
 * The step between writing and the review queue.
 *
 * Submitting used to be a single button in the editor, which meant the display
 * title, cover and topics were either set early or not at all — and a writer
 * only found out they were under the word count when the action threw. This
 * screen collects everything the piece needs to travel, shows what is still
 * missing before the button is pressed, and keeps the search title separate
 * from the headline so presentation is decoupled from the writing.
 */
export default async function SubmitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect("/write");

  const [post, topics, openCount] = await Promise.all([
    prisma.post.findUnique({
      where: { id },
      include: { topics: { select: { topicId: true } }, publication: { select: { name: true } } },
    }),
    prisma.topic.findMany({ orderBy: { name: "asc" } }),
    prisma.post.count({ where: { authorId: user.id, status: "PENDING" } }),
  ]);

  if (!post || post.authorId !== user.id) notFound();
  if (post.status === "PENDING") redirect("/me?tab=work");

  const words = wordCount(post.body);
  const chosen = new Set(post.topics.map((t) => t.topicId));

  const seo = seoReport(
    {
      title: post.title,
      seoTitle: post.seoTitle,
      subtitle: post.subtitle,
      metaDescription: post.metaDescription,
      body: post.body,
      keyTakeaways: post.keyTakeaways,
      faq: post.faq,
      sources: post.sources,
      topicIds: post.topics.map((t) => t.topicId),
    },
    words
  );
  const seoPassed = seo.filter((c) => c.pass).length;

  // Everything that would otherwise fail at the moment of submitting.
  const blockers: string[] = [];
  if (!post.title.trim()) blockers.push("Give the piece a title.");
  if (words < MIN_WORDS)
    blockers.push(`Needs at least ${MIN_WORDS} words — it has ${words}.`);
  if (openCount >= MAX_OPEN)
    blockers.push("You already have two pieces in review. Let those clear first.");

  const ready = blockers.length === 0;

  return (
    <div className="layout solo">
      <main id="content" className="feed">
        <div className="submit-head">
          <Link href={`/write/${post.id}`} className="back">
            &larr; Back to the draft
          </Link>
          <h1>Ready to send</h1>
          <p className="stand">
            An editor reads every piece before it goes live. What you set here is how it
            appears in the feed, in search results and when someone shares it — not the
            writing itself.
          </p>
        </div>

        {!ready && (
          <div className="blockers">
            <strong>Not quite ready</strong>
            <ul>
              {blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        )}

        <form action={saveSubmissionMeta} className="submit-form">
          <input type="hidden" name="id" value={post.id} />

          <section className="submit-block">
            <h2 className="sub-head">How it will look</h2>

            <div className="preview-card">
              {post.coverImage ? (
                <img className="preview-cover" src={post.coverImage} alt="" />
              ) : (
                <div className="preview-cover empty">
                  A cover image makes a piece far more likely to be opened. Add one in the
                  draft.
                </div>
              )}
              <div className="preview-meta">
                <span>{KIND_LABEL[post.kind as keyof typeof KIND_LABEL] ?? "Article"}</span>
                <span className="sep" aria-hidden="true">·</span>
                <span>{readingTime(post.body)}</span>
              </div>
            </div>

            <label htmlFor="seoTitle">
              Display title
              <span className="hint">Shown in the feed and in search. Leave blank to use the headline.</span>
            </label>
            <input
              id="seoTitle"
              name="seoTitle"
              defaultValue={post.seoTitle || post.title}
              maxLength={70}
              placeholder={post.title}
            />

            <label htmlFor="metaDescription">
              Summary
              <span className="hint">One or two lines. This is what a reader sees before deciding to open it.</span>
            </label>
            <textarea
              id="metaDescription"
              name="metaDescription"
              rows={3}
              maxLength={160}
              defaultValue={post.metaDescription || post.subtitle || ""}
            />
          </section>

          <section className="submit-block">
            <h2 className="sub-head">Topics</h2>
            <p className="hint block">
              Up to five. These decide which topic pages the piece appears on.
            </p>
            <div className="chips pick">
              {topics.map((t) => (
                <label key={t.id} className="chip-pick">
                  <input
                    type="checkbox"
                    name="topicIds"
                    value={t.id}
                    defaultChecked={chosen.has(t.id)}
                  />
                  <span>{t.name}</span>
                </label>
              ))}
            </div>
          </section>

          <div className="submit-actions">
            <button type="submit" className="btn">
              Save and keep editing
            </button>
          </div>
        </form>

        <section className="submit-block">
          <h2 className="sub-head">
            Findability &middot; {seoPassed} of {seo.length}
          </h2>
          <p className="hint block">
            None of this makes a piece rank — that comes from the writing. These are
            the mechanical things that stop a good piece being found at all.
          </p>
          <ul className="seo-list">
            {seo.map((c) => (
              <li key={c.label} className={c.pass ? "pass" : "miss"}>
                <span className="mark" aria-hidden="true">{c.pass ? "\u2713" : "\u00b7"}</span>
                <span>
                  <strong>{c.label}</strong>
                  {!c.pass && <em>{c.why}</em>}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="submit-block send">
          <h2 className="sub-head">{user.isAdmin ? "Publish it" : "Send it"}</h2>

          {user.isAdmin ? (
            <>
              <p className="hint block">
                You are an editor, so your own work does not need the queue. It goes
                live immediately and is counted on the record like any other piece.
              </p>
              <div className="send-pair">
                <form action={publishOwn}>
                  <input type="hidden" name="id" value={post.id} />
                  <button type="submit" className="btn primary big" disabled={!ready}>
                    Publish now
                  </button>
                </form>
                <form action={submitForReview}>
                  <input type="hidden" name="id" value={post.id} />
                  <button type="submit" className="btn big" disabled={!ready}>
                    Send to the desk instead
                  </button>
                </form>
              </div>
              <p className="hint block">
                Sending it to the desk is worth doing when you want a second pair of
                eyes, or when another editor should decide.
              </p>
            </>
          ) : (
            <>
              <p className="hint block">
                {post.publication
                  ? `This goes to ${post.publication.name}, then to the editor's desk.`
                  : "This goes to the editor's desk. You'll hear back either way."}
              </p>
              <form action={submitForReview}>
                <input type="hidden" name="id" value={post.id} />
                <button type="submit" className="btn primary big" disabled={!ready}>
                  Send for review
                </button>
              </form>
            </>
          )}

          {!ready && <p className="hint block">Clear the points above first.</p>}
        </section>
      </main>
    </div>
  );
}
