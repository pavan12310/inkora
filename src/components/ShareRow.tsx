"use client";

import { useState } from "react";
import Icon from "@/components/Icon";

/**
 * Share controls for a published piece.
 *
 * Uses the native share sheet where the device has one — on a phone that is the
 * whole point, because it reaches WhatsApp and Messages, which no hardcoded
 * button list can. Everything else falls back to the three links that carry
 * writing, plus copy, which is what most people actually use.
 */
export default function ShareRow({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);

  const enc = encodeURIComponent;
  const links = [
    { name: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}` },
    { name: "X", href: `https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(title)}` },
    { name: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}` },
  ];

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard access is refused outside a secure context and in some
      // embedded browsers. Fall back rather than failing silently.
      const box = document.createElement("textarea");
      box.value = url;
      box.setAttribute("readonly", "");
      box.style.position = "fixed";
      box.style.opacity = "0";
      document.body.appendChild(box);
      box.select();
      try {
        document.execCommand("copy");
      } catch {
        /* nothing more to try; the link is visible in the address bar */
      }
      document.body.removeChild(box);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }

  async function native() {
    if (!navigator.share) return false;
    try {
      await navigator.share({ title, url });
      return true;
    } catch {
      // Includes the person simply dismissing the sheet, which is not an error.
      return true;
    }
  }

  return (
    <div className="share-row">
      <span className="share-lead">Share this</span>

      <div className="share-acts">
        <button
          type="button"
          className="share-btn"
          onClick={async () => {
            if (!(await native())) copy();
          }}
        >
          <Icon name="share" size={17} />
          {copied ? "Link copied" : "Share"}
        </button>

        <button type="button" className="share-btn" onClick={copy}>
          {copied ? "Copied" : "Copy link"}
        </button>

        {links.map((l) => (
          <a
            key={l.name}
            className="share-btn"
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {l.name}
          </a>
        ))}
      </div>

      <span className="share-live" aria-live="polite">
        {copied ? "Link copied to the clipboard." : ""}
      </span>
    </div>
  );
}
