# StationCard arrivals view + per-favorite direction & density

## Context

The dashboard StationCard today is a static text row — station name, line abbreviations, service badge — that just deep-links to the station page. The richer ArrivalsCard (mobile) / Arrivals (web) component already exists on station detail pages, showing the next departures grouped by headsign and refreshing every 60s.

This change brings that arrivals UX onto the dashboard card itself, so a user's favorited station shows actionable "next train" info at a glance. It also adds two per-favorite preferences exposed via the existing card overflow menu (⋯):

1. **Direction filter** — filter the times to a single direction.
   - Metra: `all` / `inbound` / `outbound` (uses `directionId`).
   - CTA: `all` / one of the station's headsigns (e.g. "Loop", "O'Hare").
2. **Density** — `expanded` (next 3 arrivals per direction, ArrivalsCard-style) or `compact` (one row per direction, next 2 times inline).

Both preferences persist per-favorite to Firestore so they sync across devices and reload.

## Scope summary

- Extend the `Favorite` shape in `@ctt/shared` with two optional fields.
- Add a Firestore-write hook to update a single favorite's settings without re-toggling it.
- Build a shared "computed arrivals" helper in `@ctt/shared` so web and mobile share the math (minute math + grouping + filtering).
- Rewrite `dashboard/cards/StationCard.tsx` on both platforms to fetch schedule + station-trips (Metra) and render expanded/compact arrivals.
- Add inline toggle rows to `FavoriteMenu` (web) and `FavoriteMenuSheet` (mobile) for direction and density.

## Critical files

### Shared (`packages/shared/src/`)
- `types.ts` — extend `Favorite` interface (lines 76–94).
- `favorites.ts` — no shape change to keys; add helper to merge a partial settings update.
- New: `station-arrivals.ts` — pure helpers extracted from `apps/mobile/components/ArrivalsCard.tsx` (minute math, grouping by headsign, direction filtering, compact summarization).

### Web (`apps/web/`)
- `app/components/dashboard/cards/StationCard.tsx` — replace static body with arrivals renderer; subscribe to schedule via TanStack Query.
- `app/components/dashboard/FavoriteMenu.tsx` — add Direction + Density toggle rows above the existing items (only for `type === 'station'`).
- `app/lib/hooks/useDashboardQueries.ts` — add `useStationSchedule(slug)` and `useStationTrips(slug)` (Metra only) using `/api/schedules/{slug}` and `/api/metra/station-trips/{slug}`. Cache 60s; both endpoints already send `s-maxage=3600, stale-while-revalidate=86400`.
- `app/lib/hooks/useUpdateFavoriteSettings.ts` — new. Writes `favorites.{key}.directionFilter` / `favorites.{key}.density` map fields with optimistic store update (mirrors `useReorderFavorites` shape).
- `app/lib/store/favorites.ts` — add `updateSettings(key, patch)` action.

### Mobile (`apps/mobile/`)
- `components/dashboard/cards/StationCard.tsx` — same rewrite as web.
- `components/dashboard/FavoriteMenuSheet.tsx` — add toggle rows; sheet snap point may need to grow when station favorite is selected (bump from `40%` to `55%`).
- `lib/useDashboardQueries.ts` — add `useStationSchedule` / `useStationTrips` (Firestore reads via existing `getDoc` pattern, wrapped in TanStack Query for the 60s polling cadence).
- `lib/useUpdateFavoriteSettings.ts` — mirror of web hook.
- `lib/store/favorites.ts` — add `updateSettings` action.

### Reused (no change)
- `apps/mobile/components/ArrivalsCard.tsx` and `apps/web/app/components/Arrivals.tsx` continue to exist for station detail pages — extract pure logic into shared, but leave these components rendering the full version unchanged.
- `apps/web/app/api/schedules/[slug]/route.ts`, `apps/web/app/api/metra/station-trips/[slug]/route.ts` — already return the data we need.
- `packages/shared/src/gtfs-types.ts` — `StationSchedule`, `DirectionSchedule`, `StationTripEntry`, `StationTrips` already cover everything.
- `packages/shared/src/favorites.ts` — `favoriteKey`, `mapToArray`, `arrayToMap` already used by toggle/reorder hooks.
- `apps/web/app/lib/hooks/useToggleFavorite.ts` and `apps/mobile/lib/useToggleFavorite.ts` — model for the new settings hook (same map-keyed Firestore write pattern, same `pendingWrites` guard).

