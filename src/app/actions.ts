"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { currentUser, requireUser, requireAdmin } from "@/lib/auth";
import { uniquePostSlug, uniquePublicationSlug, slugify } from "@/lib/slug";
import { wordCount } from "@/lib/markdown";
import { saveSettings as persistSettings } from "@/lib/settings";
import { postHref, POST_KINDS } from "@/lib/types";
import { notifySubmission, notifyReceived, notifyPublished, notifyRejected } from "@/lib/email";
import { pingIndexNow } from "@/lib/indexnow";
import {
  notifyComment, notifyFollow, notifyApproved, notifyReturned, notifyEditors,
} from "@/lib/notify";

const MIN_WORDS = 300;
const MAX_OPEN_SUBMISSIONS = 2;

// ------------------------------------------------------------------ drafts ---

/** Create an empty draft and open the editor on it. */
export async function createDraft(formData: FormData) {
  const user = await requireUser();
  const kindRaw = String(formData.get("kind") ?? "ARTICLE");
  const kind = (POST_KINDS as readonly string[]).includes(kindRaw) ? kindRaw : "ARTICLE";

  const post = await prisma.post.create({
    data: {
      // The slug is minted now and frozen for life. Editing the title later
      // never changes the URL.
      slug: await uniquePostSlug(`untitled-${kind.toLowerCase()}`),
      kind,
      status: "DRAFT",
      title: "",
      authorId: user.id,
    },
  });

  redirect(`/write/${post.id}`);
}

export type SaveState = { error?: string; savedAt?: number };

async function ownDraft(id: string, userId: string) {
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post || post.authorId !== userId) throw new Error("Not found");
  return post;
}

/** Autosave and manual save both land here. Never changes status. */
export async function saveDraft(_prev: SaveState, formData: FormData): Promise<SaveState> {
  const user = await currentUser();
  if (!user) return { error: "Sign in to save." };

  const id = String(formData.get("id"));
  let post;
  try {
    post = await ownDraft(id, user.id);
  } catch {
    return { error: "That draft isn't yours." };
  }
  if (post.status === "PUBLISHED") {
    return { error: "This piece is live. Ask an editor to take it down before editing." };
  }

  const topicIds = String(formData.get("topicIds") ?? "").split(",").filter(Boolean);
  const publicationId = String(formData.get("publicationId") ?? "") || null;

  await prisma.post.update({
    where: { id },
    data: {
      title: String(formData.get("title") ?? "").slice(0, 120),
      subtitle: String(formData.get("subtitle") ?? "").slice(0, 200),
      coverImage: String(formData.get("coverImage") ?? "").slice(0, 400),
      body: String(formData.get("body") ?? ""),
      keyTakeaways: String(formData.get("keyTakeaways") ?? "").slice(0, 2000),
      faq: String(formData.get("faq") ?? "").slice(0, 6000),
      sources: String(formData.get("sources") ?? "").slice(0, 4000),
      difficulty: String(formData.get("difficulty") ?? "").slice(0, 20),
      timeRequired: String(formData.get("timeRequired") ?? "").slice(0, 40),
      tools: String(formData.get("tools") ?? "").slice(0, 200),
      abstract: String(formData.get("abstract") ?? "").slice(0, 3000),
      methodology: String(formData.get("methodology") ?? "").slice(0, 4000),
      seoTitle: String(formData.get("seoTitle") ?? "").slice(0, 70),
      metaDescription: String(formData.get("metaDescription") ?? "").slice(0, 165),
      publicationId,
    },
  });

  await prisma.postTopic.deleteMany({ where: { postId: id } });
  if (topicIds.length) {
    await prisma.postTopic.createMany({
      data: topicIds.slice(0, 5).map((topicId) => ({ postId: id, topicId })),
    });
  }

  return { savedAt: Date.now() };
}

/**
 * Saves what the submit screen collects, then returns to it.
 *
 * Separate from saveDraft because it touches only presentation fields and the
 * topic set — it must never overwrite the body, which the editor owns.
 */
