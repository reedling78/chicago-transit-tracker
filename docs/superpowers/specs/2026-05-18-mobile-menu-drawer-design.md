# Mobile Menu Drawer — Design Spec

**Date:** 2026-05-18
**Status:** Approved for planning
**Scope:** `apps/mobile/` only

---

## Goal

Replace the standalone mobile **Profile** screen with a **Menu** that opens as a
native side drawer (swipe-in from the edge, or via a hamburger button in the app
bar) instead of being pushed onto the navigation stack. Reorganize its contents
into labeled sections, add top-level navigation links, and improve the train
favorite labels.

This is mobile-only. The web app is unaffected.

---

## Requirements

1. The screen formerly known as "Profile" is now "Menu".
2. The home-screen app-bar icon changes from the person/profile icon to a
   hamburger (menu) icon.
3. The Menu opens as a side drawer (overlay + scrim, edge-swipe gesture),
   **not** as a screen on the navigation stack.
4. The drawer body has four labeled sections, in order:
   - **Menu** — navigation rows: Dashboard, Metra, CTA
   - **Dashboard** — the current favorites UI (`FavoritesManager`)
   - **Profile** — the current profile card UI, theme toggle, and sign-out
     button (signed-out state shows the Sign in CTA instead)
   - **Legal** — Privacy, Terms
5. In the favorites list, **Train** rows show the origin and destination station
   names plus the train number — not just the train number.

---

## Architecture

### Drawer navigator (chosen approach)

The mobile app is currently a single flat `expo-router` `Stack` declared in
`apps/mobile/app/_layout.tsx`. To make the Menu a true side drawer that is *not*
on the nav stack, wrap the existing Stack in an `expo-router` `Drawer`
navigator:

- Add dependency: `@react-navigation/drawer` (peer deps
  `react-native-gesture-handler` and `react-native-reanimated` are already
  installed and configured).
- Root `_layout.tsx`: `GestureHandlerRootView` → providers → `<Drawer>` with
  `screenOptions={{ headerShown: false }}` and a custom `drawerContent`.
- The single Drawer screen renders the existing `<Stack>` (moved into a route
  group, e.g. `app/(app)/_layout.tsx`, or kept as the index Drawer screen) so
  every existing screen keeps its current `headerTransparent`, full-bleed
  `PageHeader`, and `HeaderBackButton` behavior with **no changes**.
- `drawerType: 'front'` (slides over content with a scrim) so detail-screen
  photo headers are not pushed/resized.

**Rejected alternative:** a hand-rolled absolutely-positioned animated overlay
panel with no new dependency. Lower regression surface (routing untouched) but
reimplements drawer gesture, scrim, focus trapping, and accessibility that the
navigator provides for free. The explicit requirement is "open like a side
drawer instead of being in the nav stack" — the Drawer navigator delivers that
natively and is the more maintainable, teachable pattern.

**Regression surface:** the global navigator change is the main risk. Detail
screens rely on transparent Stack headers and full-bleed `PageHeader` photos;
`drawerType: 'front'` + `headerShown: false` on the Drawer keeps the inner Stack
fully responsible for headers, so behavior should be unchanged. This must be
verified on a simulator (iOS + Android) for: home header, detail photo headers,
back button, edge-swipe not conflicting with horizontal content.

### Components

| File | Change |
| --- | --- |
| `apps/mobile/app/_layout.tsx` | Wrap Stack in `<Drawer>`; custom `drawerContent`; `headerShown:false` on Drawer |
| `apps/mobile/components/menu/MenuDrawerContent.tsx` | **New.** Scrollable drawer body: the four sections |
| `apps/mobile/components/menu/MenuSection.tsx` | **New.** Reusable labeled section wrapper (uppercase heading + body), theme-aware |
| `apps/mobile/components/menu/MenuNavRow.tsx` | **New.** A pressable nav row (icon + label) that navigates + closes the drawer |
| `apps/mobile/components/profile/ProfilePanel.tsx` | **New.** Profile card + `ThemeToggle` + Sign out / Sign in, extracted from `profile.tsx` |
| `apps/mobile/components/HeaderMenuButton.tsx` | **New.** Hamburger button; flat icon + shadow styling matching `HeaderUserIcon`; opens the drawer |
| `apps/mobile/app/index.tsx` | Swap `headerRight` from `HeaderUserIcon` to `HeaderMenuButton` |
| `apps/mobile/app/profile.tsx` | **Deleted** — replaced by the drawer |
| `apps/mobile/components/HeaderUserIcon.tsx` | **Deleted** if unreferenced after the swap (verify no other consumers) |
| `apps/mobile/components/profile/FavoriteRow.tsx` | Train branch in `useRowContent` now shows origin→destination + train number |
| `apps/mobile/components/Footer.tsx` | Unchanged (still used inside the Profile section / drawer) |

