import { cache } from "react";
import { prisma } from "@/lib/db";

export type SiteSettings = { name: string; tagline: string; about: string };

const DEFAULTS: SiteSettings = {
  name: "Inkora",
  tagline: "A publishing platform for people who create, discover and grow through knowledge.",
  about:
    "Inkora is a publishing platform for articles, tutorials and research.\n\n" +
    "Anyone can write here. Every piece is read by an editor before it is published, " +
    "which is why the index stays worth reading.\n\n" +
    "## What gets published\n\n" +
    "First-hand knowledge. Something you did, built, tested, got wrong, or measured. " +
    "Specifics beat takes.\n\n" +
    "## The link policy\n\n" +
    'Links inside a piece carry rel="ugc nofollow". Said up front so nobody submits ' +
    "under a misunderstanding.",
};

/** Deduped per request — the topbar, footer and page all ask for this. */
export const getSettings = cache(async function getSettings(): Promise<SiteSettings> {
  const rows = await prisma.setting.findMany();
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    name: map.name || DEFAULTS.name,
    tagline: map.tagline || DEFAULTS.tagline,
    about: map.about || DEFAULTS.about,
  };
});

export async function saveSettings(s: SiteSettings): Promise<void> {
  await prisma.$transaction(
    (Object.keys(s) as (keyof SiteSettings)[]).map((key) =>
      prisma.setting.upsert({
        where: { key },
        create: { key, value: s[key] },
        update: { value: s[key] },
      })
    )
  );
}

export function siteUrl(): string {
  const given = (process.env.NEXT_PUBLIC_SITE_URL || "").trim();

  // The setup docs use a placeholder host, and it is easy to paste it in
  // literally. A placeholder here is worse than nothing: every canonical tag,
  // sitemap entry and share card would point at a domain that does not
  // resolve, so search engines credit none of it. Both Netlify and Vercel
  // publish the real deployment URL, so prefer that over a known-bad value.
  const placeholder =
    !given ||
    given.includes("your-site-name") ||
    given.includes("yoursite.com") ||
    given.includes("example.com");

  const fallback =
    process.env.URL ||                                  // Netlify, production
    (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
    "http://localhost:3000";

  return (placeholder ? fallback : given).replace(/\/$/, "");
}