## Data model changes

In `packages/shared/src/types.ts`:

```ts
export type FavoriteDirection =
  | 'all'
  | 'inbound'   // Metra directionId === 1
  | 'outbound'  // Metra directionId === 0
  | string      // CTA headsign (free-form, e.g. "Loop")

export type FavoriteDensity = 'compact' | 'expanded'

export interface Favorite {
  type: FavoriteType
  id: string
  addedAt: string
  position?: number
  /** Per-favorite filter for station cards. Defaults to 'all'. */
  directionFilter?: FavoriteDirection
  /** Per-favorite render density for station cards. Defaults to 'expanded'. */
  density?: FavoriteDensity
}
```

Both fields are optional, so existing Firestore profiles need no migration. Reads default to `'all'` / `'expanded'`.

## Shared arrivals helper (`packages/shared/src/station-arrivals.ts`)

Extract from `apps/mobile/components/ArrivalsCard.tsx` (lines 44–141 area) so web and mobile compute identically:

- `minutesUntil(now: Date, minutesSinceMidnight: number): number`
- `formatMinutesAway(mins: number): string` — returns `"Now"`, `"X min"`, etc.
- `pickServiceDay(now: Date): 'weekday' | 'saturday' | 'sunday'`
- `computeArrivalGroups({ schedule, trips, now, service, directionFilter, limit }) => Array<{ headsign, line, lineSlug, items: Array<{ minutes, label, tripId? }> }>` — does headsign grouping, applies direction filter (Metra: by `directionId`; CTA: by exact headsign match; `'all'`: passthrough), and trims to `limit` per group.
- `summarizeCompact(groups, perGroup = 2)` — for compact rendering, returns up to N times per group as a single string.

This file must remain platform-agnostic (no React, no `firebase-admin`, no `next/*`).

## StationCard rewrite (both platforms)

Behavior:

1. Resolve the favorite's `directionFilter` and `density` (defaults `'all'` / `'expanded'`).
2. Fetch:
   - `useStationSchedule(station.slug)` always.
   - `useStationTrips(station.slug)` only when `station.service === 'metra' || station.service === 'both'`.
