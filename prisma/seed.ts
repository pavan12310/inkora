/**
 * First-run seed.
 *
 * A fresh install has no topics, which means nothing can be tagged, which
 * means no topic pages exist and the first writer hits a dead end. This
 * fixes that. Safe to re-run: it only creates what is missing.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TOPICS = [
  ["SEO", "Organic search, technical and editorial."],
  ["AI", "Language models, and how discovery is changing because of them."],
  ["Growth", "Getting work in front of the people it is for."],
  ["Writing", "Craft, editing and publishing."],
  ["Startups", "Building small things that work."],
  ["Engineering", "How things are actually built and kept running."],
  ["Design", "Interfaces, type and the decisions behind them."],
  ["Data", "Measurement, analysis and the traps in both."],
];

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
}

async function main() {
  for (const [name, description] of TOPICS) {
    await prisma.topic.upsert({
      where: { slug: slugify(name) },
      create: { name, slug: slugify(name), description },
      update: {},
    });
  }

  const defaults: Record<string, string> = {
    name: "Inkora",
    tagline: "A publishing platform for people who create, discover and grow through knowledge.",
  };
  for (const [key, value] of Object.entries(defaults)) {
    await prisma.setting.upsert({ where: { key }, create: { key, value }, update: {} });
  }

  const topics = await prisma.topic.count();
  console.log(`Seeded. ${topics} topics available.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
