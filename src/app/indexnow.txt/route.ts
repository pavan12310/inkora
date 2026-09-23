/**
 * Serves the IndexNow key, proving whoever submits URLs controls this host.
 *
 * The spec's default is a file named <key>.txt at the root, but a folder called
 * "[key].txt" is not a dynamic segment in the App Router — Next reads the whole
 * name literally — so the key would never reach the handler. IndexNow allows a
 * key file at any location as long as its URL is sent as keyLocation, which is
 * what lib/indexnow.ts does.
 *
 * Served from the environment rather than committed as a static file, so the
 * key stays out of the repository.
 */
export async function GET() {
  const key = process.env.INDEXNOW_KEY?.trim();
  if (!key) return new Response("Not found", { status: 404 });

  return new Response(key, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
