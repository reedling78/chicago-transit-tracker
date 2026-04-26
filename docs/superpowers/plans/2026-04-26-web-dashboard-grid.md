# DashboardGrid — Unified, reorderable favorites list (web)

## Context

The mobile equivalent landed in PR #87 (now merged into `main`): the three separate dashboard sections (`FavoriteTrains`, `FavoriteStations`, `FavoriteLines`) on mobile were replaced with a single unified `DashboardGrid` rendering mixed-type cards, with long-press drag-reorder and an overflow ⋯ menu. The user wants the web equivalent now, with three intentional differences:

1. **Drag library:** `@dnd-kit/core` + `@dnd-kit/sortable` (mobile used `react-native-draggable-flatlist`, which is RN-only). dnd-kit handles mouse + touch + keyboard out of the box, ~7kb gzip combined.
2. **Menu UI:** a simple anchored dropdown menu opening from each card's ⋯ button — same pattern on every viewport. No slide-up sheet variant. Hand-rolled with Tailwind, matching the existing `AuthModal` convention; ~50 lines, no library.
3. **Sign-in CTA:** opens the existing `AuthModal` (web's auth pattern) instead of pushing to an `auth` route (mobile's pattern).

The shared schema (`position?: number` on `Favorite`, position-aware `mapToArray` sort) is already in `main` from PR #87. The web app does NOT yet have the position-write logic in its `useToggleFavorite`, the `pendingWrites` concurrency guard in `AuthProvider`, or any drag-drop / menu / dashboard-grid component — all of that is what this plan covers.

The user has signaled they plan to enrich the cards later (e.g. live arrivals on `TrainCard`, alert badges on `StationCard`, frequency indicators on `LineCard`). So the architecture must keep the cards independently extensible.

---

## Decisions (already made with the user)

- **Drag library:** `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`. Install via `pnpm --filter @ctt/web add ...`.
- **Menu UI:** simple anchored dropdown, identical on mobile-web and desktop-web.
- **Component organization mirrors mobile:** `DashboardGrid.tsx` + `cards/{LineCard,StationCard,TrainCard,CardMenuButton,cardClassNames}.{tsx,ts}` + `FavoriteMenu.tsx` (renamed from mobile's `FavoriteMenuSheet.tsx` since it's a dropdown, not a sheet).

---

## Sensor + click coexistence

Each card row contains a clickable `<Link>` (navigation), a clickable ⋯ `<button>` (menu), and is itself the drag source. To avoid clicks registering as drags:

```ts
const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
)
```

- **Mouse click on link / ⋯ button:** distance threshold never tripped; click reaches its target.
- **Mouse drag (>8px):** PointerSensor activates; @dnd-kit suppresses the eventual click.
- **Touch tap:** TouchSensor's 250ms delay is never reached; tap reaches its target.
- **Touch long-press 250ms:** TouchSensor activates, drag begins. Matches mobile's long-press semantics.
- **Keyboard:** a separate `sr-only focus:not-sr-only` "Reorder" button per card holds the dnd-kit `attributes` + `listeners` for KeyboardSensor activation. The card's link keeps native Enter activation; the ⋯ button keeps native Space/Enter activation.

The `attributes` + `listeners` go on the link wrapper (so pointer/touch on the link triggers drag detection), the ⋯ button is a sibling of the link (its events do NOT bubble to drag listeners), and the hidden Reorder button is the keyboard handle.

---

## Concurrency guard + position parity

PR #87 added a `pendingWrites: number` counter to mobile's favorites store and gated `hydrate` in mobile's `AuthContext` on `pendingWrites === 0` to prevent stale Firestore snapshots from clobbering an in-flight reorder. Web has the same latent race at `apps/web/app/components/AuthProvider.tsx:124` (where `hydrate(favorites)` runs unconditionally). Mirror the mobile fix here.

`useToggleFavorite` add path needs the same conditional position write mobile got: when every existing favorite has a `position`, new items get `min(positions) - REORDER_POSITION_STEP` so they slot to the top of the user's curated order. Otherwise no `position` is written and the new item joins the un-positioned bucket via `addedAt` desc.

`pendingWrites` lives only in memory — do NOT add it to the Zustand `partialize` allow-list, otherwise a closed tab mid-write would permanently block hydrate on next load. `clear()` (called on sign-out) must also reset `pendingWrites: 0`.

---

## Reorder write strategy

Mirror mobile: on `onDragEnd`, re-stamp every favorite with positions `1000, 2000, 3000, …` and write a single `updateDoc` with N field paths plus `updatedAt: serverTimestamp()`. Optimistic Zustand update first; rollback on error; bump/decrement `pendingWrites` around the mutation.

---

## Files to modify / create

### Web app config

- **`apps/web/package.json`** — add `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`.

### Web data layer (`apps/web/app/lib/`)

