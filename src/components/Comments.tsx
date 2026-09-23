import Link from "next/link";
import { addComment, deleteComment } from "@/app/actions";
import { formatDate } from "@/components/Byline";

type C = {
  id: string;
  body: string;
  createdAt: Date;
  userId: string;
  user: { name: string | null; handle: string };
};

export default function Comments({
  postId,
  comments,
  viewerId,
  isAdmin,
}: {
  postId: string;
  comments: C[];
  viewerId?: string;
  isAdmin: boolean;
}) {
  return (
    <section className="comments" id="comments">
      <div className="section-head" style={{ marginBottom: 18 }}>
        <h2>
          {comments.length} {comments.length === 1 ? "response" : "responses"}
        </h2>
      </div>

      {viewerId ? (
        <form action={addComment} className="form" style={{ marginBottom: 28 }}>
          <input type="hidden" name="postId" value={postId} />
          <div className="field" style={{ marginBottom: 10 }}>
            <label htmlFor="c-body">Leave a response</label>
            <textarea id="c-body" name="body" rows={3} maxLength={2000} required />
          </div>
          <button className="btn primary" type="submit">
            Post response
          </button>
        </form>
      ) : (
        <p className="muted-note">
          <Link href="/me">Sign in</Link> to respond.
        </p>
      )}

      {comments.map((c) => (
        <div className="comment" key={c.id}>
          <div className="byline" style={{ marginTop: 0 }}>
            <Link href={`/author/${c.user.handle}`} className="author-link">
              {c.user.name || `@${c.user.handle}`}
            </Link>
            <span className="sep" aria-hidden="true">·</span>
            <span>{formatDate(c.createdAt)}</span>
          </div>
          <p>{c.body}</p>
          {(c.userId === viewerId || isAdmin) && (
            <form action={deleteComment}>
              <input type="hidden" name="id" value={c.id} />
              <button className="btn quiet" type="submit" style={{ fontSize: 13 }}>
                Delete
              </button>
            </form>
          )}
        </div>
      ))}
    </section>
  );
}
