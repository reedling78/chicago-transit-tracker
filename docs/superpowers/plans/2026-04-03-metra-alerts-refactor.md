# Plan: Refactor MetraAlerts Component

## Context

The `MetraAlerts` component (`app/components/MetraAlerts.tsx`) is currently a debug stub that fetches Metra GTFS Realtime alerts, logs them to console, and shows an entity count. The user wants it refactored into a polished, card-based UI with line filtering.

**Goal:** Transform the debug component into a production-quality alerts feed with filter-by-line chips and modern card design, supporting dark mode.

---

## Files to Modify

| File                             | Change                                                                |
| -------------------------------- | --------------------------------------------------------------------- |
| `app/components/MetraAlerts.tsx` | Full rewrite                                                          |
| `app/page.tsx`                   | Layout adjustment — MetraAlerts becomes full-width, out of debug grid |

**Read-only references:**

- `app/components/StationDetail.tsx` — import `LINE_COLORS`
- `app/lib/metra-realtime.ts` — `fetchMetraFeed` API

---

## Implementation

### Step 1: Rewrite `MetraAlerts.tsx`

**State:**

- Keep existing `data`, `loading`, `error` states
- Add `selectedLine: string | 'all'` (default `'all'`)

**Route ID mapping** (module-level const, not exported):

```ts
const METRA_LINE_NAMES: Record<string, string> = {
  BNSF: 'BNSF Railway',
  'UP-N': 'Union Pacific North',
  'UP-NW': 'Union Pacific Northwest',
  'UP-W': 'Union Pacific West',
  'MD-N': 'Milwaukee District North',
  'MD-W': 'Milwaukee District West',
  RI: 'Rock Island',
  SWS: 'SouthWest Service',
  HC: 'Heritage Corridor',
  ME: 'Metra Electric',
  NCS: 'North Central Service',
}
```

**Filtering logic:**

- Derive `activeRoutes` from live data using `useMemo` (only show routes with active alerts)
- Filter with `.some()` on `informedEntity` to handle multi-route alerts
- Alerts without a `routeId` only show under "All"

**Filter UI — horizontal chip row:**

- "All" chip + one chip per active route
- Selected chip uses `LINE_COLORS[routeId]` background color
- Unselected chips: neutral border style
- Route ID as label, full name as `title` tooltip

**Alert cards — 2-column responsive grid:**

- Left border accent colored by line (`border-l-4` with inline `borderLeftColor`)
- Line badge (colored pill) + friendly line name
- Header text (semibold)
- Description text
- "More info" link to Metra URL
- Multi-route alerts show all affected route badges
- `hover:shadow-md` transition

**States:**

- **Loading**: 3 skeleton cards with `animate-pulse`
- **Error**: Red-accented card with error message + retry button
- **Empty (all)**: "No active alerts" with checkmark icon
- **Empty (filtered)**: "No alerts for [Line Name]" with "Show all" button

### Step 2: Update `app/page.tsx`

Move `MetraAlerts` out of the 3-col debug grid. Make it a full-width section above the remaining debug components. Adjust the debug grid to 2-col for MetraPositions and MetraTripUpdates.

---

## Verification

1. `npm run dev` — visually confirm cards render, filter chips work, dark mode looks correct
2. `npm run lint` — no lint errors
3. `npm test` — existing tests pass
4. `npm run build` — production build succeeds