`/terms` and `/privacy` remain real Stack routes. The Legal section rows
`router.push('/terms')` / `'/privacy'` and close the drawer. `/profile` route is
removed; nothing should `router.push('/profile')` afterward (audit
`HeaderUserIcon` and any other callers).

### Drawer open/close

- The hamburger button calls the drawer-open action
  (`navigation.dispatch(DrawerActions.openDrawer())` or the expo-router
  equivalent via `useNavigation`).
- Nav rows and Legal rows close the drawer
  (`DrawerActions.closeDrawer()`) then navigate, so the user lands on the target
  screen with the drawer shut.
- Edge-swipe gesture is provided by the navigator.

### Train favorite label

In `apps/mobile/components/profile/FavoriteRow.tsx`, `useRowContent`, the
`train` branch currently returns `title: "Train {trainNumber}"`. Mirror the
logic already proven in
`apps/mobile/components/dashboard/cards/TrainCard.tsx`:

- Resolve `originStop` / `destStop` from `trip.stops` using
  `favorite.trainOriginStopSlug` / `favorite.trainDestinationStopSlug`
  (fallback to first / last stop) — reuse the same "pick stop by slug with
  fallback" approach.
- `title = trip && originStop && destStop ?
  `${shortenStationName(originStop.stationName)} to ${shortenStationName(destStop.stationName)}`
  : `Train ${trainNumber}``
- `subtitle = trip ? `${trip.line ? trip.line + ' ' : ''}#${trainNumber}` :
  'Trip not currently scheduled'`
- `shortenStationName` is already exported from `@ctt/shared` (used by
  `TrainCard`).

---

## Data flow

No data-layer changes. The drawer reuses existing hooks/stores:
`useAuth`, `useFavoritesStore`, `useLinesQuery`, `useStationsQuery`,
`useFavoriteTripQuery`, `useTheme`, `signOut`. `FavoritesManager` and
`ThemeToggle` move/extract without behavioral change.

---

## Error / edge handling

- **Signed out:** Profile section shows the existing "Sign in to view your
  profile" + Sign In button (currently in `profile.tsx`), not the profile card.
- **Auth loading:** Profile section shows a lightweight "Loading…" placeholder;
  the rest of the drawer (Menu nav, Legal) still renders.
- **No favorites:** `FavoritesManager` already renders its own empty state.
- **Trip not loaded for a train favorite:** falls back to `Train {num}` title +
  "Trip not currently scheduled" subtitle (current behavior preserved).
- **Edge-swipe vs. horizontal content:** verify no conflict on detail screens;
  if needed, constrain `swipeEdgeWidth`.

---

## Testing

Jest + React Native Testing Library, mirroring existing
`apps/mobile/__tests__/` structure.

- `MenuDrawerContent` renders all four section headings; signed-in shows profile
  card + Sign out; signed-out shows Sign in CTA.
- `MenuNavRow` press triggers navigation + drawer close.
- `FavoriteRow` train branch: with a mock trip → title is
  "{origin} to {destination}" and subtitle contains `#{num}`; without a trip →
  "Train {num}".
- Update/remove any test referencing the deleted `profile.tsx` /
  `HeaderUserIcon`.
- Existing `Footer` snapshot must still pass.
- `pnpm -w run test` and `pnpm -w run lint` clean before PR.

Manual simulator verification (state explicitly if infeasible locally): iOS +
Android — home hamburger opens drawer; edge-swipe opens drawer; nav rows
navigate + close; detail-screen photo headers and back button unaffected.

---

## Out of scope

- Web app changes.
- Any change to favorites data model, persistence, or reorder logic.
- Redesigning the favorites cards themselves (only the `FavoriteRow` train label
  string changes).
- Adding a mobile Terms/Privacy redesign (existing routes reused as-is).
