import { toggleFollow } from "@/app/actions";

export default function FollowButton({
  kind,
  targetId,
  following,
  returnTo,
  label = "Follow",
}: {
  kind: "user" | "topic" | "publication";
  targetId: string;
  following: boolean;
  returnTo: string;
  label?: string;
}) {
  return (
    <form action={toggleFollow}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="targetId" value={targetId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button type="submit" className={following ? "btn" : "btn primary"}>
        {following ? "Following" : label}
      </button>
    </form>
  );
}
