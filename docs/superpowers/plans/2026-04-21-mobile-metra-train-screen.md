# Mobile Metra Train Landing Screen

## Context

The web app has a Metra train detail page at `/metra/[line]/train/[trainNumber]` (`apps/web/app/metra/[line]/train/[trainNumber]/page.tsx`) that renders the full stop schedule and realtime status for a single train. Two web UI elements link into it:

- `apps/web/app/components/StationTimetable.tsx:118` — `/metra/${trip.lineSlug}/train/${trip.tripId}`
- `apps/web/app/components/Arrivals.tsx:251-258` — `/metra/${arrival.lineSlug}/train/${arrival.tripId}`

The mobile app currently displays train numbers in `MetraTimetable.tsx` (line 56) but the rows are non-interactive `View`s — there is no mobile equivalent of the train route. `ArrivalsCard.tsx` doesn't surface train numbers in its rows.

Goal: add a blank mobile Metra train screen that mirrors the web route shape, and make the mobile timetable rows tap into it. The body of the screen stays empty for a follow-up. This makes the linking infrastructure real so detail content can be filled in later without restructuring.

## Route shape

Mirror the web URL nesting: `/(tabs)/metra/[line]/train/[trainNumber]`.

Expo-router does not support `[line].tsx` as a file and `[line]/` as a sibling directory in the same folder. The current file is `apps/mobile/app/(tabs)/metra/[line].tsx`. Convert to an index file inside a new folder:

- Move `apps/mobile/app/(tabs)/metra/[line].tsx` → `apps/mobile/app/(tabs)/metra/[line]/index.tsx`
- Add new file `apps/mobile/app/(tabs)/metra/[line]/train/[trainNumber].tsx`

The public route `/(tabs)/metra/bnsf` still resolves to the index (no caller changes needed).

## Files to modify

### 1. `apps/mobile/app/(tabs)/metra/[line].tsx` → `apps/mobile/app/(tabs)/metra/[line]/index.tsx` (move)

Pure file move. Update relative imports (`../../../` → `../../../../`) for the extra nesting level.

### 2. `apps/mobile/app/(tabs)/metra/[line]/train/[trainNumber].tsx` (new)

Blank screen with:

- `useLocalSearchParams<{ line: string; trainNumber: string }>()`
- `useLine(lineSlug)` (existing hook in `apps/mobile/lib/hooks.ts`) for the line name + color
- `<Stack.Screen options={{ title: \`Train ${trainNumber}\` }} />`
- `PageHeader` from `apps/mobile/components/PageHeader.tsx`:
  - `title={\`Train ${trainNumber}\`}`
  - `description` — line name if available
  - `imageSrc` — Metra hero (same asset the station screen uses at `apps/mobile/app/(tabs)/metra/station/[station].tsx:9`)
  - `badges` — a single line-color chip matching the station screen's chip style
- Body: an empty `<View>` below the header.

### 3. `apps/mobile/components/MetraTimetable.tsx` (edit)

Wire the rows as links. `StationTripEntry.lineSlug` already exists (`packages/shared/src/gtfs-types.ts:29`), no data plumbing needed.

- Replace each row `<View>` with `<Link asChild>` + `<Pressable>`, targeting `` `/(tabs)/metra/${trip.lineSlug}/train/${trip.tripId}` ``.
- Add a `chevron-forward` Ionicon at the row end as tap affordance.

### 4. `apps/mobile/app/(tabs)/metra/_layout.tsx` (edit)

Add `<Stack.Screen name="[line]/train/[trainNumber]" options={{ title: 'Train' }} />` for a stable default header title.

## Tests

### New: `apps/mobile/__tests__/screens/metra-train.test.tsx`

Mock `useLocalSearchParams` + `useLine`. Assert the train number and line name render in the header. Assert no body placeholder content.

### Update: `apps/mobile/__tests__/components/MetraTimetable.test.tsx`

Add a test that rows render with an `href` matching `/(tabs)/metra/<lineSlug>/train/<tripId>`. Keep existing filter tests passing.

### Update: `apps/mobile/__tests__/screens/metra-line.test.tsx`

After the file move, verify the screen import path in the test still resolves; update if needed.

## Intentionally out of scope

- **ArrivalsCard linking.** The mobile `Arrival` type (`apps/mobile/components/ArrivalsCard.tsx:7-13`) lacks `tripId` and `lineSlug`, and `StationSchedule.directions` entries don't carry them either. Linking from arrivals requires extending the schedule data model and Firestore schema — separate, larger change. Follow-up.
- **CTA train screen.** Web has no CTA train detail route.
- **Screen body content.** Realtime polling, stop list, hero status card — all deferred.

## Verification

```bash
pnpm --filter mobile run lint
pnpm --filter mobile test
pnpm -w run lint && pnpm -w run test

# Manual
pnpm run:ios
```

Manual steps:

1. Metra tab → tap a line (e.g. BNSF) → line detail renders unchanged.
2. Tap a station → scroll to Timetable.
3. Tap a row → lands on the new train screen with correct train number, line name, Metra hero, line chip, empty body.
4. Back returns to the station.

## Critical files

- `apps/mobile/app/(tabs)/metra/[line].tsx` (to move)
- `apps/mobile/app/(tabs)/metra/_layout.tsx`
- `apps/mobile/components/MetraTimetable.tsx`
- `apps/mobile/components/PageHeader.tsx` (reuse)
- `apps/mobile/lib/hooks.ts` — reuse `useLine`
- `apps/web/app/metra/[line]/train/[trainNumber]/page.tsx` — reference for future body content
- `packages/shared/src/gtfs-types.ts:23-37` — `StationTripEntry` + `StationTrips`
