# Mobile Dashboard iOS Scroll Fix

## Context

On iOS, the user cannot scroll the dashboard when their finger lands on a favorite card — the gesture is captured by the draggable list and never resolves into a parent scroll. The root cause is a nested scrollable hierarchy:

`apps/mobile/components/dashboard/Dashboard.tsx` wraps `DashboardGrid` in a `ScrollView`. `DashboardGrid` (`apps/mobile/components/dashboard/DashboardGrid.tsx:54`) renders a `DraggableFlatList` with `scrollEnabled={false}` so the inner list doesn't scroll independently. But `DraggableFlatList` still installs its own pan/long-press gesture handlers on every row. With the inner list's scroll disabled, the inner gesture handlers and the outer `ScrollView`'s pan responder compete for the same touch, and on iOS the `ScrollView` never gets a chance to claim the vertical pan because the row's `Pressable onLongPress={drag}` (250ms delay) sits in front of it.

The recommended `react-native-draggable-flatlist` pattern is to never nest it inside another `ScrollView`. The fix is to make `DraggableFlatList` the single, top-level scroller for the dashboard, and pass the header (greeting) and footer (CTA/Metra hero cards) into it via `ListHeaderComponent` / `ListFooterComponent`. This eliminates the gesture conflict — the only pan responder above each row is `DraggableFlatList`'s own `FlatList`, which natively cooperates with its drag handlers.

## Approach

Restructure the dashboard so `DraggableFlatList` is the only scroller:

1. **`apps/mobile/components/dashboard/Dashboard.tsx`** — Remove the wrapping `ScrollView`. Render `DashboardGrid` directly inside a `View` that fills the screen (`flex: 1`). Pass `DashboardHeader` and `DashboardHero` into `DashboardGrid` as `header` and `footer` props (see below).

2. **`apps/mobile/components/dashboard/DashboardGrid.tsx`**:
   - Accept new optional props `header?: ReactNode` and `footer?: ReactNode`.
   - Remove `scrollEnabled={false}` from `DraggableFlatList` (line 60). Let it scroll natively.
   - Pass `ListHeaderComponent={header}` and `ListFooterComponent={footer}` through.
   - Pass `contentContainerStyle` with the existing dashboard padding (currently on the parent `ScrollView`).
   - Keep `activationDistance={8}` and the existing `onLongPress={drag}` wiring on cards — those work correctly once the nested-scrollable conflict is removed.
   - For the empty-state (no favorites) branch (currently a non-scrolling `View`), wrap it so the user can still see header + hero. Simplest: when `favorites.length === 0`, render `header`, the empty-state body, and `footer` inside a single `ScrollView` (no nested draggable in this branch, so no conflict).

3. **`apps/mobile/app/index.tsx`** — No change expected; `Dashboard` is rendered inside the Stack screen and should fill the screen.

4. **Header inset** — `DashboardHeader` already accounts for `useNavHeaderInset()` (or the ScrollView's `contentContainerStyle` padding does). Verify the new `contentContainerStyle` on `DraggableFlatList` carries the same top inset so the greeting doesn't render under the transparent navigator header.

5. **Tests** — Update `apps/mobile/__tests__/components/dashboard/Dashboard.test.tsx` (and `DashboardGrid.test.tsx` if present) to reflect the new prop shape (header/footer pass-through) and that the outer `ScrollView` is gone in the populated state. Mocks for `react-native-draggable-flatlist` likely already render children/header/footer; confirm the mock supports `ListHeaderComponent` / `ListFooterComponent`.

## Critical files

- `apps/mobile/components/dashboard/Dashboard.tsx` — remove outer ScrollView, restructure layout
- `apps/mobile/components/dashboard/DashboardGrid.tsx` — accept header/footer, drop `scrollEnabled={false}`, pass list header/footer
- `apps/mobile/__tests__/components/dashboard/Dashboard.test.tsx` (and any `DashboardGrid.test.tsx`) — update for new structure

## Out of scope

- Web dashboard (`apps/web/app/components/dashboard/`) is unaffected; it uses `@dnd-kit` and a normal page scroll, no gesture conflict.
- Card-level touch targets, `delayLongPress`, and `CardMenuButton` behavior are unchanged.

## Verification

1. `pnpm --filter mobile run lint` — clean.
2. `pnpm --filter mobile test` — all tests pass with zero warnings.
3. Manual on iOS simulator (`pnpm run:ios`):
   - With ≥3 favorites so the list overflows the screen: place finger on a card in the middle of the list and drag vertically — the dashboard should scroll smoothly.
   - Long-press a card (~250ms hold) without moving — drag-to-reorder should still activate, and the card should follow the finger.
   - Tap (without long-press) — should navigate to the destination route as before.
   - Tap the `⋯` button — should open the favorite menu sheet.
   - Empty state (sign out / clear all): scrolling should still work; header + hero visible.
4. Manual on Android (`pnpm run:android`) — confirm no regression; Android did not exhibit this bug but the layout change affects both platforms.
