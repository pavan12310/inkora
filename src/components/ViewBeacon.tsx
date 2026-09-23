"use client";

import { useEffect } from "react";

/** Fires once per mount. Not analytics-grade; good enough for a creator dashboard. */
export default function ViewBeacon({ postId }: { postId: string }) {
  useEffect(() => {
    const key = `v:${postId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Private mode or blocked storage: count it anyway.
    }
    fetch("/api/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: postId }),
      keepalive: true,
    }).catch(() => {});
  }, [postId]);

  return null;
}
