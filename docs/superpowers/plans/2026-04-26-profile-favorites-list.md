# Profile favorites list — plan

## Context

The Profile screen on web and mobile is currently a thin display of account fields (email, display name, provider, member-since) with a Sign Out button — no view into a user's favorites lives there. We want the profile to act as a lightweight management surface for favorites: see them all in one place, remove them one at a time, or wipe them all. Display name is redundant (the navbar/header already shows the user) and will be removed.

Goals:

1. Remove the Display Name row from both profile screens.
2. Show favorited items grouped in three sections — **Lines**, **Stations**, **Trains** — with a trailing trash button on each row for one-tap removal.
3. Add a "Clear all favorites" action with a confirmation step.

Both web and mobile must stay in sync; the Firestore source of truth and Zustand stores are already shared in shape, so behavior should be parallel.

## Approach

Use the existing favorites store + `useToggleFavorite` hook for single-row removal (it already does the optimistic update + `deleteField()` Firestore write + revert-on-error). Add one new shared-shape hook on each platform for clearing all, which writes `favorites: {}` (an empty map) to the profile doc and calls `clear()` on the local store.

Render the three sections from the already-sorted `favorites` array in the store, partitioned by `type`. Each row is a new lightweight component — not the dashboard card — to keep the profile screen feeling like a management view: small icon, title, optional subtitle, trailing trash button. Tapping the row navigates to the deep link via the existing `favoriteRoute` helper; tapping the trash button removes it.

For trains, the row needs a line + train number — resolve via the existing `useMetraTrip` query (already used in `TrainCard`). Lines and stations resolve via `useLines()` / `useStation()` (mobile) and the equivalent web TanStack Query hooks in `useDashboardQueries.ts`.

## Files to modify

### Web

- `apps/web/app/profile/ProfileContent.tsx`
  - Remove Display Name field.
  - Below the existing account block, render `<FavoritesManager />`.
- `apps/web/app/components/profile/FavoritesManager.tsx` *(new)*
  - Reads `useFavoritesStore()`, partitions by type, renders three `<FavoritesSection>`s.
  - Renders a "Clear all favorites" destructive button (with a `confirm()` dialog or a small inline confirm) that calls the new `useClearAllFavorites` hook. Disabled when there are zero favorites.
  - Empty state when all three sections are empty.
- `apps/web/app/components/profile/FavoritesSection.tsx` *(new)*
  - Section header + list of `<FavoriteRow>`s. Hidden when its slice is empty.
- `apps/web/app/components/profile/FavoriteRow.tsx` *(new)*
  - Small row (uses `Link` to `favoriteRoute(fav, line?)`), trailing button `aria-label="Remove from favorites"` calling `useToggleFavorite(fav.type, fav.id).toggle()`.
  - For `train` rows, resolve via `useMetraTrip` (see `apps/web/app/components/dashboard/cards/TrainCard.tsx` for the pattern at lines that fetch and resolve trip metadata).
- `apps/web/app/lib/hooks/useClearAllFavorites.ts` *(new)*
  - Mirrors `useToggleFavorite` shape. Optimistically calls `useFavoritesStore.getState().clear()`, then `updateDoc(profileRef, { favorites: {}, updatedAt: ... })`, with revert on error.
- Tests:
  - Update `apps/web/__tests__/pages/profile.test.tsx` — drop display-name assertion, add favorites list + remove + clear-all assertions.
  - Add `apps/web/__tests__/components/profile/FavoritesManager.test.tsx`.

### Mobile

Mirror the web structure:

