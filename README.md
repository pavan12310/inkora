# Inkora

A publishing platform for articles, tutorials and research. Writers draft in a
built-in editor, an editor approves, and approved pieces become server-rendered
pages that Google can crawl and index.

Next.js 15 (App Router) · Postgres via Prisma · Google sign-in via Auth.js.

This is **V1** of the roadmap: the ten things the plan itself listed as V1, built
to work rather than to demo. What was deliberately left out is at the bottom.

---

## What's in V1

| # | Roadmap item | What was built |
|---|---|---|
| 1 | User accounts | Google sign-in; every account gets a handle at `/author/<handle>` |
| 2 | Creator profiles | Bio, expertise, location, links, follower and view counts, Person schema |
| 3 | Writing editor | Markdown editor with autosave, tabs for details/SEO/preview, live SEO checks |
| 4 | Article publishing | Three content types with their own fields, URLs and schema |
| 5 | Topics / categories | Topic pages at `/topic/<slug>`, up to five per piece, followable |
| 6 | Search | Across pieces, authors, publications and topics |
| 7 | Follow, bookmark, like | Follow people, topics and publications; like and save pieces; responses |
| 8 | Publications | Named homes with their own page, owner, writers and followers |
| 9 | Creator analytics | Views, likes, responses, followers, and a per-piece table |
| 10 | SEO / GEO infrastructure | Below |

### Added after V1

| Feature | What it does |
|---|---|
| Email notifications | Editors told of new submissions; writers told when received, published or sent back |
| Image uploads | Cover images via Vercel Blob, with a paste-a-URL fallback |
| First-run seed | Eight starter topics and site settings, so a fresh install is not a dead end |
| The public record | `/record` — published, sent back, acceptance rate, median decision time, and the editor's reasons |
| Publications directory | `/publications` — browse and create, each with About and Submission guidelines tabs |
| Setup notice | Tells an editor what is unconfigured, before it costs them a writer |

### Content types

Each has its own URL prefix, its own fields, and its own schema type — which is
the whole point of separating them rather than using one "category" column.

| Type | URL | Extra fields | Schema |
|---|---|---|---|
| Article | `/article/<slug>` | — | `Article` |
| Tutorial | `/tutorial/<slug>` | difficulty, time, tools | `HowTo` |
| Research | `/research/<slug>` | abstract, methodology | `ScholarlyArticle` |

All three also get key takeaways, an FAQ block, sources, a table of contents,
breadcrumbs and related reading.

### The SEO and GEO layer

Built in, not bolted on:

- Clean permanent URLs; slugs freeze at creation so an edited title never moves a page
- `sitemap.xml` listing only published content and only entity pages that have content behind them
- `robots.txt` blocking `/desk`, `/me`, `/write`, `/search` and `/api`
- Canonical tags, Open Graph and Twitter cards on every page
- `Organization` + `WebSite` schema sitewide, with a `SearchAction`
- `Article` / `HowTo` / `ScholarlyArticle` per piece, plus `BreadcrumbList`
- `FAQPage` schema generated from the FAQ block
- `Person` schema on author pages with `knowsAbout` and `sameAs`
- `CollectionPage` on topics, `Blog` on publications
- RSS at `/feed.xml` with categories
- Key takeaways and FAQ rendered as real text, so a model summarising the page has something to extract

---

## Access model

| Route | Who | Indexable |
|---|---|---|
| `/`, `/explore`, `/topics` | everyone | yes |
| `/article/<slug>` etc. | everyone, once approved | yes |
| `/topic/<slug>`, `/author/<handle>`, `/publication/<slug>` | everyone | yes |
| `/search` | everyone | no — unlimited near-duplicate URLs |
| `/write`, `/write/<id>`, `/me` | signed in, own content only | no |
| `/desk` | `ADMIN_EMAILS` only — **404s** for everyone else | no |

A draft or pending piece has no public page at all. It is absent from the
sitemap and 404s if someone guesses the URL.

---

## Setup

```bash
npm install
cp .env.example .env
```

1. **Database.** Any Postgres — Neon and Supabase free tiers are fine. Put the
   connection string in `DATABASE_URL`, then `npx prisma db push`.
2. **Google OAuth.** console.cloud.google.com → Credentials → OAuth client ID
   (Web). Redirect URI `https://yoursite.com/api/auth/callback/google`, plus the
   localhost one for local work. Fill `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`.
