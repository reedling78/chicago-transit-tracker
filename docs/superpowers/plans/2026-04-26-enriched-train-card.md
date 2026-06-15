# Plan: Enriched dashboard TrainCard

## Context

The dashboard `TrainCard` currently shows minimal information ("Train 2222" / "To Union Station" / `weekday`). It does not communicate the trip route, the line, or any live status — users have to tap into the train detail page to see anything useful. This plan enriches the card with a real route header, descriptive pills, a mini live-status panel, line-color accent, and per-favorite origin/destination overrides so a power user (e.g. someone whose actual commute is Schaumburg → Western Ave on a train that runs Big Timber → Union Station) sees their personal segment, not the full trip.

End state on each platform (web + mobile):

- **Header line:** `${origin} to ${destination}` (e.g. `Schaumburg to Western Ave`), defaulting to first/last stop on the trip but overridable per-favorite.
- **Right-meta:** `#${trainNumber}` (replaces today's `weekday` chip).
- **Sub-header:** pill row — `Metra` · line short (`MD-W`) · service-type (`Weekday` / `Saturday` / `Sunday`) · `Express` (when applicable).
- **Live area (when realtime trip data is available):** mini two-panel hero — left = live status tone + label, right = next-stop + scheduled time + ETA — modeled on `MetraTripHeroStatusCard` but compact.
- **Card accent:** 4px left border + subtle tinted background using `line.color`.
- **Menu:** new items `Set departure station…` and `Set destination station…` open a picker modal/sheet listing the trip's stops; selection persists to the user's `Favorite` and updates the header.

---

## Critical files

### Shared (`packages/shared/src/`)
- `types.ts` — extend `Favorite` with optional `trainOriginStopSlug?: string` and `trainDestinationStopSlug?: string`.
- `favorites.ts` — no change to keying, but ensure helpers don't strip the new fields.
- (no new file) — reuse existing `MetraTripDetail` / `TripStop` types from `metra-status.ts`.

### Cloud Function parser (`apps/functions/src/lib/parsers/metra-trips.ts`)
- Add `isExpress: boolean` to the per-trip doc. Computed per line:
  - For each `(line, serviceType)` group, find `maxStops = max(stops.length)`.
  - A trip is `isExpress` when `stops.length < 0.85 * maxStops`.
- Add `isExpress` to the trip type definition exported from `apps/functions/src/lib/gtfs-utils.ts`.

### Web (`apps/web/`)
- `app/components/dashboard/cards/TrainCard.tsx` — full rewrite (see "Component shape" below).
- `app/components/dashboard/cards/cardClassNames.ts` — add `cardPills`, `cardPill`, and a tinted-bg helper for the line accent.
- `app/components/dashboard/FavoriteMenu.tsx` — add "Set departure station…" + "Set destination station…" entries (only for `train` favorites).
- `app/components/dashboard/TrainStopPickerModal.tsx` *(new)* — a lightweight dialog (pattern modeled on `AuthModal.tsx`) that lists the trip's stops with selectable rows; constrained so destination must be after origin in `sequence`.
- `app/lib/hooks/useDashboardQueries.ts` — change `useFavoriteTripQuery` to return the full `MetraTripDetail` shape (it already reads the full Firestore doc; just widen the cast and the exported `MetraTripLite` type, renamed to keep the lite contract for non-train consumers if any — confirmed there are none).
- `app/lib/hooks/useToggleFavorite.ts` — extend the persistence path so updates to `trainOriginStopSlug` / `trainDestinationStopSlug` are written to `profiles/{uid}.favorites.{key}` via `updateDoc`. Add a sibling hook `useUpdateFavoriteStops(favorite, { originSlug?, destinationSlug? })` that mirrors the optimistic Zustand-then-Firestore pattern already used for reorder/clear.
- `app/lib/store/favorites.ts` — extend store actions to merge train-stop fields on update; keep hydration tolerant of older docs without these fields.

### Mobile (`apps/mobile/`)
- `components/dashboard/cards/TrainCard.tsx` — full rewrite, mirroring web layout.
- `components/dashboard/cards/cardStyles.ts` — add pill row styles and accent border helper.
- `components/dashboard/FavoriteMenuSheet.tsx` — add the same two new menu items, only for `train` favorites; on tap, close the sheet and call back into the dashboard to open the stop picker sheet.
- `components/dashboard/TrainStopPickerSheet.tsx` *(new)* — `@gorhom/bottom-sheet` modal listing trip stops; same selection rules as web.
- `components/dashboard/Dashboard.tsx` — wire up the new picker sheet ref alongside the existing `FavoriteMenuSheet`.
- `lib/useDashboardQueries.ts` — same widening of trip-query shape as web.
- `lib/useToggleFavorite.ts` — same `useUpdateFavoriteStops` addition.
- `lib/store/favorites.ts` — mirror web store changes.

### Live status (mini hero) — both platforms
Reuse, do not fork:
- Web: render a new `MetraTripHeroStatusCardCompact` co-located with the existing `MetraTripHeroStatusCard.tsx` that takes the same props but renders smaller (xs labels, single-line tone+label, 1-line right panel). Wrap a hook `useMetraTripLiveStatus(trip)` that encapsulates the polling currently inlined in `MetraTripRealtime.tsx` (tripupdates + positions every 30s, AppState-aware on mobile, derives `phase` / `currentDerived` / `firstStop` / `lastStop` / `vehiclePosition` / `error` / `nowMs`). Move that logic from `MetraTripRealtime` into the new hook so both the detail page and the dashboard card share one implementation.
- Mobile: same — extract polling from `apps/mobile/components/MetraTripRealtime.tsx` into `apps/mobile/lib/useMetraTripLiveStatus.ts` and add a compact variant of `MetraTripHeroStatusCard.tsx`.
- The compact variant only renders when the live hook reports `phase !== 'nodata'`. Otherwise the card shows just the header / pills / right-meta.

### Tests
Required by the project's PostSourceFileEdit hook:
- `apps/web/__tests__/components/dashboard/cards/TrainCard.test.tsx` — extend with: header derivation (default + override), right-meta = `#trainNumber`, pill row presence/order, accent border style, mini hero render gating, and menu-item visibility.
- `apps/web/__tests__/components/dashboard/TrainStopPickerModal.test.tsx` *(new)* — selection rules (destination must follow origin), persistence call, close behavior.
- `apps/web/__tests__/lib/hooks/useToggleFavorite.test.ts` — add cases for `useUpdateFavoriteStops` (Firestore call + optimistic store update + revert on error).
- `apps/web/__tests__/lib/store/favorites.test.ts` — already updated in working tree; add coverage for new train-stop fields.
- `apps/web/__tests__/functions/parsers/metra-trips.test.ts` — assert `isExpress` is `true` for short trips and `false` for full ones, given a minimal GTFS fixture.
- Mobile mirrors under `apps/mobile/__tests__/...`.

---

## Component shape (TrainCard)

```tsx
// pseudocode, both platforms
const trip = useFavoriteTripQuery(favorite.id) // returns MetraTripDetail | null
const line = lines?.find(l => l.slug === lineSlug)
const live = useMetraTripLiveStatus(trip)      // { phase, status, currentDerived, firstStop, lastStop, vehiclePosition, error, nowMs }

const originStop = pickStop(trip, favorite.trainOriginStopSlug, /*fallback*/ trip?.stops[0])
const destStop   = pickStop(trip, favorite.trainDestinationStopSlug, /*fallback*/ trip?.stops.at(-1))
const title      = trip ? `${originStop.stationName} to ${destStop.stationName}` : `Train ${trainNumber}`
const pills      = [ 'Metra', trip?.line, SERVICE_LABEL[trip?.serviceType], trip?.isExpress && 'Express' ].filter(Boolean)
const rightMeta  = `#${trainNumber}`
const accent     = line?.color
```

`pickStop(trip, slug, fallback)`: looks up `slug` in `trip.stops`; if missing, returns `fallback`; if `slug` no longer exists on this trip (e.g. Metra reroutes), silently falls back so we never break the header.

The mini hero is rendered only when `live.phase !== 'nodata'`.

---

## Behavior details

- **Override constraint:** in the picker, when choosing destination, only stops with `sequence > originStop.sequence` are selectable; same in reverse for origin. If a user has saved an override that has become invalid (the picked stop is no longer on the trip, or sequence rule violated after a schedule change), the card silently falls back to the natural endpoint — no error UI.
- **Pills:**
  - `Metra` is fixed (only Metra trips can be `train` favorites today).
  - Line short uses `trip.line` (e.g. `MD-W`); colored chip using `line.color` matching the existing `cardChip` styling pattern in `LineCard`.
  - Service-type uses a shared label map (already present as `SERVICE_LABEL` in `apps/web/app/components/MetraTripRealtime.tsx`; lift to `@ctt/shared`).
  - `Express` only when `trip.isExpress === true`.
- **Card accent:** match `LineCard`'s `borderLeft` inline-style approach for the 4px stripe, plus a Tailwind `bg-[color]/5`-style tint via inline `backgroundColor` (web) / `StyleSheet` value (mobile). Falls back to today's neutral background when `line.color` is unknown.
- **Right meta `#trainNumber`:** replaces today's `cardMeta` rendering; same right-aligned chip slot — keep the existing `cardMeta` class but change the value.
- **Menu items (train only):**
  - `Set departure station…` → opens picker scoped to origin selection.
  - `Set destination station…` → opens picker scoped to destination selection.
  - Both items hidden when `trip` data is unavailable (so we don't open an empty picker).

---

## Polling cost

The dashboard mini hero subscribes to `metraTripUpdates` + `metraPositions` per visible train favorite. Default interval is the existing 30s cadence already used by `MetraTripRealtime`. We accept the cost: typical users have <5 train favorites; the existing detail-page polling already proves the budget is fine. Mobile inherits the existing `AppState`-aware pause/resume from `useMetraFeed` once polling logic is extracted into the shared hook.

---

## Verification

1. **Unit:** `pnpm -w run lint` clean and `pnpm -w run test` green (zero warnings/errors per the standing CI rule).
2. **Parser:** run the parser test fixture; assert `isExpress` matches expected for at least one short and one full trip on a synthetic line.
3. **Web manual:**
   - `pnpm run:web`, sign in, favorite a Metra train (e.g. MD-W 2222).
   - Confirm header reads `${origin} to ${destination}`, right-meta reads `#2222`, pill row shows `Metra · MD-W · Weekday` (and `Express` if applicable).
   - Confirm 4px line-color stripe and tinted background.
   - During an active service window, confirm the mini hero appears with live tone + next-stop time; outside service hours, confirm it's hidden cleanly.
   - Open menu → `Set destination station…` → pick a midline stop → confirm header updates and the choice persists across reload (Firestore write).
   - Pick an origin after the current destination → confirm validation prevents it.
4. **Mobile manual:** repeat on iOS simulator (`pnpm run:ios`) with the same favorite. Verify drag-to-reorder still works (long-press) and the bottom-sheet picker presents correctly.
5. **Compliance check:** Metra "last updated" timestamp is already required by `.claude/rules/transit-compliance.md` for any surface showing Metra realtime data — surface it inside the mini hero (use `live.nowMs` / `vehiclePosition.timestamp`, matching the existing `Last reported …` line in `MetraTripHeroStatusCard`).
