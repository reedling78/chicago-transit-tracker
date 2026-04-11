# Plan: Realtime status on the Metra train detail page

> **Rename note:** this file was created with an auto-generated name. Before committing, rename to `docs/superpowers/plans/2026-04-10-metra-train-realtime.md` per the repo convention.

## Context

The Metra train detail page at [app/metra/[line]/train/[trainNumber]/page.tsx](../../../app/metra/[line]/train/[trainNumber]/page.tsx) currently renders a static schedule: one row per stop with scheduled arrival and departure times, pulled from the `metra-trips` Firestore collection at build time. It's a useful reference but says nothing about what the train is actually doing right now.

The site already has working plumbing for Metra GTFS Realtime: a server-side proxy at [app/api/metra/[...path]/route.ts](../../../app/api/metra/[...path]/route.ts), a protobuf decoder in [app/lib/metra-realtime.ts](../../../app/lib/metra-realtime.ts), and three client components ([MetraAlerts](../../../app/components/MetraAlerts.tsx), [MetraTripUpdates](../../../app/components/MetraTripUpdates.tsx), [MetraPositions](../../../app/components/MetraPositions.tsx)) that already poll the `alerts`, `tripupdates`, and `positions` feeds. The data needed to mark stops as past / current / upcoming, flag delays, mark skipped stops, and show the train's last reported location is all already reachable from the client.

This plan adds realtime overlays to the train page without changing its server-rendered HTML. SEO value is preserved because the initial render stays byte-identical to today's page; realtime decoration is layered on after hydration.

## Scope

In scope:

- Per-stop past / current / upcoming state from `VehiclePosition`
- Per-stop delay chips from `TripUpdate.stopTimeUpdate[].arrival.delay`
- Top-of-page trip-level delay badge (`On time` / `Delayed N min` / `Completed` / `Scheduled`)
- Skipped-stop indicator from `scheduleRelationship === SKIPPED`
- Text-only "last reported" location line derived from `currentStopSequence` + `currentStatus` against the stop list
- Alerts filtered to this trip's route or trip ID, rendered below the table
- Smart polling: every 30s while the tab is visible and the trip is active, stopping on completion or after a 4-hour safety ceiling
- "No data" fallback that equals the current SSR output (no empty-state UI needed)

Out of scope:

- Any map library or new dependency
- Changes to the GTFS sync Cloud Functions
- Changes to the `metra-trips` Firestore schema
- Changes to the existing `MetraAlerts` / `MetraTripUpdates` / `MetraPositions` debug components

## Architecture

The server component at [app/metra/[line]/train/[trainNumber]/page.tsx](../../../app/metra/[line]/train/[trainNumber]/page.tsx) keeps its `generateStaticParams`, `generateMetadata`, and Firestore fetch unchanged. Its body is simplified to fetch the `TripDetail` and render a new client component with it as a prop:

```
<MetraTripRealtime trip={trip} />
```

`MetraTripRealtime` is a new client component whose initial render reproduces the current server-rendered stop table exactly — same columns, same rows, same times, no pills, no opacity changes, no status strip content. On mount it begins polling the `tripupdates` and `positions` feeds in parallel every 30 seconds and re-renders with realtime decoration. When no matching entity is found in either feed, the component stays in its initial (schedule-only) state, so the "no data" path and the pre-hydration path are the same code path.

## Files to create

- [app/components/MetraTripRealtime.tsx](../../../app/components/MetraTripRealtime.tsx) — client component holding the stop table, polling loop, derived state, status strip, and filtered alerts section
- [app/lib/metra-trip-matching.ts](../../../app/lib/metra-trip-matching.ts) — pure helpers: `extractMetraTrainNumber(tripId)` (copied from [functions/src/lib/gtfs-utils.ts](../../../functions/src/lib/gtfs-utils.ts)) and `routeIdToLineSlug(routeId)` (static map covering all 11 Metra lines, derived from [scripts/seed-lines.ts](../../../scripts/seed-lines.ts))
- `__tests__/components/MetraTripRealtime.test.tsx`
- `__tests__/lib/metra-trip-matching.test.ts`

## Files to modify

- [app/metra/[line]/train/[trainNumber]/page.tsx](../../../app/metra/[line]/train/[trainNumber]/page.tsx) — replace inline stop table rendering with `<MetraTripRealtime trip={trip} />`. Keep everything else (generateStaticParams, generateMetadata, page header, breadcrumbs) untouched.

## Existing code to reuse

