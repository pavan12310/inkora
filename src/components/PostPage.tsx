import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { cardSelect } from "@/lib/queries";
import { currentUser } from "@/lib/auth";
import { getSettings, siteUrl } from "@/lib/settings";
import {
  renderMarkdown, readingTime, excerpt, parseLines, parseFaq, parseCsv,
} from "@/lib/markdown";
import { engagementFor, isFollowingUser } from "@/lib/social";
import { listRelated } from "@/lib/queries";
import { postHref, KIND_LABEL } from "@/lib/types";
import { Sep, formatDate, compact } from "@/components/Byline";
import TopicChips from "@/components/TopicChips";
import { Avatar, PubTile } from "@/components/Icon";
import StoryList from "@/components/StoryList";
import PubGrid from "@/components/PubGrid";
import Engage from "@/components/Engage";
import ShareRow from "@/components/ShareRow";
import JustPublished from "@/components/JustPublished";
import Comments from "@/components/Comments";
import FollowButton from "@/components/FollowButton";
import ViewBeacon from "@/components/ViewBeacon";

export async function loadPost(kind: string, slug: string) {
  return prisma.post.findFirst({
    where: { slug, kind, status: "PUBLISHED" },
    include: {
      author: true,
      publication: true,
      topics: { include: { topic: true } },
      comments: {
        where: { hidden: false },
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true, handle: true } } },
      },
    },
  });
}

