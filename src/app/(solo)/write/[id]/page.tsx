import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { deleteDraft } from "@/app/actions";
import { KIND_LABEL, STATUS_LABEL, postHref } from "@/lib/types";
import { wordCount } from "@/lib/markdown";
import Editor from "@/components/Editor";

export const metadata: Metadata = {
  title: "Editor",
  robots: { index: false, follow: false },
};

export default async function EditDraftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect("/write");

  const post = await prisma.post.findUnique({
    where: { id },
    include: { topics: true },
  });
  if (!post || post.authorId !== user.id) notFound();

  const [settings, topics, publications] = await Promise.all([
    getSettings(),
    prisma.topic.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.publication.findMany({
      where: { OR: [{ ownerId: user.id }, { members: { some: { userId: user.id } } }] },
      select: { id: true, name: true },
    }),
  ]);

  const editable = post.status === "DRAFT" || post.status === "REJECTED";
  const words = wordCount(post.body);

  return (
    <>
      <div className="section-head">
        <h1>
          {KIND_LABEL[post.kind]} &middot;{" "}
          <span className={`status ${post.status.toLowerCase()}`}>{STATUS_LABEL[post.status]}</span>
        </h1>
        <Link href="/write" className="count">
          All drafts
        </Link>
      </div>

      {post.status === "REJECTED" && post.reviewNote && (
        <div className="banner" style={{ marginTop: 20 }}>
          <strong>From the editor: </strong>
          {post.reviewNote}
        </div>
      )}

      {post.status === "PENDING" && (
        <div className="banner" style={{ marginTop: 20 }}>
          <strong>In review.</strong> You&rsquo;ll see it move once an editor has read it. Editing
          is locked while it waits.
        </div>
      )}

      {post.status === "PUBLISHED" && (
        <div className="banner" style={{ marginTop: 20 }}>
          <strong>Live.</strong>{" "}
          <Link href={postHref(post.kind, post.slug)}>Read it</Link>. Ask an editor to take it down
          if it needs changes.
        </div>
      )}

      {editable ? (
        <>
          <Editor
            draft={{
              id: post.id,
              kind: post.kind,
              status: post.status,
              title: post.title,
              subtitle: post.subtitle,
              coverImage: post.coverImage,
              body: post.body,
              keyTakeaways: post.keyTakeaways,
              faq: post.faq,
              sources: post.sources,
              difficulty: post.difficulty,
              timeRequired: post.timeRequired,
              tools: post.tools,
              abstract: post.abstract,
              methodology: post.methodology,
              seoTitle: post.seoTitle,
              metaDescription: post.metaDescription,
              publicationId: post.publicationId,
              topicIds: post.topics.map((t) => t.topicId),
            }}
            topics={topics}
            publications={publications}
            siteName={settings.name}
            statusLabel={STATUS_LABEL[post.status]}
            viewer={{ name: user.name, handle: user.handle, image: user.image }}
          />

          <div className="submit-bar">
            {/* Goes to the submit screen rather than straight into the queue,
                so the display title, cover and topics get set while the writer
                is still thinking about the piece. */}
            <Link href={`/write/${post.id}/submit`} className="btn primary">
              Review and send
            </Link>
            <span className="muted-note" style={{ margin: 0 }}>
              {!post.title.trim()
                ? "Add a title, then save."
                : words < 300
                  ? `${words} of 300 words. Save to update this.`
                  : "An editor reads it before it goes live."}
            </span>
            <form action={deleteDraft} style={{ marginLeft: "auto" }}>
              <input type="hidden" name="id" value={post.id} />
              <button className="btn danger" type="submit">
                Delete draft
              </button>
            </form>
          </div>
        </>
      ) : (
        <article className="article" style={{ marginTop: 26 }}>
          <h1>{post.title}</h1>
          {post.subtitle && <p className="standfirst">{post.subtitle}</p>}
          <pre className="raw-preview">{post.body}</pre>
        </article>
      )}
    </>
  );
}
