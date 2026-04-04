# Chicago Transit Tracker — CLAUDE.md

This file provides guidance for Claude Code when working in this repository.

---

## Project Purpose

This project serves two purposes: it is a real, production-deployed transit information site **and** a teaching tool used to train a team on Claude Code workflows (planning, brainstorming, skills, subagents, etc.). When working in this repo, keep both audiences in mind:

- **As a product:** correctness, SEO, and CTA branding compliance matter
- **As a learning resource:** prefer clear, well-documented approaches over clever ones; follow the full superpowers workflow (brainstorm → spec → plan → implement) so the team can see the process modeled correctly; leave decisions explained in spec and plan docs rather than only in code comments

When introducing a new feature or workflow pattern, consider whether it would make a good example for someone learning Claude Code for the first time.

---

## Repository State

A Next.js 16 / Tailwind CSS v4 / TypeScript web app for exploring CTA and Metra transit lines and stations. Data is stored in Firebase Firestore and read at build time via Firebase Admin SDK. Metra GTFS Realtime data (alerts, positions, trip updates) is fetched live via a server-side API proxy. The site is deployed to Firebase App Hosting (SSR).

---

## Project Structure

```
app/
  layout.tsx                  Root layout — Navbar, GA scripts, dark mode init
  page.tsx                    Home page — Hero component
  globals.css                 Tailwind imports + dark mode custom variant
  sitemap.ts                  Dynamic sitemap — fetches all routes from Firestore
  robots.ts                   Robots.txt config
  cta/
    page.tsx                  CTA service list page
    [line]/
      page.tsx                CTA line detail page
      [station]/
        page.tsx              CTA station detail page
  metra/
    page.tsx                  Metra service list page
    [line]/
      page.tsx                Metra line detail page
      [station]/
        page.tsx              Metra station detail page
  api/
    cta/alerts/
      route.ts                Server-side proxy for CTA Customer Alerts API
    metra/[...path]/
      route.ts                Server-side proxy for Metra GTFS Realtime API
  components/
    Navbar.tsx                Top nav — links, ThemeToggle, MobileMenuToggle
    MobileMenuToggle.tsx      Hamburger menu (client component)
    ThemeToggle.tsx           Light/dark toggle — persisted to localStorage
    Hero.tsx                  Home page banner with CTA and Metra service cards
    CTAAlerts.tsx             CTA realtime rail alerts feed (client component)
    MetraAlerts.tsx           Metra realtime alerts feed (client component)
    MetraPositions.tsx        Metra realtime vehicle positions (client component, debug)
    MetraTripUpdates.tsx      Metra realtime trip updates (client component, debug)
    PageHeader.tsx            Uniform page title with optional badges/description
    Breadcrumb.tsx            Semantic breadcrumb for line and station pages
    LinkCard.tsx              Clickable list card used on service and line pages
    LineDetail.tsx            Full line detail layout
    StationDetail.tsx         Full station detail layout
  lib/
    firebase-admin.ts         Firestore singleton (Admin SDK)
    cta-alerts.ts             Client-side fetch + types for CTA Customer Alerts API
    metra-realtime.ts         Client-side fetch + protobuf decode for Metra feeds
    transit.ts                Data access functions — getLinesForService, getLine, etc.
    types.ts                  Line and Station TypeScript interfaces
scripts/
  seed-lines.ts               Seeds 19 lines into Firestore
  seed-stations.ts            Seeds stations from CTA API + Metra GTFS
  tsconfig.json               CommonJS tsconfig for ts-node script execution
__tests__/                    Jest + React Testing Library test suites
```

---

## Tech Stack

- Next.js 16 (App Router, SSR with `generateStaticParams` for pre-rendering)
- React 19
- TypeScript 5
- Tailwind CSS v4 (class-based dark mode via `@custom-variant dark`)
- Firebase Admin SDK (build-time Firestore reads)
- Firebase App Hosting (SSR deployment target)
- gtfs-realtime-bindings (protobuf decode for Metra GTFS Realtime feeds)
- Google Analytics 4 (G-KQ1MNGBQP2, loaded via `next/script afterInteractive`)
- Jest 30 + React Testing Library

---

## Commands

