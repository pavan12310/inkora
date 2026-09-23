import { readFile } from "@/lib/storage";

/** Serves images held in Netlify Blobs. Unused on Vercel, where blobs are public. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  const file = await readFile(decodeURIComponent(key));
  if (!file) return new Response("Not found", { status: 404 });

  return new Response(file.body, {
    headers: {
      "Content-Type": file.contentType,
      // Immutable: every stored key carries a unique prefix.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
