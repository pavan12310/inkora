import { prisma } from "@/lib/db";

export function slugify(input: string, max = 70): string {
  return (
    input
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, max)
      .replace(/^-|-$/g, "") || "untitled"
  );
}

/**
 * Post slugs are minted once, when a draft is first created, and never change
 * afterwards — not even if the title is edited. A changed URL is a lost ranking.
 */
export async function uniquePostSlug(title: string): Promise<string> {
  const root = slugify(title);
  let candidate = root;
  let n = 1;
  while (await prisma.post.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    n += 1;
    candidate = `${root}-${n}`;
  }
  return candidate;
}

export async function uniquePublicationSlug(name: string): Promise<string> {
  const root = slugify(name, 40);
  let candidate = root;
  let n = 1;
  while (
    await prisma.publication.findUnique({ where: { slug: candidate }, select: { id: true } })
  ) {
    n += 1;
    candidate = `${root}-${n}`;
  }
  return candidate;
}
