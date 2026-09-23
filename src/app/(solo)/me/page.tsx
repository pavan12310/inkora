import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { updateProfile, createPublication } from "@/app/actions";
import { KIND_LABEL, STATUS_LABEL, postHref } from "@/lib/types";
import { formatDate, compact } from "@/components/Byline";
import StoryList from "@/components/StoryList";
import { cardSelect } from "@/lib/queries";
import { readingTime } from "@/lib/markdown";

export const metadata: Metadata = {
  title: "Your work",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Tab = "work" | "stats" | "saved" | "profile" | "publications";

export default async function MePage(
  { searchParams }: { searchParams: Promise<{ tab?: string; sent?: string }> }
) {
  const user = await currentUser();
  if (!user) redirect("/write");

  const sp = await searchParams;
  const tab = (["work", "stats", "saved", "profile", "publications"].includes(sp.tab ?? "")
    ? sp.tab
    : "work") as Tab;

  const [profile, posts, bookmarks, publications, followerCount] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id } }),
    prisma.post.findMany({
      where: { authorId: user.id },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { likes: true, comments: true } } },
    }),
    prisma.bookmark.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { post: { select: cardSelect } },
    }),
    prisma.publication.findMany({
      where: { OR: [{ ownerId: user.id }, { members: { some: { userId: user.id } } }] },
      include: { _count: { select: { posts: true, follows: true } } },
    }),
    prisma.follow.count({ where: { userId: user.id } }),
  ]);

  if (!profile) redirect("/write");

  const published = posts.filter((p) => p.status === "PUBLISHED");
  const totals = {
    views: published.reduce((n, p) => n + p.views, 0),
    likes: published.reduce((n, p) => n + p._count.likes, 0),
    comments: published.reduce((n, p) => n + p._count.comments, 0),
  };

  const tabs: [Tab, string][] = [
    ["work", "Your pieces"],
    ["stats", "Analytics"],
    ["saved", "Saved"],
    ["publications", "Publications"],
    ["profile", "Profile"],
  ];

  return (
    <>
      <div className="section-head">
        <h1>Your work</h1>
        <Link href={`/author/${user.handle}`} className="count">
          View public profile
        </Link>
      </div>

      {sp.sent && (
        <div className="banner" style={{ marginTop: 20 }}>
          <strong>Sent for review.</strong> You&rsquo;ll see it move out of the queue once an
          editor has read it.
        </div>
      )}

      <nav className="tabs">
        {tabs.map(([k, label]) => (
          <Link key={k} href={`/me?tab=${k}`} className={tab === k ? "active" : ""}>
            {label}
          </Link>
        ))}
      </nav>

      {tab === "work" && (
        <>
          {posts.length === 0 ? (
            <div className="empty">
              <h2>Nothing written yet</h2>
              <p>Start a piece and it will appear here with its status.</p>
              <Link href="/write" className="btn primary">
                Start writing
              </Link>
            </div>
          ) : (
            posts.map((p) => (
              <div className="card" key={p.id}>
                <div className="card-head">
                  <div>
                    <h3>{p.title || "Untitled"}</h3>
                    <div className="byline" style={{ marginTop: 0 }}>
                      <span>{KIND_LABEL[p.kind]}</span>
                      <span className="sep" aria-hidden="true">·</span>
                      <span>edited {formatDate(p.updatedAt)}</span>
                      {p.status === "PUBLISHED" && (
                        <>
                          <span className="sep" aria-hidden="true">·</span>
                          <span>{compact(p.views)} views</span>
                          <span className="sep" aria-hidden="true">·</span>
                          <span>{p._count.likes} likes</span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className={`status ${p.status.toLowerCase()}`}>
                    {STATUS_LABEL[p.status]}
                  </span>
                </div>

                {p.status === "REJECTED" && p.reviewNote && (
                  <div className="note-box">
                    <strong>From the editor: </strong>
                    {p.reviewNote}
                  </div>
                )}

                <div className="btn-row" style={{ marginTop: 14 }}>
                  {p.status === "PUBLISHED" ? (
                    <Link href={postHref(p.kind, p.slug)} className="btn">
                      Read it
                    </Link>
                  ) : (
                    <Link href={`/write/${p.id}`} className="btn">
                      {p.status === "PENDING" ? "View" : "Continue editing"}
                    </Link>
                  )}
                </div>
              </div>
            ))
          )}
        </>
      )}

      {tab === "stats" && (
        <>
          <div className="stat-grid">
            <div className="stat">
              <span className="n">{compact(totals.views)}</span>
              <span className="l">views</span>
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
              <span className="n">{compact(followerCount)}</span>
              <span className="l">followers</span>
            </div>
            <div className="stat">
              <span className="n">{published.length}</span>
              <span className="l">published</span>
            </div>
          </div>

          {published.length === 0 ? (
            <p className="muted-note">Numbers appear once something is published.</p>
          ) : (
            <div className="scroll-x" style={{ marginTop: 28 }}>
              <table className="data">
                <thead>
                  <tr>
                    <th>Piece</th>
                    <th>Views</th>
                    <th>Likes</th>
                    <th>Responses</th>
                    <th>Length</th>
                  </tr>
                </thead>
                <tbody>
                  {published
                    .sort((a, b) => b.views - a.views)
                    .map((p) => (
                      <tr key={p.id}>
                        <td>
                          <Link href={postHref(p.kind, p.slug)}>{p.title}</Link>
                        </td>
                        <td className="num">{compact(p.views)}</td>
                        <td className="num">{p._count.likes}</td>
                        <td className="num">{p._count.comments}</td>
                        <td className="num">{readingTime(p.body)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="muted-note">
            Views are counted once per browser session. Pair this with Search Console to see which
            queries are actually landing.
          </p>
        </>
      )}

      {tab === "saved" && (
        <StoryList
          posts={bookmarks.map((b) => b.post)}
          empty="Nothing saved. Use Save on any piece to keep it here."
        />
      )}

      {tab === "publications" && (
        <>
          {publications.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              {publications.map((p) => (
                <div className="card" key={p.id}>
                  <div className="card-head">
                    <div>
                      <h3>{p.name}</h3>
                      <p className="sub">{p.description}</p>
                    </div>
                  </div>
                  <div className="byline" style={{ marginTop: 0 }}>
                    <span>{p._count.posts} pieces</span>
                    <span className="sep" aria-hidden="true">·</span>
                    <span>{p._count.follows} followers</span>
                  </div>
                  <div className="btn-row" style={{ marginTop: 14 }}>
                    <Link href={`/publication/${p.slug}`} className="btn">
                      Open
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          <form action={createPublication} className="form">
            <div className="section-head" style={{ marginBottom: 18 }}>
              <h2>Start a publication</h2>
            </div>
            <p className="help" style={{ marginBottom: 18 }}>
              A publication is a named home for pieces on one subject, with its own page and
              followers. You can publish into it from the editor.
            </p>
            <div className="field">
              <label htmlFor="pname">Name</label>
              <input id="pname" name="name" maxLength={60} required />
            </div>
            <div className="field">
              <label htmlFor="pdesc">Description</label>
              <textarea id="pdesc" name="description" rows={3} maxLength={300} />
            </div>
            <button className="btn primary" type="submit">
              Create publication
            </button>
          </form>
        </>
      )}

      {tab === "profile" && (
        <form action={updateProfile} className="form">
          <p className="help" style={{ marginBottom: 20 }}>
            This is your public page at{" "}
            <Link href={`/author/${user.handle}`}>/author/{user.handle}</Link>. Expertise and
            links become Person schema, which is how search engines connect a byline to a real
            person.
          </p>
          <div className="field">
            <label htmlFor="name">Name</label>
            <input id="name" name="name" defaultValue={profile.name ?? ""} maxLength={60} />
          </div>
          <div className="field">
            <label htmlFor="bio">Bio</label>
            <textarea id="bio" name="bio" rows={3} defaultValue={profile.bio} maxLength={280} />
          </div>
          <div className="field">
            <label htmlFor="expertise">Expertise</label>
            <p className="help">Comma separated. Becomes knowsAbout in your Person schema.</p>
            <input
              id="expertise"
              name="expertise"
              defaultValue={profile.expertise}
              placeholder="SEO, Growth Marketing, AI"
              maxLength={160}
            />
          </div>
          <div className="field">
            <label htmlFor="website">Website</label>
            <input id="website" name="website" defaultValue={profile.website} maxLength={120} />
          </div>
          <div className="field">
            <label htmlFor="location">Location</label>
            <input id="location" name="location" defaultValue={profile.location} maxLength={60} />
          </div>
          <div className="field">
            <label htmlFor="twitter">X / Twitter URL</label>
            <input id="twitter" name="twitter" defaultValue={profile.twitter} maxLength={60} />
          </div>
          <div className="field">
            <label htmlFor="linkedin">LinkedIn URL</label>
            <input id="linkedin" name="linkedin" defaultValue={profile.linkedin} maxLength={120} />
          </div>
          <button className="btn primary" type="submit">
            Save profile
          </button>
        </form>
      )}
    </>
  );
}
