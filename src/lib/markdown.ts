import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

marked.setOptions({ gfm: true, breaks: false });

export type TocEntry = { id: string; text: string; level: 2 | 3 };

function headingId(text: string, seen: Map<string, number>): string {
  const base =
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 60) || "section";
  const n = (seen.get(base) ?? 0) + 1;
  seen.set(base, n);
  return n === 1 ? base : `${base}-${n}`;
}

/**
 * Render submitted markdown to HTML that is safe to put on the page.
 *
 * Three jobs:
 *  1. Sanitise. Submitted text is untrusted forever, including after approval.
 *  2. Force rel="ugc nofollow noopener" on every link in the body. Without this
 *     the platform becomes a link-selling target within a month of launch.
 *  3. Give h2/h3 stable ids so the table of contents can link to them.
 */
export function renderMarkdown(md: string): { html: string; toc: TocEntry[] } {
  const toc: TocEntry[] = [];
  const seen = new Map<string, number>();

  const renderer = new marked.Renderer();
  renderer.heading = function ({ tokens, depth }) {
    const text = this.parser.parseInline(tokens);
    const plain = text.replace(/<[^>]+>/g, "");
    if (depth === 2 || depth === 3) {
      const id = headingId(plain, seen);
      toc.push({ id, text: plain, level: depth as 2 | 3 });
      return `<h${depth} id="${id}">${text}</h${depth}>`;
    }
    return `<h${depth}>${text}</h${depth}>`;
  };

  const raw = marked.parse(md ?? "", { async: false, renderer }) as string;

  const html = sanitizeHtml(raw, {
    allowedTags: [
      "p", "br", "hr",
      "h2", "h3", "h4",
      "strong", "em", "del", "sup", "sub",
      "ul", "ol", "li",
      "blockquote", "pre", "code",
      "a", "img", "figure", "figcaption",
      "table", "thead", "tbody", "tr", "th", "td",
      "iframe",
    ],
    allowedAttributes: {
      a: ["href", "rel", "target"],
      img: ["src", "alt", "title", "loading"],
      h2: ["id"],
      h3: ["id"],
      iframe: ["src", "title", "allowfullscreen", "loading"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    // Embeds, but only from hosts you have decided to trust.
    allowedIframeHostnames: ["www.youtube.com", "youtube.com", "player.vimeo.com"],
    transformTags: {
      a: (_t, attribs) => ({
        tagName: "a",
        attribs: { ...attribs, rel: "ugc nofollow noopener", target: "_blank" },
      }),
      img: (_t, attribs) => ({ tagName: "img", attribs: { ...attribs, loading: "lazy" } }),
      iframe: (_t, attribs) => ({ tagName: "iframe", attribs: { ...attribs, loading: "lazy" } }),
    },
  });

  return { html, toc };
}

export function wordCount(body: string): number {
  return (body ?? "").trim().split(/\s+/).filter(Boolean).length;
}

export function readingMinutes(body: string): number {
  return Math.max(1, Math.round(wordCount(body) / 200));
}

export function readingTime(body: string): string {
  return `${readingMinutes(body)} min read`;
}

export function plainText(body: string): string {
  return (body ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*`_~|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function excerpt(body: string, max = 160): string {
  const text = plainText(body);
  return text.length <= max ? text : text.slice(0, max - 1).trimEnd() + "\u2026";
}

/** "Key takeaways", one per line in the editor. */
export function parseLines(value: string): string[] {
  return (value ?? "")
    .split("\n")
    .map((l) => l.replace(/^[-*\u2022]\s*/, "").trim())
    .filter(Boolean);
}

export type Faq = { q: string; a: string };

/** FAQ block: question line, answer line(s), "---" between entries. */
export function parseFaq(value: string): Faq[] {
  return (value ?? "")
    .split(/\n---+\n/)
    .map((chunk) => {
      const lines = chunk.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) return null;
      return { q: lines[0], a: lines.slice(1).join(" ") };
    })
    .filter((x): x is Faq => x !== null);
}

export function parseCsv(value: string): string[] {
  return (value ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}