3. Compute arrival groups with the shared helper, refresh every 60s (use a `now` state ticked by `setInterval` — keep the timer outside TanStack Query so we don't re-fetch every minute).
4. Render:
   - **Expanded:** mirrors `ArrivalsCard` — small headsign header per group, up to 3 lines of "X min · departs HH:MM" with the line color accent. Skeleton on first load.
   - **Compact:** one row per group: `{LineColor dot} {headsign} · {time}, {time}`. No skeleton (just shows "—" when empty).
5. Tapping the card body still routes to the station page (preserves today's behavior). Arrivals area is informational, not interactive — the menu is the only new interactive surface.
6. CTA branding: continue to use `LINE_COLORS` from `@ctt/shared`. No hardcoded hex.
7. Metra branding: when arrivals come from Metra, the card must satisfy `.claude/rules/transit-compliance.md` — show a "Last updated HH:MM" line sourced from the actual fetch time. Add it once at the bottom of the arrivals area for Metra cards (CTA cards don't need it).

## Menu changes

### Web (`FavoriteMenu.tsx`)
Above the existing "Open details" / "Mute alerts" / "Share" / divider / "Remove" rows, when `favorite.type === 'station'`, render:

- **View** row: `[Expanded] [Compact]` segmented buttons → calls `updateSettings(key, { density })`.
- **Show** row: `[All]` plus per-station options:
  - Metra station (`station.service === 'metra'` or `'both'`): `[All] [Inbound] [Outbound]`.
  - CTA station: `[All]` + one chip per `schedule.directions[i].headsign`. The menu needs the schedule too — read from the same TanStack Query cache so it's free.
- A subtle "Saved" affordance is unnecessary — optimistic store update is instant.

### Mobile (`FavoriteMenuSheet.tsx`)
Same two rows, rendered as `Pressable` chip rows inside the bottom sheet, above the existing items. Bump default snap point from `40%` to `55%` when the active favorite is a station; keep `40%` for line/train favorites (the sheet already takes a `Favorite` via `open()`, so it can adjust at open time).

## Persistence pattern

`useUpdateFavoriteSettings` mirrors the existing `useToggleFavorite` shape:

1. Optimistically update the zustand store (new `updateSettings` action) so the UI re-renders immediately.
2. Increment `pendingWrites` to suppress the `onSnapshot` clobber from `AuthProvider` / `AuthContext`.
3. Write `{ [`favorites.${key}.directionFilter`]: value }` (or `density`) to `profiles/{uid}` via Firebase Auth uid.
4. Decrement `pendingWrites` in finally.
5. On error, revert the store and surface a toast/alert (web: console + silent revert like `useReorderFavorites`; mobile: `Alert.alert` like `useToggleFavorite`).

Anonymous / signed-out users: write only to the local zustand store (matches today's behavior — favorites already work for anon users via local persistence).

## Tests

Per `.claude/rules/testing.md`, every changed source file gets a corresponding test. Key cases:

### `packages/shared/__tests__/station-arrivals.test.ts` (new — co-locate with shared package's existing test setup or under `apps/web/__tests__/shared/`)
- `computeArrivalGroups` filters Metra trips by `directionId` for `'inbound'` / `'outbound'`.
- `computeArrivalGroups` filters CTA arrivals by exact headsign match.
- `'all'` filter passes everything through, grouped by headsign.
- `pickServiceDay` returns the correct bucket for each weekday.
- `formatMinutesAway` returns `"Now"` for ≤0, `"1 min"` for 1, etc.

### `apps/web/__tests__/components/dashboard/cards/StationCard.test.tsx`
- Renders skeleton while schedule loads.
- Expanded view shows grouped arrivals with headsigns.
- Compact view shows single-row summary.
- Direction filter limits visible groups for both Metra and CTA.
- Metra arrivals include "Last updated" timestamp.

### `apps/web/__tests__/components/dashboard/FavoriteMenu.test.tsx`
- View toggle calls `updateSettings({ density })`.
- Show toggle calls `updateSettings({ directionFilter })` with correct value for Metra and CTA stations.
- Toggle rows are hidden for `line` and `train` favorites.

### Mobile parallels
- `apps/mobile/__tests__/components/dashboard/cards/StationCard.test.tsx`
- `apps/mobile/__tests__/components/dashboard/FavoriteMenuSheet.test.tsx`

### Update existing
- `apps/web/__tests__/lib/store/favorites.test.ts` (or equivalent) — assert `updateSettings` action exists and merges into the matching favorite.
- Any existing FavoriteMenu / FavoriteMenuSheet snapshots will need refreshing.

## Compliance check (per `.claude/rules/transit-compliance.md`)

- [x] No new agency logo or wordmark.
- [x] No client-direct fetch — all data through `/api/schedules/{slug}` and `/api/metra/station-trips/{slug}` (web) and Firestore reads (mobile, allowed since `metra-station-trips` is a self-hosted snapshot, not a Metra endpoint).
- [x] Metra last-updated timestamp added to station cards displaying Metra arrivals.
- [x] Route colors from `@ctt/shared` only.
- [x] No "official" / "in partnership" copy.
- [x] Footer / Terms unchanged — no new agency surfaced.

## Verification

1. `pnpm -w run lint` — clean.
2. `pnpm -w run test` — clean, zero warnings.
3. `pnpm run:web` and visit the dashboard:
   - Favorite a CTA station (e.g. Clark/Lake) and a Metra station (e.g. Schaumburg, Union Station Metra).
   - Confirm expanded arrivals render and refresh every 60s without re-fetching the underlying schedule.
   - Open the ⋯ menu on each station card:
     - On Schaumburg, choose `Inbound` → only inbound trains remain. Toggle `Outbound` → only outbound. Reload the page → selection persists.
     - On Union Station, choose `Outbound` (MD-W example from the original ask) → only westbound trips show.
     - On Clark/Lake, the Show row lists each headsign (Loop, O'Hare, etc.). Pick one → only that headsign's arrivals show.
     - Toggle `Compact` → card collapses to one row per direction. Toggle `Expanded` → goes back.
   - Confirm Metra cards display `Last updated HH:MM`.
4. `pnpm run:ios` (or `pnpm run:android`) — repeat the same checks on the mobile dashboard via the bottom-sheet menu. Confirm sheet height adjusts for station favorites.
5. Sign in on web, change settings, sign in on mobile — settings appear (Firestore round-trip).
6. Sign out, reload — local zustand persistence still keeps the chosen filter/density.
7. Visual sanity-check: cards on a 375px viewport (web) and a small Android device do not overflow horizontally.
