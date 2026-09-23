/**
 * Shown the instant a search is submitted. Without it the previous page stayed
 * on screen while the query ran, and the site looked like it had ignored you.
 */
export default function SearchLoading() {
  return (
    <div className="searching" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>Searching\u2026</span>
    </div>
  );
}
