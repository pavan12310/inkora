import { siteUrl } from "@/lib/settings";

/**
 * IndexNow: tells participating search engines a URL has changed, instead of
 * waiting for them to recrawl on their own schedule — which for a new, low
 * authority site can be weeks.
 *
 * Bing, Yandex, Seznam and Naver honour it, and they share submissions with
 * each other. Google does not participate: it finds new URLs through the
 * sitemap and through links, which is why the sitemap and internal linking
 * still matter more than this does.
 *
 * Entirely optional. With no INDEXNOW_KEY set this logs and returns, exactly
 * like email does without a Resend key — a missing key must never be able to
 * roll back a publish that already succeeded.
 */
export async function pingIndexNow(paths: string[]): Promise<void> {
  const key = process.env.INDEXNOW_KEY?.trim();
  if (!key) {
    console.log("[indexnow skipped] no INDEXNOW_KEY set");
    return;
  }

  const base = siteUrl();
  let host: string;
  try {
    host = new URL(base).host;
  } catch {
    console.warn("[indexnow skipped] site URL is not valid:", base);
    return;
  }

  // A localhost or .local host is not reachable by a crawler, and submitting it
  // would be noise at best.
  if (/^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(host) || host.endsWith(".local")) {
    console.log("[indexnow skipped] not a public host:", host);
    return;
  }

  const urlList = paths.map((p) => (p.startsWith("http") ? p : `${base}${p}`));

  try {
    const res = await fetch("https://api.indexnow.org/IndexNow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host,
        key,
        keyLocation: `${base}/indexnow.txt`,
        urlList,
      }),
      // A slow endpoint must not hold up the response to the person who just
      // pressed publish.
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) {
      console.warn(`[indexnow] ${res.status} for ${urlList.length} url(s)`);
      return;
    }
    console.log(`[indexnow] submitted ${urlList.length} url(s)`);
  } catch (err) {
    // Network failure, timeout, anything: log and move on.
    console.warn("[indexnow failed]", err);
  }
}
