# Live station arrivals (Metra) — design + implementation plan

## Context

The station arrivals card shows only scheduled timetable estimates (every row carries an
`≈` "approximate" symbol) on all four surfaces:

- web station page (`Arrivals.tsx`)
- mobile station page (`ArrivalsCard.tsx`)
- web dashboard station card (`dashboard/cards/StationCard.tsx`)
- mobile dashboard station card (`dashboard/cards/StationCard.tsx`)

It never shows live data even when trains are actively running, because none of these
surfaces fetch a realtime feed and the shared `computeArrivalGroups()` helper is
schedule-only. Metra realtime data already flows through the app, but only on the
train-detail screen. This change merges Metra GTFS-realtime trip updates into station
arrivals so running trains show a realtime-adjusted countdown.

Scope decisions (confirmed with user):

- **Metra only** in this plan. CTA per-station realtime requires brand-new infrastructure
  (a `ttarrivals` web proxy, a new mobile Cloud Function, CTA API key in Secret Manager) —
  captured as a scoped follow-up, not built here.
- **Adjusted time + live indicator**: live rows recompute the countdown from the realtime
  delay and replace `≈` with a live indicator.
- **Header**: keep the existing schedule header text; add a small "Live" badge and a
  "Last updated: HH:MM" line when realtime is active.
- **Cancelled trips**: trips flagged `CANCELED` in GTFS-RT show a "Cancelled" treatment
  instead of a ticking countdown.

## Approach

Merge realtime in the shared pure helper `computeArrivalGroups()` — the single chokepoint
all four surfaces already use. Logic is written and tested once and covers every surface.
The helper stays pure (no fetching inside it). Feeds are fetched by the existing
`useMetraFeed('tripupdates')` hook (identical signature on web and mobile) and threaded in.

### Data flow

1. `computeArrivalGroups()` gains an **optional** `realtime` input: a normalized list of
   per-trip / per-stop updates `{ trainNumber, stopId, predictedArrivalEpoch | delaySec,
   scheduleRelationship }`.
2. For each scheduled Metra row, match to a realtime entry using the existing
   `packages/shared/src/metra-trip-matching.ts` helpers (train number ↔ GTFS `trip_id`,
   station slug ↔ GTFS `stop_id`).
3. Match found and not cancelled → recompute countdown from the realtime prediction/delay;
   set `isLive: true`.
4. Match found and `CANCELED` → set `isCancelled: true` (no countdown).
5. No match → unchanged; `isLive: false`, keeps `≈`.
6. CTA stations / schedule-only path: `realtime` undefined → behavior identical to today.

### Feed fetching (dedupe)

- Station page: the client arrivals component subscribes to `useMetraFeed('tripupdates')`
  only when `service === 'metra'`.
- Dashboard: subscribe **once** at the dashboard-grid level and pass the parsed feed down
  to each `StationCard`, so N station cards do not create N polls.
- Early task in implementation: confirm `useMetraFeed` is query-cache-backed (TanStack
  Query) so concurrent subscribers dedupe; if so, per-component subscription is acceptable
  and the grid-level lift is a safety optimization.

### Normalization

Add a shared normalizer: GTFS-RT `FeedEntity[]` → the normalized realtime shape above, so
both platforms feed `computeArrivalGroups()` identical data. Reuse parsing already in
`metra-trip-matching.ts` / `filterFeedForTrip()` where possible. Shared package may import
`gtfs-realtime-bindings` (it is platform-agnostic; no `firebase-admin`/`next`/`react-dom`).

### UI treatment (all 4 surfaces)

- Live row: realtime-adjusted countdown + live indicator (dot/pulse) replacing `≈`.
- Cancelled row: "Cancelled" label instead of a countdown.
- Header: unchanged text + a "Live" badge + "Last updated: HH:MM" when any row is live.
- Feed unavailable / no matches → exact current scheduled appearance.

### Metra compliance (mandatory)

