/**
 * Whether a piece is set up to be findable.
 *
 * None of this makes a piece rank — that comes from the writing being the best
 * answer to a question someone is actually asking. These are the mechanical
 * things that stop a good piece from being found at all: no heading structure,
 * a title that truncates in results, nothing for a crawler to follow.
 *
 * Shared between the editor and the submit screen so the two never disagree.
 */
export type SeoCheck = { label: string; pass: boolean; why: string };

export function seoReport(f: {
  title: string;
  seoTitle: string;
  subtitle: string;
  metaDescription: string;
  body: string;
  keyTakeaways: string;
  faq: string;
  sources: string;
  topicIds: string[];
}, words: number): SeoCheck[] {
  const hasH2 = /^##\s+/m.test(f.body);
  const hasLink = /\[[^\]]+\]\([^)]+\)/.test(f.body);
  const shown = f.seoTitle || f.title;

  return [
    { label: "Title set", pass: f.title.trim().length > 0,
      why: "Without one there is nothing for a result to show." },
    { label: "Title under 60 characters", pass: shown.length > 0 && shown.length <= 60,
      why: "Google truncates around 60; the end of a longer title is cut off." },
    { label: "Summary written", pass: Boolean(f.subtitle || f.metaDescription),
      why: "This is the line under your title in results. Left blank, Google invents one." },
    { label: "At least 300 words", pass: words >= 300,
      why: "Shorter pieces rarely answer a question fully enough to rank." },
    { label: "Uses section headings", pass: hasH2,
      why: "Headings are how a crawler reads structure, and how a reader skims." },
    { label: "At least one topic", pass: f.topicIds.length > 0,
      why: "Topics put the piece on a topic page, which is a route in for crawlers." },
    { label: "Links to something", pass: hasLink,
      why: "A page with no outbound links looks like a dead end." },
    { label: "Key takeaways written", pass: f.keyTakeaways.trim().length > 0,
      why: "Often what gets quoted in an AI answer or a featured snippet." },
    { label: "FAQ added", pass: f.faq.trim().length > 0,
      why: "Becomes FAQ structured data, which can show directly in results." },
    { label: "Sources cited", pass: f.sources.trim().length > 0,
      why: "Evidence is what separates a piece worth ranking from filler." },
  ];
}
