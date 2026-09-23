import { prisma } from "@/lib/db";

function base(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s._-]/g, "")
    .trim()
    .replace(/[\s._]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 28);
}

/** Reserved so a handle can never shadow a real route. */
const RESERVED = new Set([
  "about", "explore", "search", "write", "me", "desk", "topic", "topics",
  "author", "publication", "publications", "article", "tutorial", "research",
  "api", "admin", "settings", "login", "signup", "feed", "sitemap", "robots",
]);

export async function uniqueHandle(nameOrEmail: string): Promise<string> {
  const root = base(nameOrEmail.split("@")[0] || "writer") || "writer";
  let candidate = RESERVED.has(root) ? `${root}-1` : root;
  let n = 1;
  while (await prisma.user.findUnique({ where: { handle: candidate }, select: { id: true } })) {
    n += 1;
    candidate = `${root}-${n}`;
  }
  return candidate;
}
