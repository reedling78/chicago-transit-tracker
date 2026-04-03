# Jest Test Coverage — Design Spec

## Problem

The Chicago Transit Tracker codebase had 2 test files covering only the Navbar and MobileMenuToggle components. There was no coverage of the remaining 14 components, any of the 7 pages, or the async data-fetching patterns used throughout the app. Regressions in component rendering, page structure, or CTA branding could go undetected.

## Goals

1. Establish a Jest + RTL test baseline across every component and page
2. Add snapshot tests so structural regressions are caught automatically
3. Surface the test suite as first-class npm scripts
4. Create a fixture system so test data doesn't drift out of sync with the `Line` and `Station` TypeScript interfaces

## Non-Goals

- Runtime integration tests against the live Firestore database
- End-to-end browser tests (Playwright, Cypress)
- Testing the Firebase Admin SDK or data seeding scripts
- Coverage targets (no enforced threshold — baseline coverage is the goal)

---

## Scope

### Components (16 total)

| Component          | Type   | Key Test Concerns                                                                                             |
| ------------------ | ------ | ------------------------------------------------------------------------------------------------------------- |
| `Navbar`           | Server | Site name link, CTA/Metra nav links                                                                           |
| `MobileMenuToggle` | Client | Toggle open/close, aria state                                                                                 |
| `ThemeToggle`      | Client | Button renders after mount, toggles aria-label, persists to localStorage                                      |
| `Hero`             | Server | H1 heading, CTA/Metra service links                                                                           |
| `PageHeader`       | Server | `title` as H1, optional `description`, optional `badges`, optional `children`                                 |
| `Breadcrumb`       | Server | All labels render, last item has `aria-current="page"`, intermediate items are links                          |
| `LinkCard`         | Server | Title, subtitle, meta, badge, href                                                                            |
| `Footer`           | Server | Site name, Terms of Use and Privacy links                                                                     |
| `CTALineIcon`      | Server | aria-label, background color, null for unknown line                                                           |
| `LineDetail`       | Server | Heading, station count, route miles, termini, overnight badge, schedule section                               |
| `StationDetail`    | Server | Address, municipality, ADA badge, elevator/escalator rows                                                     |
| `StationList`      | Server | Station count, station links, ADA icons, transfer chips                                                       |
| `Arrivals`         | Client | Empty when `hasSchedule: false`, header visible while loading, arrival rows after fetch resolves, error state |
| `StationTimetable` | Client | Header renders, fetch resolves to timetable data                                                              |
| `StationMap`       | Client | Renders map container, MapLibre constructor called with correct lat/lng                                       |
| `Analytics`        | Client | Renders without throwing                                                                                      |

### Pages (7 total)

| Page          | Route                     | Key Test Concerns                                                              |
| ------------- | ------------------------- | ------------------------------------------------------------------------------ |
| Home          | `/`                       | H1 heading, service cards render                                               |
| CTA Lines     | `/cta`                    | "CTA Lines" heading, line card renders                                         |
| Metra Lines   | `/metra`                  | "Metra Lines" heading, line card renders                                       |
| CTA Line      | `/cta/[line]`             | Line name heading, breadcrumb, station list                                    |
| Metra Line    | `/metra/[line]`           | Line name heading, breadcrumb, station list                                    |
| CTA Station   | `/cta/[line]/[station]`   | Station name heading, breadcrumb, address, "Station not found" fallback        |
| Metra Station | `/metra/[line]/[station]` | Station name heading, breadcrumb, Terminal badge, "Station not found" fallback |

---

## Design Decisions

### Shared fixture data

All tests share mock objects from `__tests__/fixtures.ts`. The objects fully satisfy the `Line` and `Station` TypeScript interfaces so tests don't need to cast or use partial types. Two variants of each:

- `mockLine` / `mockStation` — CTA (Red Line / Clark/Lake)
- `mockMetraLine` / `mockMetraStation` — Metra (BNSF Railway / Aurora)

The fixtures file is excluded from Jest's test discovery via `testPathIgnorePatterns` since it has no tests.

### Async server components

Next.js App Router pages are `async function` components. In Jest they can be awaited directly and the returned JSX rendered with RTL:

```ts
const ui = await CTALinePage({ params: Promise.resolve({ line: 'red' }) })
render(ui)
```

This works because Next.js has no runtime in jsdom — the component is just an async function that returns JSX.

### `jest.mock` path resolution

The `@/` alias works for regular imports in Jest (via `nextJest`'s moduleNameMapper) but fails in `jest.mock()` factory calls for modules that import `firebase-admin`. Use relative paths in all `jest.mock()` and dynamic `import()` calls inside `__tests__/pages/`:

```ts
// All page tests use:
jest.mock('../../app/lib/transit', () => ({ ... }))
jest.mock('../../app/components/Arrivals', () => () => null)
```

### Mocking async client components in page tests

`Arrivals` and `StationTimetable` call `fetch` in `useEffect`. When rendered as part of a page test, they fire async state updates after the synchronous test assertions complete, producing `act()` warnings. The fix: mock them to return `null` in the station page test files. The component behavior is tested separately in their own test files.

### Stable snapshots for time-dependent components

`Arrivals` computes arrival times relative to `new Date()`. Snapshots would fail every minute. Fix: use `jest.useFakeTimers` with `doNotFake` to freeze only `Date` while leaving `setTimeout`/`setInterval` real (so RTL's `waitFor` polling still works):

```ts
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
  now: new Date('2024-01-15T07:00:00.000Z'),
})
```

### MapLibre in jsdom

`maplibre-gl` requires a WebGL canvas. Mock the entire module and add a `MutationObserver` stub for any test that renders `StationMap` or a page containing it.

---

## npm Scripts

| Script           | Command                 | Purpose                                       |
| ---------------- | ----------------------- | --------------------------------------------- |
| `test`           | `jest`                  | Run all tests                                 |
| `test:watch`     | `jest --watch`          | Watch mode during development                 |
| `test:coverage`  | `jest --coverage`       | Generate coverage report in `coverage/`       |
| `test:snapshots` | `jest --updateSnapshot` | Update snapshots after intentional UI changes |

---

## Snapshot Strategy

- Every component and page has a `matches snapshot` test
- Snapshot files live in `__tests__/**/__snapshots__/` and are committed to the repo
- Snapshots are the regression baseline — run `npm run test:snapshots` after any intentional UI change, review the diff, then commit the updated snapshots
- Time-dependent output (Arrivals arrival times) is stabilized with a fixed fake Date so snapshots don't flap

---

## Out of Scope

- `app/lib/firebase-admin.ts` — server-only, excluded from coverage collection
- `app/lib/transit.ts` — Firestore data layer, excluded from coverage collection; mocked at the test boundary
- `app/sitemap.ts`, `app/robots.ts` — static config files, no component logic to test
