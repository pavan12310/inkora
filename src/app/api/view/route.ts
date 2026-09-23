import { prisma } from "@/lib/db";

/**
 * View counter. Called by a beacon on the post page rather than incremented
 * during render, so post pages stay cacheable and statically generated.
 *
 * Two writes: the lifetime counter on the post, which cards read directly, and
 * a per-day row, which the stats chart reads. Keeping the lifetime total
 * denormalised avoids summing the daily table on every card render.
 */
export async function POST(req: Request) {
  try {
    const { id } = (await req.json()) as { id?: string };
    if (!id) return new Response(null, { status: 400 });

    // UTC, so a reader's timezone cannot shift a view into another day and the
    // chart's buckets line up with what the stats page labels them.
    const day = new Date().toISOString().slice(0, 10);

    const post = await prisma.post.findFirst({
      where: { id, status: "PUBLISHED" },
      select: { id: true },
    });
    if (!post) return new Response(null, { status: 204 });

    await prisma.$transaction([
      prisma.post.update({ where: { id }, data: { views: { increment: 1 } } }),
      prisma.postDay.upsert({
        where: { postId_day: { postId: id, day } },
        create: { postId: id, day, views: 1 },
        update: { views: { increment: 1 } },
      }),
    ]);

    return new Response(null, { status: 204 });
  } catch {
    // A failed count must never surface to a reader mid-article.
    return new Response(null, { status: 204 });
  }
}
