# Plan: TrainCard polish — scroll fix, next-run line, menu header, remove placeholders

## Context

Four user-reported issues on the dashboard favorite **TrainCard** and its overflow (⋯) menu / stop picker. All four apply to **both web and mobile** (the apps mirror each other). The "next train" line is computed purely client-side from data the card already loads — no backend or extra query.

1. **Stop-picker list doesn't scroll all the way.** The "Set departure/destination station" picker clips its last rows.
2. **Departed-for-the-day shows a dead end.** When a train has run, the card just says "Departed 7:43 AM". It should also show when it next runs: `Departed 7:43 AM · Next train tomorrow` (day-only wording; "tomorrow" for the next calendar day, otherwise the weekday name e.g. "Next train Monday").
3. **Train menu header is uninformative.** Web shows no header; mobile shows only "Train 2222". It should show the origin→destination plus the train number.
4. **Unsupported menu items.** "Mute alerts" and "Share" are placeholders — remove them until the features exist.

Decisions confirmed with the user: **web + mobile**, **day-only wording**, and keep the "Departed …" prefix even on days the train doesn't run.

---

## 1. Stop-picker scroll fix

### Mobile — `apps/mobile/components/dashboard/TrainStopPickerSheet.tsx` (the real bug)
Inside `@gorhom/bottom-sheet`, a plain React Native `ScrollView` is not bounded by the sheet and does not scroll — you must use the sheet-aware scroller.