- `apps/mobile/app/profile.tsx` — remove Display Name field; render `<FavoritesManager />` below account fields.
- `apps/mobile/components/profile/FavoritesManager.tsx` *(new)* — same responsibilities as web; uses RN `Alert.alert` for the clear-all confirmation.
- `apps/mobile/components/profile/FavoritesSection.tsx` *(new)*.
- `apps/mobile/components/profile/FavoriteRow.tsx` *(new)* — `Pressable` row navigating via `router.push(favoriteRoute(fav, line))`, trailing trash `Pressable` (44×44 touch target, accessibilityLabel="Remove favorite").
- `apps/mobile/lib/useClearAllFavorites.ts` *(new)* — mirrors `useToggleFavorite` (mobile), uses `updateDoc(doc(db, 'profiles', uid), { favorites: {}, updatedAt: ... })`.
- Tests:
  - Update `apps/mobile/__tests__/screens/profile.test.tsx` — drop display-name assertion, add favorites + remove + clear-all coverage.

### Reused, not modified

- `packages/shared/src/favorites.ts` — `favoriteKey`, `mapToArray`.
- `apps/web/app/lib/store/favorites.ts` — already exposes `removeOptimistic`, `clear`, sorted `favorites` array.
- `apps/mobile/lib/store/favorites.ts` — same.
- `apps/web/app/lib/hooks/useToggleFavorite.ts` and `apps/mobile/lib/useToggleFavorite.ts` — used directly for per-row removal (no changes).
- `apps/web/app/lib/favoriteRoute.ts` and `apps/mobile/lib/favoriteRoute.ts` — used for row navigation.
- `apps/web/app/lib/hooks/useDashboardQueries.ts` and `apps/mobile/lib/useDashboardQueries.ts` — line/station/trip lookups.
- Existing `FavoriteMenu.tsx` (web) / `FavoriteMenuSheet.tsx` (mobile) — **not** used on profile per design.

## Behavior details

- **Empty state.** Single message ("No favorites yet — tap the heart on any line, station, or train to save it.") shown only when all three slices are empty. No section headers in that case.
- **Section order.** Lines → Stations → Trains, fixed. Hide any section whose slice is empty.
- **Within a section.** Reuse the store's existing sort (`position` asc, then `addedAt` desc), already produced by `mapToArray`.
- **Remove (single).** Optimistic; on Firestore failure the existing toggle hook reverts.
- **Clear all.**
  - Web: native `confirm()` dialog ("Remove all N favorites? This can't be undone.") — minimal first pass; can be upgraded to a styled modal later if needed.
  - Mobile: `Alert.alert` with destructive "Clear all" + "Cancel".
  - Optimistic store `clear()`, then write `favorites: {}`. Revert on failure by re-hydrating from the live `AuthProvider` profile snapshot (already present — the `onSnapshot` listener will re-populate on next tick if the write fails). Simpler than snapshotting + restoring locally, and consistent with how the existing `pendingWrites` guard works in `AuthContext`.
- **Auth gate.** Reuse the existing "Sign in to view your profile" branch in `ProfileContent` / `profile.tsx` — favorites manager only renders when `user` is non-null.

## Verification

1. **Unit/component tests.**
   - `pnpm test:web` — new + updated profile tests pass.
   - `pnpm test:mobile` — new + updated profile tests pass.
2. **Lint.** `pnpm lint` clean.
3. **Manual web (`pnpm run:web`).**
   - Visit `/profile` signed out → existing sign-in CTA still shown.
   - Sign in. Add a couple line, station, and train favorites from their detail pages. Reload `/profile`.
   - Verify Display Name row is gone.
   - Verify three sections render in correct order with the right items.
   - Tap a row → navigates to the deep link.
   - Tap a trash button → row disappears immediately; refresh to confirm Firestore deletion stuck.
   - Tap "Clear all favorites" → confirm → all favorites disappear; refresh to confirm Firestore is empty.
   - Force a failure (e.g. temp Firestore rule deny) and verify the store reverts.
4. **Manual mobile (`pnpm run:ios` and Android).** Same checklist on the `/profile` screen.
5. **Compliance.** No new agency data surfaces — nothing to add to footer / Terms.

## Out of scope

- Reordering favorites from the profile screen (still a dashboard-only affordance).
- Editing display name or other profile fields.
- A custom styled clear-all modal (web uses native `confirm()` for v1).
- Bulk-remove-by-type (e.g. "clear all lines"). Single-row + clear-all only.
