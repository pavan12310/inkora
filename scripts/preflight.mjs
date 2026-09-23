/**
 * Runs before the build. Prisma's own error for a missing DATABASE_URL is a
 * wasm validation dump that buries the cause, so check first and say plainly
 * what is missing and where to set it.
 */

const REQUIRED = [
  ["DATABASE_URL", "Your Postgres connection string. Use the POOLED one (Neon: the -pooler host; Supabase: port 6543)."],
  ["AUTH_SECRET", "Session secret. Generate one with: npx auth secret"],
  ["AUTH_GOOGLE_ID", "Google OAuth client ID."],
  ["AUTH_GOOGLE_SECRET", "Google OAuth client secret."],
  ["ADMIN_EMAILS", "Your email address. These accounts get the editor's desk."],
  ["NEXT_PUBLIC_SITE_URL", "Your live URL, no trailing slash. Drives canonical tags, the sitemap and the feed."],
];

// Required only when deployed. Auth.js builds the Google callback from its own
// origin, and behind a serverless proxy it cannot work that out — so it refuses
// rather than guessing, and sign-in fails with an opaque "Server error".
const DEPLOYED = Boolean(process.env.NETLIFY || process.env.VERCEL);
const WHEN_DEPLOYED = [
  ["AUTH_URL", "Same value as NEXT_PUBLIC_SITE_URL. Without it sign-in fails with \"There is a problem with the server configuration\"."],
];

// Strongly recommended, but AUTH_URL alone is usually enough, so a missing
// value here is a warning rather than a failed build.
const ADVISED = [
  ["AUTH_TRUST_HOST", "Set to: true. Tells Auth.js to trust the host header behind your provider's proxy."],
  ["RESEND_API_KEY", "Without it writers submit and never hear back."],
];

const checks = DEPLOYED ? [...REQUIRED, ...WHEN_DEPLOYED] : REQUIRED;
const missing = checks.filter(([key]) => !process.env[key]?.trim());

// A pasted-in placeholder is worse than a missing value: the build succeeds and
// every canonical tag, sitemap entry and share card points at a dead domain.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
if (siteUrl && /your-site-name|yoursite\.com|example\.com/.test(siteUrl)) {
  console.error(`
──────────────────────────────────────────────────────────────
  Build stopped: NEXT_PUBLIC_SITE_URL is still the example value.

    ${siteUrl}

  Set it to your real address, with no trailing slash. Left as it is,
  search engines are told your content lives on a domain that does not
  exist, and every shared link previews as broken.
──────────────────────────────────────────────────────────────
`);
  process.exit(1);
}

if (missing.length) {
  const where = process.env.NETLIFY
    ? "Netlify: Site configuration > Environment variables > Add a variable"
    : process.env.VERCEL
      ? "Vercel: Project Settings > Environment Variables"
      : "your .env file (copy .env.example to .env)";

  console.error(`
──────────────────────────────────────────────────────────────
  Build stopped: ${missing.length} required setting${missing.length === 1 ? " is" : "s are"} missing.

  Set ${missing.length === 1 ? "it" : "them"} in ${where}
  and then redeploy.
`);
  for (const [key, why] of missing) console.error(`    ${key}\n      ${why}\n`);
  console.error(`  Everything else is optional. See README.md > Deploy checklist.
──────────────────────────────────────────────────────────────
`);
  process.exit(1);
}

const advisory = DEPLOYED ? ADVISED.filter(([k]) => !process.env[k]?.trim()) : [];
if (advisory.length) {
  console.warn("\nPreflight: building anyway, but these are recommended:");
  for (const [key, why] of advisory) console.warn(`    ${key} — ${why}`);
  console.warn("");
}

console.log("Preflight: all required settings present.");
