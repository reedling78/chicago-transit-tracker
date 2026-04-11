# Refactor Audit & Foundation Plan

> **Note:** auto-generated filename. Rename to `YYYY-MM-DD-refactor-foundation.md` before committing.

## Context

The project is being prepared for a sustained round of new feature work. Before adding more surface area, we want to pay down accumulated issues so the foundation is strong. A three-agent audit of `app/`, `functions/`, `scripts/`, and `__tests__/` surfaced the findings below. The scope is **moderate**: behavior-preserving refactors plus intentional runtime improvements where they fix real duplication. Dead code candidates (`MetraPositions.tsx`, `MetraTripUpdates.tsx`, legacy seed scripts) are being kept per user decision and are out of scope.

Phases are ordered so each one is independently shippable as its own PR, and earlier phases unblock later ones. CI (`npm run lint && npm test`) must be clean at the end of every phase.

---

## Phase 1 — Type & constants consolidation

**Goal:** single source of truth for shared types and mapping tables; no runtime change.

### Type consolidation
- Add shared GTFS types to [app/lib/types.ts](app/lib/types.ts) (or a new [app/lib/gtfs-types.ts](app/lib/gtfs-types.ts) if `types.ts` gets noisy): `TripStop`, `StationSchedule`, `DirectionSchedule`, `StationTripEntry`, `StationTrips`.
- Update consumers to import from the shared file:
  - [app/lib/metra-status.ts](app/lib/metra-status.ts#L3) — currently defines `TripStop` locally
  - [app/components/Arrivals.tsx](app/components/Arrivals.tsx#L7-L33) — currently redefines `DirectionSchedule`, `StationSchedule`, `StationTripEntry`, `StationTrips`
  - [functions/src/lib/gtfs-utils.ts](functions/src/lib/gtfs-utils.ts#L32) — `TripStop`, `StationSchedule`, `DirectionSchedule`
- `functions/` is a separate tsconfig/package. If cross-package imports don't work cleanly, mirror the types there with a comment pointing at the canonical source and a test that asserts structural compatibility. Prefer the direct-import path if the path alias resolves.

### Constants consolidation
Create [app/lib/constants.ts](app/lib/constants.ts) and move the following:
- `LINE_COLORS` — currently exported from [app/components/StationDetail.tsx:7](app/components/StationDetail.tsx#L7), imported by `CTAAlerts`, `MetraAlerts`, `Arrivals`, `MetraTripRealtime`, `CtaServicePulseContainer`
- `METRA_LINE_NAMES` — currently in [app/components/MetraAlerts.tsx:9-21](app/components/MetraAlerts.tsx#L9-L21)
- `SLUG_TO_ROUTE_ID`, `ROUTE_ID_TO_NAME` — currently in [app/components/CTAAlerts.tsx:9-29](app/components/CTAAlerts.tsx#L9-L29)
- `ROUTE_ID_TO_LINE_SLUG` — currently in [app/lib/metra-trip-matching.ts:14-26](app/lib/metra-trip-matching.ts#L14-L26), also duplicated in [functions/src/lib/parsers/metra-trips.ts](functions/src/lib/parsers/metra-trips.ts)
- `TONE_CLASSES` — keep in [app/lib/metra-status.ts](app/lib/metra-status.ts) for now (tightly coupled to status derivation); revisit only if another file needs it.

### Housekeeping
- Standardize on `import type { ... }` for all type-only imports across `app/`.
- Unexport `terminalKeyFor` in [app/lib/cta-pulse.ts:29](app/lib/cta-pulse.ts#L29) — only used once internally.

### Verification
- `npm run lint && npm test` clean.
- Manual: `npm run dev`, visit a CTA line page, a Metra line page, the alerts page — no visual regressions.

---

## Phase 2 — Metra feed polling dedup

**Goal:** single in-flight request per Metra feed across all mounted consumers on a page. Real runtime fix for the duplicate polling between [MetraCurrentService.tsx:196-199](app/components/MetraCurrentService.tsx#L196-L199) and [MetraTripRealtime.tsx:197-199](app/components/MetraTripRealtime.tsx#L197-L199).

### Approach — module-level cache hook
Create [app/lib/hooks/useMetraFeed.ts](app/lib/hooks/useMetraFeed.ts):
- Module-scoped `Map<FeedName, { promise, fetchedAt, subscribers }>`.
- `useMetraFeed(feed, { intervalMs })` returns `{ data, error, loading }` and subscribes/unsubscribes on mount/unmount.
- Only one poller interval runs per feed, regardless of subscriber count. When subscriber count hits zero, the interval clears.
- In-flight dedup: if a fetch is pending when a second subscriber mounts, it receives the same promise.
- Respects `document.visibilitychange` — pause polling when tab is hidden, fire an immediate refresh on visibility return. Preserve whatever the current components do here.
- Reuses existing [app/lib/metra-realtime.ts](app/lib/metra-realtime.ts) `fetchMetraFeed`.

### Migration
- Replace the `useEffect` polling block in both components with `useMetraFeed`.
- Keep the existing filtering / derivation logic in the components untouched — Phase 3 handles that.

### Tests
New file `__tests__/lib/hooks/useMetraFeed.test.ts` (jsdom env, fake timers per existing convention):
- Two subscribers → one fetch call.
- Second subscriber mounts while first fetch is in flight → both receive same data.
- Unmounting last subscriber stops the interval.
- Error propagation to all subscribers.
- Visibility change pauses and resumes polling.

### Verification
- Existing `MetraCurrentService` and `MetraTripRealtime` tests still pass unchanged.
- Network tab in dev: loading `/metra/bnsf` shows a single request per feed per interval.

---

## Phase 3 — Split `MetraTripRealtime` and slim `MetraCurrentService`

**Goal:** break [MetraTripRealtime.tsx](app/components/MetraTripRealtime.tsx) (438 lines) into testable pure logic + thin component. Lighter treatment for [MetraCurrentService.tsx](app/components/MetraCurrentService.tsx) (301 lines).

### MetraTripRealtime
- Create `app/lib/metra-trip-realtime-helpers.ts` and move pure functions:
  - `matchEntityToTrip`
  - `filterFeedForTrip`
  - Stop derivation helpers currently defined inline
- Extract `HeroStatusCard` into `app/components/MetraTripHeroStatusCard.tsx` — a pure presentational component that takes derived state as props.
- Main `MetraTripRealtime` becomes: `useMetraFeed` calls + helper calls + render. Target under 200 lines.
- Add unit tests for the extracted helpers in `__tests__/lib/metra-trip-realtime-helpers.test.ts`.

### MetraCurrentService
- Create `app/lib/metra-current-service-helpers.ts` and move pure functions:
  - `buildTrainRow`
  - `annotate`
  - `selectTrainsForDisplay`
  - `formatEta`, `extractMatchedRealtime`
- Add unit tests in `__tests__/lib/metra-current-service-helpers.test.ts`.

### Verification
- Existing component tests pass.
- `npm run lint && npm test` clean.
- Manual: open a Metra line page and a train detail page, confirm identical behavior (active list, hero status card, delays).

---

## Phase 4 — Build-time Firestore read dedup

**Goal:** eliminate duplicate `getLine()` / `getStation()` calls between `generateMetadata` and the page component at build time.

### Approach — React `cache()`
React's `cache()` memoizes reads across `generateMetadata` and the page component within a single render request. Wrap the hot readers in [app/lib/transit.ts](app/lib/transit.ts):
- `getLine`
- `getStation`
- `getLinesForService`
- `getStationsForLine`

```ts
import { cache } from 'react'
export const getLine = cache(async (slug: string) => { ... })
```

### Affected pages (each hits the cached reader from both `generateMetadata` and the component body)
- [app/cta/[line]/page.tsx](app/cta/[line]/page.tsx)
- [app/cta/[line]/[station]/page.tsx](app/cta/[line]/[station]/page.tsx)
- [app/metra/[line]/page.tsx](app/metra/[line]/page.tsx)
- [app/metra/[line]/[station]/page.tsx](app/metra/[line]/[station]/page.tsx)

### Verification
- Build time before/after: `time npm run build`. Expect a measurable drop.
- Firestore read count: add temporary `console.count` in `getLine` during a build, confirm halves. Remove the counter before commit.
- Existing tests pass.

---

## Phase 5 — Protobuf code splitting

**Goal:** stop shipping `gtfs-realtime-bindings` (~1 MB) in the initial client bundle.

### Change
In [app/lib/metra-realtime.ts](app/lib/metra-realtime.ts), convert the static import:
```ts
import GtfsRealtime from 'gtfs-realtime-bindings'
```
to a lazy import inside `fetchMetraFeed`:
```ts
const { transit_realtime } = await import('gtfs-realtime-bindings')
```
This lets Next.js split the protobuf parser into its own chunk, loaded only when a component actually calls `fetchMetraFeed`.

### Verification
- `npm run build` — compare `First Load JS` for `/metra/[line]` and home page before/after in build output.
- `npm test` — existing metra-realtime test must continue to pass (may need `jest.mock` update for async import).
- Manual: Metra line page loads realtime data correctly in dev.

---

## Phase 6 — Test coverage gaps

**Goal:** fill the tested-surface holes identified in the audit so future phases land on a safety net.

### New API route tests
- `__tests__/api/metra/path.test.ts` — `/api/metra/[...path]` route: missing `METRA_API_TOKEN`, path whitelist (see input validation below), upstream 500, protobuf Content-Type passthrough, success case.
- `__tests__/api/cta/alerts.test.ts` — `/api/cta/alerts`: routeid param handling, upstream error, response passthrough.
- `__tests__/api/schedules/slug.test.ts` — `/api/schedules/[slug]`: missing slug, 404, Firestore error, success with cache headers.

### Fix test naming collisions
- Existing tests under `__tests__/api/metra/` for `station-trips` and `trip-index` have mislabeled describe blocks / wrong imports (audit flagged this). Correct labels and verify each test file imports the route it claims to cover.

### New error-path tests
- `__tests__/lib/transit.test.ts` additions: Firestore query errors, empty `stops`, missing optional fields (`directionId`).
- `__tests__/lib/metra-trip-matching.test.ts` additions: malformed trip IDs (missing segments, extra underscores), unknown route IDs, null/undefined inputs.

### Input validation
- Add a whitelist (e.g., `['alerts', 'positions', 'tripupdates']`) to [app/api/metra/[...path]/route.ts](app/api/metra/[...path]/route.ts). Reject anything else with 400. Cover with the new test file.

### Verification
- `npm test` clean with zero warnings.
- `npm run lint` clean.

---

## Critical files touched across the plan

| File | Phases |
| --- | --- |
| [app/lib/types.ts](app/lib/types.ts) | 1 |
| [app/lib/constants.ts](app/lib/constants.ts) (new) | 1 |
| [app/lib/hooks/useMetraFeed.ts](app/lib/hooks/useMetraFeed.ts) (new) | 2 |
| [app/lib/metra-trip-realtime-helpers.ts](app/lib/metra-trip-realtime-helpers.ts) (new) | 3 |
| [app/lib/metra-current-service-helpers.ts](app/lib/metra-current-service-helpers.ts) (new) | 3 |
| [app/components/MetraTripRealtime.tsx](app/components/MetraTripRealtime.tsx) | 2, 3 |
| [app/components/MetraCurrentService.tsx](app/components/MetraCurrentService.tsx) | 2, 3 |
| [app/components/MetraTripHeroStatusCard.tsx](app/components/MetraTripHeroStatusCard.tsx) (new) | 3 |
| [app/components/CTAAlerts.tsx](app/components/CTAAlerts.tsx) | 1 |
| [app/components/MetraAlerts.tsx](app/components/MetraAlerts.tsx) | 1 |
| [app/components/Arrivals.tsx](app/components/Arrivals.tsx) | 1 |
| [app/components/StationDetail.tsx](app/components/StationDetail.tsx) | 1 |
| [app/lib/metra-status.ts](app/lib/metra-status.ts) | 1 |
| [app/lib/metra-trip-matching.ts](app/lib/metra-trip-matching.ts) | 1, 6 |
| [app/lib/cta-pulse.ts](app/lib/cta-pulse.ts) | 1 |
| [app/lib/transit.ts](app/lib/transit.ts) | 4, 6 |
| [app/lib/metra-realtime.ts](app/lib/metra-realtime.ts) | 5 |
| [app/cta/[line]/page.tsx](app/cta/[line]/page.tsx) | 4 |
| [app/cta/[line]/[station]/page.tsx](app/cta/[line]/[station]/page.tsx) | 4 |
| [app/metra/[line]/page.tsx](app/metra/[line]/page.tsx) | 4 |
| [app/metra/[line]/[station]/page.tsx](app/metra/[line]/[station]/page.tsx) | 4 |
| [app/api/metra/[...path]/route.ts](app/api/metra/[...path]/route.ts) | 6 |
| [functions/src/lib/gtfs-utils.ts](functions/src/lib/gtfs-utils.ts) | 1 |

---

## Per-phase verification summary

Every phase must end with:
1. `npm run lint` — clean
2. `npm test` — clean, zero warnings
3. `npm run build` — succeeds
4. Manual smoke of affected pages in `npm run dev`
5. Commit on a feature branch, open PR against `main`, merge via squash, delete branch

Phase 4 adds a build-time-reads-halved measurement. Phase 5 adds a First Load JS comparison from `next build` output.

---

## Out of scope (explicit, for clarity)

- Deleting `MetraPositions.tsx`, `MetraTripUpdates.tsx`, or any legacy seed scripts — user chose to keep all.
- Restructuring `app/lib/` into domain subdirectories — would be Phase 7+ aggressive-level work.
- Moving polling into a React context provider — module cache is sufficient for current consumer count.
- Cross-package type sharing infrastructure between `app/` and `functions/` beyond mirroring — revisit if the mirror diverges.
