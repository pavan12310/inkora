import Link from "next/link";

export function Sep() {
  return <span className="sep" aria-hidden="true">&middot;</span>;
}

export function formatDate(d: Date | null | undefined): string {
  if (!d) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function compact(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
  return `${(n / 1_000_000).toFixed(1)}m`;
}

export function AuthorLink({
  name,
  handle,
}: {
  name: string | null;
  handle: string;
}) {
  return (
    <Link href={`/author/${handle}`} className="author-link">
      {name || `@${handle}`}
    </Link>
  );
}
