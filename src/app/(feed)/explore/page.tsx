import Link from "next/link";
import type { Metadata } from "next";
import { listPublished, listTrending } from "@/lib/queries";
import StoryList from "@/components/StoryList";
import { KIND_LABEL, POST_KINDS } from "@/lib/types";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Explore",
  description: "Trending, latest and most-read articles, tutorials and research.",
  alternates: { canonical: "/explore" },
};

const SORTS = [
  ["trending", "Trending"],
  ["latest", "Latest"],
  ["popular", "Most read"],
] as const;

export default async function ExplorePage(
  { searchParams }: { searchParams: Promise<{ sort?: string; kind?: string }> }
) {
  const sp = await searchParams;
  const sort = (SORTS.map((s) => s[0]) as string[]).includes(sp.sort ?? "")
    ? sp.sort!
    : "trending";
  const kind = (POST_KINDS as readonly string[]).includes(sp.kind ?? "") ? sp.kind : undefined;

  const posts =
    sort === "trending" && !kind
      ? await listTrending(30)
      : await listPublished({
          kind,
          take: 30,
          orderBy: sort === "popular" ? "popular" : "recent",
        });

  const qs = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { sort, kind, ...over };
    if (merged.sort && merged.sort !== "trending") p.set("sort", merged.sort);
    if (merged.kind) p.set("kind", merged.kind);
    const s = p.toString();
    return s ? `/explore?${s}` : "/explore";
  };

  return (
    <>
      <div className="section-head">
        <h1>Explore</h1>
        <span className="count">{posts.length} {posts.length === 1 ? "piece" : "pieces"}</span>
      </div>

      <div className="filters">
        <div className="filter-group">
          {SORTS.map(([k, label]) => (
            <Link key={k} href={qs({ sort: k })} className={sort === k ? "chip on" : "chip"}>
              {label}
            </Link>
          ))}
        </div>
        <div className="filter-group">
          <Link href={qs({ kind: undefined })} className={!kind ? "chip on" : "chip"}>
            Everything
          </Link>
          {POST_KINDS.map((k) => (
            <Link key={k} href={qs({ kind: k })} className={kind === k ? "chip on" : "chip"}>
              {KIND_LABEL[k]}
            </Link>
          ))}
        </div>
      </div>

      <StoryList posts={posts} empty="Nothing has been published yet. Approved pieces appear here first."
        action={{ href: "/write", label: "Write the first piece" }} />
    </>
  );
}