3. **Session secret.** `npx auth secret` → `AUTH_SECRET`.
4. **Make yourself the editor.** `ADMIN_EMAILS="you@gmail.com"`, comma-separated
   for more than one.
5. **Email.** Create a free account at resend.com, verify a domain, and set
   `RESEND_API_KEY` and `EMAIL_FROM`. Without this, writers submit and never hear
   back — it is the single most important optional setting.
6. **Uploads.** Add a Vercel Blob store and set `BLOB_READ_WRITE_TOKEN`. Without
   it, writers paste a cover image URL instead.
5. **Canonical URL.** `NEXT_PUBLIC_SITE_URL` = your real domain, no trailing
   slash. This drives canonical tags, the sitemap and the feed, so a wrong value
   here quietly breaks your SEO.
6. `npm run dev`, then deploy to Vercel with the same variables.

### First run

```bash
npm run db:seed
```

Seeds eight starter topics and the site settings. Safe to re-run; it only
creates what is missing. Without it nothing can be tagged and no topic pages
exist, which is a dead end for your first writer.

Then sign in. If anything is still unconfigured, a notice on the home page will
say so — visible to editors only.

---

## Design decisions worth knowing

**Enum-like columns are `String`, not Prisma enums.** Keeps the schema portable
between Postgres and SQLite so the project builds in CI without a database. The
unions live in `src/lib/types.ts`.

**Slugs are minted once and frozen.** Editing a title later never changes the
URL. A changed URL is a lost ranking.

**Views are counted by a beacon, not during render.** `src/app/api/view` is hit
by a small client component, which keeps post pages statically generated and
cacheable. Once per browser session.

**Body markdown is sanitised at render, not at save.** `src/lib/markdown.ts`
strips everything outside an allowlist, forces `rel="ugc nofollow noopener"` on
every link in submitted text, and restricts iframes to YouTube and Vimeo. Treat
submitted content as untrusted forever, including after approval.

**Approval is enforced server-side.** `requireAdmin()` runs at the top of every
moderation action. Hiding a button is not access control.

**`/desk` returns 404, not 403,** so an unauthorised visitor doesn't learn the
route exists.

**Two pieces in review per writer.** Stops one person filling the queue. Change
`MAX_OPEN_SUBMISSIONS` and `MIN_WORDS` in `src/app/actions.ts`.

**Search uses `mode: "insensitive"`,** which is Postgres-only. Swap for
`to_tsvector` full-text once the corpus is past a few thousand pieces.

---

## The public record

`/record` publishes the moderation figures: how many pieces were published, how
many were sent back, the acceptance rate, the median time to a decision, and the
editor's actual reasons for turning work down.

It is deliberately anonymous. No writer's name and no rejected title ever
appears — publishing those would punish people for having submitted, which is
the opposite of the point. Only the reasons are shown.

This is the strongest positioning move in the product. Every platform claims to
have standards; almost none will show you what they rejected.

## Deliberately not in V1

Each of these is a real decision with its own cost, not an oversight:

- **Newsletters.** Transactional email is now wired up, but a newsletter is a
  different problem: bounce handling, unsubscribe compliance, list hygiene and a
  sending reputation. A product of its own.
- **Communities and discussions.** Another moderation surface. Add it when
  there are people to fill it.
- **Monetization, subscriptions, tipping.** Needs payments, tax handling and
  payouts. Premature before the platform has readers.
- **Custom domains.** Needs wildcard DNS and per-tenant certificates.
- **AI writing assistance.** The SEO checks in the editor are deterministic on
  purpose. A generative assistant makes it trivially easy to mass-produce
  near-identical pages, which is the exact pattern Google's scaled content abuse
  policy targets.
- **Rich-text / block editor.** Markdown is the safe version: it cannot carry
  arbitrary HTML into the page. A block editor means a document model, an HTML
  sanitiser at save and at render, and image hosting.
- **Plagiarism and spam detection.** Human moderation is V1's answer. Automate
  it when volume makes that impossible, not before.

### On the programmatic-pages idea in the roadmap

Topic, author and publication pages are in V1 because each one has real content
behind it. The sitemap deliberately omits topic pages with no published pieces.

Generating topic pages in bulk to capture search demand is a different thing,
and it is the pattern Google's scaled content abuse policy exists to catch. Add
a topic when you have pieces for it, not to have a page for a keyword.

