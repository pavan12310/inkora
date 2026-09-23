import Link from "next/link";
import { postHref } from "@/lib/types";
import { readingTime } from "@/lib/markdown";
import { formatDate } from "@/components/Byline";
import { Avatar } from "@/components/Icon";

type Item = {
  id: string;
  kind: string;
  slug: string;
  title: string;
  subtitle: string;
  body: string;
  coverImage: string | null;
  publishedAt: Date | null;
  author: { name: string | null; handle: string; image: string | null };
};

/**
 * A publication's own pieces, as a grid rather than the site-wide feed list.
 *
 * A publication page is a front page: a reader arriving has no history with it
 * and is choosing what to read by looking. Cover images carry that choice, so
 * they lead, and the row layout used elsewhere would bury them.
 */
export default function PubGrid({ posts }: { posts: Item[] }) {
  return (
    <ul className="pub-grid">
      {posts.map((p) => (
        <li key={p.id} className="pub-card">
          <Link href={postHref(p.kind, p.slug)} className="pub-card-img">
            {p.coverImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.coverImage} alt="" loading="lazy" />
            ) : (
              <span className="pub-card-blank" aria-hidden="true" />
            )}
          </Link>

          <h3>
            <Link href={postHref(p.kind, p.slug)}>{p.title}</Link>
          </h3>
          {p.subtitle && <p>{p.subtitle}</p>}

          <div className="pub-card-cred">
            <Avatar name={p.author.name} handle={p.author.handle} image={p.author.image} />
            <Link href={`/author/${p.author.handle}`} className="name">
              {p.author.name || `@${p.author.handle}`}
            </Link>
            <span className="sep" aria-hidden="true">&middot;</span>
            <span>{formatDate(p.publishedAt)}</span>
            <span className="sep" aria-hidden="true">&middot;</span>
            <span>{readingTime(p.body)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
