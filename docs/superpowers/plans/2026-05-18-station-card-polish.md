# Station Card Polish — radio fix, train tap-through, subheader, live treatment, row shadow

## Context

The dashboard favorite **Station** card has five issues, reported against the mobile app but to be fixed on **both mobile and web** for parity:

1. **Radio buttons don't switch live.** Opening a station card's ⋯ menu and tapping a View/Show option does persist (visible after the menu closes), but the selected radio doesn't update while the menu is open. Root cause (identical on both platforms): the menu reads `density`/`directionFilter` from a **stale `favorite` prop snapshot** captured when the menu opened, instead of subscribing to the live Zustand store. `TrainStopPickerSheet` already does this correctly and is the reference pattern.
2. **No train tap-through.** Tapping a train inside a Metra station card does nothing. It should open that train's detail screen.
3. **Subheader / meta cleanup.** The service label ("Metra"/"CTA") currently sits as a separate element next to the ⋯ button. It should be removed from there and folded into the subheader: `Metra MD-W`, `CTA Blue Line` (CTA appends a single trailing "Line"; multi-line joins with " • ", e.g. `Metra MD-W • UP-NW`, `CTA Blue • Pink Line`).
4. **Live treatment.** Replace the verbose `● Live · Last updated: H:MM` strip with the same compact pulsing-green **"Live"** header badge the TrainCard uses.
5. **Row text drop shadow.** Colored (line-color background) expanded rows should get the same text drop-shadow already applied to the train-detail compact status card, for legibility on light brand colors.

### Hard compliance constraint (do not violate)

`.claude/rules/transit-compliance.md` **explicitly names both StationCard files** as components that MUST surface a visible "Last updated: HH:MM" timestamp whenever a Metra realtime match is present (Metra GTFS-RT license requirement; removing it can get our API key revoked). Issue #4 must therefore **move** live indication into the header badge **without dropping the timestamp**: keep a minimal, de-emphasized `Updated H:MM PM` line (no green, no dot, no "Live" word) at the bottom of the arrivals body. This satisfies the user's "remove the live line" intent (the redundant green Live strip is gone) while staying license-compliant. This decision is intentional and must not be "simplified" away.

## Changes

### Shared helper (new, reused by both platforms)

`packages/shared/src/station-arrivals.ts` — add a pure, tested helper:

```ts
export function stationCardSubheader(
  service: 'metra' | 'cta',
  lineNames: string[],
): string {
  const svc = service === 'metra' ? 'Metra' : 'CTA'
  if (lineNames.length === 0) return svc
  const joined = lineNames.join(' • ')
  return service === 'metra' ? `${svc} ${joined}` : `${svc} ${joined} Line`
}
```

Already barrel-exported via `packages/shared/src/index.ts` (export the symbol there too).

### 1. Radio-button live selection fix

- **Mobile** `apps/mobile/components/dashboard/FavoriteMenuSheet.tsx` — in `MenuContents`, mirror `TrainStopPickerSheet.tsx:91-94`:
  ```ts
  const liveFavorite = useFavoritesStore((s) =>
    s.favorites.find((f) => f.type === favorite.type && f.id === favorite.id),
  )
  const effective = liveFavorite ?? favorite
  ```
  Derive `density` / `direction` (lines 132-133) from `effective`, not `favorite`. Import `useFavoritesStore` from `../../lib/store/favorites`.
- **Web** `apps/web/app/components/dashboard/FavoriteMenu.tsx` — same pattern using the web store (`@lib/store/favorites`); derive `density`/`direction` (lines 74-78) from the live favorite selector instead of the `favorite` prop.

### 2. Train tap-through (Metra only — there is no CTA train detail page)

Route (both platforms): `/metra/${item.lineSlug}/train/${item.trainNumber}`. `ArrivalItem` already carries `lineSlug` + `trainNumber` (`packages/shared/src/station-arrivals.ts:13-15`) when matched to station-trips.

- **Mobile** `apps/mobile/components/dashboard/cards/StationCard.tsx` `ArrivalsBody`:
  - Add prop `onPressTrain?: (lineSlug: string, trainNumber: string) => void`; StationCard passes `(ls, tn) => router.push(\`/metra/${ls}/train/${tn}\` as never)`.
  - **Expanded** rows (line 215-249): wrap each `item` row in `PressableButton` when `item.lineSlug && item.trainNumber`; otherwise plain `View` as today.
  - **Compact** rows (line 187-199): wrap the row, navigating to the first item in the group with `lineSlug && trainNumber` (`g.items.find(it => it.lineSlug && it.trainNumber)`).
  - Inner `PressableButton` handles its own press; outer card `PressableButton` (station detail) still works for non-train taps and long-press drag.
- **Web** `apps/web/app/components/dashboard/cards/StationCard.tsx` `ArrivalsBody`:
  - The arrival rows are **outside** the header `<Link>`, so wrapping a row in its own `next/link` `<Link>` is safe (no nested-anchor).
  - **Expanded** rows (line 236-276): wrap the colored row in `<Link href={`/metra/${item.lineSlug}/train/${item.trainNumber}`}>` when both present; add a subtle hover affordance (e.g. `hover:brightness-110`).
  - **Compact** rows (line 201-220): wrap the `<li>` content in a `<Link>` to the first item in the group with `lineSlug && trainNumber`.

### 3. Subheader + remove standalone meta