export async function saveSubmissionMeta(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id"));
  await ownDraft(id, user.id);

  const topicIds = formData.getAll("topicIds").map(String).slice(0, 5);

  await prisma.post.update({
    where: { id },
    data: {
      seoTitle: String(formData.get("seoTitle") ?? "").slice(0, 70),
      metaDescription: String(formData.get("metaDescription") ?? "").slice(0, 160),
      topics: { deleteMany: {}, create: topicIds.map((topicId) => ({ topicId })) },
    },
  });

  revalidatePath(`/write/${id}/submit`);
  redirect(`/write/${id}/submit?saved=1`);
}

/**
 * Publish one's own piece directly, without the queue.
 *
 * Editors only. The site's whole claim is that a person reads everything before
 * it goes live, and the record page publishes an acceptance rate — if any
 * writer could skip the queue, both would be false. An editor self-approving is
 * a different thing: the piece still had an editor read it, and the record
 * still counts it honestly, because reviewedById is set to the person who
 * published it.
 */
export async function publishOwn(formData: FormData) {
  const editor = await requireAdmin();
  const id = String(formData.get("id"));

  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) throw new Error("That piece no longer exists.");
  if (post.authorId !== editor.id) {
    // Another author's work goes through the desk, where the decision is
    // recorded against the piece rather than slipped in through this route.
    throw new Error("Use the desk to publish someone else's piece.");
  }
  if (post.status === "PUBLISHED") redirect(postHref(post.kind, post.slug));
  if (!post.title.trim()) throw new Error("Add a title first.");
  if (wordCount(post.body) < MIN_WORDS) {
    throw new Error(`Needs at least ${MIN_WORDS} words.`);
  }

  await prisma.post.update({
    where: { id },
    data: {
      status: "PUBLISHED",
      publishedAt: post.publishedAt ?? new Date(),
      reviewedAt: new Date(),
      reviewedById: editor.id,
      reviewNote: "",
    },
  });

  await pingIndexNow([postHref(post.kind, post.slug)]);

  revalidatePaths(post.kind, post.slug);
  revalidatePath("/me");
  revalidatePath("/record");
  redirect(`${postHref(post.kind, post.slug)}?just=1`);
}

/** Move a draft into the moderation queue. */
export async function submitForReview(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id"));
  const post = await ownDraft(id, user.id);

  if (!post.title.trim()) throw new Error("Add a title first.");
  if (wordCount(post.body) < MIN_WORDS) throw new Error(`Needs at least ${MIN_WORDS} words.`);

  const open = await prisma.post.count({
    where: { authorId: user.id, status: "PENDING" },
  });
  if (open >= MAX_OPEN_SUBMISSIONS) {
    throw new Error("You already have two pieces in review. Let those clear first.");
  }

  await prisma.post.update({
    where: { id },
    data: { status: "PENDING", submittedAt: new Date(), reviewNote: "" },
  });

  // Awaited so failures are logged, but email.ts never throws.
  await Promise.all([notifySubmission(id), notifyReceived(id)]);

  // Editors are identified by ADMIN_EMAILS, so look them up by address.
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (adminEmails.length) {
    const editors = await prisma.user.findMany({
      where: { email: { in: adminEmails } },
      select: { id: true },
    });
    await notifyEditors(
      editors.map((e) => e.id),
      user.id,
      user.name || `@${user.handle}`,
      post.title
    );
  }

  revalidatePath("/me");
  revalidatePath("/desk");
  revalidatePath("/record");
  redirect("/me?sent=1");
}

export async function deleteDraft(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id"));
  const post = await ownDraft(id, user.id);
  if (post.status === "PUBLISHED") throw new Error("Live pieces can't be deleted here.");

  await prisma.post.delete({ where: { id } });
  revalidatePath("/me");
  redirect("/me");
}

// -------------------------------------------------------------- moderation ---

