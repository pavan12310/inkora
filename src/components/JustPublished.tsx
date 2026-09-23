"use client";

import { useState } from "react";
import ShareRow from "@/components/ShareRow";

/**
 * Shown once, to the author, immediately after a piece goes live.
 *
 * The moment something is published is the only moment a writer reliably wants
 * to share it, and it is the moment a new site most needs them to. Dismissible,
 * and never shown to a reader — it is triggered by a query flag on the redirect
 * from publishing, not by anything stored.
 */
export default function JustPublished({
  url,
  title,
}: {
  url: string;
  title: string;
}) {
  const [gone, setGone] = useState(false);
  if (gone) return null;

  return (
    <div className="just" role="status">
      <button
        type="button"
        className="just-x"
        onClick={() => setGone(true)}
        aria-label="Dismiss"
      >
        &times;
      </button>

      <h2>It&rsquo;s live.</h2>
      <p>
        This piece is published, in the sitemap and in the feed. Search engines
        will find it on their own schedule — sharing it is what gets it read this
        week.
      </p>

      <ShareRow url={url} title={title} />
    </div>
  );
}