- **Mobile** `StationCard.tsx`: replace `subtitle` (line 53) with `stationCardSubheader(metra ? 'metra' : 'cta', station?.lines ?? [])`. Delete the `meta` const (line 55) and the `{station ? <Text style={cardStyles.meta}>{meta}</Text> : null}` element (line 111). Optionally drop the now-unused `cardStyles.meta` if no other card uses it (verify LineCard/TrainCard first; keep if shared).
- **Web** `StationCard.tsx`: replace `subtitle` (line 92) with the shared helper; remove `meta` (line 93) and the `{meta && <span className={cardMeta}>{meta}</span>}` element (line 118). Keep `cardMeta` import only if still used elsewhere.

### 4. Live treatment (header badge) + compliant timestamp

- **Mobile** `StationCard.tsx`:
  - Add a `LiveDot` + "Live" badge identical to `TrainCard.tsx:46-66` and styles `liveBadge`/`liveText` (`TrainCard.tsx:178-179`). Render it in the header row (where `meta` was removed) when `hasLiveRow`.
  - In `ArrivalsBody`, delete the green `liveStrip` (lines 169-177, 182, 207) and its styles (`liveStrip`, `liveDotSmall`, `liveStripText`). Replace with a single de-emphasized footnote line at the **bottom** of the body when `lastUpdated != null`: `Updated {formatLastUpdated(lastUpdated)}` using `theme.colors.text.secondary`, `fontSize: 11`. Keep `formatLastUpdated`.
- **Web** `StationCard.tsx`:
  - Add the green pulsing "Live" badge identical to `TrainCard.tsx` web (`<span className="h-2.5 w-2.5 animate-pulse rounded-full bg-green-500" />` + `text-green-600 dark:text-green-400` "Live"), rendered in the header where `meta` was, when `hasLiveRow`.
  - In `ArrivalsBody`, remove the green `liveStrip` (lines 186-194 and its two render sites). Add a subdued bottom footnote `Updated {formatLastUpdated(lastUpdated)}` in `text-[11px] text-gray-500 dark:text-gray-400` when `lastUpdated != null`.
  - Pass `hasLiveRow` down or compute the badge in the parent (it already has `hasLiveRow`, line 83).

### 5. Row text drop shadow on colored expanded rows

Exact values come from the train-detail compact card and must be reused verbatim.

- **Mobile** `StationCard.tsx` `makeLocalStyles`: add the `onColor` object from `MetraTripHeroStatusCardCompact.tsx:116-120` (`textShadowColor: 'rgba(0,0,0,0.45)'`, `textShadowOffset: {width:0,height:1}`, `textShadowRadius: 2`) and spread `...onColor` into `expandedRowSubtitle`, `expandedRowHeadsign`, `expandedRowMinutes`, `expandedRowApprox`, `cancelledPill`.
- **Web** `StationCard.tsx`: add the arbitrary Tailwind class `[text-shadow:0_1px_2px_rgb(0_0_0_/_45%)]` (same one used in web `MetraTripHeroStatusCardCompact.tsx:55`) to the expanded colored row container (line 237-242) so all child text inherits the shadow.

## Critical files

- `packages/shared/src/station-arrivals.ts`, `packages/shared/src/index.ts`
- `apps/mobile/components/dashboard/cards/StationCard.tsx`
- `apps/mobile/components/dashboard/FavoriteMenuSheet.tsx`
- `apps/web/app/components/dashboard/cards/StationCard.tsx`
- `apps/web/app/components/dashboard/FavoriteMenu.tsx`
- Reference (read-only, copy exact values): `apps/mobile/components/dashboard/cards/TrainCard.tsx`, `apps/mobile/components/MetraTripHeroStatusCardCompact.tsx`, `apps/web/app/components/dashboard/cards/TrainCard.tsx`, `apps/web/app/components/dashboard/cards/MetraTripHeroStatusCardCompact.tsx`, `apps/mobile/components/dashboard/TrainStopPickerSheet.tsx`

## Tests (required — testing.md + PostSourceFileEdit hook)

- **Shared:** unit test for `stationCardSubheader` (Metra single/multi, CTA single/multi, empty) in `apps/web/__tests__/functions/` (or the shared helpers test location).
- **Web:** update/extend `__tests__/components/dashboard/StationCard.test.tsx` — new subheader text, no standalone meta, Live badge appears when a row is live, `Updated H:MM` footnote still present when live (compliance), Metra expanded/compact row links to `/metra/{line}/train/{num}`, CTA rows not linked. Update `FavoriteMenu` test for live-store selection. Update any TrainCard/StationCard snapshots.
- **Mobile:** mirror in `apps/mobile/__tests__/` — StationCard subheader, no meta, Live badge, train `router.push`, FavoriteMenuSheet radio reflects store immediately.
- Run `pnpm -w run lint` and `pnpm -w run test` — must be zero warnings/errors.

## Verification

1. `pnpm -w run test` and `pnpm -w run lint` clean.
2. Web: `pnpm run:web`, sign in, favorite a Metra station with live trains and a CTA station.
   - Subheader reads `Metra <line>` / `CTA <line> Line`; no separate Metra/CTA chip by the ⋯.
   - Open ⋯ menu, toggle View and Show — the selected pill updates **immediately** while the menu is open.
   - With live data, a green pulsing **Live** badge shows in the header; the old green "Live · Last updated" strip is gone; a subdued `Updated H:MM` line remains in the body (compliance check — confirm it is visible whenever a row is live).
   - Expanded + compact Metra rows navigate to the correct `/metra/{line}/train/{num}`; CTA rows do not navigate; card header still opens station detail.
   - Colored expanded rows show the text drop-shadow.
3. Mobile: `pnpm run:ios` (or Android) and repeat the same checks; verify nested press (train row vs. card vs. long-press drag) all behave.
