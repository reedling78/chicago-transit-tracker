# Mobile ArrivalsCard Component

## Context

The web app's CTA/Metra station detail pages display an "Arrivals" module showing upcoming scheduled departures grouped by direction, with line-colored rows, departure times, and "minutes away" countdowns. The mobile app currently only shows a raw schedule table (all times for all day types). This plan adds an equivalent `ArrivalsCard` component to the mobile app so users see the same at-a-glance upcoming departures view.

The web component is at `apps/web/app/components/Arrivals.tsx`. It computes arrivals from static GTFS schedule data (not real-time CTA API), recomputes every 60 seconds, and groups results by direction.

---

## Step 1: Create `ArrivalsCard` component

**New file:** `apps/mobile/components/ArrivalsCard.tsx`

Port the web `Arrivals.tsx` logic to React Native:

### Props
```typescript
interface ArrivalsCardProps {
  schedule: StationSchedule | null
  service: 'cta' | 'metra'
  loading?: boolean
}
```

### Pure helper functions (ported from web)
- `getCurrentDayType()` — returns `'weekday' | 'saturday' | 'sunday'`
- `getCurrentMinutes()` — `hours * 60 + minutes`
- `formatTime(minutes)` — 12-hour format string (same logic as `ScheduleTable.tsx`)
- `formatMinutesAway(minutesAway)` — "Due" / "N min" / "Nh Mm"
- `computeArrivals(schedule)` — filters each direction's day-type times for next 3 upcoming departures, calculates `minutesAway`, sorts by headsign then time

### Differences from web
- No Metra trip linking (no `tripId`/`lineSlug` in `Arrival` interface, no `StationTrips` fetch)
- Schedule passed as prop (already fetched by parent via `useSchedule` hook)
- Uses `Ionicons` train icon from `@expo/vector-icons` instead of inline SVG
- React Native `View`/`Text`/`StyleSheet` instead of HTML/Tailwind

### Component behavior
- `useEffect` computes arrivals when `schedule` changes
- `useEffect` with `setInterval(60_000)` recomputes from cached schedule via `useRef`
- Groups arrivals by headsign for section rendering

### Render structure
1. **Outer container** — `borderRadius: 12`, `overflow: 'hidden'`, border `#374151`
2. **Header bar** — dark bg (`#1f2937`), train icon + "Scheduled arrivals — estimates based on {CTA/Metra} timetable"
3. **Loading skeleton** — placeholder bars mimicking direction headers + rows
4. **Empty state** — "No upcoming departures found."
5. **Grouped arrivals** — per direction:
   - Direction header: dark gray bg (`#374151`), "Service toward {headsign}"
   - Arrival rows: `LINE_COLORS[line].bg` background, left side shows "{Line} Line · {time} to" + bold headsign, right side shows bold minutes + "≈" indicator

### Style palette (matches existing mobile dark theme)
- Background colors: `#1f2937`, `#374151` (direction headers)
- Row backgrounds: from `LINE_COLORS` via `@ctt/shared`
- Text: `#fff`, `rgba(255,255,255,0.8)`, `rgba(255,255,255,0.6)`

---

## Step 2: Integrate into CTA station detail

**File:** `apps/mobile/app/(tabs)/cta/station/[station].tsx`

- Import `ArrivalsCard`
- Insert `<ArrivalsCard schedule={schedule} service="cta" loading={scheduleLoading} />` between `</PageHeader>` and the Amenities section
- No new hooks needed — `useSchedule` already provides the data

---

## Step 3: Integrate into Metra station detail

**File:** `apps/mobile/app/(tabs)/metra/station/[station].tsx`

- Same pattern as Step 2 with `service="metra"`

---

## Step 4: Write tests

**New file:** `apps/mobile/__tests__/components/ArrivalsCard.test.tsx`

Using `@testing-library/react-native`, `jest.useFakeTimers()`, and `jest.setSystemTime()` to control time:

1. Renders header with "CTA timetable" when `service="cta"`
2. Renders header with "Metra timetable" when `service="metra"`
3. Shows loading skeleton when `loading={true}`
4. Shows "No upcoming departures found." when no upcoming arrivals (time past all scheduled)
5. Renders direction headers "Service toward Howard" / "Service toward 95th/Dan Ryan"
6. Renders arrival rows with line name and formatted times
7. Shows correct `minutesAway` values
8. Handles null schedule gracefully
9. Snapshot test

Uses `mockSchedule` from existing `__tests__/fixtures.ts`.

**Update:** `apps/mobile/__tests__/screens/cta-station.test.tsx` — verify ArrivalsCard appears when schedule loads
**Update:** `apps/mobile/__tests__/screens/metra-station.test.tsx` — same

---

## Critical files

| File | Action |
|------|--------|
| `apps/mobile/components/ArrivalsCard.tsx` | Create |
| `apps/mobile/app/(tabs)/cta/station/[station].tsx` | Edit |
| `apps/mobile/app/(tabs)/metra/station/[station].tsx` | Edit |
| `apps/mobile/__tests__/components/ArrivalsCard.test.tsx` | Create |
| `apps/mobile/__tests__/screens/cta-station.test.tsx` | Edit |
| `apps/mobile/__tests__/screens/metra-station.test.tsx` | Edit |

### Reference files (read-only)
- `apps/web/app/components/Arrivals.tsx` — source to port from
- `apps/mobile/components/ScheduleTable.tsx` — existing RN patterns
- `apps/mobile/__tests__/fixtures.ts` — `mockSchedule` fixture
- `packages/shared/src/gtfs-types.ts` — `StationSchedule` type
- `packages/shared/src/constants.ts` — `LINE_COLORS`

---

## Verification

1. `cd apps/mobile && pnpm test` — all tests pass with zero warnings
2. `cd apps/mobile && pnpm run lint` — clean
3. Run on iOS simulator (`pnpm run:ios`) and navigate to a CTA station (e.g., Clark/Lake) — verify ArrivalsCard renders with upcoming departures grouped by direction
4. Navigate to a Metra station (e.g., Aurora) — verify same component works with Metra data
5. Wait 60+ seconds on screen — verify minutes count down
