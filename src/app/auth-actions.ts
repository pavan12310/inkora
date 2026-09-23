"use server";

import { signIn, signOut } from "@/lib/auth";

export async function signInWithGoogle(formData: FormData) {
  await signIn("google", { redirectTo: String(formData.get("redirectTo") ?? "/me") });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

/**
 * Sends a one-time sign-in link.
 *
 * Auth.js redirects to its own verify-request page on success. An address with
 * no account gets one created when the link is followed, so there is no
 * separate registration and no "no such account" error to leak whether an
 * address is registered.
 */
export async function signInWithEmail(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return;
  await signIn("resend", {
    email,
    redirectTo: String(formData.get("redirectTo") ?? "/"),
  });
}
