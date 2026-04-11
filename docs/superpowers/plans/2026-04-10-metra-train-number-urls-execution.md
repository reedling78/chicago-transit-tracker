# Resume: Use Train Numbers in Metra URLs

This is a resumption of the existing plan at
[2026-04-08-metra-train-number-urls.md](./2026-04-08-metra-train-number-urls.md).
That plan is still current and should be followed as-is. This file exists only
to satisfy the plan-mode workflow — the authoritative plan is the dated file.

## Current Status (verified 2026-04-10)

None of the 8 steps in the original plan have been implemented yet. Specifics:

- **Step 1** — `extractMetraTrainNumber` / `metraTrainDocId` not present in
  [gtfs-utils.ts](../../../functions/src/lib/gtfs-utils.ts)
- **Step 2** — [metra-trips.ts:123](../../../functions/src/lib/parsers/metra-trips.ts#L123)
  still uses `t.trip_short_name?.trim() || t.trip_id`; no deduplication
- **Step 3** — [generate-metra-trips.ts:301](../../../scripts/generate-metra-trips.ts#L301)
  mirrors the unchanged parser logic; still writes one file per GTFS variant
- **Step 4** — Route directory is still `app/metra/[line]/train/[tripId]/`
- **Step 5** — API route is still `app/api/metra/trips/[tripId]/`, no `line`
  query param
- **Step 6** — `StationTimetable` already uses `trip.tripId` / `trip.trainNumber`,
  so it will update automatically once data changes
- **Step 7** — [gtfs-utils.test.ts](../../../__tests__/functions/gtfs-utils.test.ts)
  exists but has no tests for the new functions; page/component tests still
  reference `[tripId]`
- **Step 8** — `public/data/metra-trip-detail/` still holds the 3-variant
  per-train files (e.g. `bnsf_bn1200_v4_a.json`)

## Scope Adjustment (confirmed with user 2026-04-10)

`scripts/generate-metra-trips.ts` and `public/data/metra-trip-detail/` are
dead code — the `syncMetraGtfs` Cloud Function is the sole source of truth,
writing directly to Firestore collections. The original plan's **Step 3**
(update the local script) and **Step 8** (regenerate static JSON) are
replaced with a single deletion step.

Files to delete as part of this work:

- `scripts/generate-metra-trips.ts`
- `public/data/metra-trip-detail/` (entire directory)
- Any other `public/data/metra-*` files only consumed by the old script
  (verify before deleting — check for lingering references)
- The `generate:metra-trips` entry in `package.json` scripts, if present

After deletion, grep for `public/data/metra` and `generate-metra-trips` to
confirm nothing still imports or references them. The API routes already
read from Firestore, so runtime should be unaffected.

## Execution Order

1. Add `extractMetraTrainNumber` and `metraTrainDocId` to
   [gtfs-utils.ts](../../../functions/src/lib/gtfs-utils.ts), with unit
   tests added to
   [gtfs-utils.test.ts](../../../__tests__/functions/gtfs-utils.test.ts)
   (original Step 1 + part of Step 7)
2. Update the Cloud Function parser in
   [metra-trips.ts](../../../functions/src/lib/parsers/metra-trips.ts):
   extract the train number, deduplicate variants via a
   `Set<lineSlug_trainNumber>`, use `metraTrainDocId` as the Firestore doc
   key, and set the `tripId` field on index/station entries to the plain
   train number string (original Step 2)
3. Delete the dead local script and static data (replaces Steps 3 + 8 —
   see Scope Adjustment above)
4. Rename `app/metra/[line]/train/[tripId]/` to
   `app/metra/[line]/train/[trainNumber]/`; update the page's param type,
   `readDetail()` lookup (`${lineSlug}_${trainNumber}`),
   `generateStaticParams()`, and `generateMetadata()` canonical URL
   (original Step 4)
5. Rename `app/api/metra/trips/[tripId]/` to
   `app/api/metra/trips/[trainNumber]/`; accept a `line` query param and
   build the doc ID as `${line}_${trainNumber}` (original Step 5)
6. Update existing tests:
   [metra-train.test.tsx](../../../__tests__/pages/metra-train.test.tsx)
   (new param name, new import path, mock data using train numbers) and
   [StationTimetable.test.tsx](../../../__tests__/components/StationTimetable.test.tsx)
   (mock `tripId` values become train-number strings, link assertions
   updated) — original Step 7 remainder
7. `StationTimetable.tsx` needs no code changes — it already uses
   `trip.tripId` for the href and `trip.trainNumber` for the label, which
   will both hold the train number once the parser change lands (original
   Step 6 — verification only)
8. Update `app/sitemap.ts` only if needed — line 105 already uses
   `t.tripId` which will contain the train number automatically
9. Verification: `npm test` (zero warnings), `npm run lint` (clean),
   `npm run build` (succeeds with renamed routes), and a manual
   `npm run dev` check that the Metra station timetable links resolve to
   `/metra/{line}/train/{number}` and the detail page renders

## Critical Files

| File                                                                                                  | Change                                                     |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| [functions/src/lib/gtfs-utils.ts](../../../functions/src/lib/gtfs-utils.ts)                            | Add `extractMetraTrainNumber`, `metraTrainDocId`           |
| [functions/src/lib/parsers/metra-trips.ts](../../../functions/src/lib/parsers/metra-trips.ts)          | Use new helpers, deduplicate variants, new Firestore keys  |
| [app/metra/\[line\]/train/\[tripId\]/page.tsx](../../../app/metra/[line]/train/[tripId]/page.tsx)       | Rename directory + update params, lookup, metadata         |
| [app/api/metra/trips/\[tripId\]/route.ts](../../../app/api/metra/trips/[tripId]/route.ts)               | Rename directory + accept `line` query param               |
| [\_\_tests\_\_/functions/gtfs-utils.test.ts](../../../__tests__/functions/gtfs-utils.test.ts)           | Add `extractMetraTrainNumber` / `metraTrainDocId` tests    |
| [\_\_tests\_\_/pages/metra-train.test.tsx](../../../__tests__/pages/metra-train.test.tsx)               | New param name + import path                               |
| [\_\_tests\_\_/components/StationTimetable.test.tsx](../../../__tests__/components/StationTimetable.test.tsx) | Mock trip IDs become train-number strings            |
| `scripts/generate-metra-trips.ts`                                                                      | **Delete** (dead code)                                     |
| `public/data/metra-trip-detail/`                                                                       | **Delete** (dead code)                                     |
