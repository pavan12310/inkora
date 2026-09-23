"use client";

import { useRef, useState } from "react";

/**
 * Cover image: upload or paste a URL. Both paths end at the same string, so
 * an install without blob storage configured still works.
 */
export default function CoverField({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function upload(file: File) {
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) setError(data.error || "Upload failed.");
      else onChange(data.url);
    } catch {
      setError("Upload failed. Check your connection, or paste a URL.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="field">
      <label htmlFor="coverUrl">Cover image</label>
      <p className="help">
        Optional. Shown beside your piece in the feed and at the top of the page.
      </p>

      {value && (
        <div className="cover-preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" />
          <button type="button" className="btn quiet" onClick={() => onChange("")}>
            Remove
          </button>
        </div>
      )}

      <div className="btn-row" style={{ marginBottom: 10 }}>
        <button type="button" className="btn" onClick={() => input.current?.click()} disabled={busy}>
          {busy ? "Uploading\u2026" : value ? "Replace image" : "Upload an image"}
        </button>
        <input
          ref={input}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
            e.target.value = "";
          }}
        />
      </div>

      <input
        id="coverUrl"
        value={value}
        placeholder="\u2026or paste an image URL"
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <p className="help" style={{ color: "var(--mark)", marginTop: 8 }}>{error}</p>}
    </div>
  );
}