- Replace `ScrollView` import (from `react-native`) with `BottomSheetScrollView` (from `@gorhom/bottom-sheet`).
- Restructure `PickerContents`: keep the title `Text` fixed at the top, put the stop rows in `<BottomSheetScrollView>`. Give it `contentContainerStyle` with `paddingBottom` (use `theme.space[6]` + `useSafeAreaInsets().bottom`) so the last row clears the home indicator.
- Drop `flex: 1` from `styles.content` (it fights the sheet's content sizing); the `BottomSheetView` should size to the snap point and let the scroll view fill it. Optionally bump `SNAP_POINTS` to `['80%']` for more usable list height.

### Web — `apps/web/app/components/dashboard/TrainStopPickerModal.tsx`
The `max-h-[80vh] flex flex-col overflow-hidden` dialog with a `flex-1 overflow-y-auto` `<ul>` is a correct pattern and should scroll. Add a defensive `min-h-0` to the `<ul>` (flex children don't shrink below content size without it — a real cause of "can't scroll to the bottom" in flex-column layouts) and `pb-2` so the final row isn't flush against the rounded corner. Verify in-browser; no larger change expected.

---

## 2. "Next train tomorrow" line

### New shared helper — `packages/shared/src/metra-status.ts`
Add a pure helper next to the existing `MetraServiceType` / `SERVICE_LABEL`:

```ts
// Day-of-week approximation of GTFS service. Does not account for Metra
// holiday/special schedules — acceptable for an at-a-glance dashboard hint.
export function nextServiceRunLabel(
  serviceType: MetraServiceType,
  now: Date,
): string  // → 'tomorrow' | 'Monday' | 'Saturday' | ...
```

Logic: starting from `now`, walk forward day by day (1–7) until a day matches the service type (`weekday` = Mon–Fri, `saturday` = Sat, `sunday` = Sun). If that day is exactly `now + 1`, return `'tomorrow'`; otherwise return the weekday name (`toLocaleDateString('en-US', { weekday: 'long' })`). Export it from `packages/shared/src/index.ts`.

### Web — `apps/web/app/components/dashboard/cards/TrainCard.tsx`
In the countdown block, the `else` branch currently renders `Departed ${formatClockLabel(depMin)}`. Change it to append the next-run hint when `trip?.serviceType` is available:

```
Departed {formatClockLabel(depMin)} · Next train {nextServiceRunLabel(trip.serviceType, now)}
```

`now` is already in component state; `trip.serviceType` is already on the loaded `MetraTripDetail`. No new data fetch.

### Mobile — `apps/mobile/components/dashboard/cards/TrainCard.tsx`
Identical change to the mobile `else` branch (the `\`Departed ${formatClockLabel(depMin)}\`` template string).

---

## 3. Train menu header → "{origin} to {destination}" + "{line} #{number}"

Scope: **train favorites only** (matches the request; line/station menu headers unchanged).

### Web — `apps/web/app/components/dashboard/FavoriteMenu.tsx` + `cards/TrainCard.tsx`
`FavoriteMenu` has no header and doesn't load the trip, but `TrainCard` already computes `title` (`"{origin} to {destination}"`) and `subheader` (`"{line} #{number}"`). Pass them down:

- Add optional prop to `FavoriteMenuProps`: `header?: { title: string; subtitle: string }`.
- In `TrainCard`, where it renders `<FavoriteMenu … />`, pass `header={{ title, subtitle: subheader }}`.
- In `FavoriteMenu`, when `header` is set, render a non-interactive header block at the top of the menu (title bold, subtitle muted, bottom border) — styled to match the existing `dark:` menu palette.

### Mobile — `apps/mobile/components/dashboard/FavoriteMenuSheet.tsx`
`MenuContents` is opened with only the `favorite`. For the train branch, resolve the trip the same way the picker does (`useFavoriteTripQuery(favorite.id)` — already a cached query) and reuse `pickStop` semantics + `shortenStationName` to build the title.

- In `MenuContents`, for `favorite.type === 'train'`: call `useFavoriteTripQuery(favorite.id)`, resolve origin/dest stops honoring `favorite.trainOriginStopSlug` / `trainDestinationStopSlug` (fallback to first/last stop), and derive `title = "{origin} to {destination}"`, `subtitle = "{line} #{number}"`. Fall back to the current `Train {number}` when the trip hasn't loaded.
- Render the existing `styles.title` `Text` plus a new muted subtitle `Text` beneath it (add a `subtitle` style to `makeStyles`). Update `labelForFavorite` only as the fallback path, or compute the train title inline in `MenuContents`.

---

## 4. Remove "Mute alerts" and "Share"

### Web — `apps/web/app/components/dashboard/FavoriteMenu.tsx`
Delete the two `<MenuItem label="Mute alerts" … />` and `<MenuItem label="Share" … />` lines (currently 142–143). Keep the divider before "Remove from favorites".

### Mobile — `apps/mobile/components/dashboard/FavoriteMenuSheet.tsx`
Delete the "Mute alerts" and "Share" `<MenuItem>` blocks (currently 193–208). Remove the now-unused `Alert` import from `react-native` (lint will fail otherwise).

---

## Critical files

| File | Change |
|---|---|
| `packages/shared/src/metra-status.ts` | add `nextServiceRunLabel` |
| `packages/shared/src/index.ts` | export it |
| `apps/web/app/components/dashboard/cards/TrainCard.tsx` | next-run line; pass `header` to menu |
| `apps/mobile/components/dashboard/cards/TrainCard.tsx` | next-run line |
| `apps/web/app/components/dashboard/FavoriteMenu.tsx` | header block; remove Mute/Share |
| `apps/mobile/components/dashboard/FavoriteMenuSheet.tsx` | train header+subtitle; remove Mute/Share; drop `Alert` import |
| `apps/web/app/components/dashboard/TrainStopPickerModal.tsx` | `min-h-0` + `pb-2` on list |
| `apps/mobile/components/dashboard/TrainStopPickerSheet.tsx` | `BottomSheetScrollView` + safe-area paddingBottom |

## Tests (required by the PostSourceFileEdit hook + CI)

- `apps/web/__tests__/lib/metra-status.test.ts` — unit-test `nextServiceRunLabel`: weekday train on Tue→`tomorrow`, on Fri→`Monday`, on Sat→`Monday`; saturday train on Wed→`Saturday`; sunday train on Sun (already departed)→`Sunday` (next week).
- `apps/web/__tests__/components/dashboard/cards/TrainCard.test.tsx` & mobile equivalent — add a departed-state case asserting `Next train tomorrow` renders.
- `apps/web/__tests__/components/dashboard/FavoriteMenu.test.tsx` — change the Mute/Share assertions to assert **absence**; add a train-favorite case asserting the header title/subtitle render.
- `apps/mobile/__tests__/components/dashboard/FavoriteMenuSheet.test.tsx` — delete the Mute/Share alert tests; update the "renders all base items" test; add a train-favorite header/subtitle assertion.
- Add/adjust a render test for the mobile picker using `BottomSheetScrollView`.

## Verification

1. `pnpm -w run lint` and `pnpm -w run test` — must be fully clean (CI gate).
2. Web: `pnpm run:web`, sign in, favorite a Metra train, open dashboard:
   - Open ⋯ menu → header shows "{origin} to {destination}" and "{line} #{number}"; no Mute/Share items.
   - "Set departure station…" → list scrolls to the last stop.
   - For a train whose scheduled departure has passed: card reads "Departed H:MM AM · Next train tomorrow" (test near a Friday for the weekday-name path).
3. Mobile: `pnpm run:ios`, same checks; confirm the picker bottom sheet scrolls fully and the menu sheet header shows two lines.
4. No CTA/Metra compliance surface touched (no new data display, no attribution/branding change) — compliance checklist unaffected.
