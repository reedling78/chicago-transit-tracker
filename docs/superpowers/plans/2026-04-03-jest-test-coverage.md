# Jest Test Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend Jest + RTL coverage from 2 test files to all 16 components and all 7 pages, with snapshot tests throughout and two new npm scripts (`test:coverage`, `test:snapshots`).

**Architecture:** Test files live in `__tests__/components/` and `__tests__/pages/`. A shared `__tests__/fixtures.ts` file provides `mockLine`, `mockMetraLine`, `mockStation`, and `mockMetraStation` objects that satisfy the full `Line` and `Station` TypeScript interfaces. Pages are async server components — they can be awaited directly in tests and rendered with RTL.

**Tech Stack:** Jest 30, React Testing Library 16, jsdom, TypeScript, nextJest (Next.js 16 Jest adapter)

---

## File Map

### New files

| File                                             | Purpose                                         |
| ------------------------------------------------ | ----------------------------------------------- |
| `__tests__/fixtures.ts`                          | Shared mock data for all tests                  |
| `__tests__/components/ThemeToggle.test.tsx`      | Unit + snapshot                                 |
| `__tests__/components/PageHeader.test.tsx`       | Unit + snapshot                                 |
| `__tests__/components/Breadcrumb.test.tsx`       | Unit + snapshot                                 |
| `__tests__/components/Hero.test.tsx`             | Unit + snapshot                                 |
| `__tests__/components/LinkCard.test.tsx`         | Unit + snapshot                                 |
| `__tests__/components/Footer.test.tsx`           | Unit + snapshot                                 |
| `__tests__/components/CTALineIcon.test.tsx`      | Unit + snapshot                                 |
| `__tests__/components/LineDetail.test.tsx`       | Unit + snapshot                                 |
| `__tests__/components/StationDetail.test.tsx`    | Unit + snapshot                                 |
| `__tests__/components/StationList.test.tsx`      | Unit + snapshot                                 |
| `__tests__/components/Arrivals.test.tsx`         | Unit + snapshot (fetch mock + fixed Date)       |
| `__tests__/components/StationTimetable.test.tsx` | Unit + snapshot                                 |
| `__tests__/components/StationMap.test.tsx`       | Render test (MapLibre mock)                     |
| `__tests__/components/Analytics.test.tsx`        | Render test                                     |
| `__tests__/pages/home.test.tsx`                  | Snapshot                                        |
| `__tests__/pages/cta-list.test.tsx`              | Snapshot (mocks transit.ts)                     |
| `__tests__/pages/metra-list.test.tsx`            | Snapshot (mocks transit.ts)                     |
| `__tests__/pages/cta-line.test.tsx`              | Snapshot (mocks transit.ts)                     |
| `__tests__/pages/metra-line.test.tsx`            | Snapshot (mocks transit.ts)                     |
| `__tests__/pages/cta-station.test.tsx`           | Snapshot (mocks transit.ts + client components) |
| `__tests__/pages/metra-station.test.tsx`         | Snapshot (mocks transit.ts + client components) |

### Modified files

| File             | Change                                                   |
| ---------------- | -------------------------------------------------------- |
| `package.json`   | Added `test:coverage` and `test:snapshots` scripts       |
| `jest.config.ts` | Added `collectCoverageFrom` and `testPathIgnorePatterns` |

---

## Critical Gotchas (Learned During Implementation)

### 1. `jest.mock()` with `@/` alias fails for modules with firebase-admin deps

`jest.mock('@/app/lib/transit', factory)` throws "Cannot find module" even though the `@/` alias works for regular imports. Root cause: `transit.ts` imports `firebase-admin`, and Jest's module resolver encounters an error when it tries to resolve the path at mock-registration time.

**Fix:** Use relative paths in ALL `jest.mock()` calls in `__tests__/pages/`:

```ts
// ❌ Breaks
jest.mock('@/app/lib/transit', () => ({ ... }))

// ✅ Works — relative from __tests__/pages/
jest.mock('../../app/lib/transit', () => ({ ... }))
```

This also applies to `await import(...)` calls inside tests and to mocking async-fetching components:

```ts
jest.mock('../../app/components/Arrivals', () => () => null)
jest.mock('../../app/components/StationTimetable', () => () => null)
```

### 2. `__tests__/fixtures.ts` is treated as a test suite

Jest discovers everything in `__tests__/` and fails files with no tests. Add to `jest.config.ts`:

