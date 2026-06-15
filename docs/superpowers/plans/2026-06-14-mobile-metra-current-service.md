# Plan: Mobile "Current Service" card on the Metra line screen

> **Note:** Rename this file to `docs/superpowers/plans/2026-06-14-mobile-metra-current-service.md` as the first step (project convention is `YYYY-MM-DD-topic.md`, never a harness slug).

## Context

The web app shows a **Current Service** card at the top of every Metra line detail page (`/metra/[line]`). It polls the live GTFS-RT feeds and lists the trains running on that line right now (plus the next few scheduled departures), each with destination, next stop + ETA, and a colored status pill ("On time" / "Delayed X min" / "Scheduled 7:15 AM") that deep-links to the train detail screen.

The mobile Metra line screen (`apps/mobile/app/(app)/metra/[line]/index.tsx`) currently shows only the hero + static `StationTimeline` — no realtime "what's running now" view. This plan ports the web Current Service experience to mobile, placed **above** the station timeline.

**Intended outcome:** A signed-in or signed-out mobile user opening a Metra line sees the same live "Current service" list the web has, with tappable rows that route to the train detail screen, and a Metra-compliant "Updated H:MM" timestamp.

## Approach

The web component is already cleanly layered:

- `MetraCurrentService.tsx` — thin `'use client'` container: polls 2 feeds, runs a `nowMs` ticker, calls pure helpers, renders the list.
- `CurrentServiceList.tsx` — presentational (web JSX) + the `CurrentServiceTrain` row type.
- `apps/web/app/lib/metra-current-service-helpers.ts` — **pure, React-free** selection + row-building logic (`annotate`, `selectTrainsForDisplay`, `buildTrainRow`, `extractMatchedRealtime`, `currentServiceType`, `formatEta`).

Mobile already has parity infrastructure: `apps/mobile/lib/useMetraFeed.ts` (identical API surface, returns shared `FeedData`, AppState-aware) and every underlying derivation helper in `@ctt/shared` (`deriveStopState`, `computeHeroStatus`, `parseDisplayTimeToMinutes`, `extractMetraTrainNumber`, `routeIdToLineSlug`, `longToNumber`, `minutesSinceMidnight`, `TONE_CLASSES`, `formatClockTime`).

So the work is: **(1)** lift the pure helpers + two data types into `@ctt/shared` so both platforms share one implementation, **(2)** add a mobile hook to fetch a line's trips, **(3)** build the RN container + presentational list, **(4)** drop it onto the line screen.

### 1. Move pure helpers + types to `@ctt/shared`

Create `packages/shared/src/metra-current-service.ts` containing, moved verbatim from the web helper file:
- `MetraLineTrip` interface (currently in `apps/web/app/lib/transit.ts:8`)
- `CurrentServiceTrain` interface (currently in `apps/web/app/components/CurrentServiceList.tsx`)
- `ServiceType`, `MAX_TRAINS_SHOWN`, `UPCOMING_WINDOW_MINUTES`
- `currentServiceType`, `formatEta`, `extractMatchedRealtime`, `buildTrainRow`, `annotate`, `TripWithDepartureMinutes`, `selectTrainsForDisplay`

Change its imports to pull from `./metra-status` and `./metra-trip-matching` (sibling shared modules) and `./metra-status`'s `FeedData` instead of the web `@lib/...` aliases. The `href` string (`/metra/${lineSlug}/train/${trainNumber}`) is identical on both platforms (expo-router uses the same paths), so it stays in the shared `buildTrainRow`. Export everything from `packages/shared/src/index.ts`.

**Keep web green via re-exports (no web behavior change):**
- `apps/web/app/lib/metra-current-service-helpers.ts` → re-export the moved symbols from `@ctt/shared`.
- `apps/web/app/components/CurrentServiceList.tsx` → import `CurrentServiceTrain` from `@ctt/shared` (re-export the type so existing `import { CurrentServiceTrain } from './CurrentServiceList'` callers still resolve).
- `apps/web/app/lib/transit.ts` → import `MetraLineTrip` from `@ctt/shared` and re-export it (keeps `getMetraLineTrips` return type + all callers stable).

