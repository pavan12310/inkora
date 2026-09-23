import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { listPublished } from "@/lib/queries";
import { isFollowingUser } from "@/lib/social";
import { siteUrl } from "@/lib/settings";
import { parseCsv } from "@/lib/markdown";
import { compact } from "@/components/Byline";
import StoryList from "@/components/StoryList";
import FollowButton from "@/components/FollowButton";

export const revalidate = 1800;

export async function generateStaticParams() {
  const users = await prisma.user.findMany({
    where: { posts: { some: { status: "PUBLISHED" } } },
    select: { handle: true },
  });
  return users.map((u) => ({ handle: u.handle }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ handle: string }> }
): Promise<Metadata> {
  const { handle } = await params;
  const user = await prisma.user.findUnique({ where: { handle } });
  if (!user) return { title: "Not found", robots: { index: false } };

  const name = user.name || `@${user.handle}`;
  return {
    title: name,
    description: user.bio || `Writing by ${name} on Inkora.`,
    alternates: { canonical: `/author/${user.handle}` },
    openGraph: { type: "profile", title: name, description: user.bio },
  };
}

export default async function AuthorPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const author = await prisma.user.findUnique({
    where: { handle },
    include: {
      _count: { select: { followers: true, following: true } },
      publications: { select: { name: true, slug: true, description: true } },
    },
  });
  if (!author) notFound();

  const [posts, viewer] = await Promise.all([
    listPublished({ authorHandle: handle, take: 50 }),
    currentUser(),
  ]);
  const following = await isFollowingUser(viewer?.id, author.id);
  const expertise = parseCsv(author.expertise);

  const sameAs = [author.website, author.twitter, author.linkedin].filter(Boolean).map((u) =>
    /^https?:\/\//i.test(u) ? u : `https://${u}`
  );

  // Person schema with sameAs and knowsAbout. This is the entity signal that
  // ties a byline to a real identity across the web.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${siteUrl()}/author/${author.handle}#person`,
    name: author.name || author.handle,
    url: `${siteUrl()}/author/${author.handle}`,
    ...(author.image ? { image: author.image } : {}),
    ...(author.bio ? { description: author.bio } : {}),
    ...(author.location ? { homeLocation: author.location } : {}),
    ...(expertise.length ? { knowsAbout: expertise } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };

  const totalViews = posts.reduce((n, p) => n + p.views, 0);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="profile">
        {author.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="avatar" src={author.image} alt="" />
        )}
        <div>
          <h1>{author.name || `@${author.handle}`}</h1>
          <p className="handle">@{author.handle}</p>
          {author.bio && <p className="bio">{author.bio}</p>}

          {expertise.length > 0 && (
            <div className="chips" style={{ marginTop: 12 }}>
              {expertise.map((e) => (
                <span key={e} className="chip static">
                  {e}
                </span>
              ))}
            </div>
          )}

          <div className="byline" style={{ marginTop: 14 }}>
            <span>
              <strong>{posts.length}</strong> published
            </span>
            <span className="sep" aria-hidden="true">·</span>
            <span>
              <strong>{compact(author._count.followers)}</strong> followers
            </span>
            <span className="sep" aria-hidden="true">·</span>
            <span>
              <strong>{compact(totalViews)}</strong> views
            </span>
            {author.location && (
              <>
                <span className="sep" aria-hidden="true">·</span>
                <span>{author.location}</span>
              </>
            )}
          </div>

          <div className="btn-row" style={{ marginTop: 16 }}>
            {viewer && viewer.id !== author.id && (
              <FollowButton
                kind="user"
                targetId={author.id}
                following={following}
                returnTo={`/author/${author.handle}`}
              />
            )}
            {viewer?.id === author.id && (
              <Link href="/me?tab=profile" className="btn">
                Edit profile
              </Link>
            )}
            {author.website && (
              <a
                className="btn quiet"
                href={/^https?:\/\//i.test(author.website) ? author.website : `https://${author.website}`}
                rel="nofollow noopener"
                target="_blank"
              >
                {author.website}
              </a>
            )}
          </div>
        </div>
      </section>

      {author.publications.length > 0 && (
        <section style={{ marginTop: 36 }}>
          <div className="section-head">
            <h2>Publications</h2>
          </div>
          <div className="chips" style={{ marginTop: 14 }}>
            {author.publications.map((p) => (
              <Link key={p.slug} href={`/publication/${p.slug}`} className="chip">
                {p.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section style={{ marginTop: 36 }}>
        <div className="section-head">
          <h2>Published</h2>
          <span className="count">{posts.length} {posts.length === 1 ? "piece" : "pieces"}</span>
        </div>
        <StoryList posts={posts} empty="Nothing published yet."
          action={{ href: "/explore", label: "Browse what is published" }} />
      </section>
    </>
  );
}
