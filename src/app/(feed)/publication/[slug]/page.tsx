import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { listPublished } from "@/lib/queries";
import { isFollowingPublication } from "@/lib/social";
import { siteUrl } from "@/lib/settings";
import { renderMarkdown } from "@/lib/markdown";
import { compact } from "@/components/Byline";
import { PubTile, Avatar } from "@/components/Icon";
import StoryList from "@/components/StoryList";
import PubGrid from "@/components/PubGrid";
import FollowButton from "@/components/FollowButton";

export const dynamic = "force-dynamic";

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const pub = await prisma.publication.findUnique({ where: { slug } });
  if (!pub) return { title: "Not found", robots: { index: false } };
  return {
    title: pub.name,
    description: pub.description || `${pub.name} on Inkora.`,
    alternates: { canonical: `/publication/${pub.slug}` },
  };
}

export default async function PublicationPage({
  params, searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { slug } = await params;
  const { tab = "latest" } = await searchParams;

  const pub = await prisma.publication.findUnique({
    where: { slug },
    include: {
      owner: { select: { name: true, handle: true, image: true } },
      members: {
        take: 3,
        select: { user: { select: { name: true, handle: true, image: true } } },
      },
      _count: { select: { follows: true, members: true } },
    },
  });
  if (!pub) notFound();

  const [posts, user] = await Promise.all([
    listPublished({ publicationSlug: slug, take: 40 }),
    currentUser(),
  ]);
  const following = await isFollowingPublication(user?.id, pub.id);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: pub.name,
    description: pub.description,
    url: `${siteUrl()}/publication/${pub.slug}`,
    isPartOf: { "@id": `${siteUrl()}/#website` },
  };

  const TABS: [string, string][] = [
    ["latest", "Latest"],
    ["about", "About"],
    ["guidelines", "Submission guidelines"],
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {pub.coverImage && (
        // Full-bleed banner. Decorative — the name is in the heading below, so
        // announcing the image again would just be noise to a screen reader.
        // eslint-disable-next-line @next/next/no-img-element
        <img className="pub-cover" src={pub.coverImage} alt="" />
      )}

      <section className="pub-head">
        {pub.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="pub-logo" src={pub.logo} alt="" />
        ) : (
          <PubTile name={pub.name} slug={pub.slug} />
        )}
        <div className="pub-meta">
          <h1>{pub.name}</h1>
          <p className="page-intro">{pub.description}</p>
          <div className="pub-figures">
            <span><strong>{compact(pub._count.follows)}</strong> followers</span>
            <span><strong>{pub._count.members}</strong> {pub._count.members === 1 ? "writer" : "writers"}</span>
            <span className="pub-editors">
              <span className="faces">
                <Link href={`/author/${pub.owner.handle}`} title={pub.owner.name ?? pub.owner.handle}>
                  <Avatar name={pub.owner.name} handle={pub.owner.handle} image={pub.owner.image} />
                </Link>
                {pub.members.slice(0, 3).map((m) => (
                  <Link
                    key={m.user.handle}
                    href={`/author/${m.user.handle}`}
                    title={m.user.name ?? m.user.handle}
                  >
                    <Avatar name={m.user.name} handle={m.user.handle} image={m.user.image} />
                  </Link>
                ))}
              </span>
              {pub._count.members + 1} {pub._count.members + 1 === 1 ? "editor" : "editors"}
            </span>
          </div>
        </div>
        {user && (
          <div className="pub-action">
            <FollowButton
              kind="publication"
              targetId={pub.id}
              following={following}
              returnTo={`/publication/${pub.slug}`}
            />
          </div>
        )}
      </section>

      <nav className="feedtabs" style={{ marginTop: 22 }}>
        {TABS.map(([k, label]) => (
          <Link
            key={k}
            href={`/publication/${pub.slug}${k === "latest" ? "" : `?tab=${k}`}`}
            className={tab === k ? "active" : ""}
          >
            {label}
          </Link>
        ))}
      </nav>

      {tab === "about" && (
        <div className="article" style={{ margin: 0 }}>
          <div
            className="prose"
            style={{ marginTop: 24 }}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(pub.about || pub.description).html }}
          />
        </div>
      )}

      {tab === "guidelines" && (
        <div className="article" style={{ margin: 0 }}>
          {user && (
            <div className="banner" style={{ marginTop: 22 }}>
              <strong>Writing for {pub.name}? </strong>
              Start a piece, then choose this publication under Details.
              <span style={{ display: "block", marginTop: 10 }}>
                <Link href="/write" className="btn primary">Start a piece</Link>
              </span>
            </div>
          )}
          <div
            className="prose"
            style={{ marginTop: 22 }}
            dangerouslySetInnerHTML={{
              __html: renderMarkdown(pub.guidelines || "This publication has not published guidelines yet.").html,
            }}
          />
        </div>
      )}

      {tab === "latest" &&
        (posts.length ? (
          <PubGrid posts={posts} />
        ) : (
          <StoryList
            posts={posts}
            empty="Nothing published here yet."
            action={{ href: "/write", label: "Submit to this publication" }}
          />
        ))}
    </>
  );
}