export async function approvePost(formData: FormData) {
  const editor = await requireAdmin();
  const id = String(formData.get("id"));
  const existing = await prisma.post.findUnique({ where: { id } });
  if (!existing) return;

  const title = String(formData.get("title") ?? "").trim();
  const subtitle = String(formData.get("subtitle") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  await prisma.post.update({
    where: { id },
    data: {
      ...(title ? { title } : {}),
      ...(subtitle ? { subtitle } : {}),
      ...(body ? { body } : {}),
      status: "PUBLISHED",
      publishedAt: existing.publishedAt ?? new Date(),
      reviewedAt: new Date(),
      reviewedById: editor.id,
      reviewNote: "",
    },
  });

  await notifyPublished(id);
  await notifyApproved(existing.authorId, existing.title, postHref(existing.kind, existing.slug));
  await pingIndexNow([postHref(existing.kind, existing.slug)]);
  revalidatePaths(existing.kind, existing.slug);
}

export async function rejectPost(formData: FormData) {
  const editor = await requireAdmin();
  const id = String(formData.get("id"));
  const note = String(formData.get("reviewNote") ?? "").trim().slice(0, 600);

  // A rejection without a reason teaches the writer nothing and costs you the
  // next piece they would have written.
  if (!note) throw new Error("Write a reason before sending a piece back.");

  await prisma.post.update({
    where: { id },
    data: {
      status: "REJECTED",
      reviewNote: note,
      reviewedAt: new Date(),
      reviewedById: editor.id,
    },
  });

  await notifyRejected(id);

  const returned = await prisma.post.findUnique({
    where: { id },
    select: { authorId: true, title: true },
  });
  if (returned) await notifyReturned(returned.authorId, returned.title, note, id);
  revalidatePath("/desk");
  revalidatePath("/me");
  revalidatePath("/record");
}

/** Back to the author as a draft, so they can fix it and resubmit. */
export async function unpublishPost(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const post = await prisma.post.update({
    where: { id },
    data: { status: "DRAFT", publishedAt: null },
  });
  revalidatePaths(post.kind, post.slug);
}

export async function hideComment(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const c = await prisma.comment.update({ where: { id }, data: { hidden: true } });
  const post = await prisma.post.findUnique({ where: { id: c.postId } });
  if (post) revalidatePath(postHref(post.kind, post.slug));
}

export async function updateSettings(formData: FormData) {
  await requireAdmin();
  await persistSettings({
    name: String(formData.get("name") ?? "").trim().slice(0, 40) || "Inkora",
    tagline: String(formData.get("tagline") ?? "").trim().slice(0, 200),
    about: String(formData.get("about") ?? "").trim(),
  });
  revalidatePath("/", "layout");
  revalidatePath("/about");
}

export async function createTopic(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim().slice(0, 40);
  if (!name) return;
  await prisma.topic.create({
    data: {
      name,
      slug: slugify(name, 40),
      description: String(formData.get("description") ?? "").trim().slice(0, 200),
    },
  });
  revalidatePath("/topics");
  revalidatePath("/desk");
}

function revalidatePaths(kind: string, slug: string) {
  revalidatePath("/");
  revalidatePath("/explore");
  revalidatePath("/desk");
  revalidatePath("/me");
  revalidatePath(postHref(kind, slug));
  revalidatePath("/record");
  revalidatePath("/sitemap.xml");
}

// ------------------------------------------------------------------ social ---

export async function toggleLike(formData: FormData) {
  const user = await requireUser();
  const postId = String(formData.get("postId"));
  const existing = await prisma.like.findUnique({
    where: { userId_postId: { userId: user.id, postId } },
  });

  if (existing) {
    await prisma.like.delete({ where: { userId_postId: { userId: user.id, postId } } });
  } else {
    await prisma.like.create({ data: { userId: user.id, postId } });
  }

  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (post) revalidatePath(postHref(post.kind, post.slug));
}

export async function toggleBookmark(formData: FormData) {
  const user = await requireUser();
  const postId = String(formData.get("postId"));
  const existing = await prisma.bookmark.findUnique({
    where: { userId_postId: { userId: user.id, postId } },
  });

  if (existing) {
    await prisma.bookmark.delete({ where: { userId_postId: { userId: user.id, postId } } });
  } else {
    await prisma.bookmark.create({ data: { userId: user.id, postId } });
  }

  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (post) revalidatePath(postHref(post.kind, post.slug));
  revalidatePath("/me");
}

export async function toggleFollow(formData: FormData) {
  const user = await requireUser();
  const kind = String(formData.get("kind")); // user | topic | publication
  const targetId = String(formData.get("targetId"));

  if (kind === "user" && targetId === user.id) return;

  const where =
    kind === "user"
      ? { followerId_userId: { followerId: user.id, userId: targetId } }
      : kind === "topic"
        ? { followerId_topicId: { followerId: user.id, topicId: targetId } }
        : { followerId_publicationId: { followerId: user.id, publicationId: targetId } };

  // One of three compound unique keys, narrowed by `kind` above.
  const existing = await prisma.follow.findUnique({ where: where as never });

  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
  } else {
    await prisma.follow.create({
      data: {
        followerId: user.id,
        userId: kind === "user" ? targetId : null,
        topicId: kind === "topic" ? targetId : null,
        publicationId: kind === "publication" ? targetId : null,
      },
    });

    // Only a person can be told they were followed; a topic has no inbox.
    if (kind === "user") {
      await notifyFollow(targetId, user.id, user.name || `@${user.handle}`, user.handle);
    }
  }

  revalidatePath(String(formData.get("returnTo") ?? "/"));
}

