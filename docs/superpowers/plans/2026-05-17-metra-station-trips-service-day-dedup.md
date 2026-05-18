# Fix: Metra station screen drops whole service days (Sunday "phantom" trains)

## Context

On the mobile Metra station screen (e.g. Schaumburg, MD-W), the "Scheduled
arrivals" card shows trains, but on Sunday:

- The **Timetable** section says "No Sunday service at this station"
- No arrival row is ever **live** (all show the `≈` estimate symbol)
- Arrival rows are **not tappable** (no trip link)

This looked like "active trains right now but none scheduled or live."

### Root cause (verified against production Firestore)

It is genuinely Sunday (2026-05-17) and MD-W **does** run Sunday service.
The arrivals card is showing **correct** data: `schedules/schaumburg.sunday`
is correctly populated and matches the screenshot exactly.

The bug is a data inconsistency between two Firestore collections that are
both produced by the `syncMetraGtfs` Cloud Function from the same GTFS zip:

| Collection | Sunday data for Schaumburg | Parser |
| --- | --- | --- |
| `schedules/schaumburg` | ✅ correctly populated | `parseMetraSchedules` |
| `metra-station-trips/schaumburg` | ❌ **empty** (`sunday: []`) | `parseMetraTrips` |

`parseMetraTrips`
([apps/functions/src/lib/parsers/metra-trips.ts:138-142](apps/functions/src/lib/parsers/metra-trips.ts:138))
dedupes by `metraTrainDocId(lineSlug, trainNumber)` = `md-w_2700` and `continue`s
on the second occurrence. This is correct for the one-doc-per-train
`metra-trips` collection — but Metra **reuses weekend train numbers** (2700–2725)
for **both** Saturday and Sunday as separate `trip_id` calendar variants.
The Saturday variant is processed first and consumes `md-w_2700`; the Sunday
variant hits `continue`, so its `stationTripsData` / `lineIndexData` entries
are dropped entirely. `parseMetraSchedules` has no such dedup, so it keeps
Sunday correctly — hence the divergence.

Downstream effects of the empty `metra-station-trips['sunday']`:

- `MetraTimetable` ([apps/mobile/components/MetraTimetable.tsx:51](apps/mobile/components/MetraTimetable.tsx:51))
  reads `stationTrips['sunday']` → empty → "No Sunday service".
- `computeArrivalGroups`
  ([packages/shared/src/station-arrivals.ts:162-172](packages/shared/src/station-arrivals.ts:162))
  builds its `tripLookup` from `trips['sunday']` → empty → no row gets a
  `tripId`/`lineSlug`/`trainNumber` → rows render as non-tappable `<View>`s
  and `canMergeRealtime` never finds a match, so `isLive` is never set
  (every row is `≈`, never live).

**Scope (confirmed with user):** station screen only. The one-doc-per-train
`metra-trips` collection (train detail pages) keeps its existing global
dedup — its `{lineSlug}_{trainNumber}` docId can only hold one variant anyway,
and reworking that schema is explicitly out of scope.

## The fix

### 1. `apps/functions/src/lib/parsers/metra-trips.ts` (core change)

Stop the global per-train dedup from also suppressing per-service-day
station-trips and line-index population. Split into two dedup scopes:

- **`seenTrainDocIds` (existing, `${lineSlug}_${trainNumber}`)** — guards
  **only** `tripDetails.set(...)` (the `metra-trips` collection). Unchanged
  behavior: first variant wins.
- **New `seenTrainServiceKeys` (`${docId}|${serviceType}`)** — guards the
  `stationTripsData` and `lineIndexData` pushes. This still collapses the
  true same-service `_A` / `_AA` / `_B` calendar variants (same train,
  same service type) but keeps **distinct service days** for a reused train
  number.

Restructure the loop body so the early `continue` at line 141 is removed:

