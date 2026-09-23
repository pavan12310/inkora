import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { currentUser } from "@/lib/auth";
import "./globals.css";
import Topbar from "@/components/Topbar";
import LeftRail from "@/components/LeftRail";
import Footer from "@/components/Footer";
import { getSettings, siteUrl } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    metadataBase: new URL(siteUrl()),
    // Google truncates around 60 characters, and the previous title spent all
    // 90 on the tagline — the brand half was cut off in results. The tagline
    // moves to the description, where it has room and does the selling.
    title: { default: `${s.name} \u2014 read before published`, template: `%s \u2014 ${s.name}` },
    description:
      `Every piece on ${s.name} is read by an editor before it goes live. ` +
      `Articles, tutorials and research, with a public record of what gets turned down.`,
    alternates: { canonical: "/", types: { "application/rss+xml": "/feed.xml" } },
    // No url here: set at the root it would claim every page is the homepage,
    // which is what /topics and /about were reporting to crawlers and share
    // cards. Each page's canonical carries the real address.
    openGraph: { siteName: s.name, type: "website" },
    // summary_large_image now that opengraph-image.tsx generates a real card.
    twitter: { card: "summary_large_image" },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [s, viewer, head] = await Promise.all([getSettings(), currentUser(), headers()]);

  // The signed-out home page is a landing page: it gets its own header and a
  // slim footer, because the app rails mean nothing to someone who has not seen
  // the site before. Every other page keeps the normal chrome, signed in or not.
  const path = head.get("x-pathname") ?? "";
  const isLanding = path === "/" && !viewer;

  // The editor is a writing surface, not a page of the app. Rails, search and a
  // footer around a blank canvas are all things to look at instead of writing,
  // so those routes carry their own minimal bar and nothing else.
  const isComposing = /^\/write\/[^/]+$/.test(path) || /^\/write\/[^/]+\/submit$/.test(path);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl()}/#organization`,
        name: s.name,
        url: siteUrl(),
        description: s.tagline,
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl()}/#website`,
        url: siteUrl(),
        name: s.name,
        publisher: { "@id": `${siteUrl()}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: { "@type": "EntryPoint", urlTemplate: `${siteUrl()}/search?q={search_term_string}` },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300..700;1,6..72,300..600&family=IBM+Plex+Sans:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body>
        <a href="#content" className="skip">Skip to content</a>
        {isLanding ? (
          <>
            <header className="mkt-bar">
              <Link href="/" className="mkt-mark">{s.name}.</Link>
              <nav className="mkt-nav">
                <Link href="/about">What gets published</Link>
                <Link href="/record">The record</Link>
                <Link href="/explore">Read</Link>
                <Link href="/signin" className="mkt-quiet">Sign in</Link>
                <Link href="/signin?next=/write" className="btn primary">Get started</Link>
              </nav>
            </header>
            <main id="content">{children}</main>
            <footer className="mkt-foot">
              <Link href="/about">About</Link>
              <Link href="/record">Moderation record</Link>
              <Link href="/topics">Topics</Link>
              <Link href="/feed.xml">RSS</Link>
              <span>&copy; {new Date().getFullYear()} {s.name}</span>
            </footer>
          </>
        ) : isComposing ? (
          <main id="content" className="composing">{children}</main>
        ) : (
          <>
            <Topbar />
            <LeftRail />
            {children}
            <Footer />
          </>
        )}
      </body>
    </html>
  );
}
