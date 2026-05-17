# Plan: Global Station Display-Name Normalization

> Canonical location per project standing rule: rename this file to
> `docs/superpowers/plans/2026-05-17-station-display-name-normalization.md`
> when implementation starts.

## Context

The team has been "renaming" a few stations for display, but there is **no
central mechanism** — names arrive raw from three sources with inconsistent
values:

- **Firestore `stations`** (seeded from GTFS): `"Chicago Union Station"`,
  `"Ogilvie Transportation Center"`
- **`metra-trips` / `schedules` / `metra-station-trips`** (Cloud Function
  parsers, auto-resynced hourly): raw `headsign` / `stationName`, e.g.
  `"Chicago OTC"`, `"Chicago Union Station"`
- **`apps/web/scripts/seed-lines.ts`** (hand-typed): internally inconsistent —
  `termini: ['Chicago Union Station', …]` but `downtownTerminal: 'Union Station'`

Today the only "renames" are ad-hoc hand-edits in `seed-lines.ts`; every other
rider-facing surface still shows raw GTFS text. We want one global,
non-destructive rule.

Required mappings (extensible):

| Raw (canonical, GTFS/seed)      | Display      |
| ------------------------------- | ------------ |
| `Chicago Union Station`         | `Union Station` |
| `Ogilvie Transportation Center` | `Ogilvie TC` |
| `Chicago OTC`                   | `Ogilvie TC` |

**Decisions:**

- Display-layer **pure helper** in `@ctt/shared`, applied at the
  read/render boundary on web + mobile. Firestore data, URL slugs, and doc IDs
  stay **untouched** (canonical GTFS names are required for Metra realtime trip
  matching and the legal "verify with Metra" linkout; slugs must not change for
  SEO). `apps/functions` parsers are NOT modified.
- Scope = all name surfaces: line `termini` + `downtownTerminal`, Metra
  `headsign`, stop-timeline `stationName`, and the station's own `name`.
- **Exception:** the **station detail page H1 hero title only** keeps the
  **full proper name** (e.g. "Chicago Union Station"). Everything else —
  including that same page's breadcrumb leaf — uses the short display name.
  This applies to **web and mobile** (mobile mirrors web).

## Design

Two distinct application strategies, because of the H1 exception:

1. **Non-station names → normalize at the data layer.** `termini`,
   `downtownTerminal`, `headsign`, `stops[].stationName` are not the
   `Station.name` field, so normalizing them once at the data read makes every
   downstream render correct automatically.
2. **`Station.name` → keep canonical (full) at the data layer; normalize per
   render site.** `Station.name` must remain the full name so the H1 can show
   it. Every other station-name render site wraps it in `displayStationName()`.
   The web station pages already pass `title` and `breadcrumbItems` as separate
   props (verified: `PageHeader.tsx:43` renders `title`; the breadcrumb leaf is
   an independent array entry), so the H1 stays full while the breadcrumb leaf
   shortens. Mobile `PageHeader` has no breadcrumb and its H1 stays full —
   matching the web H1.

## Implementation Steps

### 1. Shared helper (new)

- **New file** `packages/shared/src/station-names.ts`:
  - `export const STATION_DISPLAY_NAME_OVERRIDES: Record<string, string>` with
    the 3 mappings.
  - `export function displayStationName(raw: string): string` — exact-match
    lookup, pass-through on no match, null/undefined/empty-safe, idempotent.
- **Barrel** `packages/shared/src/index.ts`: add
  `export { STATION_DISPLAY_NAME_OVERRIDES, displayStationName } from './station-names'`.

### 2. Data-layer normalization — NON-station names only

**`apps/web/app/lib/transit.ts`** (add `import { displayStationName } from '@ctt/shared'`):
- `toLine` (line 15): map `termini` (line 24) + `downtownTerminal` (line 36).
  Do NOT touch `d.name` (route name) or `slug`.
- `getMetraLineTrips` (lines 110-119): map `headsign` (line 114) + each
  `stops[].stationName` (line 117); preserve `slug`/`sequence`/times.
- **Do NOT change `toStation` (line 47) or `getStation`** — `Station.name`
  stays canonical/full.

**`apps/web/app/metra/[line]/train/[trainNumber]/page.tsx`**:
- `readDetail` (~line 28): normalize `data.headsign` + `data.stops[].stationName`.
- `readIndex` (~line 22): if `TripIndex` carries `headsign` strings, normalize
  them; else leave.

**Web API routes** (build a new object; never mutate `doc.data()`):
- `app/api/metra/station-trips/[slug]/route.ts` — `weekday/saturday/sunday[].headsign`.
- `app/api/metra/trips/[trainNumber]/route.ts` — `headsign` + `stops[].stationName`.
- `app/api/schedules/[slug]/route.ts` — `directions[].headsign`.

**`apps/mobile/lib/hooks.ts`** (add the import; build new objects):
- `useLines` — map `termini` + `downtownTerminal`.
- `useMetraTrip` — map `headsign` + `stops[].stationName`.
- `useStationTrips` — map `weekday/saturday/sunday[].headsign`.
- `useSchedule` — map `directions[].headsign`.
- **Do NOT change `useStation` / `useLineStations`** — `Station.name` stays full.

### 3. Render-site normalization — `Station.name` (short everywhere except H1)

