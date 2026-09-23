import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { renderMarkdown, readingTime, parseLines, parseFaq } from "@/lib/markdown";
import {
  approvePost, rejectPost, unpublishPost, updateSettings, createTopic, hideComment,
} from "@/app/actions";
import { KIND_LABEL, postHref } from "@/lib/types";
import { Sep, formatDate, compact } from "@/components/Byline";

export const metadata: Metadata = {
  title: "Editor's desk",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Tab = "queue" | "live" | "rejected" | "comments" | "topics" | "settings";

export default async function DeskPage(
  { searchParams }: { searchParams: Promise<{ tab?: string }> }
) {
  const user = await currentUser();
  // notFound, not 403: an unauthorised visitor shouldn't learn this route exists.
  if (!user?.isAdmin) notFound();

  const sp = await searchParams;
  const tab = (["queue", "live", "rejected", "comments", "topics", "settings"].includes(sp.tab ?? "")
    ? sp.tab
    : "queue") as Tab;

  const [queue, live, rejected, comments, topics, settings] = await Promise.all([
    prisma.post.findMany({
      where: { status: "PENDING" },
      orderBy: { submittedAt: "asc" },
      include: { author: true, topics: { include: { topic: true } } },
    }),
    prisma.post.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      include: { author: { select: { name: true, handle: true } } },
    }),
    prisma.post.findMany({
      where: { status: "REJECTED" },
      orderBy: { reviewedAt: "desc" },
      include: { author: { select: { name: true, handle: true } } },
    }),
    prisma.comment.findMany({
      where: { hidden: false },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        user: { select: { name: true, handle: true } },
        post: { select: { title: true, slug: true, kind: true } },
      },
    }),
    prisma.topic.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { posts: true } } },
    }),
    getSettings(),
  ]);

  const tabs: [Tab, string, number | null][] = [
    ["queue", "Queue", queue.length],
    ["live", "Published", live.length],
    ["rejected", "Rejected", rejected.length],
    ["comments", "Responses", comments.length],
    ["topics", "Topics", topics.length],
    ["settings", "Settings", null],
  ];

  return (
    <>
      <div className="section-head">
        <h1>Editor&rsquo;s desk</h1>
        <span className="count">{queue.length ? `${queue.length} waiting` : "queue clear"}</span>
      </div>

      <nav className="tabs">
        {tabs.map(([k, label, n]) => (
          <Link key={k} href={`/desk?tab=${k}`} className={tab === k ? "active" : ""}>
            {label}
            {n ? ` (${n})` : ""}
          </Link>
        ))}
      </nav>

      {tab === "queue" &&
        (queue.length === 0 ? (
          <Empty title="Queue is clear" body="Nothing is indexable until you approve it." />
        ) : (
          queue.map((p) => <QueueCard key={p.id} post={p} />)
        ))}

      {tab === "live" &&
        (live.length === 0 ? (
          <Empty title="Nothing published" body="Approved pieces appear here." />
        ) : (
          live.map((p) => (
            <div className="card" key={p.id}>
              <div className="card-head">
                <div>
                  <h3>{p.title}</h3>
                  <div className="byline" style={{ marginTop: 0 }}>
                    <span>{p.author.name || `@${p.author.handle}`}</span>
                    <Sep />
                    <span>{formatDate(p.publishedAt)}</span>
                    <Sep />
                    <span>{compact(p.views)} views</span>
                    <Sep />
                    <span>{postHref(p.kind, p.slug)}</span>
                  </div>
                </div>
                <span className="status published">live</span>
              </div>
              <div className="btn-row" style={{ marginTop: 14 }}>
                <Link className="btn" href={postHref(p.kind, p.slug)}>
                  View
                </Link>
                <form action={unpublishPost}>
                  <input type="hidden" name="id" value={p.id} />
                  <button className="btn danger" type="submit">
                    Take down
                  </button>
                </form>
              </div>
            </div>
          ))
        ))}

      {tab === "rejected" &&
        (rejected.length === 0 ? (
          <Empty title="Nothing rejected" body="Turned-down pieces stay here with your note." />
        ) : (
          rejected.map((p) => (
            <div className="card" key={p.id}>
              <div className="card-head">
                <div>
                  <h3>{p.title || "Untitled"}</h3>
                  <p className="sub">{p.author.name || `@${p.author.handle}`}</p>
                </div>
                <span className="status rejected">rejected</span>
              </div>
              {p.reviewNote && (
                <div className="note-box">
                  <strong>Your note: </strong>
                  {p.reviewNote}
                </div>
              )}
            </div>
          ))
        ))}

      {tab === "comments" &&
        (comments.length === 0 ? (
          <Empty title="No responses yet" body="Responses across the site appear here." />
        ) : (
          comments.map((c) => (
            <div className="card" key={c.id}>
              <div className="byline" style={{ marginTop: 0 }}>
                <span>{c.user.name || `@${c.user.handle}`}</span>
                <Sep />
                <span>{formatDate(c.createdAt)}</span>
                <Sep />
                <Link href={postHref(c.post.kind, c.post.slug)}>{c.post.title}</Link>
              </div>
              <p className="sub" style={{ marginTop: 10 }}>
                {c.body}
              </p>
              <form action={hideComment}>
                <input type="hidden" name="id" value={c.id} />
                <button className="btn danger" type="submit">
                  Hide
                </button>
              </form>
            </div>
          ))
        ))}

      {tab === "topics" && (
        <>
          {topics.length > 0 && (
            <div className="scroll-x" style={{ marginBottom: 32 }}>
              <table className="data">
                <thead>
                  <tr>
                    <th>Topic</th>
                    <th>Slug</th>
                    <th>Pieces</th>
                  </tr>
                </thead>
                <tbody>
                  {topics.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <Link href={`/topic/${t.slug}`}>{t.name}</Link>
                      </td>
                      <td>/topic/{t.slug}</td>
                      <td className="num">{t._count.posts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <form action={createTopic} className="form">
            <div className="section-head" style={{ marginBottom: 18 }}>
              <h2>Add a topic</h2>
            </div>
            <p className="help" style={{ marginBottom: 18 }}>
              Each topic becomes an indexable page at /topic/slug. Add them slowly — a topic page
              with two pieces on it is a thin page, not a landing page.
            </p>
            <div className="field">
              <label htmlFor="tname">Name</label>
              <input id="tname" name="name" maxLength={40} required />
            </div>
            <div className="field">
              <label htmlFor="tdesc">Description</label>
              <p className="help">Shown on the topic page and used as its meta description.</p>
              <input id="tdesc" name="description" maxLength={200} />
            </div>
            <button className="btn primary" type="submit">
              Add topic
            </button>
          </form>
        </>
      )}

      {tab === "settings" && (
        <form action={updateSettings} className="form">
          <div className="field">
            <label htmlFor="name">Publication name</label>
            <input id="name" name="name" defaultValue={settings.name} maxLength={40} />
          </div>
          <div className="field">
            <label htmlFor="tagline">Tagline</label>
            <p className="help">Sits under the name and is the site&rsquo;s meta description.</p>
            <input id="tagline" name="tagline" defaultValue={settings.tagline} maxLength={200} />
          </div>
          <div className="field">
            <label htmlFor="about">About page</label>
            <p className="help">Markdown. Say who edits this and what you&rsquo;re looking for.</p>
            <textarea id="about" name="about" rows={14} defaultValue={settings.about} />
          </div>
          <button className="btn primary" type="submit">
            Save changes
          </button>
        </form>
      )}
    </>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="empty">
      <h2>{title}</h2>
      <p>{body}</p>
    </div>
  );
}

function QueueCard({ post }: { post: any }) {
  const { html } = renderMarkdown(post.body);
  const takeaways = parseLines(post.keyTakeaways);
  const faq = parseFaq(post.faq);

  return (
    <div className="card pending">
      <div className="card-head">
        <div>
          <h3>{post.title}</h3>
          <div className="byline" style={{ marginTop: 0 }}>
            <Link href={`/author/${post.author.handle}`}>
              {post.author.name || `@${post.author.handle}`}
            </Link>
            <Sep />
            <span>{KIND_LABEL[post.kind]}</span>
            <Sep />
            <span>{formatDate(post.submittedAt)}</span>
            <Sep />
            <span>{readingTime(post.body)}</span>
          </div>
        </div>
        <span className="status pending">in queue</span>
      </div>

      {post.subtitle && <p className="sub" style={{ marginTop: 12 }}>{post.subtitle}</p>}

      <div className="note-box">
        <strong>Structure: </strong>
        {post.topics.length} topics &middot; {takeaways.length} takeaways &middot; {faq.length} FAQ
        entries &middot; {parseLines(post.sources).length} sources
        {post.author.bio ? "" : " \u00b7 author has no bio"}
      </div>

      <details style={{ marginTop: 16 }}>
        <summary className="summary-link">Read it as published</summary>
        <div className="preview" dangerouslySetInnerHTML={{ __html: html }} />
      </details>

      <form action={approvePost} style={{ marginTop: 18 }}>
        <input type="hidden" name="id" value={post.id} />
        <div className="field">
          <label htmlFor={`t-${post.id}`}>Title</label>
          <input id={`t-${post.id}`} name="title" defaultValue={post.title} maxLength={120} />
        </div>
        <div className="field">
          <label htmlFor={`s-${post.id}`}>Subtitle</label>
          <input id={`s-${post.id}`} name="subtitle" defaultValue={post.subtitle} maxLength={200} />
        </div>
        <details>
          <summary className="summary-link">Edit the body before approving</summary>
          <div className="field" style={{ marginTop: 12 }}>
            <textarea name="body" rows={18} defaultValue={post.body} />
          </div>
        </details>
        <button className="btn primary" type="submit" style={{ marginTop: 14 }}>
          Approve and publish
        </button>
      </form>

      <form action={rejectPost} style={{ marginTop: 18 }}>
        <input type="hidden" name="id" value={post.id} />
        <div className="field">
          <label htmlFor={`r-${post.id}`}>Send it back with a note</label>
          <p className="help">
            The writer sees this and can fix and resubmit. A real reason beats silence.
          </p>
          <input id={`r-${post.id}`} name="reviewNote" maxLength={600} />
        </div>
        <button className="btn danger" type="submit">
          Reject
        </button>
      </form>
    </div>
  );
}
