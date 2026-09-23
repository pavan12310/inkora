import { currentUser } from "@/lib/auth";
import { storeFile, storageConfigured } from "@/lib/storage";

/**
 * Cover image upload. Signed-in users only, images only, 5 MB ceiling.
 * The storage provider is resolved at request time, so the same build runs
 * on Vercel or Netlify without changes.
 */

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return json({ error: "Sign in to upload." }, 401);

  if (!storageConfigured()) {
    return json(
      { error: "Uploads are not configured on this install. Paste an image URL instead." },
      501
    );
  }

  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get("file");
    if (f instanceof File) file = f;
  } catch {
    return json({ error: "Could not read that upload." }, 400);
  }

  if (!file) return json({ error: "No file received." }, 400);
  if (!TYPES.includes(file.type)) return json({ error: "Images only: jpg, png, webp, avif or gif." }, 415);
  if (file.size > MAX_BYTES) return json({ error: "That image is over 5 MB. Resize it and try again." }, 413);

  // Never trust a client-supplied filename in a storage key.
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-80) || "cover";

  try {
    const stored = await storeFile(`covers/${user.handle}/${safe}`, file, file.type);
    return json({ url: stored.url }, 200);
  } catch (err) {
    console.error("[upload failed]", err);
    return json({ error: "Upload failed. Try again, or paste a URL." }, 500);
  }
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
