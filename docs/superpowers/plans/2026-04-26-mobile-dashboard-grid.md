# DashboardGrid — Unified, reorderable favorites list (mobile)

## Context

The mobile dashboard currently renders three stacked sections — `FavoriteTrains`, `FavoriteStations`, `FavoriteLines` — each scoped to a single favorite type. Users have asked for one unified, mixed list of all favorites with two new interactions: long-press-to-drag reorder, and a per-card overflow (⋯) menu opening a slide-up sheet. The new component will be called `DashboardGrid` and will replace the three sections in `apps/mobile/components/dashboard/Dashboard.tsx`.

User-driven order will sync to Firestore (cross-device) via a new optional `position` field on each `Favorite`. New favorites continue to land at the top, matching today's "newest first" UX.

This change is mobile-first but touches `@ctt/shared` (the `Favorite` type and `mapToArray` sort). Web continues to render correctly with no UI changes — it just starts respecting `position` if any has been set on another device.

---

## Decisions (already made with the user)

- **Order persistence:** per-favorite `position?: number` synced to Firestore.
- **Libraries:** `react-native-gesture-handler`, `react-native-reanimated`, `react-native-draggable-flatlist`, `@gorhom/bottom-sheet`. Install via `npx expo install` for SDK-54-compatible versions.
- **Menu trigger:** trailing ⋯ icon on each card. Long-press on the card body initiates drag; tap on ⋯ opens the bottom sheet. These gestures are mutually exclusive.

---

## Sort policy

Replace `mapToArray` in `packages/shared/src/favorites.ts` with a single-key sort:

1. Sort by `position ?? Number.POSITIVE_INFINITY` ascending.
2. Tiebreak by `addedAt` descending.

For users who have never reordered (no item has `position`), this collapses to today's `addedAt` DESC order. No existing web test asserts an ordering involving `position`, so all `apps/web/__tests__/lib/favorites.test.ts` and `apps/web/__tests__/components/AuthProvider.test.tsx` assertions stay green.

---

## Position assignment rule (in `useToggleFavorite` add path)

```ts
const positioned = favorites.filter((f) => typeof f.position === 'number')
const newPos =
  positioned.length === favorites.length && positioned.length > 0
    ? Math.min(...positioned.map((f) => f.position!)) - 1000
    : undefined
```

- Fresh user / mid-migration user → `undefined` (item enters un-positioned bucket, top by `addedAt`).
- Fully reordered user → `min - 1000` so the new card lands at the top of the curated list.

Reorder writes always renumber every favorite to dense sparse values `1000, 2000, 3000, …` in a single `updateDoc` with N field paths. Simpler than fractional/midpoint inserts; well within Firestore's per-write op cap; trivial to reason about.

---

## Concurrency guard

`apps/mobile/lib/AuthContext.tsx:122` calls `useFavoritesStore.getState().hydrate(favorites)` unconditionally on every Firestore snapshot. Today this is benign — heart-toggle outcomes are commutative — but reorder is not, so a stale snapshot landing mid-reorder would visibly roll back the user's drag.

Add a `pendingWrites: number` counter to the favorites store. `useReorderFavorites` increments it before `updateDoc` and decrements in `onSettled`. The snapshot handler skips `hydrate` while `pendingWrites > 0`. The `setProfile(...)` call in the same handler is unaffected (other UI reads it). Apply the same guard to `useToggleFavorite` for consistency — it's a free fix to the same latent race.

Web has the same latent race in `apps/web/app/components/AuthProvider.tsx`, but web has no reorder UI and no current bug. Mirror the guard there for symmetry; no other web change needed.

---

## Files to modify / create

### Shared (`packages/shared/src/`)

- `types.ts` — add `position?: number` to `Favorite`.
- `favorites.ts` — replace `mapToArray` sort with the position-then-addedAt rule.

### Mobile data layer (`apps/mobile/lib/`)