```bash
npm run dev            # Dev server at http://localhost:3000
npm run build          # Production build (SSR + static pre-rendering)
npm run lint           # ESLint
npm test               # Jest
npm run test:watch     # Jest watch mode
npm run seed:lines     # Seed Firestore lines collection
npm run seed:stations  # Seed Firestore stations collection
firebase deploy --only firestore # Deploy Firestore rules
# App deploys automatically via Firebase App Hosting on push to main
```

---

## Key Architecture Decisions

### SSR with static pre-rendering + Firestore at build time

The site runs as a server-side rendered Next.js app deployed to Firebase App Hosting. Pages with `generateStaticParams` are pre-rendered at build time (SSG). API routes (`app/api/`) run server-side on Cloud Run.

- `generateStaticParams` enumerates slugs for all dynamic routes (pre-rendered as static HTML)
- Server components fetch line/station data as props
- `serverExternalPackages: ['firebase-admin']` prevents Next.js from bundling the Admin SDK client-side
- `app/api/metra/[...path]/route.ts` proxies Metra GTFS Realtime requests server-side (avoids CORS, hides API key)

### Dark mode

Tailwind v4 class-based dark mode. A blocking inline `<script>` in `<head>` applies `.dark` to `<html>` before first paint to prevent flash. `suppressHydrationWarning` is set on `<html>`. `ThemeToggle` uses a mount-only render pattern to avoid hydration mismatch.

### Firestore credentials

`app/lib/firebase-admin.ts` checks for `service-account.json` first, then falls back to `applicationDefault()`. `service-account.json` is gitignored.

### Duplicate station slugs

Some stations share names across CTA and Metra (e.g. Rosemont). The seed script detects duplicates and appends `-cta` / `-metra` to the slug and doc ID.

---

## Firestore Collections

### `lines` — doc ID = slug (e.g. `red`, `bnsf`, `up-n`)

19 documents total (8 CTA rapid transit + 11 Metra commuter rail). Seeded by `scripts/seed-lines.ts`.

### `stations` — doc ID = slug (e.g. `clark-lake`, `union-station-metra`)

~388 documents. Seeded by `scripts/seed-stations.ts` using:

- CTA: Chicago Open Data Portal Socrata API (no auth required)
- Metra: GTFS static zip from Metra's public schedule feed (no auth required)

---

## CTA Branding Guidelines

All CTA-related UI must comply with the CTA Trademark Guidelines for Developers.

- **Local copy:** `docs/design guidelines/CTA_Trademark_Developer_Guidelines_(with_Branding_Guide)_v1_0.pdf`
- **Online:** `https://www.transitchicago.com/developers/branding/`

### Official 'L' Route Colors — use these exact hex values, no substitutions

| Line      | Hex       | Pantone |
| --------- | --------- | ------- |
| Red       | `#c60c30` | 186C    |
| Blue      | `#00a1de` | 299C    |
| Brown     | `#62361b` | 161C    |
| Green     | `#009b3a` | 355C    |
| Orange    | `#f9461c` | 172C    |
| Purple    | `#522398` | 267C    |
| Pink      | `#e27ea6` | 204C    |
| Yellow    | `#f9e300` | 012C    |
| Sign Grey | `#565a5c` | 425C    |

These are already correctly set in `scripts/seed-lines.ts` and `app/components/StationDetail.tsx`.

### Attribution

- Always credit CTA data with a phrase like "Data provided by Chicago Transit Authority" or "Powered by CTA data"
- Never use "official", "authorized", or "in partnership with CTA"

### Project naming

- **Chicago Transit Tracker** is compliant — CTA is not the first word
- Never name any page or feature in a way that sounds like it was made by or endorsed by CTA

### Logos — what is and isn't allowed

- **Prohibited:** Any CTA agency logo (circle logo, text-based logos, or approximations)
- **Allowed:** CTA Bus Tracker icon — only alongside Bus Tracker API data, black/white/grey only. Must include note: _"CTA Bus Tracker (SM) logo icon is a trademark of the Chicago Transit Authority."_
- **Allowed:** CTA Train Tracker icon — only alongside Train Tracker API data, black/white/grey only. Must include note: _"CTA Train Tracker (SM) logo icon is a trademark of the Chicago Transit Authority."_
- **Allowed:** US DOT bus icon — keep black or white, do not colorize
- **Allowed:** CTA 'L' train icon — can be used for L service information; may be colored to match official route colors

