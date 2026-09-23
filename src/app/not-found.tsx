import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

/**
 * Lives at the app root, so it renders outside the (feed) and (solo) layouts.
 * Without the .layout wrapper the fixed left rail sat on top of this content
 * and the recovery links were invisible — a dead end with no way out.
 */
export default function NotFound() {
  return (
    <div className="layout solo">
      <main id="content" className="feed">
        <div className="empty">
          <h2>That page isn&rsquo;t here</h2>
          <p>It may have been taken down, or the link is wrong.</p>
          <div className="btn-row">
            <Link href="/" className="btn primary">Home</Link>
            <Link href="/search" className="btn quiet">Search instead</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