- `store/favorites.ts` — add `pendingWrites: number`, `incrementPendingWrites()`, `decrementPendingWrites()`, and `reorder(newOrder: Favorite[])` (rewrites local positions to `1000, 2000, …` to match what we'll write to Firestore).
- `AuthContext.tsx:122` — gate `hydrate(favorites)` on `pendingWrites === 0`.
- `useToggleFavorite.ts` — add path conditionally writes `position` per the rule above.
- **NEW** `useReorderFavorites.ts` — TanStack mutation. Optimistic `reorder()`; single `updateDoc` with `{ ['favorites.{key}.position']: N }` field paths and `updatedAt: serverTimestamp()`; rollback on error; `onSettled` decrements pending counter.
- **NEW** `favoriteRoute.ts` — pure helper `(favorite, lines, stations) => Href | null`. Extracts the route-building logic currently duplicated in `FavoriteStations.tsx` and `FavoriteLines.tsx`.

### Mobile components (`apps/mobile/components/dashboard/`)

- **NEW** `DashboardGrid.tsx` — orchestrator. Reads `favorites` from store, resolves line/station/trip data via `useDashboardQueries`, renders `DraggableFlatList` (or skeleton/empty/signed-out states), owns the `BottomSheetModal` ref + active-favorite state, passes `onMenuPress(fav)` and `drag` down to each card.
- **NEW** `cards/StationCard.tsx`, `cards/TrainCard.tsx`, `cards/LineCard.tsx` — one component per favorite type. Each renders the shared row (matching today's `#1f2937` row styling), its type-specific content (chip / meta / subtitle), and the trailing `CardMenuButton`.
- **NEW** `cards/CardMenuButton.tsx` — small ⋯ Pressable with `hitSlop`, calls `onPress(favorite)`.
- **NEW** `cards/cardStyles.ts` — extracted `StyleSheet` for the shared row to avoid drift across the three card components.
- **NEW** `FavoriteMenuSheet.tsx` — `@gorhom/bottom-sheet` `BottomSheetModal` with `forwardRef`. Renders example menu items based on the active favorite:
  - **Remove from favorites** — calls `useToggleFavorite(fav.type, fav.id).toggle()`. Dismiss the sheet first.
  - **Open details** — `router.push(favoriteRoute(fav, lines, stations))`.
  - **Mute alerts** — placeholder `Alert.alert('Coming soon')`.
  - **Share** — placeholder `Alert.alert('Coming soon')`.
- `Dashboard.tsx` — replace the three section renders with `<DashboardGrid />` followed by the existing `<DashboardHero />`.
- **DELETE:** `FavoriteTrains.tsx`, `FavoriteStations.tsx`, `FavoriteLines.tsx`.

### Mobile root (`apps/mobile/app/`)

- `_layout.tsx` — wrap outermost in `<GestureHandlerRootView style={{ flex: 1 }}>`. Wrap inside `AuthProvider` (and outside `SafeAreaProvider`) with `<BottomSheetModalProvider>`. Resulting tree:
  `GestureHandlerRootView > QueryProvider > AuthProvider > BottomSheetModalProvider > SafeAreaProvider > Stack`.

### Mobile config

- `babel.config.js` — only create if Expo prints a "Reanimated plugin not detected" warning during `expo start`. SDK 54's `babel-preset-expo` already includes the reanimated plugin. If needed, the file content is `presets: ['babel-preset-expo'], plugins: ['react-native-reanimated/plugin']` (plugin must be last).
- `jest.setup.ts` — add global mocks (Fragment-style) for:
  - `react-native-gesture-handler` (use the package's `jestSetup.js` if present; otherwise stub `GestureHandlerRootView` as a passthrough)
  - `react-native-reanimated/mock`
  - `react-native-draggable-flatlist` — render items as a plain `FlatList`-like list, expose `onDragEnd` via a captured prop
  - `@gorhom/bottom-sheet` — render the modal contents inline as a `View`; expose `present`/`dismiss` via the ref

### Mobile tests (`apps/mobile/__tests__/`)

- **DELETE:** `components/dashboard/FavoriteLines.test.tsx`, `FavoriteStations.test.tsx`, `FavoriteTrains.test.tsx`.
- **NEW:** `components/dashboard/DashboardGrid.test.tsx` — covers loading/signed-out/empty/populated states, mixed-type render, ⋯ tap opens sheet, drag-end calls reorder hook with new order.
- **NEW:** `lib/useReorderFavorites.test.tsx` — mirrors `lib/useToggleFavorite.test.tsx` setup. Asserts: optimistic store reorder, `updateDoc` field-path map shape, rollback on rejected write, pending-writes counter increments/decrements.
- **NEW:** `lib/favoriteRoute.test.ts` — pure helper unit tests for each favorite type and missing-data fallbacks.
- **UPDATE:** `components/dashboard/Dashboard.test.tsx` — replace three section mocks with one `DashboardGrid` mock.
- **UPDATE:** `screens/root-layout.test.tsx` — add Fragment mocks for `react-native-gesture-handler` and `@gorhom/bottom-sheet`.
- Position-assignment + sort tests added to `apps/web/__tests__/lib/favorites.test.ts` (since `mapToArray` lives in `@ctt/shared` and is tested from web). Don't modify existing assertions; add new cases for `position`-set fixtures.

---

## States the new grid must handle

| Auth / data state                         | Render                                                                           |
| ----------------------------------------- | -------------------------------------------------------------------------------- |
| `auth.loading === true`                   | `null`                                                                           |
| Signed out                                | One placeholder card: "Sign in to save favorite lines, stations, and trains."    |
| Signed in, zero favorites                 | One placeholder card: "Tap the heart on any line, station, or train to save it." |
| Signed in, has favorites, queries loading | Existing card list (queries don't gate render — names/colors fall back gracefully) |
| Signed in, has favorites, all loaded      | The full draggable list                                                          |

`DashboardHero` always renders below the grid regardless of state.

---

## Critical files referenced

- `packages/shared/src/types.ts` — add `position?`.
- `packages/shared/src/favorites.ts` — sort change.
- `apps/mobile/lib/store/favorites.ts` — store extensions.
- `apps/mobile/lib/AuthContext.tsx:122` — snapshot guard.
- `apps/mobile/lib/useToggleFavorite.ts` — position assignment in add path.
- `apps/mobile/app/_layout.tsx` — provider wiring.
- `apps/mobile/components/dashboard/Dashboard.tsx` — replace three sections with `<DashboardGrid />`.
- `apps/mobile/components/dashboard/FavoriteTrains.tsx`, `FavoriteStations.tsx`, `FavoriteLines.tsx` — visual reference for new card components, then deleted.
- `apps/mobile/components/LineListItem.tsx` — existing `Pressable` row pattern to mirror.
- `apps/mobile/lib/useDashboardQueries.ts` — existing data hooks (`useLinesQuery`, `useStationsQuery`, `useFavoriteTripQuery`) reused as-is.
- `apps/mobile/jest.setup.ts:35-45` — `FavoriteButton` mock pattern to mirror for new global mocks.
- `apps/web/__tests__/lib/favorites.test.ts` — existing sort tests; extend with positioned-items cases.

---

## Verification

After implementation:

1. `pnpm --filter @ctt/mobile test` and `pnpm --filter @ctt/web test` both green.
2. `pnpm -w run lint` clean.
3. On a fresh iOS simulator (`pnpm run:ios`):
   - Sign in with a test account that has 4–5 favorites of mixed types.
   - Confirm one mixed list renders, cards visually match the previous sections.
   - Long-press a card → it lifts; drag up/down; release. Confirm new order persists across kill-and-relaunch.
   - On a second device (or web) signed in with the same account, confirm the order matches.
   - Tap ⋯ on a card → bottom sheet slides up with the four menu items.
   - Tap "Remove from favorites" → sheet dismisses, card disappears, Firestore document loses the entry.
   - Tap "Open details" → navigates to the correct line / station / train route.
   - Tap "Share" / "Mute alerts" → "Coming soon" alert.
   - Sign out → grid shows the signed-out placeholder.
   - Test signed-in-no-favorites state by removing all entries.
4. On the web app, sign in with the same account: favorites appear in the order set on mobile.
5. CTA / Metra branding: the new cards reuse existing line colors from `@ctt/shared/constants`. No new hex values introduced.

---

## Open implementation question for the user

The Plan agent flagged that "Move to top" as a menu item is largely redundant with drag. The plan above replaces it with **Mute alerts** and **Share** as obvious-future-feature placeholders (both no-op `Alert.alert` for now), while keeping **Remove from favorites** and **Open details** as functional. If you want a different set of example items, easy to swap in `FavoriteMenuSheet.tsx` — just say the word.