### Other rules

- Do not embed or reproduce official CTA maps or documents — link to them on the CTA website instead
- Do not imply CTA endorsement, sponsorship, or affiliation in any copy or UI

---

## CI / CD

**Deployment** is handled by Firebase App Hosting. Pushing to `main` (via merged PR) triggers an automatic build and deploy through Firebase's GitHub integration. No manual deploy step needed.

**CI checks** run via GitHub Actions (`.github/workflows/deploy.yml`) on every push to `main` and on PRs:

1. `npm ci` — install dependencies
2. `npm run lint` — ESLint + Prettier
3. `npm test` — Jest test suite

**Secrets and environment variables:**

| Secret            | Where it lives       | What it is                                |
| ----------------- | -------------------- | ----------------------------------------- |
| `METRA_API_TOKEN` | Cloud Secret Manager | Metra GTFS Realtime API key (server-only) |
| Firebase SA creds | Firebase App Hosting | Managed automatically by App Hosting      |

Secrets are configured in `apphosting.yaml` and managed via `firebase apphosting:secrets:set`.

---

## Git Workflow

**Branch protection is enabled on `main`.** Direct pushes to `main` are blocked. All changes must be merged via a pull request. No approving review is required (solo project), so you can open and merge your own PRs.

**Auto-delete is enabled.** GitHub automatically deletes the feature branch after a PR is merged — no manual cleanup needed.

Typical workflow:

```bash
git checkout -b your-feature-branch
# make changes, commit
git push origin your-feature-branch
gh pr create --base main
gh pr merge --squash
# branch is deleted on GitHub automatically after merge
git checkout main && git pull && git branch -d your-feature-branch
```

---

## Standing Rules

**Sitemap:** Any time a new page route is added, `app/sitemap.ts` must be updated to include it. No exceptions.

**SSR compatibility:** The site runs as a server-side rendered app. API routes are available under `app/api/`. Dynamic routes should use `generateStaticParams` for pre-rendering where possible.

**Firebase Admin in server components only:** Never import `firebase-admin` or anything from `app/lib/firebase-admin.ts` in a client component (`'use client'`).

**CTA branding:** All CTA UI must use the official hex colors above and follow the trademark rules. Full guidelines at `https://www.transitchicago.com/developers/branding/`.

**Planning and spec documents:** All planning documents go in `docs/superpowers/plans/YYYY-MM-DD-topic.md` and all design specs go in `docs/superpowers/specs/YYYY-MM-DD-topic-design.md`. Never save these only to Claude's internal plans directory — always write them to the repo so they are versioned with the code.

---

## SEO Rules

These rules must be applied whenever a new page is added or an existing page's content changes.

**Every page must export `metadata` or `generateMetadata`.** No exceptions. Static pages use `export const metadata: Metadata = { ... }`. Dynamic routes (`[param]`) must use `export async function generateMetadata(...)`.

**Required metadata fields** on every page:

- `title` — short page-level title (the root layout template appends `| Chicago Transit Tracker`)
- `description` — descriptive sentence specific to the page
- `openGraph` — must include `title`, `description`, `url`, `images`, and `type: 'website'`
- `twitter` — must include `card: 'summary_large_image'`, `title`, `description`, and `images`

**Site constants:** Always import from `app/lib/siteConfig.ts`. Never hardcode the site name, canonical URL, or default OG image path directly in a page file.

```typescript
import { siteConfig } from '../lib/siteConfig'
// siteConfig.name  — 'Chicago Transit Tracker'
// siteConfig.url   — 'https://chicago-transit-tracker.com'
// siteConfig.ogImage — '/og-default.png'
```

**`og:image` / `twitter:image`:** Use `siteConfig.ogImage` as the minimum fallback. If a page-specific image is available (e.g., `line.photoUrl`), it may be used instead, but `siteConfig.ogImage` must still be the fallback.

**`openGraph.url`:** Must be the full canonical URL of the page — `${siteConfig.url}/path`.

**New dynamic routes checklist:**

1. Add `generateStaticParams` (for pre-rendering at build time)
2. Add `generateMetadata` with all required fields above
3. Update `app/sitemap.ts` to include the new route
