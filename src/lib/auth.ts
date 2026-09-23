import { cache } from "react";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { uniqueHandle } from "@/lib/handle";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Google, plus a one-time email link when Resend is configured. The link
  // removes passwords, resets and "forgot password" from the build entirely,
  // and it is the only way in for anyone without a Google account.
  //
  // Added conditionally: with no RESEND_API_KEY the provider would render a
  // sign-in form that silently fails, which is worse than not offering it.
  providers: [
    Google,
    ...(process.env.RESEND_API_KEY
      ? [
          Resend({
            apiKey: process.env.RESEND_API_KEY,
            from: process.env.EMAIL_FROM || "onboarding@resend.dev",
          }),
        ]
      : []),
  ],
  session: { strategy: "database" },
  pages: { signIn: "/write" },
  events: {
    // Every new account gets a readable public handle: /author/<handle>.
    async createUser({ user }) {
      if (!user.id) return;
      const handle = await uniqueHandle(user.name || user.email || "writer");
      await prisma.user.update({ where: { id: user.id }, data: { handle } });
    },
  },
});

function adminList(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return adminList().includes(email.toLowerCase());
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  image: string;
  handle: string;
  isAdmin: boolean;
};

/**
 * The signed-in user, with their Inkora profile fields, or null.
 *
 * Wrapped in React's cache() because this is called from the topbar, the left
 * rail, the setup notice, the story list and the page itself — five call sites
 * on the home page alone. Each call is a session lookup plus a user row, so
 * without deduping a single render made ten round trips to the database for
 * one answer. cache() collapses them to one per request.
 */
export const currentUser = cache(async function currentUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.email) return null;

  const row = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true, name: true, image: true, handle: true },
  });
  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    name: row.name ?? "",
    image: row.image ?? "",
    handle: row.handle,
    isAdmin: isAdminEmail(row.email),
  };
});

export async function requireUser(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) throw new Error("Sign in required");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user?.isAdmin) throw new Error("Not authorised");
  return user;
}
