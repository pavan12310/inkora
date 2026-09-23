import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { listPublished } from "@/lib/queries";
import { isFollowingTopic } from "@/lib/social";
import { siteUrl } from "@/lib/settings";
import StoryList from "@/components/StoryList";
import FollowButton from "@/components/FollowButton";

export const revalidate = 1800;

export async function generateStaticParams() {
  const topics = await prisma.topic.findMany({ select: { slug: true } });
  return topics.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const topic = await prisma.topic.findUnique({ where: { slug } });
  if (!topic) return { title: "Not found", robots: { index: false } };

  return {
    title: topic.name,
    description:
      topic.description || `Articles, tutorials and research about ${topic.name}.`,
    alternates: { canonical: `/topic/${topic.slug}` },
  };
}

export default async function TopicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const topic = await prisma.topic.findUnique({ where: { slug } });
  if (!topic) notFound();

  const [posts, viewer] = await Promise.all([
    listPublished({ topicSlug: slug, take: 40 }),
    currentUser(),
  ]);
  const following = await isFollowingTopic(viewer?.id, topic.id);

  // CollectionPage schema: says plainly that this is a curated list about one
  // subject, rather than leaving a crawler to infer it from the heading.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: topic.name,
    description: topic.description,
    url: `${siteUrl()}/topic/${topic.slug}`,
    isPartOf: { "@id": `${siteUrl()}/#website` },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="section-head">
        <h1>{topic.name}</h1>
        <span className="count">{posts.length} {posts.length === 1 ? "piece" : "pieces"}</span>
      </div>

      {topic.description && <p className="page-intro">{topic.description}</p>}

      {viewer && (
        <div style={{ margin: "18px 0 8px" }}>
          <FollowButton
            kind="topic"
            targetId={topic.id}
            following={following}
            returnTo={`/topic/${topic.slug}`}
            label="Follow topic"
          />
        </div>
      )}

      <StoryList posts={posts} empty={`Nothing published under ${topic.name} yet.`} />
    </>
  );
}
