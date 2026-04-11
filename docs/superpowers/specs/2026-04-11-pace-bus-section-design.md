# Pace Suburban Bus Section — Design Spec

**Date:** 2026-04-11
**Status:** Approved, ready for implementation plan
**Research:** [docs/research/2026-04-11-pace-bus-developer-data.md](../../research/2026-04-11-pace-bus-developer-data.md)

---

## Summary

Add a new `/pace` section to Chicago Transit Tracker covering Pace Suburban Bus. Built as a **static-only reference section** — schedules, routes, stops, and a Pulse BRT feature page — because Pace does not publish a public realtime API. Structure mirrors the existing `/metra` section minus realtime components, with adaptations for Pace's scale (~240 routes vs Metra's 11) and vocabulary (routes and stops vs lines and stations).

The work is purely additive. No existing pages, collections, components, or API routes change. A new hourly Cloud Function syncs Pace's static GTFS feed into new Firestore collections, a new data-access module reads from them at build time, and new pages render the result.

## Context and Constraints

**Data availability** (verified — see research doc):

- Pace publishes a standard GTFS static feed at `https://www.pacebus.com/gtfsdownload`, updated monthly, covering ~240 routes and ~6,000 stops
- Pace does **not** publish any realtime data to the public (no GTFS-realtime, no REST predictions API)
- Pace's consumer tracker runs on Trapeze TransitMaster — a different platform from CTA's Clever Devices BusTime and does not expose a developer API
- The CTA Bus Tracker API key obtained from `ctabustracker.com/home` is a valid BusTime key for CTA buses. It is **not relevant to this Pace work** and is not used anywhere in this design. It may be useful for a future CTA bus section — out of scope here
- Pace's license permits static GTFS redistribution in derived apps under a non-exclusive, non-commercial license. It explicitly prohibits use of the Pace name or logo without written consent. Descriptive use of the name "Pace" in body copy is a factual reference and is fine; the Pace logo cannot be displayed

**Scale** — Pace's network is roughly 12× the routes and 15× the stops of CTA and Metra combined. The information architecture and data layer are designed around this difference rather than reusing patterns that work for 8–19 lines.

**Teaching repo consideration** — this codebase is also a learning resource. The design favors clarity over cleverness and documents decisions (in spec and plan) so future contributors can follow the reasoning.

## Information Architecture

### URL structure

```
/pace                         Landing — search + browse list
/pace/pulse                   Pulse feature page
/pace/[route]                 Route detail — direction toggle, stop list
/pace/[route]/[stop]          Stop detail — schedule table by direction and day
```

Route slugs use the numeric route short name where possible (`208`, `250`, `353`) and named slugs for Pulse (`milwaukee-pulse`, `dempster-pulse`). Stop slugs follow the existing Metra pattern — slugified stop name with a disambiguation suffix when collisions occur.

### Navbar

One new top-level link, `Pace`, between "Metra" and the alerts dropdown. No Pace alerts menu item. Pulse is reached from the Pace landing page rather than the global nav.

### Home page Hero

Three equal service cards: CTA, Metra, Pace. Pace card body copy reads **"Schedules & Routes — explore Pace Suburban Bus's 240+ routes across the Chicago suburbs"** while CTA and Metra continue to read "Live Tracking & Schedules." The small copy difference sets honest expectations about the realtime gap without visually demoting Pace. Three cards collapse to a single column on mobile.

### Landing page (`/pace`)

Primary user task is "I know my route — take me to it" with browsing as a strong secondary. Layout:

1. **PageHeader** — title "Pace Suburban Bus", breadcrumb `Home / Pace`, descriptive subtitle
2. **Search input** — client component, filters ~240 routes in-browser on every keystroke (~30 KB of data passed from server)
3. **Inline alert note** — one small line of copy: "For Pace service advisories, visit pacebus.com." External link. This is the only concession to the missing alerts feature.
4. **Pulse feature block** — highlighted card section listing Pulse routes with their branded colors, linking to `/pace/pulse` and to each Pulse route detail page
5. **Browse by region** — grouped lists under region headings (North, Northwest, West, Southwest, South, Heritage), each route rendered as a `LinkCard` with its colored chip

When a search query is non-empty, the Pulse block and region groups are hidden and replaced by a flat filtered result list.

### Pulse feature page (`/pace/pulse`)

Short curated landing: brief explanation of what makes Pulse different from local Pace service (branded stations, off-board fare, limited stops, higher-frequency), followed by cards for each Pulse route. Small page, hand-authored content, server-rendered from Firestore Pulse routes filtered by `serviceType === 'pulse'`.