Per `.claude/rules/transit-compliance.md`, any component rendering Metra **realtime** data
must show a visible "Last updated: HH:MM" sourced from the actual fetch time. These cards
are exempt today (static schedule only); once realtime merges in, the timestamp is
**required** on the station page card and the dashboard station card, web and mobile.
Update the component list in `.claude/rules/transit-compliance.md` to add `Arrivals.tsx`
and mobile `ArrivalsCard.tsx` (and the dashboard `StationCard`s) as Metra-realtime
surfaces. No new page routes are added (existing Metra proxy / Cloud Function reused), so
sitemap and SEO rules are unaffected.

## Critical files

Shared:
- `packages/shared/src/station-arrivals.ts` — add optional `realtime` param + merge;
  output rows gain `isLive`, `isCancelled`, realtime-adjusted minutes.
- `packages/shared/src/metra-trip-matching.ts` — reuse / extend for stop-level matching.
- shared normalizer (new export, likely in `metra-trip-matching.ts` or a new
  `packages/shared/src/metra-realtime.ts`) for `FeedEntity[]` → normalized updates.

Web:
- `apps/web/app/components/Arrivals.tsx` — subscribe to feed (Metra only), render live
  indicator / cancelled / "Live" badge / last-updated.
- `apps/web/app/lib/hooks/useMetraFeed.ts` — verify query-cache dedupe (no change expected).
- `apps/web/app/components/dashboard/cards/StationCard.tsx` +
  `apps/web/app/lib/hooks/useDashboardQueries.ts` + dashboard grid — single feed
  subscription lifted to grid, passed to cards.
- `apps/web/app/components/StationDetail.tsx` — passes service through to `Arrivals`.

Mobile:
- `apps/mobile/components/ArrivalsCard.tsx` — same UI treatment.
- `apps/mobile/lib/useMetraFeed.ts` — verify dedupe (no change expected).
- `apps/mobile/app/metra/station/[station].tsx` — station screen wiring.
- `apps/mobile/components/dashboard/cards/StationCard.tsx` +
  `apps/mobile/lib/useDashboardQueries.ts` + dashboard grid — grid-level feed subscription.

Docs / rules:
- `.claude/rules/transit-compliance.md` — add the arrivals cards to the Metra-realtime
  timestamp component list.

## Key risk to resolve early

Each Metra arrival row must expose a stable **train number** (from `StationTrips` /
`metra-station-trips`) so it can be matched to a GTFS-RT `trip_id`. First implementation
task: confirm `computeArrivalGroups()` rows already carry the train number; if not, thread
it through from the `trips` input before building the merge.

## Verification

1. **Shared unit tests** (`apps/web/__tests__/`): match → realtime-adjusted minutes;
   no match → unchanged scheduled row with `≈`; `CANCELED` → `isCancelled`; CTA / no
   `realtime` input → byte-identical to current output.
2. **Web component tests**: `Arrivals` renders live indicator + adjusted time, "Cancelled"
   treatment, "Live" badge + "Last updated" string when realtime present; unchanged when
   feed absent. Dashboard `StationCard` same.
3. **Mobile component tests**: `ArrivalsCard` equivalents.
4. `pnpm -w run test` and `pnpm -w run lint` clean (CI gate).
5. **Manual**: run web (`pnpm run:web`) and mobile (`pnpm run:ios`), open a Metra station
   with running trains (e.g. Ogilvie Transportation Center) on both the station page and
   as a dashboard favorite; confirm running trains show adjusted countdowns + live
   indicator + last-updated, scheduled-only trains keep `≈`, a cancelled train shows
   "Cancelled", and CTA stations are visually unchanged.

## Out of scope (scoped follow-up)

CTA per-station realtime arrivals: new `apps/web/app/api/cta/arrivals` proxy to CTA
`ttarrivals`, a new `ctaArrivals` Cloud Function for mobile, CTA API key in Secret
Manager, and CTA realtime matching. The shared merge designed here is agency-agnostic so
CTA can plug into the same `computeArrivalGroups()` path later.
