import Link from "next/link";
import type { Metadata } from "next";
import { searchEverything } from "@/lib/queries";
import StoryList from "@/components/StoryList";

export const dynamic = "force-dynamic";

// A search results page should never be indexed: it generates unlimited
// near-duplicate URLs, which is exactly what thin-content filters look for.
export const metadata: Metadata = {
  title: "Search",
  robots: { index: false, follow: true },
};

export default async function SearchPage(
  { searchParams }: { searchParams: Promise<{ q?: string }> }
) {
  const { q = "" } = await searchParams;
  const results = await searchEverything(q);
  const total =
    results.posts.length + results.authors.length + results.publications.length + results.topics.length;

  return (
    <>
      <div className="section-head">
        <h1>Search</h1>
        {q && <span className="count">{total} {total === 1 ? "result" : "results"}</span>}
      </div>

      <form className="searchbox page" action="/search">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z" />
          <path d="m16.2 16.2 4.3 4.3" />
        </svg>
        <input type="search" name="q" defaultValue={q} placeholder="Search Inkora" aria-label="Search" />
      </form>

      {!q ? (
        <p className="muted-note">Search across everything published here.</p>
      ) : total === 0 ? (
        <p className="muted-note">Nothing matched &ldquo;{q}&rdquo;.</p>
      ) : (
        <>
          {results.topics.length > 0 && (
            <section style={{ marginTop: 28 }}>
              <div className="section-head">
                <h2>Topics</h2>
              </div>
              <div className="chips" style={{ marginTop: 14 }}>
                {results.topics.map((t) => (
                  <Link key={t.slug} href={`/topic/${t.slug}`} className="chip">
                    {t.name}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {results.authors.length > 0 && (
            <section style={{ marginTop: 28 }}>
              <div className="section-head">
                <h2>Authors</h2>
              </div>
              <ul className="index">
                {results.authors.map((a) => (
                  <li key={a.handle} className="card-row">
                    <div className="card-main">
                      <Link href={`/author/${a.handle}`} className="entry">
                        <h3>{a.name || `@${a.handle}`}</h3>
                        {a.bio && <p>{a.bio}</p>}
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {results.publications.length > 0 && (
            <section style={{ marginTop: 28 }}>
              <div className="section-head">
                <h2>Publications</h2>
              </div>
              <ul className="index">
                {results.publications.map((p) => (
                  <li key={p.slug} className="card-row">
                    <div className="card-main">
                      <Link href={`/publication/${p.slug}`} className="entry">
                        <h3>{p.name}</h3>
                        {p.description && <p>{p.description}</p>}
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {results.posts.length > 0 && (
            <section style={{ marginTop: 28 }}>
              <div className="section-head">
                <h2>Pieces</h2>
                <span className="count">{results.posts.length} {results.posts.length === 1 ? "piece" : "pieces"}</span>
              </div>
              <StoryList posts={results.posts} />
            </section>
          )}
        </>
      )}
    </>
  );
}