This honors the repo's "pure helpers live in `packages/shared`, consumed by web and mobile" convention. Guardrail check: the moved code imports nothing from `firebase-admin`/`next`/`react-dom`, so it's shared-safe.

### 2. Mobile hook to fetch a line's trips

Add `useMetraLineTrips(lineSlug)` to `apps/mobile/lib/hooks.ts`, mirroring web's `getMetraLineTrips` (`apps/web/app/lib/transit.ts:108`) but with the JS SDK:

```ts
query(collection(db, 'metra-trips'), where('lineSlug', '==', lineSlug))
```

Map each doc to `MetraLineTrip` (from `@ctt/shared`), applying `displayStationName` to `headsign` and each `stop.stationName` — exactly the normalization `useMetraTrip` and `getMetraLineTrips` already do. Return `{ trips, loading }`.

### 3. Mobile components

**`apps/mobile/components/CurrentServiceList.tsx`** (presentational, RN):
- Card `View`: `borderLeftWidth: 4`, `borderLeftColor: lineColor`, theme tokens (`bg.elevated`, `border.subtle`, `radius.md`) via the `useTheme()` + `makeStyles(theme)` + `useMemo` pattern (see `MetraTripHeroStatusCard.tsx`).
- Header row: "Current service" label (uppercase, `text.muted`) on the left; on the right a pulsing red dot + `Live` and a **`Updated H:MM`** footnote (Metra compliance — sourced from the feed `fetchedAt`, formatted with `formatClockTime`). Pulse via `Animated`/reanimated opacity loop (or a simple static dot if keeping it light — match the StationCard live-badge approach).
- States: error line; loading skeleton (3 placeholder rows) when `loading && trains.length === 0`; empty message; otherwise the list.
- Rows: `Pressable` (reuse `PressableButton` conventions) → `router.push(train.href)`. Layout: `#{trainNumber}` (muted), destination (primary, ellipsized), `Next: {nextStop} · {nextStopEta}` (secondary, tabular-nums), and a status pill colored via a `tonePalette(tone, theme)` helper.
- **Refactor `tonePalette`** out of `MetraTripHeroStatusCard.tsx` (lines 29-42) into a small shared mobile util (e.g. `apps/mobile/lib/theme/statusTone.ts` or inline in a `cards`-style helper) so both the hero card and the new list use one mapping. Pill background = a tinted/translucent version of the tone color; dot = solid tone color.

**`apps/mobile/components/MetraCurrentService.tsx`** (container, RN port of the web container):
- Props: `{ lineSlug, lineColor, trips }`.
- `useMetraFeed('tripupdates')` + `useMetraFeed('positions')` at 30s.
- `nowMs` state on a 30s `setInterval` ticker (drives "X min" ETA countdowns without re-fetching).
- Same `useMemo` body as the web container (annotate → extract realtime → active set → `selectTrainsForDisplay` → `buildTrainRow` → empty message), all now from `@ctt/shared`.
- Pass the most recent `fetchedAt` (max of the two feeds) down to `CurrentServiceList` for the timestamp.
- Render `<CurrentServiceList ... loading={!hasFetched} error={...} fetchedAt={...} />`.

### 4. Wire into the line screen

In `apps/mobile/app/(app)/metra/[line]/index.tsx`:
- Call `useMetraLineTrips(lineSlug)`.
- Render `<MetraCurrentService lineSlug={line.slug} lineColor={line.color} trips={trips} />` **between `PageHeader` and `StationTimeline`** (above the timeline, per decision). It self-manages its loading/empty states, so no extra spinner gating is needed.

## Critical files

