# Plan: Match dashboard StationCard arrivals typography to the station page

## Context

The dashboard favorite **StationCard** and the station detail page's **Arrivals**
component render the *same* scheduled-arrivals data (both call
`computeArrivalGroups` / `formatMinutesAway` from
`packages/shared/src/station-arrivals.ts`), but their typography diverges
sharply. On the station page each arrival is a tall two-line row with a 16px
bold headsign and a 24px countdown; on the dashboard card the same data is
crushed into a single 14px line with an 11px direction header. The user reports
the card "seems much smaller than its sister component on the station page" and
asked for **full visual parity** in the expanded density mode, plus a **slight
bump** to the compact density mode.

Reference (station page, the parity target):
`apps/web/app/components/Arrivals.tsx:215-270`.

## Scope

In scope: the per-row and direction-header typography/layout of
`ArrivalsBody` inside `StationCard.tsx` (both density modes).

Out of scope (intentional — not what the user asked for):
- The outer "Scheduled arrivals — estimates based on CTA timetable" banner from
  `Arrivals.tsx:172-180`. The card is a compact widget; we match the arrival
  rows, not add an explanatory header.
- Per-row deep links to Metra train pages (`Arrivals.tsx:249-260`). The card
  row sits inside a `@dnd-kit` draggable `<li>` that already links to the
  station; nested links would fight the drag sensor. Leave row linking as-is.

## Changes

### 1. `apps/web/app/components/dashboard/cards/StationCard.tsx`

**Expanded density** (`ArrivalsBody`, currently lines 191-218) — replace the
single-line row with the station page's two-line layout:

- **Direction header** (currently line 197,
  `bg-gray-100 px-4 py-1 text-[11px] font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200`,
  text `Toward {g.headsign}`):
  change to match `Arrivals.tsx:218-219` —
  `bg-gray-600 px-4 py-2 dark:bg-gray-700` wrapper with an inner
  `text-sm font-semibold text-white` line reading `Service toward {g.headsign}`.

- **Arrival row** (currently lines 201-213): rebuild to mirror
  `Arrivals.tsx:223-266`:
  - Row container: `flex items-center justify-between border-t border-black/10 px-4 py-3`, keep `style={{ backgroundColor: bg }}`.
  - Left block (`<div>`):
    - `<p className="text-xs text-white/80">{g.line} Line · {item.label} to</p>`
    - `<p className="text-base leading-tight font-bold text-white">{g.headsign}</p>`
  - Right block: `<div className="flex shrink-0 items-center gap-2">`
    - `<span className="text-2xl font-bold text-white tabular-nums">{formatMinutesAway(item.minutesAway)}</span>`
    - `<span className="text-lg text-white/60" title="Scheduled estimate">≈</span>`
      (the `≈` correctly signals these are schedule estimates, matching the
      station page and satisfying the "verify against agency" intent — keep it).

  Reuse the existing `g`, `item`, `bg`, `formatMinutesAway` already in scope
  (lines 193-211); no new data wiring needed (`ArrivalItem.label` and
  `ArrivalGroup.headsign` confirmed in `station-arrivals.ts:5-21`).

- The wrapper `<div className="overflow-hidden rounded-b-lg border-t border-gray-100 dark:border-gray-700">` (line 192) stays — it keeps the body flush with the card's rounded bottom (`StationCard` mounts it via `-mx-4 mt-3 -mb-4`, lines 122-129).

**Compact density** (lines 166-189) — slight bump only, keep the one-line
layout: change the row `<li>` class from `flex items-center gap-2 text-sm`
(line 172) to `flex items-center gap-2 text-base`. No structural change.

### 2. `apps/web/__tests__/components/dashboard/cards/StationCard.test.tsx`

Update assertions to the new expanded structure (required by the
PostSourceFileEdit testing hook + `.claude/rules/testing.md`):
- Direction header text becomes `Service toward {headsign}` (was `Toward …`).
- Assert the headsign now renders as its own element and the countdown
  (`formatMinutesAway` output, e.g. via `data-testid="arrival-row"`) is present.
- Adjust/add a compact-mode assertion if it pins the old `text-sm` class.
- Keep existing `data-testid` hooks (`arrival-group`, `arrival-row`,
  `arrival-row-compact`, `arrivals-skeleton`) so other queries still pass.

## Verification

1. `cd apps/web && pnpm test -- StationCard` — updated suite green, zero warnings.
2. `pnpm -w run lint` and `pnpm -w run test` — fully clean (CI parity).
3. `pnpm run:web`, sign in, add a station favorite. On the dashboard:
   - Expanded card: rows now show the bold ~16px headsign and ~24px countdown,
     visually matching a station detail page opened side-by-side
     (`/cta/<line>/<station>` or `/metra/<line>/<station>`).
   - Toggle the favorite to compact density via the ⋯ menu: one-line rows are
     a touch larger (`text-base`) but layout unchanged.
   - Check 375px / 768px / 1280px widths — the taller card must not overflow
     its grid cell or clip text (responsive rule in `.claude/rules/code-style.md`).
   - Verify light and dark mode (direction header now uses the dark
     `bg-gray-600/700` band like the station page).

## Critical files

- `apps/web/app/components/dashboard/cards/StationCard.tsx` (edit — `ArrivalsBody`)
- `apps/web/app/components/Arrivals.tsx` (read-only reference, lines 215-270)
- `apps/web/__tests__/components/dashboard/cards/StationCard.test.tsx` (edit)
- `packages/shared/src/station-arrivals.ts` (read-only — `ArrivalItem`/`ArrivalGroup`)
