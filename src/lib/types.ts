export const POST_KINDS = ["ARTICLE", "TUTORIAL", "RESEARCH"] as const;
export type PostKind = (typeof POST_KINDS)[number];

export const POST_STATUSES = ["DRAFT", "PENDING", "PUBLISHED", "REJECTED"] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

export const DIFFICULTIES = ["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const;

/** URL segment per content type. These are permanent — changing one breaks every link. */
export const KIND_PATH: Record<string, string> = {
  ARTICLE: "article",
  TUTORIAL: "tutorial",
  RESEARCH: "research",
};

export const PATH_KIND: Record<string, PostKind> = {
  article: "ARTICLE",
  tutorial: "TUTORIAL",
  research: "RESEARCH",
};

export const KIND_LABEL: Record<string, string> = {
  ARTICLE: "Article",
  TUTORIAL: "Tutorial",
  RESEARCH: "Research",
};

export const STATUS_LABEL: Record<string, string> = {
  DRAFT: "draft",
  PENDING: "in review",
  PUBLISHED: "published",
  REJECTED: "not accepted",
};

export function postHref(kind: string, slug: string): string {
  return `/${KIND_PATH[kind] ?? "article"}/${slug}`;
}