| File | Change |
| --- | --- |
| `packages/shared/src/metra-current-service.ts` | **New** — moved pure helpers + `MetraLineTrip` + `CurrentServiceTrain` |
| `packages/shared/src/index.ts` | Export the new module |
| `apps/web/app/lib/metra-current-service-helpers.ts` | Re-export from `@ctt/shared` |
| `apps/web/app/components/CurrentServiceList.tsx` | Import/re-export `CurrentServiceTrain` from shared |
| `apps/web/app/lib/transit.ts` | Import/re-export `MetraLineTrip` from shared |
| `apps/mobile/lib/hooks.ts` | **New** `useMetraLineTrips(lineSlug)` |
| `apps/mobile/components/CurrentServiceList.tsx` | **New** RN presentational list |
| `apps/mobile/components/MetraCurrentService.tsx` | **New** RN container |
| `apps/mobile/lib/theme/statusTone.ts` (or similar) | **New/extracted** shared `tonePalette` |
| `apps/mobile/components/MetraTripHeroStatusCard.tsx` | Use the extracted `tonePalette` |
| `apps/mobile/app/(app)/metra/[line]/index.tsx` | Render the card above the timeline |

## Reused, not rebuilt

- `apps/mobile/lib/useMetraFeed.ts` — polling/AppState/cache already done.
- `@ctt/shared`: `deriveStopState`, `computeHeroStatus`, `parseDisplayTimeToMinutes`, `extractMetraTrainNumber`, `routeIdToLineSlug`, `longToNumber`, `minutesSinceMidnight`, `formatClockTime`, `TONE_CLASSES`, `FeedData`/`RealtimeState`/`TripUpdate`/`VehiclePosition`/`TripStop` types.
- Theme/styling conventions (`useTheme`, `makeStyles`, `space`/`radius`/`colors.status` tokens), `PressableButton`, and the existing pill/chip styling from `MetraTripStopTimeline.tsx`.

## Compliance

- **Metra "last updated":** the new mobile card surfaces `Updated H:MM` from the feed `fetchedAt` (satisfies the GTFS-RT license timestamp requirement for a new Metra realtime surface). No agency logo/wordmark is added; line color comes from Firestore (`line.color`, already `@ctt/shared`-sourced). Web component is intentionally left unchanged this round (its missing timestamp is a pre-existing gap, out of scope per the chosen option).
- No client-side fetch hits a Metra URL directly — data flows through `useMetraFeed` → Cloud Functions.

## Tests (required by `.claude/rules/testing.md`)

- **Shared:** move/add unit tests for the relocated helpers. Port the assertions from `apps/web/__tests__/lib/metra-current-service-helpers.test.ts` to a shared-package test (or keep the web test pointing at the re-export so it still exercises the moved code). Verify `selectTrainsForDisplay`, `buildTrainRow` (active vs scheduled), `annotate`, `currentServiceType`, `formatEta`.
- **Web regression:** `apps/web/__tests__/components/CurrentServiceList.test.tsx`, `MetraCurrentService.test.tsx`, `metra-current-service-helpers.test.ts`, `pages/metra-line.test.tsx` must stay green after the re-export refactor (no behavior change).
- **Mobile (jest-expo):**
  - `apps/mobile/__tests__/` — `MetraCurrentService` test: mock `useMetraFeed` to return a feed with one active train + one scheduled, assert rows render with correct labels/ETAs and that an empty feed shows the fallback message. Use fake timers for the `nowMs` ticker (per testing rule: `doNotFake` real timers as needed).
  - `CurrentServiceList` test: loading skeleton, error line, empty message, populated rows, and tapping a row calls the router with `/metra/{line}/train/{num}`.
  - `useMetraLineTrips` test: mock Firestore `getDocs` chain, assert `MetraLineTrip[]` shape + `displayStationName` normalization.

## Verification

1. `pnpm -w run lint` and `pnpm -w run test` — both clean (web regression + new mobile/shared tests).
2. `pnpm run:ios` (or `/build-mobile`) → open a Metra line (e.g. BNSF) → confirm the Current Service card renders above the station timeline, shows live rows during service hours (or "Next service…" off-hours), the `Updated H:MM` stamp updates on poll, and tapping a row opens the correct train detail screen.
3. Toggle light/dark to confirm theming; background the app and confirm polling pauses/resumes (AppState behavior inherited from `useMetraFeed`).
4. Sanity-check the web Metra line page still renders the Current Service card unchanged.