### Route detail (`/pace/[route]`)

1. **PageHeader** — breadcrumb `Home / Pace / Route 208`, colored route chip, route long name, description from GTFS `route_desc` if present
2. **Direction toggle** — client component, two tabs (e.g. "East to Evanston" / "West to Schaumburg")
3. **Stop list** — stop sequence for the selected direction, each stop as a `LinkCard` linking to the stop detail page
4. **Route map** — Leaflet/Mapbox rendering GTFS shapes, same component pattern Metra uses. Optional for v1 — can ship after the first PR if v1 becomes too large

### Stop detail (`/pace/[route]/[stop]`)

1. **PageHeader** — breadcrumb, stop name, chips for every route serving this stop
2. **Schedule table** — client component with tabs for Weekday / Saturday / Sunday, columns per direction, rows of scheduled departure times. Reads from `/api/pace/schedules/[slug]`
3. **Small location map** — optional v1 feature

## Data Model

### New types (`app/lib/pace-types.ts`)

Kept in a new file rather than appended to the existing `app/lib/types.ts` to avoid unwieldy growth.

```typescript
export interface PaceRoute {
  slug: string                 // '208', 'milwaukee-pulse'
  shortName: string            // '208', 'Milwaukee Pulse'
  longName: string             // 'Golf Road', 'Milwaukee Avenue'
  serviceType: 'pulse' | 'local' | 'express' | 'feeder'
  region: 'north' | 'northwest' | 'west' | 'southwest' | 'south' | 'heritage'
  color: string                // hex
  textColor: string            // '#000000' or '#FFFFFF' — WCAG contrast
  description?: string         // from route_desc if present
  directions: PaceDirection[]
}

export interface PaceDirection {
  id: string                   // GTFS trip.direction_id: '0' | '1'
  name: string                 // e.g. 'East to Evanston', derived from headsigns
}

export interface PaceStop {
  slug: string
  name: string                 // 'Golf Rd & Waukegan Rd'
  lat: number
  lon: number
  routes: string[]             // route slugs that serve this stop
  wheelchairBoarding: boolean
}
```

### New Firestore collections

| Collection          | Doc count  | Key               | Contents                                            |
| ------------------- | ---------- | ----------------- | --------------------------------------------------- |
| `pace-routes`       | ~240       | route slug        | `PaceRoute` records                                 |
| `pace-stops`        | ~6,000     | stop slug         | `PaceStop` records                                  |
| `pace-route-stops`  | ~240       | route slug        | Per-direction canonical stop sequence               |
| `pace-schedules`    | ~6,000     | stop slug         | Departure times grouped by route, direction, day   |

Kept separate from the existing `lines` / `stations` / `schedules` collections rather than mixing services. Reasons: pure volume (Pace is ~12× CTA+Metra combined), cleaner queries in `getAllPaceRoutes`, independent change-detection and sync paths, and zero risk of breaking CTA/Metra reads during development.

The existing `gtfs-meta` collection gets one more doc — `pace` — with the same shape as `cta` and `metra` (`lastModified`, `etag`, `lastCheckedAt`, `lastSyncedAt`, `lastError`).

### Derived fields — how the sync computes them

