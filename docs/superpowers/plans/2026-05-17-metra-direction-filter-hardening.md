# Plan: Harden Metra direction filtering against station-trips join misses

> Convention note: per CLAUDE.md, planning docs live at `docs/superpowers/plans/YYYY-MM-DD-topic.md`.
> This file is the plan-mode scratch file; on execution, copy it to
> `docs/superpowers/plans/2026-05-17-metra-direction-filter-hardening.md`.

## Context

A favorited Metra station card on the mobile dashboard (Schaumburg / MD-W)
intermittently showed **"No upcoming departures."** even though trains were
scheduled, and never surfaced the live train — while the station detail page
showed the same trains correctly, including the live one.

Investigation (with live production data) ruled out a permanent data problem:
`metra-station-trips/schaumburg` and `schedules/schaumburg` line up exactly, and
the card recovered on its own once the hourly GTFS sync repopulated the
`metra-station-trips` doc. The dashboard card and the station page share the
exact same realtime path (`computeArrivalGroups` + `indexMetraTripUpdates` +
`useMetraFeed`); the only behavioral difference is that the dashboard
`StationCard` passes `favorite.directionFilter` while the station-page
`ArrivalsCard` does not.

That difference exposes a **latent fragility**, not yet a permanent bug:

In `computeArrivalGroups` ([packages/shared/src/station-arrivals.ts](packages/shared/src/station-arrivals.ts)),
a group's `directionId` is only set when a *currently-upcoming* scheduled time
matches a `metra-station-trips` entry on the composite key
`${headsign}|${line}|${clockLabel}` (lines 186–189). When that per-time join
misses — a stale/not-yet-synced `metra-station-trips` doc, a brand-new station
before its first sync, or any future time-string drift between the two
independently-produced collections — `groupDirectionId` stays `undefined`.
`applyDirectionFilter` (lines 236–239) then **drops every group whose
`directionId` is `undefined`** when the favorite has an inbound/outbound filter,
turning "trains are scheduled" into a false **"No upcoming departures."**

The intended outcome: a direction-filtered Metra card must degrade gracefully
(still show scheduled rows) instead of collapsing to a false empty whenever the
`metra-station-trips` join is incomplete.

## Approach

Two defensive layers in `packages/shared/src/station-arrivals.ts`, both pure and
shared by web + mobile (no Cloud Function / data changes, no redeploy):

### 1. Derive group direction from a headsign+line map (primary fix)

Today `directionId` depends on a *time-specific* match. Decouple direction
classification from the per-departure join:

- While building `tripLookup` (lines 161–172), also build
  `dirByHeadsignLine = Map<string, number>` keyed `${entry.headsign}|${entry.line}`
  → `entry.directionId` (first entry wins; all trips for a headsign/line on a
  service day share a direction, so this is stable).
- After the per-item loop for a direction (around line 216), if
  `groupDirectionId === undefined`, fall back to
  `dirByHeadsignLine.get(`${dir.headsign}|${dir.line}`)`.

Effect: as long as the `metra-station-trips` doc has *any* entry for that
headsign/line that service day, the group is correctly classified even when the
specific upcoming departure time didn't line up — so the inbound/outbound filter
keeps it. The existing per-item realtime match (which still needs `trainNumber`
from the exact time match) is unchanged; unmatched rows just stay non-live
(`≈`), exactly as today.

### 2. Safety net in `applyDirectionFilter` (defense in depth)

For the residual case where `metra-station-trips` is *entirely* missing for the
day (no headsign/line map at all), change the Metra inbound/outbound branch
(lines 236–239) to retain groups whose `directionId` is `undefined`:

```ts
return groups.filter((g) => g.directionId === wanted || g.directionId === undefined)
```

Tradeoff (document inline): if the station-trips doc is fully absent, an
inbound-filtered card will show both directions rather than nothing. Showing
unclassified-but-real scheduled trains is strictly better UX than a false
"No upcoming departures." and self-corrects on the next successful sync.

## Files to modify

- `packages/shared/src/station-arrivals.ts` — `computeArrivalGroups`
  (add `dirByHeadsignLine` + fallback) and `applyDirectionFilter` (keep
  `undefined` groups for Metra inbound/outbound). Add a short comment on the
  degradation tradeoff.
- `apps/web/__tests__/lib/station-arrivals.test.ts` — extend existing suite.

No changes needed in `apps/web/app/components/dashboard/cards/StationCard.tsx`
or `apps/mobile/components/dashboard/cards/StationCard.tsx`; the fix is entirely
in the shared pure helper they both call.

## Tests (TDD — write failing first)

Add to `apps/web/__tests__/lib/station-arrivals.test.ts`:

1. **Regression — stale station-trips, direction filter set:** schedule has
   upcoming Sunday times for "Union Station" (dir-1) and "Elgin" (dir-0); pass
   `trips` with that service day **empty**; `directionFilter: 'inbound'`.
   Expect: groups **non-empty** (currently returns `[]`). With layer 2, the
   group survives unclassified.
2. **Headsign/line fallback classifies group:** `trips[day]` contains a
   "Union Station|MD-W" entry whose `departure` does *not* match any upcoming
   schedule label, plus an "Elgin|MD-W" entry. `directionFilter: 'inbound'`.
   Expect: only the Union Station group returned, `directionId === 1`, even
   though no upcoming row time-matched.
3. **No regression — happy path:** upcoming time matches a station-trips entry
   and realtime feed has that train → row still `isLive`, `directionId` set
   from the matched entry, opposite-direction group filtered out as before.
4. **CTA unaffected:** CTA headsign-string filter path unchanged.

Run: `pnpm -w run test` and `pnpm -w run lint` — both must be clean.

## End-to-end verification

1. Unit tests above pass; full `pnpm -w run test` green, `pnpm -w run lint`
   clean.
2. Manual (mobile): with a Metra station favorite that has an inbound/outbound
   filter, confirm the card shows scheduled rows + the live dot when the feed
   has a matching train, and that it no longer shows a false
   "No upcoming departures." when `metra-station-trips` is momentarily
   stale (can be simulated in a test by passing empty `trips[day]`).
3. Confirm the station detail page (`ArrivalsCard`, no filter) behavior is
   unchanged.
