import { Resend } from "resend";
import { prisma } from "@/lib/db";
import { getSettings, siteUrl } from "@/lib/settings";
import { postHref } from "@/lib/types";

/**
 * Email.
 *
 * A submission platform without this loop is broken in practice: a writer
 * sends a piece and then has to keep checking a dashboard to find out what
 * happened. Three messages close the loop — received, published, sent back.
 *
 * If RESEND_API_KEY is not set, every function here logs and returns instead
 * of throwing. Email must never be able to fail a submission or an approval:
 * the database write is the thing that matters, the notification is not.
 */

const key = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM || "Inkora <onboarding@resend.dev>";
const resend = key ? new Resend(key) : null;

type Mail = { to: string; subject: string; lines: string[]; cta?: { label: string; url: string } };

function render(mail: Mail, siteName: string): { html: string; text: string } {
  const body = mail.lines.map((l) => `<p style="margin:0 0 16px">${escapeHtml(l)}</p>`).join("");
  const button = mail.cta
    ? `<p style="margin:26px 0 0">
         <a href="${mail.cta.url}" style="display:inline-block;padding:11px 20px;border-radius:20px;background:#376D4C;color:#fff;text-decoration:none;font-weight:500">${escapeHtml(mail.cta.label)}</a>
       </p>`
    : "";

  return {
    html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.6;color:#1D2620;max-width:520px">
      <p style="margin:0 0 24px;font-size:17px;font-weight:600">${escapeHtml(siteName)}</p>
      ${body}${button}
      <p style="margin:34px 0 0;padding-top:16px;border-top:1px solid #EAECE7;font-size:13px;color:#858D7D">
        You are receiving this because you have an account on ${escapeHtml(siteName)}.
      </p>
    </div>`,
    text: mail.lines.join("\n\n") + (mail.cta ? `\n\n${mail.cta.label}: ${mail.cta.url}` : ""),
  };
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function send(mail: Mail): Promise<void> {
  const { name } = await getSettings();
  if (!resend) {
    console.info(`[email skipped: no RESEND_API_KEY] to=${mail.to} subject="${mail.subject}"`);
    return;
  }
  try {
    const { html, text } = render(mail, name);
    await resend.emails.send({ from, to: mail.to, subject: mail.subject, html, text });
  } catch (err) {
    // Never let a notification failure roll back the action that caused it.
    console.error("[email failed]", mail.subject, err);
  }
}

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
}

/** A piece has entered the queue. Tells the editors, not the writer. */
export async function notifySubmission(postId: string): Promise<void> {
  const post = await prisma.post.findUnique({ where: { id: postId }, include: { author: true } });
  if (!post) return;

  const waiting = await prisma.post.count({ where: { status: "PENDING" } });
  const who = post.author.name || post.author.email;

  await Promise.all(
    adminEmails().map((to) =>
      send({
        to,
        subject: `New submission: ${post.title}`,
        lines: [
          `${who} sent in a ${post.kind.toLowerCase()}.`,
          `“${post.title}”`,
          post.subtitle || "",
          `${waiting} ${waiting === 1 ? "piece is" : "pieces are"} now waiting in the queue.`,
        ].filter(Boolean),
        cta: { label: "Open the desk", url: `${siteUrl()}/desk` },
      })
    )
  );
}

/** Confirms receipt to the writer, so they are not left guessing. */
export async function notifyReceived(postId: string): Promise<void> {
  const post = await prisma.post.findUnique({ where: { id: postId }, include: { author: true } });
  if (!post?.author.email) return;

  await send({
    to: post.author.email,
    subject: `We have your piece: ${post.title}`,
    lines: [
      `Thanks for sending “${post.title}”.`,
      "An editor reads every submission before it is published, so this will be read by a person rather than filtered by a script.",
      "You will hear back either way, including if we pass on it.",
    ],
    cta: { label: "Track it", url: `${siteUrl()}/me` },
  });
}

export async function notifyPublished(postId: string): Promise<void> {
  const post = await prisma.post.findUnique({ where: { id: postId }, include: { author: true } });
  if (!post?.author.email) return;

  await send({
    to: post.author.email,
    subject: `Published: ${post.title}`,
    lines: [
      `“${post.title}” is live.`,
      "It is on the index, in the sitemap and in the feed.",
    ],
    cta: { label: "Read it", url: `${siteUrl()}${postHref(post.kind, post.slug)}` },
  });
}

/** The rejection note is the whole point of this one. Silence teaches nothing. */
export async function notifyRejected(postId: string): Promise<void> {
  const post = await prisma.post.findUnique({ where: { id: postId }, include: { author: true } });
  if (!post?.author.email) return;

  await send({
    to: post.author.email,
    subject: `About your piece: ${post.title}`,
    lines: [
      `We are not going to run “${post.title}”.`,
      post.reviewNote ? `From the editor: ${post.reviewNote}` : "",
      "It is back in your drafts. You can rework it and send it again, and that is not a formality — resubmissions do get published.",
    ].filter(Boolean),
    cta: { label: "Open the draft", url: `${siteUrl()}/write/${post.id}` },
  });
}

export function emailConfigured(): boolean {
  return Boolean(key);
}