**`serviceType`:**
- `pulse` — route short name ends with "Pulse" OR route is on a hardcoded Pulse list (Milwaukee Pulse, Dempster Pulse, plus any future Pulse routes that get added)
- `express` — `route_type=3` AND route long name contains "Express" OR `route_desc` indicates express service
- `feeder` — route short name starts with `8` (Pace's internal convention) OR GTFS flags as on-demand/community
- `local` — everything else (the default and vast majority)

**`region`** — derived from the first digit of the route short name, following Pace's own numbering convention:

| Digit | Region      | Notes                                         |
| ----- | ----------- | --------------------------------------------- |
| `2`   | north       | Evanston, Skokie, Wilmette                    |
| `3`   | northwest   | Arlington Heights, Schaumburg, Elgin          |
| `4`   | west        | Oak Park, River Forest, western suburbs       |
| `5`   | southwest   | LaGrange, Joliet                              |
| `6`   | south       | Harvey, south suburbs                         |
| `7`   | southwest   | Overflow / express bucket                     |
| `8`   | per-route   | Feeder routes, nearest-neighbor assignment    |
| `9`   | heritage    | Heritage Corridor                             |

Pulse routes have hardcoded regions regardless of numbering. A small override map at `functions/src/lib/parsers/pace-region-overrides.ts` handles edge cases we find during or after the first real parse run. Treating this as "good enough + fixable" is cheaper than building perfect classification upfront; we expect the heuristic to be right for ~85% of routes out of the box.

**`color` / `textColor`:**
- If `route_color` is populated in `routes.txt` and is not equal to Pace's default corporate blue → use as-is
- Otherwise fall back to Pace corporate blue (hex verified during implementation from Pace marketing — tentatively `#005DAA`)
- Pulse routes are hardcoded to their branded colors (Milwaukee Pulse orange, Dempster Pulse teal — exact hex values verified during implementation) regardless of GTFS contents
- `textColor` computed via WCAG contrast check — pure black or pure white, whichever has better contrast

### No changes to existing collections

`lines`, `stations`, `schedules`, `metra-trips`, `metra-station-trips`, `metra-trip-indexes`, and `cta-alerts` are all untouched.

## GTFS Sync

### New Cloud Function — `syncPaceGtfs`

Lives in `functions/src/index.ts` alongside `syncCtaGtfs` and `syncMetraGtfs` — three parallel functions sharing the same shape.

- **Schedule:** hourly at `:10` (CTA runs `:00`, Metra `:05`; staggered to avoid Firestore write contention and keep logs clean)
- **Feed URL:** `https://www.pacebus.com/gtfsdownload`, following redirects
- **Change detection:** HEAD request checking `Last-Modified` and `ETag` against `gtfs-meta/pace`. Same strategy as the existing CTA path (Pace does not publish a `published.txt` like Metra). The existing `change-detection.ts` helper will be refactored lightly or extended to expose a generic HEAD-based checker if the CTA helper isn't already reusable
- **Download and parse:** on change, download zip, run the new parser, write derived documents in batches
- **Idempotent and additive:** writes to `pace-*` collections only, never touches `lines` / `stations` / `schedules`

### New parser — `functions/src/lib/parsers/pace-schedules.ts`

Modeled on the existing `metra-schedules.ts` / `metra-trips.ts` parsers. Takes a downloaded GTFS zip and emits four Firestore write batches.

Steps:

1. Read standard GTFS tables via existing `gtfs-utils.ts` CSV parser — `routes.txt`, `stops.txt`, `trips.txt`, `stop_times.txt`, `calendar.txt`, `calendar_dates.txt`, `shapes.txt`
2. Build `PaceRoute` records — applying the serviceType / region / color derivation rules above. Directions derived by collecting distinct `(direction_id, headsign)` pairs per route and taking the two most common
3. Build `PaceStop` records from `stops.txt` where `location_type = 0` or empty (ignore station parents). `routes` field populated in a second pass
4. Build `pace-route-stops` records — one per route, with per-direction canonical stop sequences. Pace routes have many pattern variants (expresses skipping stops, short-turns, branches); v1 takes the longest pattern per `(route, direction)` as canonical. Variant handling deferred to post-v1
5. Build `pace-schedules` records — one per stop, departures grouped by route, direction, and service type (weekday/Saturday/Sunday derived from calendar.txt)
6. Write to Firestore via existing `firestore-writer.ts` in 500-op batches, in order: routes → stops → route-stops → schedules. On any batch failure, abort and do not update `lastSyncedAt` so the next run retries

### Performance

Pace's GTFS zip is smaller than CTA's (~20 MB vs ~99 MB) but produces more derived documents. Expected totals: ~240 + ~6,000 + ~240 + ~6,000 ≈ 12,500 docs. At 500 per batch, ~25 sequential batches — comfortably under the 540-second Cloud Function timeout. Timing is instrumented via structured logs.

### No seed script

All data is derived from GTFS via the sync function. First deploy of `syncPaceGtfs` populates everything. For local dev ergonomics, an optional `npm run sync:pace` script can invoke the parser module against a service account — nice to have, not required for v1.

### Error handling

Three failure modes, all safe:

1. **Feed unreachable** — log error, update `gtfs-meta/pace.lastError`, do not touch derived collections. Existing pages continue serving last-good data
2. **Feed parses malformed** — bail out before any writes, log specific parse failure
3. **Partial write failure** — abort the run, leave `lastSyncedAt` unchanged, retry next hour. Writes are ordered (routes → stops → route-stops → schedules), and per-collection isolation means a `pace-schedules` failure does not corrupt `pace-routes`

## Pages and Components

### New files

```
app/pace/
  page.tsx                       Pace landing (server)
  pulse/
    page.tsx                     Pulse feature page (server)
  [route]/
    page.tsx                     Route detail (server)
    [stop]/
      page.tsx                   Stop detail (server)

app/api/pace/
  schedules/[slug]/route.ts      Stop schedule reader
  route-stops/[route]/route.ts   Route stop sequence reader

app/components/
  PaceRouteSearch.tsx            Client-side search/filter (client)
  PaceBrowseList.tsx             Pulse block + grouped regions (server)
  PaceScheduleTable.tsx          Day and direction tabs (client)
  PaceRouteChip.tsx              Colored route pill (server)

app/lib/
  pace.ts                        Data-access helpers (async, build-time)
  pace-types.ts                  PaceRoute, PaceStop, PaceDirection
```

### Component reuse

These existing components are already service-agnostic and get reused unchanged: `PageHeader`, `Breadcrumb`, `LinkCard`, `ThemeToggle`, `Navbar`, `MobileMenuToggle`. `LineChipList` is extended to accept a minimal `{slug, shortName, color, textColor, href}` shape (additive, does not break CTA/Metra callers) or a parallel `PaceRouteChipList` is added — chosen during implementation based on what the existing types allow cleanly.

### Server vs client components

Per CLAUDE.md rules, server-by-default. `PaceRouteSearch` and `PaceScheduleTable` are the only client components — search needs input state, schedule table needs fetch-on-mount and tab state.

### Data access (`app/lib/pace.ts`)

Parallels `app/lib/transit.ts` patterns — async server functions reading from Firestore via Firebase Admin SDK at build time:

```typescript
getAllPaceRoutes(): Promise<PaceRoute[]>
getPaceRoute(slug: string): Promise<PaceRoute | null>
getAllPaceStops(): Promise<PaceStop[]>
getPaceStop(slug: string): Promise<PaceStop | null>
getPaceRouteStops(routeSlug: string, directionId: string): Promise<PaceStop[]>
```

`transit.ts` stays CTA/Metra-only. Shared extraction is deferred until a second caller actually needs it.

### API routes

Two new routes under `app/api/pace/`, both following the existing `/api/schedules/[slug]` pattern exactly:

- **`GET /api/pace/schedules/[slug]`** — reads `pace-schedules/{slug}`, returns grouped times by direction and day, cache headers `public, s-maxage=3600, stale-while-revalidate=86400`, validates slug parameter, 404 on missing, 500 on Firestore errors
- **`GET /api/pace/route-stops/[route]`** — reads `pace-route-stops/{route}`, same cache and validation rules

### Search implementation

Client-side filtering of ~240 routes is sub-millisecond and doesn't need external search infra. `PaceRouteSearch` receives the full `PaceRoute[]` as a prop (~30 KB inlined in server HTML), maintains query state, and filters on `shortName` (exact or prefix) and `longName` (substring), case-insensitive. Results render in place, replacing the browse list while the query is non-empty.

### SEO metadata

Every new page exports metadata per the standing rules:

| Page                        | Metadata source                                                          |
| --------------------------- | ------------------------------------------------------------------------ |
| `/pace`                     | Static `metadata` export                                                 |
| `/pace/pulse`               | Static `metadata` export                                                 |
| `/pace/[route]`             | `generateMetadata(params)` reading from Firestore                        |
| `/pace/[route]/[stop]`      | `generateMetadata(params)` reading from Firestore                        |

All four set `title`, `description`, `openGraph` (including `title`, `description`, `url`, `images`, `type: 'website'`), and `twitter` (`card: 'summary_large_image'`, plus title/description/images). `openGraph.url` is the full canonical URL. Images fall back to `siteConfig.ogImage` — v1 has no per-route or per-stop imagery.

### Sitemap

`app/sitemap.ts` updated to append Pace entries via `getAllPaceRoutes()` and `getAllPaceStops()`. Additional entries total ~6,240 — well under the 50,000 sitemap limit.

### generateStaticParams

All four dynamic-route pages pre-render at build time. The largest is `/pace/[route]/[stop]` at ~6,000 pages. Build-time impact is a step up from the current site (~237 Metra station pages) but should stay under a few minutes on Firebase App Hosting. If build time becomes unreasonable during PR 4, fallback is ISR for the stop pages. Low expected risk.

## Branding and License Compliance

- **No Pace logo anywhere.** Navbar, landing hero, footer, about pages, cards — nowhere. Text-only "Pace Suburban Bus" treatment. This is the hard rule from Pace's license
- **Descriptive use of "Pace" is fine** — "Route 208 is operated by Pace Suburban Bus" is factual and permitted
- **No implied endorsement** — no "official," "in partnership with," or similar copy
- **Generic bus iconography** — the US DOT bus icon is explicitly allowed under CTA's branding guidelines and is a safe neutral choice for Pace too. Colored per Pace corporate blue where a visual is needed
- **Attribution** — footer or Pace landing page copy includes a line crediting Pace data, such as "Schedule data provided by Pace Suburban Bus"

## Testing

Following the repo's testing conventions — all tests in `__tests__/`, mirroring source structure, shared fixtures in `__tests__/fixtures.ts`, `@jest-environment node` on API routes.

**New test files:**

- `__tests__/functions/pace-schedules.test.ts` — parser tests against a small GTFS zip fixture covering Pulse, local, express, and feeder routes; assertions on derivation rules, direction extraction, route-stop sequences, schedule grouping, region override table
- `__tests__/api/pace-schedules.test.ts` and `__tests__/api/pace-route-stops.test.ts` — mocked Firestore chain, 200 / 404 / 500 paths, cache header verification
- `__tests__/pages/pace.test.tsx` and `__tests__/pages/pace-route.test.tsx` — mocked `pace.ts` helpers, assertions on landing page structure and route detail rendering
- `__tests__/components/PaceRouteSearch.test.tsx` and `__tests__/components/PaceScheduleTable.test.tsx` — user interaction (type query, assert filter), fetch-on-mount with loading and error states

**New fixtures in `__tests__/fixtures.ts`:** `mockPaceRoute`, `mockPaceStop`, `mockPacePulseRoute`, parallel to existing `mockLine` / `mockStation`.

**CI discipline:** `npm test` and `npm run lint` must pass with zero warnings and zero errors before every push (existing standing rule).

## Rollout — Phased PRs

The section is too large for one PR. Proposed split:

1. **PR 1 — Types and data layer.** `pace-types.ts`, `app/lib/pace.ts`, fixtures, tests. No pages, no sync. Unblocks downstream work
2. **PR 2 — Sync function and parser.** `functions/src/lib/parsers/pace-schedules.ts`, `syncPaceGtfs` wiring, change-detection refactor if needed, parser tests. Deploy populates new Firestore collections — nothing user-visible yet
3. **PR 3 — API routes.** Two new routes under `app/api/pace/`. Safe to deploy standalone
4. **PR 4 — Pages.** Landing, Pulse, route detail, stop detail. Includes `PaceRouteSearch`, `PaceBrowseList`, `PaceScheduleTable`, `PaceRouteChip`, sitemap update, SEO metadata, generateStaticParams. The main visible work. Map components on route detail and stop detail pages are **not** in this PR — deferred to a post-v1 follow-up to keep PR 4 reviewable
5. **PR 5 — Home Hero and Navbar.** Small final PR that makes the section reachable — updates `Hero.tsx` to three equal cards and adds the Navbar link

Each PR is independently reviewable, tested, and safe to deploy. PRs 1–4 are invisible to users until PR 5 ships.

## Risks and Open Questions

**Pace GTFS content quality** — we don't yet know whether `route_color` values are populated, whether headsigns are clean enough to derive direction names, or how many pattern variants per route exist in practice. The design accommodates worst case (fallback color, longest pattern = canonical, region overrides). Mitigation: run the parser locally against a real Pace GTFS download before deploying `syncPaceGtfs` and iterate until output looks correct.

**Pulse route identification** — the Pulse hardcoded list covers Milwaukee and Dempster. If Pace launches a new Pulse line between v1 ship and the next maintenance update, it classifies as Local until the hardcoded list is updated. Acceptable — Pulse launches are newsworthy and will be noticed. Override is a one-line change in one file.

**Build time at ~6,000 pre-rendered stop pages** — flagged as a scale concern. Ship with full pre-rendering first; fall back to ISR only if build times become unreasonable during PR 4. Low expected risk.

**Pace corporate color verification** — the tentative fallback is `#005DAA` but the final hex should be confirmed from Pace's own marketing or GTFS feed during implementation.

**Route count and region accuracy** — we expect ~240 routes and ~85% correct region classification from the digit heuristic. Both numbers will be verified after the first sync run, and the region override map will be populated as needed. Not a design risk — just an iteration expectation.

## Out of Scope

- Pace realtime — no public API exists
- Pace service alerts — no public feed exists
- CTA Bus Tracker integration (the actual API key you hold) — out of scope for this work. Could be a future CTA bus section
- Station hero photos for Pace stops — deferred; bus shelters don't map well to the existing station photo pattern, and the Pulse stations that might deserve imagery are a small hand-curated future addition
- Scraping `tmweb.pacebus.com` — explicitly rejected. Brittle, against terms, maintenance liability