export async function addComment(formData: FormData) {
  const user = await requireUser();
  const postId = String(formData.get("postId"));
  const body = String(formData.get("body") ?? "").trim().slice(0, 2000);
  if (!body) return;

  await prisma.comment.create({ data: { postId, userId: user.id, body } });

  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (post) {
    await notifyComment(
      post.authorId,
      user.id,
      user.name || `@${user.handle}`,
      post.title,
      postHref(post.kind, post.slug)
    );
    revalidatePath(postHref(post.kind, post.slug));
  }
}

export async function deleteComment(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id"));
  const comment = await prisma.comment.findUnique({ where: { id } });
  if (!comment) return;
  if (comment.userId !== user.id && !user.isAdmin) throw new Error("Not yours");

  await prisma.comment.delete({ where: { id } });
  const post = await prisma.post.findUnique({ where: { id: comment.postId } });
  if (post) revalidatePath(postHref(post.kind, post.slug));
}

/** Clear the unread count. Scoped to the caller — never another person's. */
export async function markAllRead() {
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/notifications");
}

// ------------------------------------------------------------------ people ---

export async function updateProfile(formData: FormData) {
  const user = await requireUser();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: String(formData.get("name") ?? "").trim().slice(0, 60) || null,
      bio: String(formData.get("bio") ?? "").trim().slice(0, 280),
      website: String(formData.get("website") ?? "").trim().slice(0, 120),
      location: String(formData.get("location") ?? "").trim().slice(0, 60),
      expertise: String(formData.get("expertise") ?? "").trim().slice(0, 160),
      twitter: String(formData.get("twitter") ?? "").trim().slice(0, 60),
      linkedin: String(formData.get("linkedin") ?? "").trim().slice(0, 120),
    },
  });
  revalidatePath("/me");
  revalidatePath(`/author/${user.handle}`);
}

export async function createPublication(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  if (!name) throw new Error("A publication needs a name.");

  const pub = await prisma.publication.create({
    data: {
      name,
      slug: await uniquePublicationSlug(name),
      description: String(formData.get("description") ?? "").trim().slice(0, 300),
      about: String(formData.get("about") ?? "").trim().slice(0, 4000),
      guidelines: String(formData.get("guidelines") ?? "").trim().slice(0, 6000),
      ownerId: user.id,
      members: { create: { userId: user.id, role: "EDITOR" } },
    },
  });

  revalidatePath("/publications");

  revalidatePath("/me");
  redirect(`/publication/${pub.slug}`);
}
