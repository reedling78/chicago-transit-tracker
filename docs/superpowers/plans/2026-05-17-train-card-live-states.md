# Plan: TrainCard live / no-live states + two-column layout

## Context

The dashboard favorite **TrainCard** (web + mobile) currently has one meaningful state:
when the Metra trip is receiving realtime data it renders `MetraTripHeroStatusCardCompact`
(status + next stop inline); when it is **not** receiving live data it shows nothing below
the pills except a static fallback subtitle. There is no indication of when the train will
actually leave the user's departure station, and the live state has no explicit "this is
live" affordance.

This change makes the no-live state useful and the live state clearer:

1. **No live data** → show a countdown to the train's next scheduled arrival/departure at
   the user's departure (origin) station, alongside the existing tags/pills.
2. **Receiving live data** → show a pulsing "Live" dot + label next to the status, and lay
   the status and next-stop info out as **two side-by-side columns**.
3. The two-column layout applies **only in the live state**, **only at mobile widths on
   web** (desktop web keeps today's stacked/inline layout); the native mobile app is always
   two-column. Scope is **dashboard only** — the Metra line page is unchanged.

All scheduled-time data needed for the countdown is already in the `metra-trips` Firestore
doc that `TrainCard` loads via `useFavoriteTripQuery` — **no new data plumbing required**.

## Files to modify

### Web
- `apps/web/app/components/dashboard/cards/TrainCard.tsx` — add no-live countdown block.
- `apps/web/app/components/MetraTripHeroStatusCardCompact.tsx` — pulsing Live indicator +
  responsive two-column layout (mobile two-col, `sm:` and up = current inline layout).
- `apps/web/__tests__/components/...` — add/extend TrainCard test (testing-rules hook).

### Mobile
- `apps/mobile/components/dashboard/cards/TrainCard.tsx` — add no-live countdown block.
- `apps/mobile/components/MetraTripHeroStatusCardCompact.tsx` — pulsing Live indicator +
  always two-column layout.
- `apps/mobile/__tests__/...` — add/extend TrainCard test.

### No changes needed
- `packages/shared` — reuse existing helpers (see below). No new shared exports.
- Line page components (`MetraCurrentService`, `CurrentServiceList`) — out of scope.

> Before editing `MetraTripHeroStatusCardCompact`, grep both apps to confirm `TrainCard` is
> its only consumer (CLAUDE.md says so). If anything else imports it, gate the new layout
> behind a prop rather than changing it globally.

## Reused helpers (already exported from `@ctt/shared`)

- `parseDisplayTimeToMinutes(display)` — `"5:42 PM"` → minutes since midnight
  (`packages/shared/src/metra-status.ts:111`).
- `minutesUntil(now, minutesSinceMidnight)` (`station-arrivals.ts:41`).
- `formatMinutesAway(minutesAway)` — `"12 min"` / `"Due"` / `"1h 5m"`
  (`station-arrivals.ts:46`).
- `formatClockLabel(minutesSinceMidnight)` — back to `"5:42 PM"` (`station-arrivals.ts:54`).
- `computeRightPanel(...)` — already used; produces the next-stop `{title, station, time,
  subtext}` for the live column.

The origin stop is already computed in both `TrainCard`s as
`originStop = pickStop(trip?.stops, favorite.trainOriginStopSlug, firstStop)`; use
`originStop.departure` (display string) as the countdown target.

## Approach

### 1. No-live countdown (both platforms, in `TrainCard`)

Add a "now" tick mirroring the existing `StationCard` pattern (local
`useState(() => new Date())` + `useEffect` `setInterval(…, 60_000)` with cleanup). Do not
add a shared hook — match the StationCard convention already in the codebase.

Render the countdown **only when** `trip` exists and `!(live && live.status &&
!live.isNoData)` (i.e. the live compact card is not shown). Compute:

```
const depMin = originStop ? parseDisplayTimeToMinutes(originStop.departure) : null
const away   = depMin != null ? minutesUntil(now, depMin) : null
```

Display rules:
- `away >= 0` → `Departs in {formatMinutesAway(away)}` + muted `· {formatClockLabel(depMin)}`
  + ` from {originStop.stationName}`.
- `away < 0` (already past, no live data) → muted `Departed {formatClockLabel(depMin)}`
  (graceful; the existing `subtitleFallback` / "Trip not currently scheduled" still covers
  the no-trip case).
- `depMin == null` or no `originStop` → keep the current fallback subtitle behavior
  unchanged.

Tags/pills: leave the existing pills row exactly as-is in both states. The countdown line
sits **below** the pills (replacing the bare fallback subtitle in the no-live state). This
keeps the no-live state "stacked" as specified.

### 2. Live state: pulsing Live indicator (in `MetraTripHeroStatusCardCompact`)

The compact card is only mounted when live data is present, so "Live" is unconditional
inside it. Make the existing tone status dot pulse and add a small `Live` label next to the
status label.

- **Web:** wrap the existing `h-2 w-2 rounded-full` dot with Tailwind `animate-pulse`; add
  `<span class="text-[10px] font-semibold uppercase tracking-wide {toneClass.text}">Live</span>`
  after the status label.
- **Mobile:** add a tiny `LiveDot` using `react-native-reanimated` (already a dep):
  `useSharedValue` opacity/scale + `withRepeat(withTiming(...), -1, true)` on an
  `Animated.View`; add a `Live` `<Text>` (uppercase, 10px, tone color). Keep it local to
  the file.

`Last reported …` (Metra compliance timestamp) stays — it moves into the left/status
column (see below). Do not remove it.

### 3. Two-column layout (in `MetraTripHeroStatusCardCompact`)

Restructure into two logical blocks:
- **Status column:** tone dot + pulsing + status label + `Live` label, with
  `Last reported …` underneath.
- **Next-stop column:** the `computeRightPanel` content (`title: station`, `time`,
  `subtext`).

**Web responsive:** mobile-first two columns, desktop reverts to today's inline look.
- Container: `grid grid-cols-2 gap-3 items-start` as the base (mobile two-col).
- At `sm:` and up: restore the current single-line behavior —
  `sm:flex sm:flex-wrap sm:items-baseline sm:gap-x-2 sm:gap-y-1`.
- The `·` separators between status and next-stop become `hidden sm:inline` (only needed in
  the desktop inline layout; the grid columns provide separation on mobile).
- Net effect: **desktop web is visually unchanged**; mobile web gets two columns.

**Mobile (RN):** always two columns. Replace the single `styles.row` (`flexDirection:
'row', flexWrap: 'wrap'`) with a two-`View` row: left status column (`flex: 1`) and right
next-stop column (`flex: 1`, `alignItems: 'flex-end'`). Drop the inline `·` divider (the
columns separate them). Keep the negative-margin bleed wrapper as-is.

## Compliance note (call out, do not silently skip)

`.claude/rules/transit-compliance.md` says static-schedule surfaces should show the GTFS
schedule's published date (`gtfs-meta/metra`). The new countdown is derived from the static
trip schedule. **The existing `StationCard` already ships scheduled countdowns on the
dashboard without that published date** — this plan deliberately stays consistent with that
established precedent and does **not** add `gtfs-meta` plumbing to dashboard cards. Flag
this to the user in the PR description as a pre-existing, codebase-wide consideration rather
than introducing an inconsistency here. The live state's `Last reported` timestamp (the
GTFS-RT compliance requirement) is preserved.

## Verification

1. `pnpm run:web`, sign in, add a Metra train favorite.
   - **No live data** (off-peak / a train not currently running): card shows
     `Departs in N min · 5:42 PM from {origin}` below the pills; updates each minute.
   - **Live data** (a train currently mid-trip): compact card shows pulsing dot + `LIVE`
     label; at a 375px viewport status and next-stop render as two columns; at ≥`sm`
     desktop width the layout matches the current inline look (regression check).
   - Resize across 375 / 768 / 1280 to confirm the responsive switch.
2. `pnpm run:ios` (or Android): same two checks; confirm two-column compact card on a
   phone and the pulsing Live dot animates.
3. `pnpm -w run lint` and `pnpm -w run test` must pass clean (zero warnings).
4. Update/extend Jest tests:
   - Web: render `TrainCard` with a mocked no-live `useMetraTripLiveStatus` + a trip with a
     known `originStop.departure`; assert the countdown string. Render with live status;
     assert `Live` label present.
   - Mobile: equivalent RNTL test.