```ts
testPathIgnorePatterns: ['/node_modules/', '<rootDir>/__tests__/fixtures.ts'],
```

### 3. RTL's `render()` flushes `useEffect` synchronously

`render()` is wrapped in `act()`, so `useEffect` runs before the first assertion. The ThemeToggle component has a mount-guard (`if (!mounted) return <div />`) but it fires immediately in tests. Remove any test that asserts the pre-mount state.

### 4. `getByText` fails when a value appears multiple times in the DOM

The Metra line fixture has `termini: ['Union Station', 'Aurora']` and `downtownTerminal: 'Union Station'`. Both render in `LineDetail`, causing `getByText('Union Station')` to throw. Same issue for "Terminal" (appears as a badge AND a column label in StationList) and "Aurora" (appears in both termini and station list on the line page).

**Fix:** Use `getAllByText(value).length).toBeGreaterThanOrEqual(1)` when a value legitimately appears more than once.

### 5. Arrivals component snapshots are time-dependent

`computeArrivals()` uses `new Date()` internally, so "2 min", "4:00 PM" etc. change every minute. Fake only the `Date` API without faking `setTimeout`/`setInterval` (which would break `waitFor`'s internal polling):

```ts
beforeAll(() => {
  jest.useFakeTimers({
    doNotFake: [
      'setTimeout',
      'clearTimeout',
      'setInterval',
      'clearInterval',
      'setImmediate',
      'clearImmediate',
      'nextTick',
      'queueMicrotask',
    ],
    now: new Date('2024-01-15T07:00:00.000Z'), // Mon Jan 15 01:00 AM CST
  })
})
afterAll(() => {
  jest.useRealTimers()
})
```

### 6. `act()` warnings from async state updates in page tests

When station pages render `Arrivals` or `StationTimetable`, those components call `fetch` in `useEffect`. The fetch resolves after the test completes, triggering state updates outside `act()`. Fix: mock the async client components away in page-level tests since the page tests are checking page structure, not component behavior:

```ts
jest.mock('../../app/components/Arrivals', () => () => null)
jest.mock('../../app/components/StationTimetable', () => () => null)
```

### 7. Tests that check initial state but use a resolving fetch cause `act()` warnings

If a test only checks the header (not the loaded state) but `global.fetch` is mocked to resolve, the fetch completes after the test assertion runs, causing an `act()` warning. Fix: use a never-resolving mock for tests that only care about the loading/initial state:

```ts
global.fetch = jest.fn().mockImplementation(() => new Promise(() => {})) as jest.Mock
```

### 8. MapLibre requires a `MutationObserver` stub

jsdom doesn't include `MutationObserver`. Add before any test file that renders `StationMap` (or any page that includes it):

```ts
global.MutationObserver = class {
  observe() {}
  disconnect() {}
  takeRecords() {
    return []
  }
} as unknown as typeof MutationObserver
```

---

## Key Patterns

### Fixture data (`__tests__/fixtures.ts`)

Must satisfy the full `Line` and `Station` interfaces from `app/lib/types.ts`. Excluded from Jest test discovery via `testPathIgnorePatterns`.

```ts
import type { Line, Station } from '@/app/lib/types'

export const mockLine: Line = {
  id: 'red',
  name: 'Red Line',
  shortName: 'Red',
  slug: 'red',
  service: 'cta',
  color: '#c60c30',
  textColor: '#ffffff',
  termini: ['Howard', '95th/Dan Ryan'],
  stationCount: 33,
  routeMiles: 23.0,
  operatesOvernight: true,
  type: 'rapid_transit',
  peakFrequencyMins: 3,
  offPeakFrequencyMins: 8,
  firstTrainApprox: '4:00 AM',
  lastTrainApprox: '1:00 AM',
  description: 'The busiest CTA line, running north–south through downtown.',
  ctaRouteId: 'Red',
  metraLineCode: null,
  downtownTerminal: null,
  operator: null,
  countiesServed: [],
  photoUrl: null,
  scheduleUrl: null,
}

export const mockMetraLine: Line = {
  id: 'bnsf',
  name: 'BNSF Railway',
  shortName: 'BNSF',
  slug: 'bnsf',
  service: 'metra',
  color: '#1A3D7A',
  textColor: '#ffffff',
  termini: ['Union Station', 'Aurora'],
  stationCount: 24,
  routeMiles: 37.0,
  operatesOvernight: false,
  type: 'commuter_rail',
  peakFrequencyMins: null,
  offPeakFrequencyMins: null,
  firstTrainApprox: '5:00 AM',
  lastTrainApprox: '11:30 PM',
  description: 'Metra BNSF line connecting Union Station to Aurora.',
  ctaRouteId: null,
  metraLineCode: 'BNSF',
  downtownTerminal: 'Union Station',
  operator: 'BNSF Railway',
  countiesServed: ['Cook', 'DuPage'],
  photoUrl: null,
  scheduleUrl: null,
}

export const mockStation: Station = {
  id: 'clark-lake',
  name: 'Clark/Lake',
  slug: 'clark-lake',
  address: '100 W Lake St, Chicago, IL',
  municipality: 'Chicago',
  location: { latitude: 41.8857, longitude: -87.6318 },
  service: 'cta',
  lines: ['Red', 'Blue', 'Green', 'Brown', 'Purple', 'Pink', 'Orange'],
  hours: { weekday: '24 hours', saturday: '24 hours', sunday: '24 hours' },
  open24Hours: true,
  terminal: false,
  parking: false,
  stationType: 'subway',
  accessibility: { ada: true, elevator: true, escalator: true },
  amenities: ['fare_vending', 'seating'],
  ctaStopId: 30074,
  ctaMapId: 40380,
  metraStopId: null,
  photoUrl: null,
  wikipediaUrl: null,
  metraLink: null,
  lineOrder: { Red: 12, Blue: 5 },
}

export const mockMetraStation: Station = {
  id: 'aurora',
  name: 'Aurora',
  slug: 'aurora',
  address: '233 N Broadway, Aurora, IL',
  municipality: 'Aurora',
  location: { latitude: 41.7606, longitude: -88.3201 },
  service: 'metra',
  lines: ['BNSF'],
  hours: null,
  open24Hours: false,
  terminal: true,
  parking: true,
  stationType: 'commuter_rail',
  accessibility: { ada: true, elevator: false, escalator: false },
  amenities: ['parking'],
  ctaStopId: null,
  ctaMapId: null,
  metraStopId: 'AURORA',
  photoUrl: null,
  wikipediaUrl: null,
  metraLink: 'https://metra.com/stations/aurora',
  lineOrder: { BNSF: 24 },
}
```

### Async page component pattern

Pages are async server components. Await the function call, then render the JSX:

```tsx
import CTALinePage from '@/app/cta/[line]/page'

jest.mock('../../app/lib/transit', () => ({
  getLinesForService: jest.fn().mockResolvedValue([mockLine]),
  getLine: jest.fn().mockResolvedValue(mockLine),
  getStationsForLine: jest.fn().mockResolvedValue([mockStation]),
}))

const params = Promise.resolve({ line: 'red' })

it('renders the line name heading', async () => {
  const ui = await CTALinePage({ params })
  render(ui)
  expect(screen.getByRole('heading', { level: 1, name: 'Red Line' })).toBeInTheDocument()
})
```

### MapLibre mock

Required in any test that renders `StationMap` or a page that includes it:

```tsx
jest.mock('maplibre-gl', () => ({
  Map: jest.fn().mockImplementation(() => ({ remove: jest.fn(), setStyle: jest.fn() })),
  Marker: jest.fn().mockImplementation(() => ({
    setLngLat: jest.fn().mockReturnThis(),
    setPopup: jest.fn().mockReturnThis(),
    addTo: jest.fn().mockReturnThis(),
  })),
  Popup: jest.fn().mockImplementation(() => ({ setHTML: jest.fn().mockReturnThis() })),
}))

global.MutationObserver = class {
  observe() {}
  disconnect() {}
  takeRecords() {
    return []
  }
} as unknown as typeof MutationObserver
```

### `jest.config.ts` final state

```ts
const config: Config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/__tests__/fixtures.ts'],
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    '!app/**/*.d.ts',
    '!app/lib/firebase-admin.ts',
    '!app/lib/transit.ts',
  ],
}
```

---

## Verification

```bash
npm test                  # 137 tests, 23 suites, 24 snapshots — all pass, no act() warnings
npm run test:coverage     # coverage report in coverage/
npm run test:snapshots    # update snapshots after intentional UI changes
```

Snapshot files live in `__tests__/**/__snapshots__/`. Commit them alongside test files — they are the regression baseline. Run `npm run test:snapshots` after any intentional UI change.
