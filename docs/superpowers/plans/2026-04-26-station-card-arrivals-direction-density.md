See `2026-04-26-station-card-arrivals-and-direction-filter.md` (this file is the auto-named harness placeholder; descriptive copy is the source of truth and will be committed).

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
- Build a shared "computed arrivals" helper in `@ctt/shared` so web and mobile share the math.
- Rewrite `dashboard/cards/StationCard.tsx` on both platforms to fetch schedule + station-trips (Metra) and render expanded/compact arrivals.
- Add inline toggle rows to `FavoriteMenu` (web) and `FavoriteMenuSheet` (mobile) for direction and density.

## Critical files

### Shared (`packages/shared/src/`)
- `types.ts` — extend `Favorite` interface (lines 76–94).
- New: `station-arrivals.ts` — pure helpers extracted from `apps/mobile/components/ArrivalsCard.tsx` (minute math, grouping by headsign, direction filtering, compact summarization).

### Web (`apps/web/`)
- `app/components/dashboard/cards/StationCard.tsx` — replace static body with arrivals renderer; subscribe to schedule via TanStack Query.
- `app/components/dashboard/FavoriteMenu.tsx` — add Direction + Density toggle rows above existing items, only for `type === 'station'`.
- `app/lib/hooks/useDashboardQueries.ts` — add `useStationSchedule(slug)` and `useStationTrips(slug)` (Metra only).
- `app/lib/hooks/useUpdateFavoriteSettings.ts` — new hook mirroring `useToggleFavorite` shape.
- `app/lib/store/favorites.ts` — add `updateSettings(key, patch)` action.

### Mobile (`apps/mobile/`)
- `components/dashboard/cards/StationCard.tsx` — same rewrite as web.
- `components/dashboard/FavoriteMenuSheet.tsx` — add toggle rows; bump snap point to `55%` for station favorites.
- `lib/useDashboardQueries.ts` — add `useStationSchedule` / `useStationTrips`.
- `lib/useUpdateFavoriteSettings.ts` — mirror of web hook.
- `lib/store/favorites.ts` — add `updateSettings` action.

### Reused (no change)
- `apps/mobile/components/ArrivalsCard.tsx` and `apps/web/app/components/Arrivals.tsx` continue to exist for station detail pages.
- `apps/web/app/api/schedules/[slug]/route.ts`, `apps/web/app/api/metra/station-trips/[slug]/route.ts` — already return what we need.
- `packages/shared/src/gtfs-types.ts` — `StationSchedule`, `DirectionSchedule`, `StationTripEntry`, `StationTrips` already cover the data shapes.
- `packages/shared/src/favorites.ts` — `favoriteKey`, `mapToArray`, `arrayToMap`.
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

Both fields are optional, so existing Firestore profiles need no migration.

## Shared arrivals helper (`packages/shared/src/station-arrivals.ts`)

Extract from `apps/mobile/components/ArrivalsCard.tsx` so web and mobile compute identically:

- `minutesUntil(now: Date, minutesSinceMidnight: number): number`
- `formatMinutesAway(mins: number): string` — `"Now"`, `"X min"`, etc.
- `pickServiceDay(now: Date): 'weekday' | 'saturday' | 'sunday'`
- `computeArrivalGroups({ schedule, trips, now, service, directionFilter, limit }) => Array<{ headsign, line, lineSlug, items: Array<{ minutes, label, tripId? }> }>` — groups by headsign, applies direction filter (Metra: by `directionId`; CTA: by exact headsign match; `'all'`: passthrough), trims to `limit` per group.
- `summarizeCompact(groups, perGroup = 2)` — for compact rendering, returns up to N times per group as a single string.

Must remain platform-agnostic (no React, no `firebase-admin`, no `next/*`).

## StationCard rewrite (both platforms)

1. Resolve favorite's `directionFilter` and `density` (defaults `'all'` / `'expanded'`).
2. Fetch:
   - `useStationSchedule(station.slug)` always.
   - `useStationTrips(station.slug)` only for Metra (`station.service === 'metra' || === 'both'`).