```
const isNewTrainDoc = !seenTrainDocIds.has(docId)
if (isNewTrainDoc) seenTrainDocIds.add(docId)
// ...build stops...
if (isNewTrainDoc) tripDetails.set(docId, { ...detail })

const svcKey = `${docId}|${serviceType}`
if (!seenTrainServiceKeys.has(svcKey)) {
  seenTrainServiceKeys.add(svcKey)
  for (const st of stopRows) { /* push stationTripsData[serviceType] */ }
  /* push lineIndexData[serviceType] */
}
```

The express second-pass (lines 204-218) iterates `tripDetails` only and is
unaffected (still first-variant-based; out of scope, no station-screen impact).

### 2. Regression test — `apps/web/__tests__/functions/parsers/metra-trips.test.ts`

Add a fixture where one train number has **two** `trip_id` calendar variants
mapping to different `service_id`s (one Saturday, one Sunday) via `calendar.txt`.
Assert:

- `stationTrips.get(slug).saturday` **and** `.sunday` both contain the train
- `tripIndexes.get(lineSlug).saturday` and `.sunday` both contain it
- Same-service-type `_A`/`_B` variants are still deduped (no double-listing
  within one service day)
- `tripDetails` still has exactly one doc for the colliding train number

Model the GTFS fixture on the existing tests in that file
(`metra-schedules.test.ts` / `metra-trips.test.ts` show the zip-builder pattern).

### 3. Data backfill (production data is currently wrong for all weekend Metra)

`syncMetraGtfs` ([apps/functions/src/index.ts:224](apps/functions/src/index.ts:224))
is `onSchedule` only and is gated by `hasMetraFeedChanged()` comparing
`gtfs-meta/metra.publishedTimestamp` to Metra's `published.txt`. After
deploying the fixed function it will **not** re-parse until Metra publishes a
new feed. Force a one-time re-sync:

1. Deploy: `cd apps/functions && npm run build && firebase deploy --only functions:syncMetraGtfs`
2. Check `apps/functions/src/lib/change-detection.ts` `hasMetraFeedChanged()`
   to confirm a missing/cleared `gtfs-meta/metra` doc is treated as "changed".
3. Clear the change-detection state so the next scheduled run re-parses:
   delete the `gtfs-meta/metra` document (Firestore console / MCP). The job
   runs at `:05` each hour; optionally force-run the Cloud Scheduler job
   immediately (`gcloud scheduler jobs run <syncMetraGtfs job>`).
4. Confirm the next run logs "Metra GTFS feed changed, starting sync".

This is a read-then-write to a single meta doc — safe and reversible (the
function rewrites it on success).

## Critical files

- `apps/functions/src/lib/parsers/metra-trips.ts` — the fix (lines ~113-202)
- `apps/web/__tests__/functions/parsers/metra-trips.test.ts` — regression test
- `apps/functions/src/lib/change-detection.ts` — read-only, to confirm the
  force-resync path
- (reference, no change) `packages/shared/src/station-arrivals.ts`,
  `apps/mobile/components/ArrivalsCard.tsx`,
  `apps/mobile/components/MetraTimetable.tsx`

## Verification

1. **Unit:** `cd apps/web && pnpm test` — new regression test + existing
   parser tests green; `pnpm -w run lint` clean.
2. **Parser sanity (local):** run the fixed parser against a real Metra zip in
   a scratch test and assert `stationTrips.get('schaumburg').sunday.length > 0`
   and that a 27xx train present on Saturday is also present on Sunday.
3. **Post-deploy data check:** after backfill, query
   `metra-station-trips/schaumburg` → `sunday` array non-empty; spot-check that
   a train number appearing in `saturday` also appears in `sunday` with its
   own departure time. Confirm `metra-trip-indexes/md-w.sunday` non-empty.
4. **End-to-end (mobile):** on the Schaumburg Metra station screen on a Sunday
   (or with the device/date set to a Sunday):
   - Timetable "Sunday" tab lists trains (no "No Sunday service")
   - Arrivals rows are tappable and navigate to the train detail
   - When the Metra realtime feed has a matching trip, the row shows the live
     white dot + "Last updated: HH:MM" instead of `≈`
5. Repeat the data check for one Saturday-only and one weekday station to
   confirm no regression (no duplicate rows within a single service day).
