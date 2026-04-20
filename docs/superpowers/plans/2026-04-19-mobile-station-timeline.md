# Plan: Mobile Station Timeline Component

## Context

The mobile app's line detail pages (CTA and Metra) currently show stations as simple card rows with a small colored dot. The web app already has a proper timeline/steps layout in `StationList.tsx` — vertical bar, connected circles (hollow for regular stops, filled for terminals), transfer chips, and ADA icons. The goal is to bring the mobile station list up to match the web's timeline aesthetic.

No UI framework will be added — the component will be hand-built with React Native primitives, matching the pattern already established on web.

## Changes

### Step 1: Create `apps/mobile/components/StationTimeline.tsx`

New reusable component that mirrors the web's `StationList.tsx`. Props:

```typescript
interface StationTimelineProps {
  stations: Station[]
  lineColor: string
  stationHrefPrefix: string   // e.g. '/cta/station' or '/metra/station'
  currentLine: string         // short name, excluded from transfer chips
}
```

Visual design:
- **Vertical line**: Absolutely positioned colored bar (3px wide) running from first to last station dot, using `lineColor`
- **Station dots**: 
  - Terminal stations: filled circle (20px, `lineColor` background)
  - Regular stations: hollow circle (12px, `lineColor` border, `#0f0f23` fill to match app background)
  - Dots centered at left edge on the vertical line
- **Station name**: White, semibold, 16px — no municipality text
- **ADA icon**: Wheelchair SVG (via `react-native-svg`) next to station name, matching web's blue icon
- **Transfer chips**: Colored badges below station name using `LINE_COLORS` from `@ctt/shared` — same style as web (rounded, colored background, white/dark text)
- **Row**: Each station is a `Link`-wrapped `Pressable`, navigating to station detail
- **Separator**: Subtle bottom border between rows (matching `#1a1a2e` or similar dark border)
- Uses `ScrollView` (not `FlatList`) since the station list is rendered as a single connected timeline with an absolute-positioned vertical bar

### Step 2: Update `apps/mobile/app/cta/[line].tsx`

- Remove inline `FlatList` + `renderItem` logic
- Replace with `ScrollView` containing the header + `<StationTimeline>` component
- Pass `stationHrefPrefix="/cta/station"` and `currentLine={line.shortName}`

### Step 3: Update `apps/mobile/app/metra/[line].tsx`

- Same changes as CTA — replace `FlatList` with `ScrollView` + `<StationTimeline>`
- Pass `stationHrefPrefix="/metra/station"` and `currentLine={line.shortName}`

### Step 4: Write tests

- Create `apps/mobile/__tests__/components/StationTimeline.test.tsx`
- Test: renders station names, shows transfer chips for multi-line stations, shows ADA icon for accessible stations, distinguishes terminal vs regular dots, renders correct number of stations

## Files Modified

| File | Action |
|------|--------|
| `apps/mobile/components/StationTimeline.tsx` | **Create** |
| `apps/mobile/app/cta/[line].tsx` | **Modify** — replace FlatList with StationTimeline |
| `apps/mobile/app/metra/[line].tsx` | **Modify** — replace FlatList with StationTimeline |
| `apps/mobile/__tests__/components/StationTimeline.test.tsx` | **Create** |

## Reference files (read-only)

- `apps/web/app/components/StationList.tsx` — web timeline component to mirror
- `packages/shared/src/constants.ts` — `LINE_COLORS` for transfer chip colors
- `packages/shared/src/types.ts` — `Station` type definition

## Verification

1. Run `cd apps/mobile && pnpm test` — all tests pass
2. Run `cd apps/mobile && pnpm run lint` — no lint errors
3. Launch iOS simulator (`pnpm run:ios`) and verify:
   - Navigate to a CTA line (e.g. Blue Line) — see timeline with connected dots
   - Terminal stations (e.g. O'Hare, Forest Park) have filled circles
   - Transfer stations (e.g. Clark/Lake) show colored line chips
   - ADA-accessible stations show wheelchair icon
   - Tapping a station navigates to station detail
   - Navigate to a Metra line — same timeline behavior