export default async function PostPage({
  kind,
  slug,
  justPublished = false,
}: {
  kind: string;
  slug: string;
  /** Set by the redirect after publishing, so only the author sees it, once. */
  justPublished?: boolean;
}) {
  const post = await loadPost(kind, slug);
  if (!post) notFound();

  const [settings, viewer] = await Promise.all([getSettings(), currentUser()]);
  const [authorFollowers, authorPosts, pubFollowers, moreByAuthor] = await Promise.all([
    prisma.follow.count({ where: { userId: post.authorId } }),
    prisma.post.count({ where: { authorId: post.authorId, status: "PUBLISHED" } }),
    post.publicationId
      ? prisma.follow.count({ where: { publicationId: post.publicationId } })
      : Promise.resolve(0),
    prisma.post.findMany({
      where: {
        authorId: post.authorId,
        status: "PUBLISHED",
        id: { not: post.id },
      },
      orderBy: { publishedAt: "desc" },
      take: 4,
      select: cardSelect,
    }),
  ]);

  const [engagement, following, related] = await Promise.all([
    engagementFor(post.id, viewer?.id),
    isFollowingUser(viewer?.id, post.authorId),
    listRelated(post.id, post.topics.map((t) => t.topicId)),
  ]);

  const { html, toc } = renderMarkdown(post.body);
  const takeaways = parseLines(post.keyTakeaways);
  const faq = parseFaq(post.faq);
  const sources = parseLines(post.sources);
  const tools = parseCsv(post.tools);
  const url = `${siteUrl()}${postHref(post.kind, post.slug)}`;
  const description = post.metaDescription || post.subtitle || excerpt(post.body);

  // Schema varies by content type. A tutorial marked up as HowTo and research
  // marked up as ScholarlyArticle both describe themselves far better to
  // crawlers and language models than a generic Article would.
  const schemaType =
    post.kind === "TUTORIAL" ? "HowTo" : post.kind === "RESEARCH" ? "ScholarlyArticle" : "Article";

  const graph: Record<string, unknown>[] = [
    {
      "@type": schemaType,
      "@id": `${url}#content`,
      headline: post.title,
      name: post.title,
      description,
      ...(post.coverImage ? { image: post.coverImage } : {}),
      datePublished: post.publishedAt?.toISOString(),
      dateModified: (post.updatedAt ?? post.publishedAt)?.toISOString(),
      author: {
        "@type": "Person",
        name: post.author.name || post.author.handle,
        url: `${siteUrl()}/author/${post.author.handle}`,
        ...(post.author.expertise ? { knowsAbout: parseCsv(post.author.expertise) } : {}),
      },
      publisher: { "@id": `${siteUrl()}/#organization` },
      mainEntityOfPage: url,
      ...(post.kind === "RESEARCH" && post.abstract ? { abstract: post.abstract } : {}),
      ...(post.kind === "TUTORIAL" && tools.length
        ? { tool: tools.map((t) => ({ "@type": "HowToTool", name: t })) }
        : {}),
      ...(sources.length ? { citation: sources } : {}),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: siteUrl() },
        {
          "@type": "ListItem",
          position: 2,
          name: KIND_LABEL[post.kind],
          item: `${siteUrl()}/explore?kind=${post.kind}`,
        },
        { "@type": "ListItem", position: 3, name: post.title, item: url },
      ],
    },
  ];

  if (faq.length) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    });
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@graph": graph }) }}
      />
      <ViewBeacon postId={post.id} />

      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span aria-hidden="true">/</span>
        <Link href={`/explore?kind=${post.kind}`}>{KIND_LABEL[post.kind]}</Link>
      </nav>

      <article className="article">
        {post.topics.length > 0 && (
          <div className="top-topics">
            <TopicChips topics={post.topics.map((t) => t.topic)} />
          </div>
        )}

        <div className="card-eyebrow">
          <span className={`kind kind-${post.kind.toLowerCase()}`}>{KIND_LABEL[post.kind]}</span>
          {post.publication && (
            <Link href={`/publication/${post.publication.slug}`} className="pub-link">
              {post.publication.name}
            </Link>
          )}
        </div>

        <h1>{post.title}</h1>
        {post.subtitle && <p className="standfirst">{post.subtitle}</p>}

        <div className="article-meta">
          <Link href={`/author/${post.author.handle}`} className="meta-face" aria-hidden="true" tabIndex={-1}>
            <Avatar name={post.author.name} handle={post.author.handle} image={post.author.image} size="md" />
          </Link>
          <Link href={`/author/${post.author.handle}`} className="author-link">
            {post.author.name || `@${post.author.handle}`}
          </Link>
          <Sep />
          <time dateTime={post.publishedAt?.toISOString()}>{formatDate(post.publishedAt)}</time>
          <Sep />
          <span>{readingTime(post.body)}</span>
          <Sep />
          <span>{compact(post.views)} views</span>
          {viewer && viewer.id !== post.authorId && (
            <span style={{ marginLeft: "auto" }}>
              <FollowButton
                kind="user"
                targetId={post.authorId}
                following={following}
                returnTo={postHref(post.kind, post.slug)}
              />
            </span>
          )}
        </div>

        {/* Medium repeats the actions above the piece: a reader who already
            knows they want to save or share should not have to scroll first. */}
        <div className="top-acts">
          <Engage
            postId={post.id}
            likes={engagement.likes}
            liked={engagement.liked}
            bookmarked={engagement.bookmarked}
            signedIn={Boolean(viewer)}
          />
          <a href="#responses" className="act-link">
            {post.comments.length} {post.comments.length === 1 ? "response" : "responses"}
          </a>
        </div>

        {post.coverImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="cover" src={post.coverImage} alt="" />
        )}

        {post.kind === "TUTORIAL" && (post.difficulty || post.timeRequired || tools.length) && (
          <dl className="facts">
            {post.difficulty && (
              <div>
                <dt>Difficulty</dt>
                <dd>{post.difficulty.toLowerCase()}</dd>
              </div>
            )}
            {post.timeRequired && (
              <div>
                <dt>Time</dt>
                <dd>{post.timeRequired}</dd>
              </div>
            )}
            {tools.length > 0 && (
              <div>
                <dt>Tools</dt>
                <dd>{tools.join(", ")}</dd>
              </div>
            )}
          </dl>
        )}

        {post.kind === "RESEARCH" && post.abstract && (
          <section className="abstract">
            <h2>Abstract</h2>
            <p>{post.abstract}</p>
          </section>
        )}

        {takeaways.length > 0 && (
          <section className="takeaways">
            <h2>Key takeaways</h2>
            <ul>
              {takeaways.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </section>
        )}

        {toc.length >= 3 && (
          <nav className="toc" aria-label="On this page">
            <h2>On this page</h2>
            <ol>
              {toc.map((h) => (
                <li key={h.id} className={h.level === 3 ? "sub" : ""}>
                  <a href={`#${h.id}`}>{h.text}</a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        {/* Sanitised in renderMarkdown. Never render submitted HTML unsanitised. */}
        <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />

        {post.kind === "RESEARCH" && post.methodology && (
          <section className="abstract">
            <h2>Methodology</h2>
            <p>{post.methodology}</p>
          </section>
        )}

        {faq.length > 0 && (
          <section className="faq">
            <h2>Frequently asked questions</h2>
            {faq.map((f, i) => (
              <details key={i}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </section>
        )}

        {sources.length > 0 && (
          <section className="sources">
            <h2>Sources</h2>
            <ol>
              {sources.map((s, i) => (
                <li key={i}>
                  {/^https?:\/\//i.test(s) ? (
                    <a href={s} rel="ugc nofollow noopener" target="_blank">
                      {s}
                    </a>
                  ) : (
                    s
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}

        <TopicChips topics={post.topics.map((t) => t.topic)} />

        <Engage
          postId={post.id}
          likes={engagement.likes}
          liked={engagement.liked}
          bookmarked={engagement.bookmarked}
          signedIn={Boolean(viewer)}
        />

        {justPublished && viewer?.id === post.authorId && (
          <JustPublished url={url} title={post.title} />
        )}

        <ShareRow url={url} title={post.title} />

        <div className="author-note">
          <div className="wrote-head">
            <Avatar name={post.author.name} handle={post.author.handle} image={post.author.image} size="lg" />
            <div>
              <h2>Written by {post.author.name || `@${post.author.handle}`}</h2>
              <span className="wrote-figs">
                {compact(authorFollowers)} {authorFollowers === 1 ? "follower" : "followers"}
                <Sep />
                {compact(authorPosts)} published
              </span>
            </div>
            {viewer && viewer.id !== post.authorId && (
              <span className="wrote-follow">
                <FollowButton
                  kind="user"
                  targetId={post.authorId}
                  following={following}
                  returnTo={postHref(post.kind, post.slug)}
                />
              </span>
            )}
          </div>
          {post.author.bio}
          {post.author.website && (
            <>
              {" "}
              <a
                href={/^https?:\/\//i.test(post.author.website) ? post.author.website : `https://${post.author.website}`}
                rel="ugc nofollow noopener"
                target="_blank"
              >
                {post.author.website}
              </a>
            </>
          )}
          <div style={{ marginTop: 12 }}>
            <Link href={`/author/${post.author.handle}`} className="btn">
              More from this author
            </Link>
          </div>
        </div>
        {post.publication && (
          <div className="pub-note">
            <div className="wrote-head">
              <PubTile name={post.publication.name} slug={post.publication.slug} />
              <div>
                <h2>
                  Published in{" "}
                  <Link href={`/publication/${post.publication.slug}`}>
                    {post.publication.name}
                  </Link>
                </h2>
                <span className="wrote-figs">
                  {compact(pubFollowers)} {pubFollowers === 1 ? "follower" : "followers"}
                </span>
              </div>
            </div>
            {post.publication.description && <p>{post.publication.description}</p>}
          </div>
        )}
      </article>

      <span id="responses" />
      <Comments
        postId={post.id}
        comments={post.comments}
        viewerId={viewer?.id}
        isAdmin={Boolean(viewer?.isAdmin)}
      />

      {moreByAuthor.length > 0 && (
        <section style={{ marginTop: 48 }}>
          <div className="section-head">
            <h2>More from {post.author.name || `@${post.author.handle}`}</h2>
            <Link href={`/author/${post.author.handle}`} className="count">
              See all
            </Link>
          </div>
          <PubGrid posts={moreByAuthor} />
        </section>
      )}

      {related.length > 0 && (
        <section style={{ marginTop: 48 }}>
          <div className="section-head">
            <h2>Related reading</h2>
          </div>
          <StoryList posts={related} />
        </section>
      )}
    </>
  );
}

export async function postMetadata(kind: string, slug: string) {
  const post = await loadPost(kind, slug);
  if (!post) return { title: "Not found", robots: { index: false } };

  const description = post.metaDescription || post.subtitle || excerpt(post.body);
  const settings = await getSettings();

  return {
    title: post.seoTitle || post.title,
    description,
    alternates: { canonical: postHref(post.kind, post.slug) },
    openGraph: {
      title: post.seoTitle || post.title,
      description,
      type: "article" as const,
      url: `${siteUrl()}${postHref(post.kind, post.slug)}`,
      siteName: settings.name,
      publishedTime: post.publishedAt?.toISOString(),
      authors: [post.author.name || post.author.handle],
      // Setting openGraph at all replaces the site-wide default, so a piece
      // with no cover was sharing with no image — a bare grey box in LinkedIn,
      // Slack and WhatsApp. Fall back to the generated site card.
      images: [post.coverImage || `${siteUrl()}/opengraph-image`],
    },
    twitter: {
      card: "summary_large_image" as const,
      title: post.seoTitle || post.title,
      description,
    },
  };
}
