# Human-Facing Site Map Page — Design Spec

**Date:** 2026-04-11
**Status:** Approved
**Author:** Reed + Claude

---

## Context

Chicago Transit Tracker already publishes an XML sitemap at `/sitemap.xml` for search engines, but there is no equivalent page for humans. A user-facing site map serves two goals:

1. **Navigation aid.** Users who want a bird's-eye view of every page — or who are looking for a specific line or station they can't remember how to find — get a single directory to scan.
2. **SEO internal linking.** A fully-expanded HTML page of real anchor tags gives search engines another crawl path into every line, station, and hub page, reinforcing the XML sitemap.

The page lives at `/sitemap` and is linked from the global footer. It is statically rendered at build time from the same Firestore data sources the XML sitemap already uses — no new data layer, no client-side JavaScript.

---

## Scope

### In scope

- New server-rendered page at `app/sitemap/page.tsx` rendering to `/sitemap`
- Sections for: top-level pages, CTA rail (lines + stations), Metra (lines + stations), Pace bus (routes only)
- Footer link added to `app/components/Footer.tsx`
- Full page metadata per project SEO rules
- Entry in `app/sitemap.ts` for the new `/sitemap` route
- Jest tests for the page and updated footer test

### Out of scope

- Individual Metra train pages (~1,000 URLs) — covered by line pages and the XML sitemap
- Individual Pace stops (potentially 5,000+ URLs) — covered by route pages and the XML sitemap
- Search, filtering, collapsible sections, or any client-side interactivity
- A new "all trains" per-line index page (Option C from brainstorming — rejected)
- Restructuring the XML sitemap

---

## Design

### Route

Next.js reserves `sitemap.ts`/`sitemap.tsx` at the app root for the XML sitemap route, but a **directory** named `sitemap` containing `page.tsx` is a separate route and does not conflict. The new file is `app/sitemap/page.tsx`, resolving to `/sitemap`.

### Component type

Server component. Statically pre-rendered at build time. No `'use client'`, no hooks, no polling. Data is fetched once during the build using existing helpers:

- `getLinesForService('cta')` and `getLinesForService('metra')` from `@lib/transit`
- `getStationsForLine(shortName)` from `@lib/transit`
- `getAllPaceRoutes()` from `@lib/pace`

These are the same functions [app/sitemap.ts](app/sitemap.ts) already uses, so behavior stays consistent between the XML and HTML sitemaps.

### Page structure

Top to bottom:

1. **`PageHeader`** — title "Site Map", breadcrumb Home → Site Map. No hero photo (pass `imageSrc={null}` so the default fallback is used).
2. **Pages section** — `<h2>` "Pages", followed by a simple list of links: Home, CTA, CTA Alerts, Metra, Metra Alerts, Pace, Pace Pulse, Terms, Privacy.
3. **CTA section** — `<h2>` "CTA Rail". For each CTA line (in the order returned by `getLinesForService`): an `<h3>` with the line name, styled with a left border accent in the line's official hex color (matching existing design language on line/station pages). Below the heading, a `columns-2 md:columns-3` list of station links, each an `<a>` pointing to `/cta/{line.slug}/{station.slug}`.
4. **Metra section** — Same pattern as CTA. `<h2>` "Metra", then each line's stations columned underneath.
5. **Pace section** — `<h2>` "Pace Bus", followed by a `columns-2 md:columns-3` list of every Pace route, each link showing route number and name and pointing to `/pace/{route.slug}`. No individual stops.

All links are rendered as real anchor tags in the initial HTML. No `<details>`, no collapsibles, no pagination. Ctrl+F works across the full page and every link is visible to crawlers.

### Styling

- Tailwind utility classes only, no new CSS
- `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` container matching other top-level pages
- `columns-2 md:columns-3` for station and Pace route lists so long lists don't produce a mile-long page
- Dark mode via existing `dark:` utility patterns
- Line color accents applied with inline `style={{ borderLeftColor: line.color }}` since the hex values come from Firestore at build time (Tailwind can't generate arbitrary classes from runtime data)

### Metadata

```typescript
export const metadata: Metadata = {
  title: 'Site Map',
  description:
    'Full directory of every page on Chicago Transit Tracker — CTA rail lines and stations, Metra lines and stations, and Pace bus routes.',
  openGraph: {
    title: 'Site Map',
    description: '...same...',
    url: `${siteConfig.url}/sitemap`,
    images: [siteConfig.ogImage],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Site Map',
    description: '...same...',
    images: [siteConfig.ogImage],
  },
}
```

### Footer update

Add a "Site Map" `<li>` to the `<nav>` in [app/components/Footer.tsx](app/components/Footer.tsx), after the Privacy link. Uses the same styling as the existing Terms and Privacy links.

### XML sitemap update

Add `/sitemap` as an entry in [app/sitemap.ts](app/sitemap.ts) — per the project's standing rule, every new route must be included. Priority 0.4, `changeFrequency: 'weekly'`.

---

## Testing

### New: `__tests__/pages/sitemap.test.tsx`

Mock `getLinesForService`, `getStationsForLine`, and `getAllPaceRoutes` using the existing fixtures pattern from `__tests__/fixtures.ts` (`mockLine`, `mockMetraLine`, `mockStation`, `mockMetraStation`). Assertions:

- Renders section headings for Pages, CTA Rail, Metra, and Pace Bus
- Renders each mocked CTA line heading
- Renders each mocked Metra line heading
- Renders at least one station link per line with the correct href (e.g. `/cta/red/clark-lake`)
- Renders every mocked Pace route link with the correct href
- Renders top-level links: `/`, `/cta`, `/cta/alerts`, `/metra`, `/metra/alerts`, `/pace`, `/pace/pulse`, `/terms`, `/privacy`
- Does **not** render any individual Pace stop links or Metra train links

### Updated: `__tests__/components/Footer.test.tsx`

Add an assertion that a "Site Map" link pointing to `/sitemap` is present in the footer nav.

### Commands

- `npm test` — must pass with zero warnings and zero errors
- `npm run lint` — must be fully clean

---

## Verification

1. `npm run dev` and visit http://localhost:3000/sitemap — verify the page renders with all four sections, line headings show the correct color accents, and station/route links work.
2. Click through a few CTA station links, Metra station links, and Pace route links to confirm they navigate correctly.
3. Check the footer on any page and confirm the "Site Map" link is visible and navigates to `/sitemap`.
4. View page source on `/sitemap` and confirm every link is present as a real `<a>` tag in the initial HTML (no JS required).
5. `curl http://localhost:3000/sitemap.xml | grep /sitemap` — confirm the new route is in the XML sitemap.
6. `npm run build` — confirm the page is statically generated.
7. `npm test` and `npm run lint` — both clean.

---

## Critical files

- **New:** `app/sitemap/page.tsx`
- **New:** `__tests__/pages/sitemap.test.tsx`
- **Modified:** `app/components/Footer.tsx`
- **Modified:** `app/sitemap.ts`
- **Modified:** `__tests__/components/Footer.test.tsx`
