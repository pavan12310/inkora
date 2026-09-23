"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Icon";

/**
 * The bar above the writing canvas.
 *
 * It carries only what a writer needs mid-sentence: where they are, whether
 * their work is safe, and the way out. The status label is the only feedback
 * the editor gives, so it has to be honest — "Saved" appears because a save
 * succeeded, never because one was attempted.
 */
export default function EditorBar({
  siteName,
  status,
  saving,
  savedAt,
  error,
  words,
  ready,
  submitHref,
  user,
}: {
  siteName: string;
  status: string;
  saving: boolean;
  savedAt: number | null;
  error: string | null;
  words: number;
  ready: boolean;
  submitHref: string;
  user: { name: string | null; handle: string; image: string | null };
}) {
  const router = useRouter();

  const label = error
    ? error
    : saving
      ? "Saving\u2026"
      : savedAt
        ? "Saved"
        : words > 0
          ? "Not saved yet"
          : "";

  return (
    <header className="ed-bar">
      <div className="ed-left">
        <Link href="/" className="ed-mark">
          {siteName}
        </Link>
        <span className="ed-status">{status}</span>
        {label && (
          <span className={`ed-save ${error ? "bad" : ""}`} aria-live="polite">
            {label}
          </span>
        )}
        {words > 0 && <span className="ed-words">{words} words</span>}
      </div>

      <div className="ed-right">
        <button
          type="button"
          className={`btn primary pill ${ready ? "" : "inert"}`}
          disabled={!ready}
          onClick={() => router.push(submitHref)}
          title={
            ready
              ? "Set how it appears, then send it to an editor"
              : "Add a title and at least 300 words first"
          }
        >
          Publish
        </button>
        <Link href="/me" className="ed-avatar" aria-label="Your pieces">
          <Avatar name={user.name} handle={user.handle} image={user.image} size="md" />
        </Link>
      </div>
    </header>
  );
}