Apply `displayStationName(station.name)` (incl. the `accessibilityLabel` so
screen-reader output matches visible text) at:

**Web:**
- `app/cta/[line]/[station]/page.tsx` — breadcrumb leaf (line 81) → short.
  **Leave `title={station.name}` (line 75) FULL.**
- `app/metra/[line]/[station]/page.tsx` — breadcrumb leaf (line 83) → short.
  **Leave `title` (line 77) FULL.**
- `app/components/StationList.tsx:81`
- `app/sitemap/page.tsx:113` and `:141`
- `app/components/dashboard/cards/StationCard.tsx:78`
- `app/components/profile/FavoriteRow.tsx:70`

**Mobile:**
- `app/cta/station/[station].tsx:42` and `app/metra/station/[station].tsx:43`
  — **leave FULL** (mobile PageHeader H1 mirrors web H1; no breadcrumb exists).
- `components/StationTimeline.tsx:86` + `accessibilityLabel:56`
- `components/dashboard/cards/StationCard.tsx:49` (+ `accessibilityLabel:83`)
- `components/profile/FavoriteRow.tsx:77` (+ `accessibilityLabel:33`)

**No change (already covered by step 2 data layer):** web/mobile
`MetraTripStopTimeline` (`stop.stationName`), `TrainCard`
(`originStop/destStop.stationName`), `TrainStopPickerSheet`,
`MetraCurrentService`/`CurrentServiceList` (derive from normalized
`MetraLineTrip`).

## Files to Modify

- `packages/shared/src/station-names.ts` (new)
- `packages/shared/src/index.ts`
- `apps/web/app/lib/transit.ts`
- `apps/web/app/metra/[line]/train/[trainNumber]/page.tsx`
- `apps/web/app/api/metra/station-trips/[slug]/route.ts`
- `apps/web/app/api/metra/trips/[trainNumber]/route.ts`
- `apps/web/app/api/schedules/[slug]/route.ts`
- `apps/web/app/cta/[line]/[station]/page.tsx`
- `apps/web/app/metra/[line]/[station]/page.tsx`
- `apps/web/app/components/StationList.tsx`
- `apps/web/app/sitemap/page.tsx`
- `apps/web/app/components/dashboard/cards/StationCard.tsx`
- `apps/web/app/components/profile/FavoriteRow.tsx`
- `apps/mobile/lib/hooks.ts`
- `apps/mobile/components/StationTimeline.tsx`
- `apps/mobile/components/dashboard/cards/StationCard.tsx`
- `apps/mobile/components/profile/FavoriteRow.tsx`

## Out of Scope

`apps/functions/` parsers; seed scripts; Firestore data; slugs/doc IDs;
`useMetraFeed.ts`; hero status-card label text (no station name —
verified in `metra-status.ts`). `Station.name` is never mutated at the data
layer.

## Tests

`PostSourceFileEdit` hook requires test updates in the same session as each
source edit; zero-warning Jest + lint required.

- **New** `apps/web/__tests__/lib/station-names.test.ts` — 3 mappings,
  pass-through, idempotency, null/empty, extensibility.
- **`transit.test.ts`** — assert `toLine.termini`/`downtownTerminal` and
  `getMetraLineTrips` headsign/stops normalize; assert `toStation.name`
  stays FULL (regression guard for the H1 exception).
- **Station page tests** (`pages/` + snapshots for CTA/Metra station detail):
  assert H1 shows full name AND breadcrumb leaf shows short name on the same
  render — this pairing is the core acceptance test.
- **Reconcile** component/snapshot tests asserting station strings
  (`StationList`, `StationCard`, `FavoriteRow`, `MetraTripRealtime`,
  `MetraTripStopTimeline`, `CurrentServiceList`, `MetraCurrentService`,
  `StationTimetable`, `LineDetail`, `pages/metra-train`); reconcile the existing
  `Union Station` vs `Chicago Union Station` inconsistency; regenerate only
  manually reviewed snapshots.
- **API route tests** — response JSON normalized while mocked Firestore doc
  keeps the raw value (proves non-destructive).
- **Mobile** — audit `__tests__/fixtures.ts` consumers per data path;
  add a test that the mobile station screen header renders the FULL name.
- **Do NOT change** `__tests__/functions/parsers/metra-*.test.ts` — parsers
  unchanged; they must keep asserting canonical GTFS strings.

## Verification

1. `pnpm --filter web test station-names` green.
2. `pnpm --filter web test` + `pnpm --filter web lint` — zero warnings.
3. `pnpm --filter mobile test` + `pnpm --filter mobile lint`.
4. Web dev (`pnpm run:web`): open Union Station detail — **H1 reads "Chicago
   Union Station" (full); breadcrumb leaf reads "Union Station" (short)**.
   `/metra/bnsf` termini/downtownTerminal short; StationList short; sitemap
   short; dashboard StationCard + profile FavoriteRow short;
   `/metra/bnsf/train/<n>` timeline/headsign short; realtime status unaffected;
   view-source confirms slug + `metraLink`/`metraStopId` unchanged.
5. Mobile (Expo): station screen header shows full name; line station list,
   dashboard StationCard, profile FavoriteRow, train timeline show short;
   deep-link slugs unchanged.
6. Regression: Metra realtime status still renders (trip-matching unaffected).