- `store/favorites.ts` — add `pendingWrites: number`, `incrementPendingWrites()`, `decrementPendingWrites()`, `reorder(newOrder: Favorite[])` (rewrites positions to dense `1000, 2000, …`), and `REORDER_POSITION_STEP` export. Update `addOptimistic` to compute `position` for fully-reordered users (port `computeNewFavorite` from mobile's store). Update `clear()` to reset `pendingWrites: 0`. Do NOT add `pendingWrites` to `partialize`.
- `components/AuthProvider.tsx:124` — gate `hydrate(favorites)` on `useFavoritesStore.getState().pendingWrites === 0`.
- `lib/hooks/useToggleFavorite.ts` — add path conditionally writes `position`; bracket the mutation with `incrementPendingWrites` / `decrementPendingWrites`.
- **NEW** `lib/hooks/useReorderFavorites.ts` — TanStack mutation. Optimistic `reorder()`; single `updateDoc` with `{ ['favorites.{key}.position']: N }` field paths and `updatedAt: serverTimestamp()`; rollback on error; `onSettled` decrements pending counter.
- **NEW** `lib/favoriteRoute.ts` — pure helper `(favorite, lines, stations) => string | null`. Consolidates the route-building logic currently duplicated in `FavoriteStations.tsx` and `FavoriteLines.tsx`.

### Web components (`apps/web/app/components/dashboard/`)

- **NEW** `DashboardGrid.tsx` — `'use client'` orchestrator. Resolves favorites from store; calls `useLinesQuery` / `useStationsQuery`; wraps content in `<DndContext id="dashboard-grid" sensors={...} collisionDetection={closestCenter}>` + `<SortableContext items={favorites.map(f => favoriteKey(f.type, f.id))} strategy={verticalListSortingStrategy}>`; renders one `<Sortable*Card>` per favorite (each calls `useSortable({ id: favoriteKey(...) })` internally and forwards `attributes` + `listeners` to its card). On `onDragEnd`, computes new order via `arrayMove` and calls `reorder(newOrder)`. Conditional rendering for loading / signed-out / empty states (see below).
- **NEW** `cards/cardClassNames.ts` — exported Tailwind strings for the row, title, subtitle, meta, and dragging state. Copies `LinkCard`'s exact visual language.
- **NEW** `cards/CardMenuButton.tsx` — small ⋯ Pressable button with `aria-haspopup="menu"`, `aria-expanded`, `aria-label`. Toggles its parent card's local menu state.
- **NEW** `cards/LineCard.tsx`, `cards/StationCard.tsx`, `cards/TrainCard.tsx` — three independent components, each implementing `useSortable` internally, the shared row classNames, the type-specific content (chip / lines list / headsign), the trailing ⋯ button, and the locally-anchored `<FavoriteMenu>`. `TrainCard` calls `useFavoriteTripQuery(favorite.id)` internally (matches today's `FavoriteTrains` pattern).
- **NEW** `FavoriteMenu.tsx` — anchored dropdown component. Tailwind: `absolute right-0 top-full mt-1 w-48 rounded-lg border bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800` with click-outside-to-close (via `useEffect` listener) and Escape-to-close. Receives `favorite`, `lines`, `stations`, `onClose` props. Renders four menu items:
  - **Open details** — functional, uses `favoriteRoute()`, navigates via `router.push`.
  - **Mute alerts** — disabled placeholder with `title="Coming soon"`.
  - **Share** — disabled placeholder with `title="Coming soon"`.
  - **Remove from favorites** — destructive (`text-red-600`), calls `useToggleFavorite(fav.type, fav.id).toggle()`.
- `Dashboard.tsx` — replace the three `<Favorite*>` renders with a single `<DashboardGrid />`.
- **DELETE:** `FavoriteTrains.tsx`, `FavoriteStations.tsx`, `FavoriteLines.tsx`.

### Web tests (`apps/web/__tests__/`)

- **`jest.setup.ts`** — add global mocks for `@dnd-kit/core` and `@dnd-kit/sortable`. The dnd-kit mock captures `onDragEnd` on a `__captured` object so tests can drive reorder directly. The sortable mock returns no-op `attributes`/`listeners` and a real `arrayMove` (so the on-drag-end logic still computes the right new order).
- **DELETE:** `components/dashboard/FavoriteTrains.test.tsx`, `FavoriteStations.test.tsx`, `FavoriteLines.test.tsx`.
- **NEW:** `components/dashboard/DashboardGrid.test.tsx` — covers loading / signed-out / empty / populated states, mixed-type render, ⋯ tap opens menu, drag-end calls reorder hook with new order.
- **NEW:** `components/dashboard/FavoriteMenu.test.tsx` — Escape closes, click-outside closes, "Open details" navigates and dismisses, "Remove from favorites" calls `toggle()`, placeholder items are disabled.
- **NEW:** `components/dashboard/cards/{LineCard,StationCard,TrainCard,CardMenuButton}.test.tsx`.
- **NEW:** `lib/hooks/useReorderFavorites.test.tsx` — mirrors the mobile equivalent. Optimistic store reorder, `updateDoc` field-path map shape, rollback on error, pending-writes counter increments/decrements.
- **NEW:** `lib/favoriteRoute.test.ts` — pure helper unit tests for each favorite type and missing-data fallbacks.
- **UPDATE:** `components/dashboard/Dashboard.test.tsx` — replace the three section mocks with a single `DashboardGrid` mock.
- **UPDATE:** `components/AuthProvider.test.tsx` — add a test that `hydrate` is skipped when `pendingWrites > 0` (mirror mobile's PR #87 test).
- **UPDATE:** `lib/store/favorites.test.ts` — add tests for `reorder()`, `pendingWrites` counter, and the position-assignment logic in `addOptimistic`.
- **UPDATE:** `lib/hooks/useToggleFavorite.test.tsx` — add tests asserting position is written for fully-reordered users, omitted for partially-positioned users, and that pendingWrites brackets the mutation.

---

## States the new grid must handle

| Auth / data state                         | Render                                                                              |
| ----------------------------------------- | ----------------------------------------------------------------------------------- |
| `auth.loading === true`                   | `null`                                                                              |
| Signed out                                | One placeholder card: "Sign in to save favorites" — opens `AuthModal` on click      |
| Signed in, zero favorites                 | One placeholder card: "Tap the heart on any line, station, or train to save it"     |
| Signed in, has favorites, queries loading | Existing card list (queries don't gate render — names/colors fall back gracefully)  |
| Signed in, has favorites, all loaded      | The full dnd-kit-wrapped sortable list                                              |

When favorites are present, render an italic hint footer below the list: *"Tip: drag a card to reorder. Click ⋯ for more options."* in `text-xs italic text-gray-500 dark:text-gray-400 mt-2`.

The conditional order is `loading` → `!user` → `favorites.length === 0` → grid (matches mobile). This avoids a flash of "No favorites yet" during sign-out, when the store's `clear()` empties the local list a tick before `user` flips to `null`.

---

## Critical files referenced

- `apps/web/app/components/dashboard/Dashboard.tsx` — replace 3 sections with `<DashboardGrid />`.
- `apps/web/app/components/dashboard/{FavoriteTrains,FavoriteStations,FavoriteLines}.tsx` — visual reference, then deleted.
- `apps/web/app/components/LinkCard.tsx` — existing card visual baseline; `cardClassNames.ts` mirrors its Tailwind strings.
- `apps/web/app/components/AuthProvider.tsx:124` — snapshot guard.
- `apps/web/app/components/AuthModal.tsx` — existing hand-rolled modal pattern (Escape, backdrop click) the new dropdown's accessibility approach mirrors.
- `apps/web/app/lib/store/favorites.ts` — store extensions.
- `apps/web/app/lib/hooks/useToggleFavorite.ts` — position assignment + pendingWrites brackets.
- `apps/web/app/lib/hooks/useDashboardQueries.ts` — existing data hooks (`useLinesQuery`, `useStationsQuery`, `useFavoriteTripQuery`) reused as-is.
- `apps/web/jest.setup.ts` — global mocks for dnd-kit.
- `apps/mobile/lib/store/favorites.ts`, `apps/mobile/lib/useReorderFavorites.ts`, `apps/mobile/lib/favoriteRoute.ts` — port equivalents to web.
- `packages/shared/src/{types,favorites}.ts` — already updated by PR #87, no changes needed.

---

## Verification

1. `pnpm --filter @ctt/web test` and `pnpm -w run lint` both clean.
2. `pnpm --filter @ctt/web run build` passes (catches any SSR / hydration regression on the dnd-kit integration).
3. `pnpm run:web` and exercise on a desktop browser:
   - Sign in with a test account that has 4–5 favorites of mixed types.
   - Confirm one mixed list renders, cards visually match the existing `LinkCard` style.
   - Click a card → navigates to its route. Click ⋯ → dropdown opens anchored under the button. Click outside / Escape → closes.
   - Drag a card via mouse → it moves; release → new order persists, survives reload.
   - On the same account in the iOS app (or via Chrome DevTools "Toggle device toolbar"), confirm the order syncs.
   - Touch-drag on a phone-sized viewport (Chrome DevTools touch emulation): long-press 250ms then drag.
   - Tap "Remove from favorites" in the menu → card disappears, Firestore document loses the entry.
   - Tap "Open details" → navigates correctly per favorite type.
   - Tap "Mute alerts" / "Share" → no-op (visibly disabled).
   - Sign out → grid shows the signed-out placeholder; click it → `AuthModal` opens.
   - Test signed-in-no-favorites by removing all entries.
4. CTA / Metra branding: `LineCard`'s accent color comes from `line.color` (which Firestore seeds from `@ctt/shared/constants`). No new hex values introduced.
5. SEO: no new routes, no metadata changes. Sitemap unchanged.

---

## Notes on follow-on enrichment

The user plans to enrich the cards later (live arrivals on `TrainCard`, alert badges on `StationCard`, frequency indicators on `LineCard`). The three-independent-cards architecture (sharing only `cardClassNames`) means each card can grow type-specific data hooks without touching the others — same pattern mobile uses. Avoid extracting a `BaseFavoriteCard` slot wrapper; that pushes type-specific fetch logic up into a parent and adds prop drilling for no gain.