- `fetchMetraFeed('tripupdates' | 'positions' | 'alerts')` from [app/lib/metra-realtime.ts](../../../app/lib/metra-realtime.ts) — handles proxy fetch + protobuf decode
- `extractMetraTrainNumber()` pattern from [functions/src/lib/gtfs-utils.ts](../../../functions/src/lib/gtfs-utils.ts) — copy the ~5-line function; do not cross the `functions/` runtime boundary
- Polling + `useEffect` + 30s interval pattern from [app/components/MetraTripUpdates.tsx](../../../app/components/MetraTripUpdates.tsx)
- Alerts filtering + `informed_entity` walking pattern from [app/components/MetraAlerts.tsx](../../../app/components/MetraAlerts.tsx)
- Tailwind utility classes and line-color usage already in [app/components/StationDetail.tsx](../../../app/components/StationDetail.tsx) — do not add new classes to [app/globals.css](../../../app/globals.css)

## Implementation steps

1. **Matching helper.** Create [app/lib/metra-trip-matching.ts](../../../app/lib/metra-trip-matching.ts) with `extractMetraTrainNumber(tripId: string): string` and `routeIdToLineSlug(routeId: string): string | null`. Derive the routeId → lineSlug map by reading [scripts/seed-lines.ts](../../../scripts/seed-lines.ts) and encoding one entry per Metra line. Write unit tests at `__tests__/lib/metra-trip-matching.test.ts` covering the cases in Section 4 of the design.

2. **Skeleton client component.** Create [app/components/MetraTripRealtime.tsx](../../../app/components/MetraTripRealtime.tsx) as a `'use client'` component that accepts a `trip: TripDetail` prop and renders the exact same stop table the page currently renders inline. No state, no fetches yet. Verify visual parity by swapping it into the page (step 3) and eyeballing dev + prod builds.

3. **Wire into the page.** Modify [app/metra/[line]/train/[trainNumber]/page.tsx](../../../app/metra/[line]/train/[trainNumber]/page.tsx) to import and render `<MetraTripRealtime trip={trip} />` in place of the inline table. Keep page chrome, metadata, and `generateStaticParams` untouched. Confirm SSR HTML is byte-identical to the previous version.

4. **Add polling and derived state.** Inside `MetraTripRealtime`, add a `useEffect` that fetches `tripupdates` and `positions` in parallel via `Promise.all`, filters each feed using the matching helper, and stores `{ tripUpdate, vehiclePosition, fetchedAt }` in state. Compute derived per-stop state (`status`, `delayMinutes`, `skipped`) and trip-level state (`tripDelayMinutes`, `tripPhase`) as `useMemo` values off the raw state. Start with a dumb 30s `setInterval` — lifecycle gating comes in step 6.

5. **Render realtime decoration.** Apply the visual treatment from Section 3 of the design: past-row opacity, current-row left border + pill, delay chips, skipped pill. Add the status strip above the table (trip-level badge + location line) and the filtered alerts section below. Hide the alerts section entirely when there are no matching alerts.

6. **Smart polling lifecycle.** Gate the interval on `document.visibilityState === 'visible'`, on the trip not being completed (sequence reached last stop with `STOPPED_AT`, OR no matching entity on two consecutive ticks with scheduled end > 15 min in the past), and on a 4-hour hard ceiling from mount. Add a `visibilitychange` listener to pause/resume. When polling stops, render a `Last updated HH:MM` line with a manual Refresh button that does a one-shot fetch.

7. **Tests.** Write `__tests__/components/MetraTripRealtime.test.tsx` per Section 4 of the design: initial-render parity with the schedule, past/current/upcoming decoration from a mocked `VehiclePosition`, delay chip from a mocked `TripUpdate`, skipped pill, "scheduled to depart" fallback, polling-stops-after-completion, visibility-gating. Use `jest.mock('@lib/metra-realtime')`, fake timers per the project's polling-test pattern, and `@testing-library/react` for rendering.

8. **Lint + test + type-check.** `npm run lint`, `npm test`, `npm run build` must all be clean before opening a PR (per [.claude/rules/testing.md](../../../.claude/rules/testing.md) and the clean-CI feedback memory).

## Verification

End-to-end verification once merged:

1. `npm run dev` and open `/metra/bnsf/train/1200` (or any live train number from the current day's schedule). Confirm the schedule renders immediately, then within 30 seconds realtime decoration appears: a trip-level badge at the top, past stops dimmed, the current stop highlighted with a pill, and delay chips where the feed reports delays.
2. Open the same URL for a train that has already completed its run. Confirm the page shows a `Completed` badge and a `Last updated` + Refresh control, and that no further fetches happen (check the Network tab — it should go quiet after the first one or two fetches).
3. Open a URL for a train scheduled later today. Confirm the "Trip scheduled to depart HH:MM" copy renders and no decoration is applied yet.
4. Switch to another tab, wait two minutes, switch back. Confirm the Network tab shows no polling while the tab was hidden and a fresh fetch when it regained focus.
5. `view-source:` the page in the browser (or `curl` it) and diff the HTML against the previous version of the page. The server-rendered markup should be unchanged except for the component wrapper — the table, rows, times, and surrounding chrome should be byte-identical. This is the SEO guard rail.
6. `npm test` passes with zero warnings and zero errors; `npm run lint` is clean.
