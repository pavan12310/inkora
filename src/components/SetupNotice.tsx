import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { emailConfigured } from "@/lib/email";
import { storageConfigured } from "@/lib/storage";

/**
 * Tells the editor what is missing before it costs them a writer. Nothing here
 * is visible to readers, and it disappears once the install is complete.
 */
export default async function SetupNotice() {
  const user = await currentUser();
  if (!user?.isAdmin) return null;

  const gaps: React.ReactNode[] = [];

  const topics = await prisma.topic.count();
  if (topics === 0) {
    gaps.push(
      <>
        No topics exist, so nothing can be tagged and no topic pages will be generated. Run{" "}
        <code>npm run db:seed</code>, or add them from the desk.
      </>
    );
  }

  if (!emailConfigured()) {
    gaps.push(
      <>
        Email is off. Writers will submit and never hear back. Set <code>RESEND_API_KEY</code> and{" "}
        <code>EMAIL_FROM</code>.
      </>
    );
  }

  if (!storageConfigured()) {
    gaps.push(
      <>
        Image uploads are off, so writers can only paste a cover URL. On Vercel set{" "}
        <code>BLOB_READ_WRITE_TOKEN</code>; on Netlify uploads work automatically once
        Blobs are enabled for the site.
      </>
    );
  }

  const deployed = Boolean(process.env.NETLIFY || process.env.VERCEL);
  if (deployed && (!process.env.AUTH_URL || !process.env.AUTH_TRUST_HOST)) {
    gaps.push(
      <>
        <code>AUTH_URL</code> or <code>AUTH_TRUST_HOST</code> is unset. Sign-in will fail with
        a server configuration error. Set <code>AUTH_URL</code> to your site URL and{" "}
        <code>AUTH_TRUST_HOST</code> to <code>true</code>.
      </>
    );
  }

  if (!process.env.NEXT_PUBLIC_SITE_URL) {
    gaps.push(
      <>
        <code>NEXT_PUBLIC_SITE_URL</code> is unset, so canonical tags, the sitemap and the feed
        will point at localhost. This one quietly breaks your SEO.
      </>
    );
  }

  if (!gaps.length) return null;

  return (
    <div className="setup">
      <strong>Setup, visible to editors only</strong>
      <ul style={{ margin: "8px 0 0", paddingLeft: "1.1em" }}>
        {gaps.map((g, i) => (
          <li key={i} style={{ marginBottom: 4 }}>{g}</li>
        ))}
      </ul>
    </div>
  );
}
