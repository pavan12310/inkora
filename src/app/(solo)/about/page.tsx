import Link from "next/link";
import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { renderMarkdown } from "@/lib/markdown";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return { title: "About", description: s.tagline, alternates: { canonical: "/about" } };
}

export default async function AboutPage() {
  const s = await getSettings();
  const { html } = renderMarkdown(s.about);

  return (
    <>
      <div className="section-head">
        <h1>About {s.name}</h1>
      </div>
      <div className="article" style={{ marginTop: 26 }}>
        <div className="prose" style={{ marginTop: 0 }} dangerouslySetInnerHTML={{ __html: html }} />
        <div className="btn-row" style={{ marginTop: 32 }}>
          <Link href="/write" className="btn primary">
            Write something
          </Link>
          <Link href="/explore" className="btn">
            Explore
          </Link>
        </div>
      </div>
    </>
  );
}
