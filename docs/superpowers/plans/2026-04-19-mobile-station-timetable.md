# Mobile Station Timetable Component

## Context

The mobile app's station detail pages currently use a basic `ScheduleTable` component that dumps all schedule data in a flat layout — all directions and all service types stacked vertically, with times shown as small chips (capped at 12 per group). There's no filtering, no tabs, and no interactivity.

The web app has a much richer timetable experience:
- **CTA stations** use an `Arrivals` component showing upcoming departures with minutes-away countdown
- **Metra stations** use a `StationTimetable` component with direction filters (All/Inbound/Outbound), service type tabs (Weekday/Saturday/Sunday), and individual trip rows showing departure time, destination, and train number

The goal is to rebuild the mobile schedule display to match the web's look, feel, and functionality — giving users the same filtering and browsing experience on mobile.

## Approach

Create two focused timetable components (CTA and Metra) that share a common filter bar, replacing the single `ScheduleTable`. The split is necessary because the data shapes differ: CTA uses `StationSchedule` (minutes-since-midnight arrays), while Metra can use the richer `StationTrips` data (individual trip entries with train numbers and formatted times).

## Files to Modify/Create

| Action | File | Purpose |
|--------|------|---------|
| Create | `apps/mobile/components/TimetableFilterBar.tsx` | Shared direction + service type filter bar |
| Create | `apps/mobile/components/CTAScheduleTable.tsx` | CTA timetable with tabs and direction filtering |
| Create | `apps/mobile/components/MetraTimetable.tsx` | Metra timetable matching web's StationTimetable |
| Modify | `apps/mobile/lib/hooks.ts` | Add `useStationTrips` hook |
| Modify | `apps/mobile/app/(tabs)/cta/station/[station].tsx` | Use new `CTAScheduleTable` |
| Modify | `apps/mobile/app/(tabs)/metra/station/[station].tsx` | Use new `MetraTimetable` + `useStationTrips` |
| Delete | `apps/mobile/components/ScheduleTable.tsx` | No longer needed |
| Rewrite | `apps/mobile/__tests__/components/ScheduleTable.test.tsx` | Replace with tests for new components |

## Implementation Steps

### Step 1: Add `useStationTrips` hook

**File:** `apps/mobile/lib/hooks.ts`

Add a new hook following the existing `useSchedule` pattern. Reads from the `metra-station-trips` Firestore collection. Returns `{ stationTrips: StationTrips | null, loading: boolean }`.

Import `StationTrips` from `@ctt/shared` (already exported).

### Step 2: Create `TimetableFilterBar`

**File:** `apps/mobile/components/TimetableFilterBar.tsx`

Shared sub-component rendering two rows of toggle buttons:
- **Direction filter:** Configurable labels (e.g., All/Inbound/Outbound for Metra, or direction headsigns for CTA)
- **Service type tabs:** Weekday / Saturday / Sunday

Includes a `todayServiceType()` helper (same logic as web: `getDay()` → weekday/saturday/sunday).

Styling: horizontal button rows with rounded container, active button gets highlighted background (`#2a2a4a`), inactive gets muted text. Matches the dark theme (`#1a1a2e` backgrounds, `#333` borders).

### Step 3: Create `CTAScheduleTable`

**File:** `apps/mobile/components/CTAScheduleTable.tsx`

Props: `{ schedule: StationSchedule }`

State: `serviceType` (auto-detected), `directionIndex` (`'all'` or index)

Behavior:
- Renders `TimetableFilterBar` with directions derived from `schedule.directions` headsigns
- Shows time rows for selected service type, filtered by direction
- When "All" is selected, merge and sort times from all directions chronologically, labeling each row with its headsign
- Each row: `[ 5:30 AM ]  [ To Howard ]`
- Reuse the existing `formatTime()` helper (minutes → 12-hour AM/PM)
- Empty state: "No {service type} service at this station."
- No truncation — tabs filter by service type so lists are manageable

### Step 4: Create `MetraTimetable`

**File:** `apps/mobile/components/MetraTimetable.tsx`

Props: `{ stationTrips: StationTrips }`

State: `serviceType` (auto-detected), `direction` (`'all' | 'inbound' | 'outbound'`)

Behavior:
- Renders `TimetableFilterBar` with fixed All/Inbound/Outbound options
- Filters `stationTrips[serviceType]` by `directionId` (0=outbound, 1=inbound)
- Each row shows: departure time | "To {headsign}" | "Train {trainNumber}"
- Rows are plain `View`s (no navigation — mobile doesn't have train detail pages yet)
- Empty state: "No {service type} service at this station."

Matches web `StationTimetable` layout: departure time left-aligned, headsign fills middle, train number right-aligned.

### Step 5: Update station pages

**CTA** (`apps/mobile/app/(tabs)/cta/station/[station].tsx`):
- Replace `ScheduleTable` import with `CTAScheduleTable`
- Keep `useSchedule` hook as-is

**Metra** (`apps/mobile/app/(tabs)/metra/station/[station].tsx`):
- Replace `useSchedule` with `useStationTrips`
- Replace `ScheduleTable` import with `MetraTimetable`
- Update section title from "Schedule" to "Timetable"

### Step 6: Delete old component

Remove `apps/mobile/components/ScheduleTable.tsx` — no longer imported anywhere.

### Step 7: Update tests

Replace `apps/mobile/__tests__/components/ScheduleTable.test.tsx` with tests for the new components:
- `CTAScheduleTable.test.tsx` — service type tabs, direction filtering, time formatting, empty states
- `MetraTimetable.test.tsx` — service type tabs, direction filtering, trip row rendering, empty states
- `TimetableFilterBar.test.tsx` — button rendering, active state, callback invocations
- Delete old snapshot file

## Key Reuse Points

- **Types:** `StationSchedule`, `DirectionSchedule`, `StationTrips`, `StationTripEntry`, `ServiceType` — all from `@ctt/shared`
- **`formatTime()` helper** from current `ScheduleTable.tsx` — extract to shared or inline in `CTAScheduleTable`
- **`todayServiceType()` logic** — same as web's `StationTimetable.tsx:37-42`
- **Hook pattern** — `useStationTrips` follows exact pattern of existing `useSchedule` in `hooks.ts`
- **Dark theme palette** — `#0f0f23` (page bg), `#1a1a2e` (card bg), `#252540` (dividers), consistent with existing mobile components

## Verification

1. Run `pnpm test:mobile` — all new and existing tests pass
2. Run `pnpm lint:mobile` — no lint errors
3. Launch iOS simulator (`pnpm run:ios`):
   - Navigate to a CTA station → verify tabs switch service types, direction filter works, times display correctly
   - Navigate to a Metra station → verify tabs, direction filter, trip rows with train numbers
   - Verify auto-detection of current day's service type on load
   - Check empty state messaging (e.g., a station with no Sunday service)
