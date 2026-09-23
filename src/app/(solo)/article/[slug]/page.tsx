import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import PostPage, { postMetadata } from "@/components/PostPage";

export const revalidate = 3600;

const KIND = "ARTICLE";

export async function generateStaticParams() {
  const posts = await prisma.post.findMany({
    where: { status: "PUBLISHED", kind: KIND },
    select: { slug: true },
  });
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  return postMetadata(KIND, slug) as Promise<Metadata>;
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ just?: string }>;
}) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  return <PostPage kind={KIND} slug={slug} justPublished={sp.just === "1"} />;
}
