import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { signInWithGoogle, signInWithEmail } from "@/app/auth-actions";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: true },
};

/**
 * One page for both signing up and signing in.
 *
 * There is no separate registration: the first time an address arrives, an
 * account is made for it. That removes passwords, reset flows and a second
 * screen, and it means the button can honestly say the same thing to a new
 * writer and a returning one.
 *
 * `next` carries where the person was heading, so clicking Write while signed
 * out ends in the editor rather than dumping them on the feed.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [user, settings, sp] = await Promise.all([
    currentUser(),
    getSettings(),
    searchParams,
  ]);

  // Only relative paths, so a crafted ?next= cannot bounce someone off-site.
  const raw = sp.next ?? "/";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";

  if (user) redirect(next);

  const emailReady = Boolean(process.env.RESEND_API_KEY);

  return (
    <div className="signin-wrap">
      <div className="signin-card">
        <h1>Join {settings.name}</h1>
        <p className="signin-stand">
          One account to read, write and follow. Nothing is published without an
          editor reading it first.
        </p>

        <form action={signInWithGoogle} className="signin-form">
          <input type="hidden" name="redirectTo" value={next} />
          <button type="submit" className="provider">
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#4285F4" d="M17.6 9.2c0-.6 0-1.2-.2-1.8H9v3.5h4.8a4 4 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.7-4 2.7-6.6Z" />
              <path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.5-1.8.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H.9v2.3A9 9 0 0 0 9 18Z" />
              <path fill="#FBBC05" d="M3.9 10.7a5.4 5.4 0 0 1 0-3.4V5H.9a9 9 0 0 0 0 8l3-2.3Z" />
              <path fill="#EA4335" d="M9 3.6c1.3 0 2.5.5 3.4 1.3L15 2.3A9 9 0 0 0 .9 5l3 2.3C4.6 5.2 6.6 3.6 9 3.6Z" />
            </svg>
            Continue with Google
          </button>
        </form>

        {emailReady ? (
          <>
            <div className="signin-or"><span>or</span></div>
            <form action={signInWithEmail} className="signin-form">
              <input type="hidden" name="redirectTo" value={next} />
              <label className="sr-only" htmlFor="email">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="signin-email"
              />
              <button type="submit" className="provider">
                Email me a sign-in link
              </button>
            </form>
            <p className="signin-alt">
              No password. We send a link that signs you in, and makes an account if
              you do not have one.
            </p>
          </>
        ) : (
          <p className="signin-alt">
            Google is the only way in on this install. Email links need{" "}
            <code>RESEND_API_KEY</code> set.
          </p>
        )}

        <p className="signin-terms">
          By continuing you agree that what you submit may be read and edited by an
          editor before it is published. Read{" "}
          <Link href="/about">what gets published</Link>.
        </p>
      </div>

      <p className="signin-back">
        <Link href="/">&larr; Back to {settings.name}</Link>
      </p>
    </div>
  );
}
