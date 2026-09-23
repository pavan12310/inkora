import { toggleLike, toggleBookmark } from "@/app/actions";
import { compact } from "@/components/Byline";

export default function Engage({
  postId,
  likes,
  liked,
  bookmarked,
  signedIn,
}: {
  postId: string;
  likes: number;
  liked: boolean;
  bookmarked: boolean;
  signedIn: boolean;
}) {
  if (!signedIn) {
    return (
      <div className="engage">
        <span className="muted-note" style={{ margin: 0 }}>
          {compact(likes)} {likes === 1 ? "like" : "likes"} &middot; sign in to like or save
        </span>
      </div>
    );
  }

  return (
    <div className="engage">
      <form action={toggleLike}>
        <input type="hidden" name="postId" value={postId} />
        <button type="submit" className={`icon-btn ${liked ? "on" : ""}`}>
          {liked ? "Liked" : "Like"} <span className="num">{compact(likes)}</span>
        </button>
      </form>
      <form action={toggleBookmark}>
        <input type="hidden" name="postId" value={postId} />
        <button type="submit" className={`icon-btn ${bookmarked ? "on" : ""}`}>
          {bookmarked ? "Saved" : "Save"}
        </button>
      </form>
    </div>
  );
}
