"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import EditorBar from "@/components/EditorBar";
import { saveDraft, type SaveState } from "@/app/actions";
import { DIFFICULTIES } from "@/lib/types";
import CoverField from "@/components/CoverField";

type Topic = { id: string; name: string };
type Pub = { id: string; name: string };

export type DraftShape = {
  id: string;
  kind: string;
  status: string;
  title: string;
  subtitle: string;
  coverImage: string;
  body: string;
  keyTakeaways: string;
  faq: string;
  sources: string;
  difficulty: string;
  timeRequired: string;
  tools: string;
  abstract: string;
  methodology: string;
  seoTitle: string;
  metaDescription: string;
  publicationId: string | null;
  topicIds: string[];
};

const AUTOSAVE_MS = 2500;

export default function Editor({
  draft,
  topics,
  publications,
  siteName,
  statusLabel,
  viewer,
}: {
  siteName: string;
  statusLabel: string;
  viewer: { name: string | null; handle: string; image: string | null };
  draft: DraftShape;
  topics: Topic[];
  publications: Pub[];
}) {
  const [form, setForm] = useState<DraftShape>(draft);
  const [tab, setTab] = useState<"write" | "meta" | "seo" | "preview">("write");
  const [state, setState] = useState<SaveState>({});
  const [saving, setSaving] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [inserting, setInserting] = useState(false);
  const [insertError, setInsertError] = useState<string | null>(null);
  const dirty = useRef(false);
  const first = useRef(true);

  const set = <K extends keyof DraftShape>(key: K, value: DraftShape[K]) => {
    dirty.current = true;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const words = useMemo(
    () => form.body.trim().split(/\s+/).filter(Boolean).length,
    [form.body]
  );

  async function persist() {
    if (!dirty.current || saving) return;
    setSaving(true);
    const fd = new FormData();
    fd.set("id", form.id);
    (
      [
        "title", "subtitle", "coverImage", "body", "keyTakeaways", "faq", "sources",
        "difficulty", "timeRequired", "tools", "abstract", "methodology",
        "seoTitle", "metaDescription",
      ] as const
    ).forEach((k) => fd.set(k, form[k] ?? ""));
    fd.set("publicationId", form.publicationId ?? "");
    fd.set("topicIds", form.topicIds.join(","));

    const res = await saveDraft({}, fd);
    dirty.current = false;
    setState(res);
    setSaving(false);
  }

  // Autosave on a pause in typing, not on every keystroke.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(persist, AUTOSAVE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  // Don't let someone close the tab on unsaved work.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  const checks = seoChecks(form, words);

  /**
   * Puts text where the cursor is, rather than at the end.
   *
   * Appending would drop an image below everything already written, which for
   * a long piece means scrolling back to find it and cutting it out again.
   */
  function insertAtCursor(text: string) {
    const el = bodyRef.current;
    if (!el) {
      set("body", form.body + text);
      return;
    }
    const start = el.selectionStart ?? form.body.length;
    const end = el.selectionEnd ?? start;
    const next = form.body.slice(0, start) + text + form.body.slice(end);
    set("body", next);
    // Restore the caret after React has re-rendered with the new value.
    requestAnimationFrame(() => {
      el.focus();
      const at = start + text.length;
      el.setSelectionRange(at, at);
    });
  }

  const ready = Boolean(form.title.trim()) && words >= 300;

  return (
    <div className="editor">
      <EditorBar
        siteName={siteName}
        status={statusLabel}
        saving={saving}
        savedAt={state.savedAt ? new Date(state.savedAt).getTime() : null}
        error={state.error ?? null}
        words={words}
        ready={ready}
        submitHref={`/write/${draft.id}/submit`}
        user={viewer}
      />

      <div className="editor-bar">
        <div className="tabs" style={{ margin: 0, border: 0 }}>
          {(["write", "meta", "seo", "preview"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={tab === t ? "active" : ""}
            >
              {t === "meta" ? "Details" : t === "seo" ? "SEO & AI" : t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <div className="save-state">
          {saving
            ? "Saving\u2026"
            : state.error
              ? state.error
              : state.savedAt
                ? `Saved ${new Date(state.savedAt).toLocaleTimeString()}`
                : "Not saved yet"}
          <button type="button" className="btn quiet" onClick={persist} style={{ marginLeft: 12 }}>
            Save now
          </button>
        </div>
      </div>

      {tab === "write" && (
        <div className="form" style={{ maxWidth: "none" }}>
          <input
            className="title-input"
            placeholder="Title"
            value={form.title}
            maxLength={120}
            onChange={(e) => set("title", e.target.value)}
          />
          <input
            className="subtitle-input"
            placeholder="Subtitle \u2014 one sentence on why someone should read this"
            value={form.subtitle}
            maxLength={200}
            onChange={(e) => set("subtitle", e.target.value)}
          />
          <div className="insert-row">
            <label className={`insert-btn ${inserting ? "busy" : ""}`}>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                hidden
                disabled={inserting}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  setInsertError(null);
                  setInserting(true);
                  try {
                    const fd = new FormData();
                    fd.append("file", file);
                    const res = await fetch("/api/upload", { method: "POST", body: fd });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) {
                      setInsertError(data.error || "Upload failed.");
                      return;
                    }
                    insertAtCursor(`\n\n![${file.name.replace(/\.[^.]+$/, "")}](${data.url})\n\n`);
                  } catch {
                    setInsertError("Upload failed. Check your connection.");
                  } finally {
                    setInserting(false);
                  }
                }}
              />
              {inserting ? "Uploading\u2026" : "Insert an image"}
            </label>
            <span className="insert-hint">
              {insertError ?? "Dropped in at the cursor, as markdown you can move."}
            </span>
          </div>

          <textarea
            ref={bodyRef}
            className="body-input"
            placeholder={
              "Write here.\n\n## A heading\n\nBlank line between paragraphs. - for a list, > for a quote, **bold**, `code`, [link](https://example.com)."
            }
            value={form.body}
            rows={26}
            onChange={(e) => set("body", e.target.value)}
          />
          <p className="counter">
            {words} words &middot; about {Math.max(1, Math.round(words / 200))} min read
            {words < 300 && <> &middot; needs 300 to submit</>}
          </p>
        </div>
      )}

      {tab === "meta" && (
        <div className="form">
          <div className="field">
            <label>Topics</label>
            <p className="help">Up to five. Topics drive the topic pages and discovery.</p>
            <div className="chips">
              {topics.map((t) => {
                const on = form.topicIds.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={on ? "chip on" : "chip"}
                    onClick={() =>
                      set(
                        "topicIds",
                        on
                          ? form.topicIds.filter((x) => x !== t.id)
                          : form.topicIds.length < 5
                            ? [...form.topicIds, t.id]
                            : form.topicIds
                      )
                    }
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>
          </div>

          <CoverField value={form.coverImage} onChange={(url) => set("coverImage", url)} />

          {publications.length > 0 && (
            <div className="field">
              <label htmlFor="pub">Publish into</label>
              <select
                id="pub"
                value={form.publicationId ?? ""}
                onChange={(e) => set("publicationId", e.target.value || null)}
              >
                <option value="">Your own profile</option>
                {publications.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {form.kind === "TUTORIAL" && (
            <>
              <div className="field">
                <label htmlFor="diff">Difficulty</label>
                <select
                  id="diff"
                  value={form.difficulty}
                  onChange={(e) => set("difficulty", e.target.value)}
                >
                  <option value="">Not set</option>
                  {DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>
                      {d[0] + d.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="time">Time required</label>
                <input
                  id="time"
                  value={form.timeRequired}
                  onChange={(e) => set("timeRequired", e.target.value)}
                  placeholder="30 minutes"
                />
              </div>
              <div className="field">
                <label htmlFor="tools">Tools</label>
                <p className="help">Comma separated. Shown as a fact box and in HowTo schema.</p>
                <input
                  id="tools"
                  value={form.tools}
                  onChange={(e) => set("tools", e.target.value)}
                  placeholder="Ahrefs, Google Search Console"
                />
              </div>
            </>
          )}

          {form.kind === "RESEARCH" && (
            <>
              <div className="field">
                <label htmlFor="abstract">Abstract</label>
                <textarea
                  id="abstract"
                  rows={5}
                  value={form.abstract}
                  onChange={(e) => set("abstract", e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="method">Methodology</label>
                <p className="help">How the data was gathered. Research without this is an opinion piece.</p>
                <textarea
                  id="method"
                  rows={6}
                  value={form.methodology}
                  onChange={(e) => set("methodology", e.target.value)}
                />
              </div>
            </>
          )}

          <div className="field">
            <label htmlFor="sources">Sources</label>
            <p className="help">One per line. URLs become nofollow links in a citations block.</p>
            <textarea
              id="sources"
              rows={5}
              value={form.sources}
              onChange={(e) => set("sources", e.target.value)}
            />
          </div>
        </div>
      )}

      {tab === "seo" && (
        <div className="form">
          <div className="checks">
            {checks.map((c) => (
              <div key={c.label} className={c.pass ? "check pass" : "check fail"}>
                <span aria-hidden="true">{c.pass ? "\u2713" : "\u25CB"}</span> {c.label}
              </div>
            ))}
          </div>

          <div className="field" style={{ marginTop: 26 }}>
            <label htmlFor="seoTitle">Search title</label>
            <p className="help">
              Leave blank to use the piece&rsquo;s own title. Under 60 characters shows in full.
            </p>
            <input
              id="seoTitle"
              value={form.seoTitle}
              maxLength={70}
              onChange={(e) => set("seoTitle", e.target.value)}
            />
            <p className="counter">{form.seoTitle.length} / 70</p>
          </div>

          <div className="field">
            <label htmlFor="metaDescription">Meta description</label>
            <p className="help">Leave blank to use the subtitle.</p>
            <textarea
              id="metaDescription"
              rows={3}
              maxLength={165}
              value={form.metaDescription}
              onChange={(e) => set("metaDescription", e.target.value)}
            />
            <p className="counter">{form.metaDescription.length} / 165</p>
          </div>

          <div className="field">
            <label htmlFor="takeaways">Key takeaways</label>
            <p className="help">
              One per line. Shown above the piece and used by models that summarise it.
            </p>
            <textarea
              id="takeaways"
              rows={5}
              value={form.keyTakeaways}
              onChange={(e) => set("keyTakeaways", e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="faq">FAQ</label>
            <p className="help">
              Question on one line, answer on the next, then <code>---</code> before the next pair.
              Becomes FAQPage schema.
            </p>
            <textarea
              id="faq"
              rows={8}
              value={form.faq}
              onChange={(e) => set("faq", e.target.value)}
              placeholder={"How long does it take?\nAbout six months.\n---\nDoes it cost anything?\nNo."}
            />
          </div>
        </div>
      )}

      {tab === "preview" && (
        <div className="article" style={{ marginTop: 24 }}>
          <h1>{form.title || "Untitled"}</h1>
          {form.subtitle && <p className="standfirst">{form.subtitle}</p>}
          <pre className="raw-preview">{form.body}</pre>
          <p className="muted-note">
            Formatting is applied when the piece is published. This view shows your raw text.
          </p>
        </div>
      )}
    </div>
  );
}

function seoChecks(f: DraftShape, words: number) {
  const hasH2 = /^##\s+/m.test(f.body);
  const hasLink = /\[[^\]]+\]\([^)]+\)/.test(f.body);
  return [
    { label: "Title set", pass: f.title.trim().length > 0 },
    { label: "Title under 60 characters", pass: (f.seoTitle || f.title).length <= 60 },
    { label: "Subtitle or meta description written", pass: Boolean(f.subtitle || f.metaDescription) },
    { label: "At least 300 words", pass: words >= 300 },
    { label: "Uses section headings", pass: hasH2 },
    { label: "At least one topic", pass: f.topicIds.length > 0 },
    { label: "Key takeaways written", pass: f.keyTakeaways.trim().length > 0 },
    { label: "FAQ added", pass: f.faq.trim().length > 0 },
    { label: "Sources cited", pass: f.sources.trim().length > 0 },
    { label: "Links to something", pass: hasLink },
  ];
}
