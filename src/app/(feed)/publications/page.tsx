import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { createPublication } from "@/app/actions";
import { PubTile } from "@/components/Icon";
import { compact } from "@/components/Byline";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Publications",
  description: "Named homes for pieces on one subject, each with its own page and submission guidelines.",
  alternates: { canonical: "/publications" },
};

export default async function PublicationsPage() {
  const [pubs, user] = await Promise.all([
    prisma.publication.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { follows: true, posts: true } } },
    }),
    currentUser(),
  ]);

  return (
    <>
      <div className="page-head">
        <h1>Publications</h1>
        <span className="count">{pubs.length} {pubs.length === 1 ? "publication" : "publications"}</span>
      </div>

      <p className="page-intro" style={{ marginBottom: 22 }}>
        A publication is a named home for pieces on one subject, with its own page, its own
        followers and its own submission guidelines. Anyone can start one.
      </p>

      {pubs.length > 0 && (
        <div className="pub-grid">
          {pubs.map((p) => (
            <Link key={p.id} href={`/publication/${p.slug}`} className="pub-card">
              <PubTile name={p.name} slug={p.slug} size={56} />
              <div>
                <h3>{p.name}</h3>
                <p>{p.description}</p>
                <div className="meta-row" style={{ marginTop: 10 }}>
                  <span>{p._count.posts} {p._count.posts === 1 ? "piece" : "pieces"}</span>
                  <span>{compact(p._count.follows)} followers</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!user ? (
        <p className="muted-note">Sign in to start one of your own.</p>
      ) : (
        <>
          <h2 className="sub-head" style={{ marginTop: 38 }}>Start a publication</h2>
          <form action={createPublication} className="form">
            <div className="field">
              <label htmlFor="name">Name</label>
              <input id="name" name="name" maxLength={60} required placeholder="The SEO Brief" />
            </div>
            <div className="field">
              <label htmlFor="description">One-line description</label>
              <input id="description" name="description" maxLength={300} placeholder="What it covers, in one line." />
            </div>
            <div className="field">
              <label htmlFor="about">About</label>
              <p className="help">Markdown. Who runs it and what it is for.</p>
              <textarea id="about" name="about" rows={5} />
            </div>

            <div className="field">
              <label htmlFor="logo">Logo image URL</label>
              <input id="logo" name="logo" type="url" placeholder="https://… (square works best)" />
            </div>

            <div className="field">
              <label htmlFor="coverImage">Cover image URL</label>
              <input
                id="coverImage"
                name="coverImage"
                type="url"
                placeholder="https://… (wide banner, about 1500×400)"
              />
            </div>
            <div className="field">
              <label htmlFor="guidelines">Submission guidelines</label>
              <p className="help">
                What you will and will not publish. Stating this up front is the cheapest
                moderation you will ever do &mdash; most pieces you would reject never get sent.
              </p>
              <textarea id="guidelines" name="guidelines" rows={7} />
            </div>
            <button className="btn primary" type="submit">Create publication</button>
          </form>
        </>
      )}
    </>
  );
}
