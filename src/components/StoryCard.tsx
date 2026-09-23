import Link from "next/link";
import { postHref } from "@/lib/types";
import { excerpt } from "@/lib/markdown";
import { Avatar } from "@/components/Icon";
import { readingTime } from "@/lib/markdown";
import Icon from "@/components/Icon";
import { toggleLike, toggleBookmark } from "@/app/actions";
import { compact } from "@/components/Byline";

type Story = {
  id: string;
  slug: string;
  kind: string;
  title: string;
  subtitle: string;
  coverImage: string;
  body: string;
  views: number;
  publishedAt: Date | null;
  author: { name: string | null; handle: string; image: string | null };
  publication: { name: string; slug: string } | null;
  topics: { topic: { name: string; slug: string } }[];
  _count: { likes: number; comments: number };
};

function shortDate(d: Date | null) {
  if (!d) return "";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(d);
}

export default function StoryCard({
  post,
  signedIn,
  liked,
  saved,
}: {
  post: Story;
  signedIn: boolean;
  liked?: boolean;
  saved?: boolean;
}) {
  return (
    <li className="story">
      <div className="story-cred">
        <Avatar name={post.author.name} handle={post.author.handle} image={post.author.image} />
        {post.publication && (
          <>
            <span className="in">In</span>
            <Link href={`/publication/${post.publication.slug}`} className="name">
              {post.publication.name}
            </Link>
            <span className="in">by</span>
          </>
        )}
        <Link href={`/author/${post.author.handle}`} className="name">
          {post.author.name || `@${post.author.handle}`}
        </Link>
        <span className="when">{shortDate(post.publishedAt)}</span>
        <span className="sep" aria-hidden="true">·</span>
        <span className="when">{readingTime(post.body)}</span>
        <span className="reviewed" title="Read and approved by an editor before publishing">
          <Icon name="check" size={14} />
          <span>Reviewed</span>
        </span>
      </div>

      <div className="story-main">
        <div className="story-text">
          <Link href={postHref(post.kind, post.slug)}>
            <h3>{post.title || "Untitled"}</h3>
          </Link>
          <p>{post.subtitle || excerpt(post.body, 140)}</p>
        </div>
        {post.coverImage && (
          <Link href={postHref(post.kind, post.slug)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="thumb" src={post.coverImage} alt="" loading="lazy" />
          </Link>
        )}
      </div>

      <div className="actionbar">
        {signedIn ? (
          <form action={toggleLike}>
            <input type="hidden" name="postId" value={post.id} />
            <button type="submit" className={`act ${liked ? "on" : ""}`} aria-label="Like">
              <Icon name="like" size={18} />
              <span className="n">{compact(post._count.likes)}</span>
            </button>
          </form>
        ) : (
          <span className="act">
            <Icon name="like" size={18} />
            <span className="n">{compact(post._count.likes)}</span>
          </span>
        )}

        <Link href={`${postHref(post.kind, post.slug)}#responses`} className="act" aria-label="Responses">
          <Icon name="reply" size={18} />
          <span className="n">{post._count.comments}</span>
        </Link>

        {signedIn && (
          <form action={toggleBookmark} style={{ marginLeft: "auto" }}>
            <input type="hidden" name="postId" value={post.id} />
            <button type="submit" className={`act ${saved ? "on" : ""}`} aria-label={saved ? "Remove from saved" : "Save"}>
              <Icon name="bookmark" size={18} />
            </button>
          </form>
        )}
      </div>
    </li>
  );
}