3. Compute arrival groups via shared helper, refresh every 60s with a `now` state interval (don't re-fetch — let cache age handle it).
4. Render:
   - **Expanded:** mirrors `ArrivalsCard` — small headsign header per group, up to 3 lines of "X min · departs HH:MM" with the line color accent. Skeleton on first load.
   - **Compact:** one row per group: `{LineColor dot} {headsign} · {time}, {time}`. No skeleton (shows "—" empty).
5. Card body still routes to the station page (preserves today's behavior).
6. CTA branding: `LINE_COLORS` from `@ctt/shared`. No hardcoded hex.
7. Metra: per `.claude/rules/transit-compliance.md`, show "Last updated HH:MM" sourced from the actual fetch time at the bottom of the arrivals area for Metra cards.

## Menu changes

### Web (`FavoriteMenu.tsx`)
For `favorite.type === 'station'`, render above existing items:
- **View** row: `[Expanded] [Compact]` segmented buttons → `updateSettings(key, { density })`.
- **Show** row:
  - Metra station: `[All] [Inbound] [Outbound]`.
  - CTA station: `[All]` + one chip per `schedule.directions[i].headsign` (read from the same TanStack Query cache the card uses).

### Mobile (`FavoriteMenuSheet.tsx`)
Same two rows as `Pressable` chip rows. Bump default snap point from `40%` to `55%` when the active favorite is a station; keep `40%` for line/train favorites (sheet already takes a `Favorite` on `open()`).

## Persistence pattern

`useUpdateFavoriteSettings` mirrors `useToggleFavorite`:

1. Optimistically update zustand store (new `updateSettings` action).
2. Increment `pendingWrites` to suppress `onSnapshot` clobber.
3. Write `{ [favorites.${key}.directionFilter]: value }` (or `density`) to `profiles/{uid}`.
4. Decrement `pendingWrites` in finally.
5. On error, revert the store (web: silent like `useReorderFavorites`; mobile: `Alert.alert` like `useToggleFavorite`).

Anonymous / signed-out users: local zustand store only — matches today's behavior.

## Tests

### `packages/shared` (or `apps/web/__tests__/shared/`)
- `computeArrivalGroups` filters Metra by `directionId` for `'inbound'` / `'outbound'`.
- Filters CTA by exact headsign match.
- `'all'` passes everything through, grouped by headsign.
- `pickServiceDay` correct for each weekday.
- `formatMinutesAway` — `"Now"` for ≤0, `"1 min"`, etc.

### `apps/web/__tests__/components/dashboard/cards/StationCard.test.tsx`
- Skeleton while schedule loads.
- Expanded view: grouped arrivals with headsigns.
- Compact view: single-row summary.
- Direction filter limits visible groups (Metra and CTA).
- Metra arrivals include "Last updated" timestamp.

### `apps/web/__tests__/components/dashboard/FavoriteMenu.test.tsx`
- View toggle calls `updateSettings({ density })`.
- Show toggle calls `updateSettings({ directionFilter })` with correct value for Metra and CTA.
- Toggle rows hidden for `line` and `train` favorites.

### Mobile parallels
- `apps/mobile/__tests__/components/dashboard/cards/StationCard.test.tsx`
- `apps/mobile/__tests__/components/dashboard/FavoriteMenuSheet.test.tsx`

### Update existing
- Favorites store test — assert `updateSettings` action merges patch into matching favorite.
- Any FavoriteMenu / FavoriteMenuSheet snapshots refreshed.

## Compliance check (`.claude/rules/transit-compliance.md`)

- [x] No new agency logo or wordmark.
- [x] No client-direct fetch — all data through `/api/schedules/{slug}` and `/api/metra/station-trips/{slug}` (web) and Firestore (mobile, self-hosted snapshot).
- [x] Metra last-updated timestamp on station cards displaying Metra arrivals.
- [x] Route colors from `@ctt/shared` only.
- [x] No "official" / "in partnership" copy.
- [x] Footer / Terms unchanged — no new agency surfaced.

## Verification

1. `pnpm -w run lint` — clean.
2. `pnpm -w run test` — clean, zero warnings.
3. `pnpm run:web` → dashboard:
   - Favorite a CTA station (Clark/Lake) and Metra stations (Schaumburg, Union Station Metra).
   - Expanded arrivals render and refresh every 60s without re-fetch.
   - Open ⋯ menu on each station card:
     - Schaumburg → `Inbound` → only inbound trains. `Outbound` → only outbound. Reload → persists.
     - Union Station → `Outbound` (MD-W example) → only westbound trips show.
     - Clark/Lake → Show row lists each headsign (Loop, O'Hare, etc.). Pick one → only that headsign.
     - Toggle `Compact` → card collapses; `Expanded` → goes back.
   - Metra cards display `Last updated HH:MM`.
4. `pnpm run:ios` / `pnpm run:android` — repeat checks via bottom-sheet menu. Sheet height adjusts for station favorites.
5. Sign in on web → change settings → sign in on mobile → settings appear (Firestore round-trip).
6. Sign out, reload — local zustand persistence keeps the chosen filter/density.
7. Sanity check at 375px (web) and a small Android device — no horizontal overflow.