---

## Scripts

```bash
npm run dev        # local
npm run build      # prisma generate + migrate deploy + next build
npm run db:push    # push schema without migrations
npm run db:studio  # browse the data
```

---

## What I would do next, in order

1. **Pick the niche.** One editor reading everything means four to six pieces a
   month done properly. That is a publication, not a platform — a good shape,
   but only if the subject is specific enough that being *the* place for it
   matters. "A publishing platform" competes with Medium on Medium's terms.
2. **Write the first fifteen pieces yourself.** Open submissions on an empty
   site and the only people who reply are the ones who want your domain.
3. **Then open submissions**, with the guidelines and the record already public.

Deliberately still not built: newsletters, monetization, custom domains,
plagiarism detection, and a generative writing assistant. Each is premature
before anyone is reading, and the last one actively invites the scaled-content
problem the review queue exists to prevent.

---

## What this is built in

| Layer | Technology |
|---|---|
| Frontend | TypeScript, React 19, Next.js 15 App Router, plain CSS |
| Backend | TypeScript on Node 20 — Next.js server actions and route handlers |
| Auth | Auth.js v5 with Google OAuth |
| Database | PostgreSQL, accessed through Prisma (you write TypeScript, not SQL) |
| Email | Resend |
| Storage | Vercel Blob or Netlify Blobs, chosen at runtime |

One codebase, one language. There is no separate backend service to run.

## Hosting: Vercel or Netlify

Both work. Netlify supports the App Router, server components, streaming and
both kinds of revalidation through its OpenNext adapter, with no configuration.
A `netlify.toml` is included for the few things it cannot infer.

The one thing that differs is **image uploads**, and the code handles it:

| Host | What to do |
|---|---|
| Vercel | Create a Blob store, set `BLOB_READ_WRITE_TOKEN` |
| Netlify | Nothing — Netlify Blobs is detected automatically, and images are served from `/api/media/<key>` on your own domain |
| Anywhere else | Leave both unset; uploads are disabled and writers paste a cover URL |

### The one that will bite you on either host

Both run this as **serverless functions**, which open a new database connection
per invocation. Use your provider's **pooled** connection string:

- Neon — the host containing `-pooler`
- Supabase — port `6543` (transaction pooler), not `5432`

With the direct connection string, it will work fine in testing and then fall
over the first time more than a handful of people are on the site at once.

### Netlify: two things that will fail if you skip them

**`DATABASE_URL` must be set before the first build.** The build runs
`prisma migrate deploy`, which connects to the database to create the tables.
If the variable is missing the build fails at that step, not at runtime.

**The Prisma engine is declared in `prisma/schema.prisma`, not in
`netlify.toml`.** Netlify's functions run on Amazon Linux, which needs the
`rhel-openssl-3.0.x` query engine. That is already set:

```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "rhel-openssl-3.0.x"]
}
```

Do not try to set this through `PRISMA_CLI_BINARY_TARGETS` in `netlify.toml` —
that variable does not accept `native` and the build will fail with
`Unknown binaryTarget native`. If you change Node away from 20, check whether
you need `rhel-openssl-1.0.x` instead.

`next.config.mjs` also lists Prisma under `serverExternalPackages`, which keeps
the query engine out of the bundle so it can still be found at runtime.

### Why "frontend on one host, backend on another" does not apply here

This is one Next.js application, not two deployables. The pages are rendered by
the server on request — that is how a published piece ends up in the HTML for
Google to read. Splitting it is not a configuration choice; there is nothing to
split.

In particular, **GitHub cannot host the backend.** GitHub stores your code.
GitHub Pages serves static files only: no Node, no database, no sign-in, no
submissions. Use GitHub for the repository and one host — Netlify or Vercel —
for the running site.

### Deploy checklist

1. Push to GitHub, import the repo into Vercel or Netlify
2. Set the environment variables **before the first build**: `DATABASE_URL`
   (pooled), `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`,
   `ADMIN_EMAILS`, `NEXT_PUBLIC_SITE_URL`
3. Add your deployed domain to the Google OAuth redirect URIs:
   `https://yoursite.com/api/auth/callback/google`
4. Deploy. The build runs `prisma migrate deploy` (creating the tables) and
   then seeds the starter topics.
5. Sign in. The setup notice on the home page will tell you what is still missing.
