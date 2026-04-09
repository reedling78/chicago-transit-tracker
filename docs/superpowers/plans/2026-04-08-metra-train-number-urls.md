# Plan: Use Train Numbers in Metra URLs

## Context

Metra train URLs currently use the raw GTFS trip ID (e.g., `/metra/md-w/train/md-w_mw2222_v2_a`). Riders know trains by their number (e.g., train 2222), not internal GTFS identifiers. The train number is embedded in the trip ID but never extracted — the parser falls back to the full trip ID because Metra's GTFS doesn't populate `trip_short_name`.

**Goal**: URLs like `/metra/md-w/train/2222` with clean train number display throughout the UI.

**Key finding**: Each train number has multiple trip ID variants (suffixes `_A`, `_AA`, `_B`) representing different calendar periods, but they all share the same stops, times, and headsigns. We can safely deduplicate to one document per train number per line.

---

## Step 1: Add `extractMetraTrainNumber` to gtfs-utils

**File**: [gtfs-utils.ts](functions/src/lib/gtfs-utils.ts)

Add a function that extracts the numeric train number from a Metra trip ID:

- Pattern: `{LINE}_{PREFIX}{NUMBER}_V{version}_{suffix}` → take second segment, strip alpha prefix
- `MD-W_MW2222_V2_A` → `2222`, `BNSF_BN1200_V4_A` → `1200`, `NCS_NC100_V1_A` → `100`
- Falls back to full trip ID if pattern doesn't match

Also add `metraTrainDocId(lineSlug, trainNumber)` → `"{lineSlug}_{trainNumber}"` for Firestore doc keys.

---

## Step 2: Update Cloud Function parser

**File**: [metra-trips.ts](functions/src/lib/parsers/metra-trips.ts)

- **Line 123**: Replace `t.trip_short_name?.trim() || t.trip_id` with `t.trip_short_name?.trim() || extractMetraTrainNumber(t.trip_id)`
- **Deduplication**: Add a `Set<string>` to track seen `lineSlug_trainNumber` keys; skip duplicate variants
- **Doc key**: Change `tripDetails.set(tripId, ...)` to use `metraTrainDocId(lineSlug, trainNumber)` as the map key
- **Index/station entries**: Set `tripId` field to the train number string (so downstream URL construction works automatically)
- Keep `TripDetail.tripId` as the Firestore doc key (`bnsf_1200`), used by the page for lookups

---

## Step 3: Update local generation script

**File**: [generate-metra-trips.ts](scripts/generate-metra-trips.ts)

Mirror the same changes from Step 2:

- Line 301: Use `extractMetraTrainNumber` (import or inline the function since this script doesn't import from functions/)
- Line 312: Use `metraTrainDocId` pattern for filename
- Add deduplication set
- Set `tripId` in index/station entries to train number string

---

## Step 4: Rename route directory and update page

**Rename**: `app/metra/[line]/train/[tripId]/` → `app/metra/[line]/train/[trainNumber]/`

**File**: [page.tsx](app/metra/[line]/train/[tripId]/page.tsx)

- Props type: `{ params: Promise<{ line: string; trainNumber: string }> }`
- `readDetail()`: Look up doc by `${lineSlug}_${trainNumber}` instead of raw tripId
- `generateStaticParams()`: Return `{ trainNumber: entry.tripId }` (which now holds the train number)
- `generateMetadata()`: Use `trainNumber` in canonical URL
- No display changes needed — already shows `trip.trainNumber`

---

## Step 5: Rename API route

**Rename**: `app/api/metra/trips/[tripId]/` → `app/api/metra/trips/[trainNumber]/`

**File**: [route.ts](app/api/metra/trips/[tripId]/route.ts)

- Accept a `line` query param: `/api/metra/trips/2222?line=md-w`
- Construct doc ID as `${line}_${trainNumber}` for Firestore lookup

---

## Step 6: Verify auto-updating files (no code changes needed)

These files use `trip.tripId` or `t.tripId` for URL construction, which will automatically contain the train number after the data changes:

- [StationTimetable.tsx:118](app/components/StationTimetable.tsx#L118) — link href uses `trip.tripId` ✓
- [StationTimetable.tsx:133](app/components/StationTimetable.tsx#L133) — displays `trip.trainNumber` ✓
- [sitemap.ts:105](app/sitemap.ts#L105) — URL uses `t.tripId` ✓

---

## Step 7: Update tests

- [metra-train.test.tsx](__tests__/pages/metra-train.test.tsx) — Update param name from `tripId` to `trainNumber`, update mock trip index entries, update import path
- [StationTimetable.test.tsx](__tests__/components/StationTimetable.test.tsx) — Update `tripId` values in mock data and link assertions
- Add unit test for `extractMetraTrainNumber` with various trip ID formats
- Update parser tests if they exist

---

## Step 8: Regenerate static JSON data

Run `npm run generate:metra-trips` to regenerate all `public/data/` files with:

- Correct train numbers in `trainNumber` fields
- Train numbers in `tripId` fields (for URL construction)
- Deduplicated entries (3x reduction in trip detail files)

---

## Verification

1. `npm test` — all tests pass
2. `npm run build` — build succeeds with new route structure
3. `npm run dev` — verify locally:
   - Station timetable shows "Train 2222" (not full ID)
   - Timetable links go to `/metra/md-w/train/2222`
   - Train detail page loads correctly at that URL
   - Breadcrumbs show "Train 2222"
4. `npm run lint` — no lint errors

---

## Files Modified (summary)

| File                                             | Change                                           |
| ------------------------------------------------ | ------------------------------------------------ |
| `functions/src/lib/gtfs-utils.ts`                | Add `extractMetraTrainNumber`, `metraTrainDocId` |
| `functions/src/lib/parsers/metra-trips.ts`       | Extract train number, deduplicate, new doc keys  |
| `scripts/generate-metra-trips.ts`                | Same parser changes for local script             |
| `app/metra/[line]/train/[trainNumber]/page.tsx`  | Rename + update params/lookup                    |
| `app/api/metra/trips/[trainNumber]/route.ts`     | Rename + accept line param                       |
| `__tests__/pages/metra-train.test.tsx`           | Update for new param/path                        |
| `__tests__/components/StationTimetable.test.tsx` | Update mock data                                 |
| New: `__tests__/functions/gtfs-utils.test.ts`    | Test extractMetraTrainNumber                     |
