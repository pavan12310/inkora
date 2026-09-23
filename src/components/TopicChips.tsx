import Link from "next/link";

type T = { name: string; slug: string };

export default function TopicChips({ topics }: { topics: T[] }) {
  if (!topics.length) return null;
  return (
    <div className="chips">
      {topics.map((t) => (
        <Link key={t.slug} href={`/topic/${t.slug}`} className="chip">
          {t.name}
        </Link>
      ))}
    </div>
  );
}
