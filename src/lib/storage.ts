/**
 * Cover image storage.
 *
 * Deliberately host-agnostic. The app should not care whether it is running on
 * Vercel, Netlify or anywhere else, so the provider is chosen from whatever
 * credentials are present rather than hard-wired at build time.
 *
 *   Vercel Blob   — set BLOB_READ_WRITE_TOKEN
 *   Netlify Blobs — automatic on Netlify; served back through /api/media/<key>
 *   neither       — the route says so and the writer pastes a URL instead
 */

export type StoredFile = { url: string };

export function storageProvider(): "vercel" | "netlify" | "none" {
  if (process.env.BLOB_READ_WRITE_TOKEN) return "vercel";
  // NETLIFY is set in Netlify's build and function runtimes.
  if (process.env.NETLIFY || process.env.NETLIFY_BLOBS_CONTEXT) return "netlify";
  return "none";
}

export function storageConfigured(): boolean {
  return storageProvider() !== "none";
}

const STORE = "inkora-covers";

export async function storeFile(
  key: string,
  file: File,
  contentType: string
): Promise<StoredFile> {
  const provider = storageProvider();

  if (provider === "vercel") {
    const { put } = await import("@vercel/blob");
    // addRandomSuffix stops one writer's upload overwriting another's.
    const blob = await put(key, file, { access: "public", addRandomSuffix: true, contentType });
    return { url: blob.url };
  }

  if (provider === "netlify") {
    const { getStore } = await import("@netlify/blobs");
    const store = getStore(STORE);
    const unique = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}-${key}`;
    await store.set(unique, await file.arrayBuffer(), { metadata: { contentType } });
    // Netlify Blobs are not public objects, so they are served back through
    // our own route. The URL is on your domain, which is arguably better.
    return { url: `/api/media/${encodeURIComponent(unique)}` };
  }

  throw new Error("No storage provider configured.");
}

export async function readFile(
  key: string
): Promise<{ body: ArrayBuffer; contentType: string } | null> {
  if (storageProvider() !== "netlify") return null;
  const { getStore } = await import("@netlify/blobs");
  const store = getStore(STORE);
  const result = await store.getWithMetadata(key, { type: "arrayBuffer" });
  if (!result) return null;
  return {
    body: result.data as ArrayBuffer,
    contentType: String(result.metadata?.contentType || "application/octet-stream"),
  };
}
