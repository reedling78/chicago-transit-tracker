# Refactor: Favorites → Dashboard Items

## Context

The favorites system is being rebranded as "dashboard items" across both apps, and a set of related UX changes is going in at the same time. Today, "favorites" is the dominant concept in the codebase — a Zustand store, a wide hook surface, a heart button in every detail-screen header, an admin-style manager on the mobile drawer and the web profile page. The branding feels backwards for what is, functionally, a personalized dashboard.

In the same pass we want to:

- Remove the heart from detail-screen headers and add a single "+ Dashboard" action on the hero photo (more discoverable, doesn't fight with the menu/back chrome on iOS 26).
- On mobile, fix the visual where the hero photo currently bleeds under a translucent header — switch to a solid opaque header so the photo butts cleanly against it.
- Replace the drawer's "Dashboard" admin section with a read-only, type-grouped list of dashboard items (Trains / Stations / Lines), since each card already has a per-item remove in its ⋯ menu. Move Clear all to the Profile section.
- Apply the same idea on web: keep the home page's existing dashboard grid, and add a new read-only grouped list as a second column at desktop width (60/40 split).

The Firestore wire format (`profiles/{uid}.favorites`) stays unchanged for back-compat with existing user data. The rename is internal.

---

## Scope

**Platforms:** both web (`apps/web/`) and mobile (`apps/mobile/`).

**Naming convention (full rename):**
- `Favorite` → `DashboardItem`
- `FavoriteType` → `DashboardItemType`
- `FavoriteDirection` → `DashboardItemDirection`
- `FavoriteDensity` → `DashboardItemDensity`
- `FavoriteSettingsPatch` → `DashboardItemSettingsPatch`
- `useFavoritesStore` → `useDashboardStore`
- `useToggleFavorite` → `useToggleDashboardItem`
- `useClearAllFavorites` → `useClearAllDashboardItems`
- `useReorderFavorites` → `useReorderDashboardItems`
- `useUpdateFavoriteSettings` → `useUpdateDashboardItemSettings`
- `useFavoriteTripQuery` → `useDashboardItemTripQuery`
- `favoriteKey` → `dashboardItemKey`
- `favoriteRoute` → `dashboardItemRoute`
- `FavoriteButton` (heart) → deleted entirely (replaced by `DashboardAddButton` on hero)
- `FavoritesManager` → `DashboardItemsList` (refactored, see below)
- `FavoritesSection` → `DashboardItemsSection`
- `FavoriteRow` → `DashboardItemRow`
- `FavoriteMenu` (web) → `DashboardItemMenu`
- `FavoriteMenuSheet` (mobile) → `DashboardItemMenuSheet`

**Firestore:** `profiles.{uid}.favorites` stays named `favorites`. The Firestore-facing helpers `mapToArray` / `arrayToMap` read/write that exact field; do not rename it.

**User profile type:** `UserProfile.favorites: Favorite[]` → `UserProfile.favorites: DashboardItem[]` (field name preserved).

---

## Phase A — Shared package (`packages/shared/`)

Critical files:
- [packages/shared/src/types.ts](packages/shared/src/types.ts) — rename `Favorite*` types listed above; keep `UserProfile.favorites` field name.
- [packages/shared/src/favorites.ts](packages/shared/src/favorites.ts) — rename file to `dashboard-items.ts`. Rename `favoriteKey` → `dashboardItemKey`. `arrayToMap` / `mapToArray` stay (they're generic enough), but their generic typing updates to `DashboardItem`.
- [packages/shared/src/index.ts](packages/shared/src/index.ts) — update barrel exports.
- [packages/shared/src/station-arrivals.ts](packages/shared/src/station-arrivals.ts) — update `FavoriteDirection` import.

---

## Phase B — Web app (`apps/web/`)

### B1. Store + hooks (rename surface, no behavior change)

- [apps/web/app/lib/store/favorites.ts](apps/web/app/lib/store/favorites.ts) → `apps/web/app/lib/store/dashboard.ts`. Rename `useFavoritesStore` → `useDashboardStore`.
- Hook files rename:
  - [apps/web/app/lib/hooks/useToggleFavorite.ts](apps/web/app/lib/hooks/useToggleFavorite.ts) → `useToggleDashboardItem.ts`
  - [apps/web/app/lib/hooks/useReorderFavorites.ts](apps/web/app/lib/hooks/useReorderFavorites.ts) → `useReorderDashboardItems.ts`
  - [apps/web/app/lib/hooks/useClearAllFavorites.ts](apps/web/app/lib/hooks/useClearAllFavorites.ts) → `useClearAllDashboardItems.ts`
  - [apps/web/app/lib/hooks/useUpdateFavoriteSettings.ts](apps/web/app/lib/hooks/useUpdateFavoriteSettings.ts) → `useUpdateDashboardItemSettings.ts`
- [apps/web/app/lib/hooks/useDashboardQueries.ts](apps/web/app/lib/hooks/useDashboardQueries.ts) — rename internal export `useFavoriteTripQuery` → `useDashboardItemTripQuery`.
- [apps/web/app/lib/favoriteRoute.ts](apps/web/app/lib/favoriteRoute.ts) → `dashboardItemRoute.ts`. Rename function.
- [apps/web/app/lib/favorites.ts](apps/web/app/lib/favorites.ts) (re-export from `@ctt/shared`) → `dashboard-items.ts`.
- [apps/web/app/components/AuthProvider.tsx](apps/web/app/components/AuthProvider.tsx) — update import + hydration call (still reads `favorites` field from Firestore).

### B2. New `DashboardAddButton` (replaces FavoriteButton on hero)

- New component: `apps/web/app/components/DashboardAddButton.tsx`. Pill-shaped button placed in the bottom-right of `PageHeader`. Props mirror the old `FavoriteButton`: `type: DashboardItemType, id: string, className?: string`.
- Behavior: if not added, shows `+ Dashboard` (white text on a translucent dark pill matching the hero overlay). If already added, shows `Added` / `✓ On Dashboard` and re-tapping removes it. Uses `useToggleDashboardItem`. Auth redirect path unchanged.
- Delete [apps/web/app/components/FavoriteButton.tsx](apps/web/app/components/FavoriteButton.tsx) and its test [apps/web/__tests__/components/FavoriteButton.test.tsx](apps/web/__tests__/components/FavoriteButton.test.tsx).

### B3. PageHeader edits

- [apps/web/app/components/PageHeader.tsx](apps/web/app/components/PageHeader.tsx) — remove the FavoriteButton render block (`apps/web/app/components/PageHeader.tsx` around the breadcrumb row). Render `DashboardAddButton` instead in the bottom content row, right-aligned, on the same row as the title (mobile) or pinned to the bottom-right corner of the hero overlay (desktop). Pass through the existing `favorite` prop, renamed to `dashboardItem: { type, id }`.
- Web hero already butts against the (solid) Navbar — no header-style change needed on web.

### B4. New home-page two-column layout

- [apps/web/app/page.tsx](apps/web/app/page.tsx) + [apps/web/app/components/dashboard/Dashboard.tsx](apps/web/app/components/dashboard/Dashboard.tsx) — at `lg:` (≥ 1024px) split the page body into two columns: `lg:grid-cols-[3fr_2fr]` (60/40). Left column = existing `DashboardGrid`. Right column = new `DashboardItemsList` component (see B5). Below `lg:`, stack single-column (grid first, list below).
- The home Hero (CTA + Metra service cards) stays full-width above the grid.
- Tailwind responsive rules per [.claude/rules/code-style.md](.claude/rules/code-style.md): mobile-first; collapse to single column below `lg:`.

### B5. New `DashboardItemsList` component (read-only grouped nav list)

- New: `apps/web/app/components/dashboard/DashboardItemsList.tsx`. Reads `useDashboardStore().items`, groups by type, renders three sections (Trains / Stations / Lines, in that order). Each row is an anchor (`next/link`) to `dashboardItemRoute(item, lines, stations)` with a title + subtitle. No trash icon, no drag handle, no ⋯. Empty state: small helper text.
- Reuse styling primitives from the old `FavoritesSection` / `FavoriteRow` but trimmed (no actions). Sticky-ish section headings (`text-xs uppercase tracking-wide`).

### B6. Profile page — Clear all + remove old admin

- [apps/web/app/profile/ProfileContent.tsx](apps/web/app/profile/ProfileContent.tsx) — remove the `<FavoritesManager />` block. In its place, render a single `Clear all dashboard items` button (red, secondary). Confirmation dialog identical to today's. Uses `useClearAllDashboardItems`.
- Delete:
  - [apps/web/app/components/profile/FavoritesManager.tsx](apps/web/app/components/profile/FavoritesManager.tsx)
  - [apps/web/app/components/profile/FavoritesSection.tsx](apps/web/app/components/profile/FavoritesSection.tsx)
  - [apps/web/app/components/profile/FavoriteRow.tsx](apps/web/app/components/profile/FavoriteRow.tsx)
  - (Their tests in [apps/web/__tests__/components/profile/](apps/web/__tests__/components/profile/))

### B7. Dashboard card ⋯ menu

- [apps/web/app/components/dashboard/FavoriteMenu.tsx](apps/web/app/components/dashboard/FavoriteMenu.tsx) → `DashboardItemMenu.tsx`. Rename the destructive action label: "Remove from favorites" → "Remove from dashboard".
- [apps/web/app/components/dashboard/cards/LineCard.tsx](apps/web/app/components/dashboard/cards/LineCard.tsx), [StationCard.tsx](apps/web/app/components/dashboard/cards/StationCard.tsx), [TrainCard.tsx](apps/web/app/components/dashboard/cards/TrainCard.tsx) — update import + prop names.

### B8. Sitemap (no change)

No new route is added on web (`/profile` stays). Sitemap doesn't need an update.

---

## Phase C — Mobile app (`apps/mobile/`)

### C1. Store + hooks (mirror web rename)

Same renames as B1, applied to:
- [apps/mobile/lib/store/favorites.ts](apps/mobile/lib/store/favorites.ts) → `apps/mobile/lib/store/dashboard.ts`
- [apps/mobile/lib/useToggleFavorite.ts](apps/mobile/lib/useToggleFavorite.ts) → `useToggleDashboardItem.ts`
- [apps/mobile/lib/useReorderFavorites.ts](apps/mobile/lib/useReorderFavorites.ts) → `useReorderDashboardItems.ts`
- [apps/mobile/lib/useClearAllFavorites.ts](apps/mobile/lib/useClearAllFavorites.ts) → `useClearAllDashboardItems.ts`
- [apps/mobile/lib/useUpdateFavoriteSettings.ts](apps/mobile/lib/useUpdateFavoriteSettings.ts) → `useUpdateDashboardItemSettings.ts`
- [apps/mobile/lib/useDashboardQueries.ts](apps/mobile/lib/useDashboardQueries.ts) — rename `useFavoriteTripQuery` → `useDashboardItemTripQuery`.
- [apps/mobile/lib/favoriteRoute.ts](apps/mobile/lib/favoriteRoute.ts) → `dashboardItemRoute.ts`.
- [apps/mobile/lib/AuthContext.tsx](apps/mobile/lib/AuthContext.tsx) — update imports; Firestore field name stays `favorites`.

### C2. Solid opaque app header

Today the Stack uses `headerTransparent: true` + `AppHeaderBackground` at ~88% alpha. Switch to:
- [apps/mobile/app/(app)/_layout.tsx](apps/mobile/app/(app)/_layout.tsx) — set `headerTransparent: false`, `headerStyle.backgroundColor: theme.colors.bg.canvas`, keep `headerShadowVisible: false`, keep the hairline bottom border (move it onto `headerStyle.borderBottomWidth` + `borderBottomColor` so it works without `headerTransparent`).
- [apps/mobile/components/AppHeaderBackground.tsx](apps/mobile/components/AppHeaderBackground.tsx) — delete (no longer needed). Or repurpose to render only the hairline; cleanest to delete and inline the hairline.
- [apps/mobile/lib/useNavHeaderInset.ts](apps/mobile/lib/useNavHeaderInset.ts) — keep; React Navigation's `useHeaderHeight()` already accounts for opaque headers, but screens that use `PageHeader` no longer need negative-margin tricks (verify each callsite — likely no change since PageHeader uses `marginHorizontal: -16` for edge-to-edge, not vertical bleed).
- Token: optionally add `bg.headerSolid` to [apps/mobile/lib/theme/tokens.ts](apps/mobile/lib/theme/tokens.ts) (alias of `bg.canvas`) so future tuning is one knob; or skip and reference `bg.canvas` directly.

### C3. Replace header heart with HeaderMenuButton on detail screens

- [apps/mobile/components/FavoriteButton.tsx](apps/mobile/components/FavoriteButton.tsx) — delete.
- [apps/mobile/lib/headerItems.ts](apps/mobile/lib/headerItems.ts) — unchanged. Continues to be the only path for `headerRight*` items so iOS 26 Liquid Glass stays suppressed.
- Each detail screen swaps `FavoriteButton` for `HeaderMenuButton` in its `headerRight`:
  - [apps/mobile/app/(app)/cta/[line].tsx](apps/mobile/app/(app)/cta/[line].tsx)
  - [apps/mobile/app/(app)/cta/station/[station].tsx](apps/mobile/app/(app)/cta/station/[station].tsx)
  - [apps/mobile/app/(app)/metra/[line]/index.tsx](apps/mobile/app/(app)/metra/[line]/index.tsx)
  - [apps/mobile/app/(app)/metra/[line]/train/[trainNumber].tsx](apps/mobile/app/(app)/metra/[line]/train/[trainNumber].tsx)
  - [apps/mobile/app/(app)/metra/station/[station].tsx](apps/mobile/app/(app)/metra/station/[station].tsx)
- Reuse existing [apps/mobile/components/HeaderMenuButton.tsx](apps/mobile/components/HeaderMenuButton.tsx) — already opens the drawer via `DrawerActions.openDrawer()`.

### C4. New `DashboardAddButton` on PageHeader

- New: `apps/mobile/components/DashboardAddButton.tsx`. Pill-shaped pressable in the bottom-right of `PageHeader`. Reuses `PressableButton` for press feedback + haptics. Same add/added visual states as web.
- [apps/mobile/components/PageHeader.tsx](apps/mobile/components/PageHeader.tsx) — remove the inline `FavoriteButton` from `titleRow`. Add `DashboardAddButton` anchored to bottom-right of the content area. Rename `favorite` prop → `dashboardItem`.
- All detail screens that pass `favorite={...}` to `PageHeader` — rename the prop.

### C5. Menu drawer restructure

- [apps/mobile/components/menu/MenuDrawerContent.tsx](apps/mobile/components/menu/MenuDrawerContent.tsx) — replace the current section ordering:
  - **Menu** (unchanged) — Dashboard, Metra, CTA nav rows
  - **Dashboard Items** (new, replaces the old "Dashboard" section) — renders the new `<DashboardItemsList />` (mobile version, see C6)
  - **Profile** — renders `<ProfilePanel />` (which now includes Clear all, see C7)
  - **Legal** (unchanged) — Privacy, Terms
- Delete the section that mounted `FavoritesManager`.

### C6. New `DashboardItemsList` component (mobile)

- New: `apps/mobile/components/menu/DashboardItemsList.tsx`. Same shape as web's: groups by type (Trains / Stations / Lines), each row uses `MenuNavRow`-style styling (icon + label + chevron). Tapping a row closes the drawer (`navigation.dispatch(DrawerActions.closeDrawer())`) and routes via `dashboardItemRoute(item, lines, stations)`.
- Empty state: single helper line — "Tap '+ Dashboard' on any line, station, or train to add it here."
- Reads from `useDashboardStore`. For train rows that need a fresh subtitle (e.g. "BNSF #1207") it can call `useDashboardItemTripQuery` per row or accept the existing `useStationsQuery` / `useLinesQuery` pattern that `FavoritesSection` uses today — copy that pattern over.
- Delete:
  - [apps/mobile/components/profile/FavoritesManager.tsx](apps/mobile/components/profile/FavoritesManager.tsx)
  - [apps/mobile/components/profile/FavoritesSection.tsx](apps/mobile/components/profile/FavoritesSection.tsx)
  - [apps/mobile/components/profile/FavoriteRow.tsx](apps/mobile/components/profile/FavoriteRow.tsx)

### C7. ProfilePanel — Clear all button

- [apps/mobile/components/profile/ProfilePanel.tsx](apps/mobile/components/profile/ProfilePanel.tsx) — add a destructive `Clear all dashboard items` button (red text, ghost background, full-width). Uses `useClearAllDashboardItems`. Show only when signed in AND `items.length > 0`. Use native `Alert.alert` for confirmation (same UX as today's mobile FavoritesManager).

### C8. Dashboard card ⋯ menu

- [apps/mobile/components/dashboard/FavoriteMenuSheet.tsx](apps/mobile/components/dashboard/FavoriteMenuSheet.tsx) → `DashboardItemMenuSheet.tsx`. Rename the destructive label "Remove from favorites" → "Remove from dashboard".
- [apps/mobile/components/dashboard/DashboardGrid.tsx](apps/mobile/components/dashboard/DashboardGrid.tsx), the three cards, and `cardStyles.ts` — update imports + ref naming. No visual change.

---

## Phase D — Tests

Rename test files in lockstep with their source files. Every test that asserts on the strings "Favorites", "Remove from favorites", or the heart's `aria-label` needs to update to the new strings. Snapshot tests (Footer, MenuDrawerContent) will regenerate.

Affected test files (web):
- `apps/web/__tests__/lib/store/favorites.test.ts` → `dashboard.test.ts`
- `apps/web/__tests__/lib/hooks/useToggleFavorite.test.tsx` → `useToggleDashboardItem.test.tsx` (and the other three hook tests)
- `apps/web/__tests__/lib/favoriteRoute.test.ts` → `dashboardItemRoute.test.ts`
- `apps/web/__tests__/components/FavoriteButton.test.tsx` → delete; replace with `DashboardAddButton.test.tsx`
- `apps/web/__tests__/components/PageHeader.test.tsx` — update assertions
- `apps/web/__tests__/components/AuthProvider.test.tsx` — update import
- `apps/web/__tests__/components/dashboard/DashboardGrid.test.tsx`, `FavoriteMenu.test.tsx` (→ `DashboardItemMenu.test.tsx`), card tests
- `apps/web/__tests__/components/profile/{FavoritesManager,FavoritesSection,FavoriteRow}.test.tsx` — delete; add a small `DashboardItemsList.test.tsx`
- `apps/web/__tests__/pages/profile.test.tsx` — update to assert the Clear all button is present

Affected test files (mobile): same shape — rename store/hook/route tests, replace `FavoriteButton.test.tsx` with `DashboardAddButton.test.tsx`, swap profile-manager tests for a new `DashboardItemsList.test.tsx` under `apps/mobile/__tests__/components/menu/`, and update `MenuDrawerContent.test.tsx`.

`apps/web/__tests__/lib/station-arrivals.test.ts` — only import name changes; assertions unchanged.

---

## Verification

After implementation:

1. **Type-check both apps:** `pnpm -w run build` (or `pnpm --filter web run build && pnpm --filter mobile run typecheck`). Zero TS errors.
2. **Lint clean:** `pnpm -w run lint`.
3. **All tests pass:** `pnpm -w run test`. No remaining references to renamed identifiers (`grep -r "useFavoritesStore\|FavoriteButton\|FavoritesManager" apps/ packages/` should return nothing outside intentional comments / migration notes).
4. **Firestore back-compat:** sign in with an existing test account that already has favorites. Verify the items appear in the new dashboard list, on both web and mobile. Add a new item — confirm the Firestore document is still keyed under `favorites.{type}:{id}` (use Firebase console or `mcp__firebase__firestore_get_document` with path `profiles/{uid}`).
5. **Web home two-column layout:**
   - At 1280px+ wide: dashboard grid on the left (~60%), DashboardItemsList on the right (~40%).
   - At 768px (tablet): single column, grid on top, list below.
   - At 375px (phone): single column, no horizontal overflow.
6. **Web detail page:** open `/cta/red` and `/metra/up-n/train/606`. Confirm: no heart in the hero corner. Bottom-right pill says "+ Dashboard" when not added, "Added" when added. Tapping toggles the dashboard store + Firestore.
7. **Mobile header:** open `/cta/red` on iOS 26 simulator. Confirm: header is solid opaque (no photo bleed-through), hero photo's top edge butts cleanly against the header's hairline border, no Liquid Glass pill around the menu/back buttons. Same check on Android emulator.
8. **Mobile drawer:** open from any screen. Confirm: four sections in order — Menu, Dashboard Items, Profile, Legal. Dashboard Items shows your real items grouped Trains / Stations / Lines, tapping a row closes the drawer and navigates. Profile shows the existing card plus a destructive "Clear all dashboard items" button (only when signed in + items > 0).
9. **Card removal still works:** from the home dashboard, tap a card's ⋯, choose "Remove from dashboard". Verify the card disappears optimistically and Firestore reflects the removal within a second. The new "+ Dashboard" button on that line/station's detail page should now read "+ Dashboard" again.
10. **Compliance:** the Metra "not sponsored, affiliated, or operated by" disclaimer and the "Last updated" timestamps remain present on all Metra surfaces. Footer attribution + non-affiliation strings unchanged.

---

## Critical files (modify)

Shared:
- [packages/shared/src/types.ts](packages/shared/src/types.ts)
- [packages/shared/src/favorites.ts](packages/shared/src/favorites.ts) (rename to `dashboard-items.ts`)
- [packages/shared/src/index.ts](packages/shared/src/index.ts)
- [packages/shared/src/station-arrivals.ts](packages/shared/src/station-arrivals.ts)

Web:
- [apps/web/app/page.tsx](apps/web/app/page.tsx)
- [apps/web/app/components/dashboard/Dashboard.tsx](apps/web/app/components/dashboard/Dashboard.tsx)
- [apps/web/app/components/PageHeader.tsx](apps/web/app/components/PageHeader.tsx)
- [apps/web/app/profile/ProfileContent.tsx](apps/web/app/profile/ProfileContent.tsx)
- [apps/web/app/components/AuthProvider.tsx](apps/web/app/components/AuthProvider.tsx)
- All `apps/web/app/lib/store/`, `apps/web/app/lib/hooks/`, and `apps/web/app/lib/favorites.ts`
- All `apps/web/app/components/dashboard/`

Mobile:
- [apps/mobile/app/(app)/_layout.tsx](apps/mobile/app/(app)/_layout.tsx)
- [apps/mobile/components/PageHeader.tsx](apps/mobile/components/PageHeader.tsx)
- [apps/mobile/components/menu/MenuDrawerContent.tsx](apps/mobile/components/menu/MenuDrawerContent.tsx)
- [apps/mobile/components/profile/ProfilePanel.tsx](apps/mobile/components/profile/ProfilePanel.tsx)
- [apps/mobile/components/AppHeaderBackground.tsx](apps/mobile/components/AppHeaderBackground.tsx) (delete)
- [apps/mobile/components/FavoriteButton.tsx](apps/mobile/components/FavoriteButton.tsx) (delete)
- All five detail screens under `apps/mobile/app/(app)/`
- All `apps/mobile/lib/store/`, `apps/mobile/lib/use*Favorite*`, and `apps/mobile/lib/favoriteRoute.ts`
- All `apps/mobile/components/dashboard/`
