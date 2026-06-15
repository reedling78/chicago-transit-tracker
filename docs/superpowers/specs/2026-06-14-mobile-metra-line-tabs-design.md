# Mobile Metra line screen — Live / Stations tabs

**Date:** 2026-06-14
**Status:** Approved (pending spec review)
**Platform:** Mobile only (`apps/mobile/`)

## Problem

The mobile Metra line detail screen (`apps/mobile/app/(app)/metra/[line]/index.tsx`)
currently stacks two distinct sections in a single scroll view: the live
**Current service** component (`MetraCurrentService`) and the full **station list**
(`StationTimeline`). On a long line the station list pushes the live panel far up
the page, and there is no quick way to jump between "what's running now" and "where
does this line stop."

## Goal

Split the existing line-detail content into two switchable tabs beneath the hero:

- **Live** — the active-trains panel (`MetraCurrentService`), shown by default
- **Stations** — the ordered station list (`StationTimeline`)

No change to *what data* is displayed or *how it is fetched* — the two sections that
exist today simply become switchable tabs instead of being stacked.

## Out of scope

- The CTA line screen (`apps/mobile/app/(app)/cta/[line].tsx`) is unchanged. It has
  no live-service section, so tabs would add nothing there.
- Alerts. The original ask mentioned an Alerts tab; that was dropped. Service alerts
  continue to live on the dedicated `/metra/alerts` screen, unchanged.
- The web app. This is a mobile-only change.

## Layout

A single `ScrollView` with three children, in order:

1. `PageHeader` hero (unchanged props)
2. The tab bar (`LineTabs`) — **sticky** (`stickyHeaderIndices={[1]}`)
3. The active tab's content

```
ScrollView (stickyHeaderIndices={[1]})
├─ PageHeader               (index 0 — scrolls away under the nav header)
├─ LineTabs  Live | Stations  (index 1 — pins to top once scrolled past the hero)
└─ activeTab === 'live'
     ? <MetraCurrentService />
     : <StationTimeline />   (index 2)
```

### Sticky behavior

When the user scrolls a long station list, the hero scrolls away under the
navigation header but the tab bar pins to the top, so tabs are always reachable.
The sticky element must be fully opaque: its wrapper `View` gets a
`bg.canvas` background and vertical padding so list rows do not show through when
pinned.

### Conditional mount (only poll when visible)

The inactive tab is **unmounted**, not hidden:

- When `activeTab === 'live'`, only `MetraCurrentService` is rendered.
- When `activeTab === 'stations'`, only `StationTimeline` is rendered.

Because `MetraCurrentService` owns the 30s realtime polling (`useMetraFeed` for
`tripupdates` + `positions`), unmounting it on the Stations tab stops the polling
and the `setInterval` "now" tick. Returning to Live remounts it and triggers a
fresh fetch. This trades a fetch-on-return for no background network/battery use.

## Components

### New: `apps/mobile/components/LineTabs.tsx`

A small, generic, presentational segmented control. No Metra-specific knowledge.

```ts
interface LineTab {
  key: string
  label: string
}

interface LineTabsProps {
  tabs: LineTab[]
  activeKey: string
  onChange: (key: string) => void
}
```

- Renders a horizontal row of equal-width (`flex: 1`) `Pressable` segments.
- Styled to match the existing `ToggleRow` inside `TimetableFilterBar`: rounded
  outer border (`border.subtle`), `overflow: 'hidden'`, the active segment filled
  with `bg.surface` and `text.primary`, inactive segments `text.secondary`.
- Uses the `useTheme()` + `makeStyles(theme)` + `useMemo` pattern like the rest of
  `apps/mobile/components/`.
- Each segment is a ≥44px touch target, `accessibilityRole="tab"`,
  `accessibilityState={{ selected }}`.

### Changed: `apps/mobile/app/(app)/metra/[line]/index.tsx`

- Add `const [activeTab, setActiveTab] = useState<'live' | 'stations'>('live')`.
- Add `stickyHeaderIndices={[1]}` to the `ScrollView`.
- Render `<LineTabs>` as the second child (wrapped in an opaque `bg.canvas` view).
- Replace the always-rendered `MetraCurrentService` + `StationTimeline` pair with a
  conditional render keyed on `activeTab`. The existing `stationsLoading` spinner
  handling stays inside the Stations branch.
- All existing data hooks (`useLine`, `useLineStations`, `useMetraLineTrips`) and
  the `useTrackOpenedOnce` call are unchanged.

## Testing

- **New** `apps/mobile/__tests__/components/LineTabs.test.tsx`:
  - renders all provided tab labels
  - the active tab reflects `activeKey` (selected accessibility state / active style)
  - pressing an inactive tab calls `onChange` with that tab's key
- **Metra line screen:** if a test already exists for the screen, extend it to
  assert Live content shows by default and tapping "Stations" swaps to the station
  list (and vice versa). If none exists, add a focused test for the tab swap. Mock
  the data hooks per existing mobile test conventions.
- `pnpm test:mobile` and `pnpm lint:mobile` must pass clean.

## Risks / notes

- **Sticky header opacity** is the main visual gotcha — without an opaque wrapper
  background the pinned tab bar will let scrolled content bleed through. Covered above.
- Switching tabs while scrolled down keeps the `ScrollView` offset; with a sticky
  tab bar pinned at top this reads naturally (the tab bar is already at the top edge).
- No analytics event for tab switches (YAGNI). `line_opened` tracking is unchanged.
```
