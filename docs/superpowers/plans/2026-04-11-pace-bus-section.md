# Pace Bus Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a static-only Pace Suburban Bus section at `/pace` — landing page, Pulse feature page, route detail, and stop detail — backed by a new Cloud Function that syncs Pace's static GTFS feed hourly into new Firestore collections.

**Architecture:** Five phased PRs that each ship independently. Phase 1 adds types and the data-access layer. Phase 2 adds the Cloud Function and parser. Phase 3 adds API routes. Phase 4 adds pages and components. Phase 5 wires the section into the home page Hero and global Navbar. All changes are strictly additive — no existing CTA or Metra code changes.

**Tech Stack:** Next.js 16 App Router (SSR), TypeScript 5 strict, Firebase Admin SDK, Firebase Cloud Functions 2nd gen, Jest 30, React Testing Library, Tailwind CSS v4. AdmZip + csv-parse for GTFS parsing. Firestore for derived data.

**Spec:** [docs/superpowers/specs/2026-04-11-pace-bus-section-design.md](../specs/2026-04-11-pace-bus-section-design.md)
**Research:** [docs/research/2026-04-11-pace-bus-developer-data.md](../../research/2026-04-11-pace-bus-developer-data.md)

---

## File Map

New files created by this plan (organized by phase):

**Phase 1 — Types and data layer:**
- Create: `app/lib/pace-types.ts` — `PaceRoute`, `PaceStop`, `PaceDirection` interfaces
- Create: `app/lib/pace.ts` — data-access helpers (`getAllPaceRoutes`, `getPaceRoute`, `getAllPaceStops`, `getPaceStop`, `getPaceRouteStops`)
- Modify: `__tests__/fixtures.ts` — add `mockPaceRoute`, `mockPacePulseRoute`, `mockPaceStop`
- Create: `__tests__/lib/pace.test.ts` — tests for the data-access layer

**Phase 2 — Cloud Function sync and parser:**
- Create: `functions/src/lib/parsers/pace-schedules.ts` — GTFS zip → Firestore document maps
- Modify: `functions/src/lib/change-detection.ts` — add `hasPaceFeedChanged` and `updatePaceMeta`
- Modify: `functions/src/index.ts` — wire up the new `syncPaceGtfs` scheduled function
- Create: `__tests__/functions/parsers/pace-schedules.test.ts` — parser tests with an in-memory GTFS zip fixture
- Modify: `__tests__/functions/change-detection.test.ts` — add Pace change detection tests

**Phase 3 — API routes:**
- Create: `app/api/pace/schedules/[slug]/route.ts` — reads `pace-schedules` from Firestore
- Create: `app/api/pace/route-stops/[route]/route.ts` — reads `pace-route-stops` from Firestore
- Create: `__tests__/api/pace-schedules.test.ts`
- Create: `__tests__/api/pace-route-stops.test.ts`

**Phase 4 — Pages and components:**
- Create: `app/components/PaceRouteChip.tsx` — colored route pill (server component)
- Create: `app/components/PaceBrowseList.tsx` — Pulse block + grouped regions (server component)
- Create: `app/components/PaceRouteSearch.tsx` — client-side filter input (client component)
- Create: `app/components/PaceScheduleTable.tsx` — day/direction tabs + schedule table (client component)
- Create: `app/pace/page.tsx` — Pace landing
- Create: `app/pace/pulse/page.tsx` — Pulse feature page
- Create: `app/pace/[route]/page.tsx` — route detail
- Create: `app/pace/[route]/[stop]/page.tsx` — stop detail
- Modify: `app/sitemap.ts` — append Pace route and stop entries
- Create: `__tests__/components/PaceRouteChip.test.tsx`
- Create: `__tests__/components/PaceBrowseList.test.tsx`
- Create: `__tests__/components/PaceRouteSearch.test.tsx`
- Create: `__tests__/components/PaceScheduleTable.test.tsx`
- Create: `__tests__/pages/pace-landing.test.tsx`
- Create: `__tests__/pages/pace-pulse.test.tsx`
- Create: `__tests__/pages/pace-route.test.tsx`
- Create: `__tests__/pages/pace-stop.test.tsx`

**Phase 5 — Home and Navbar integration:**
- Modify: `app/components/Hero.tsx` — change to a three-card grid
- Modify: `app/components/Navbar.tsx` — add Pace link
- Modify: `__tests__/components/Hero.test.tsx`
- Modify: `__tests__/components/Navbar.test.tsx`

---

## Conventions and Pre-flight Notes

**TDD discipline:** Every task writes the failing test first, runs it to confirm failure with the expected error, then implements the minimal code to pass. This is non-negotiable on this repo per CLAUDE.md and the PostSourceFileEdit hook.

**Commits:** At the end of each task, commit with a conventional commit message. Keep commits small — one focused change per commit. Pre-commit hooks run linting and type-checking; if they fail, fix the underlying issue and create a NEW commit.

**Test commands:**
- Single test file: `npm test -- __tests__/lib/pace.test.ts`
- Watch mode: `npm run test:watch`
- Full suite + lint before each PR: `npm test && npm run lint`

**Data-access pattern reference** — `app/lib/transit.ts` is the canonical example for how to read Firestore collections at build time with `cache()` wrappers. `app/lib/pace.ts` follows the exact same shape.

**API route pattern reference** — `app/api/schedules/[slug]/route.ts:1-17` is the template. Copy its structure exactly; only the collection name changes.

**Parser pattern reference** — `functions/src/lib/parsers/metra-schedules.ts` is the closest analogue to the Pace parser. Same zip/parse/group/emit flow, different derivation rules.

**Import aliases (from `tsconfig.json` and `jest.config.ts`):**
- `@lib/*` → `app/lib/*`
- `@components/*` → `app/components/*`
- `@functions/*` → `functions/src/*` (test-only)
- `@/*` → project root (e.g. `@/app/api/...` in tests)

**Pace GTFS URL:** `https://www.pacebus.com/gtfsdownload` (redirects to the current zip). Download manually with `curl -L` if you need a real fixture for local testing.

---

# Phase 1 — Types and Data Layer (PR 1)

Goal: Ship the type definitions and data-access module so downstream phases can import from them. No pages, no sync, no user-visible changes.

---

### Task 1.1: Add Pace type definitions

**Files:**
- Create: `app/lib/pace-types.ts`

- [ ] **Step 1: Create the type definition file**

Create `app/lib/pace-types.ts` with this exact content:

```typescript
export type PaceRouteServiceType = 'pulse' | 'local' | 'express' | 'feeder'

export type PaceRegion =
  | 'north'
  | 'northwest'
  | 'west'
  | 'southwest'
  | 'south'
  | 'heritage'

export interface PaceDirection {
  id: string
  name: string
}

export interface PaceRoute {
  slug: string
  shortName: string
  longName: string
  serviceType: PaceRouteServiceType
  region: PaceRegion
  color: string
  textColor: string
  description: string | null
  directions: PaceDirection[]
}

export interface PaceStop {
  slug: string
  name: string
  lat: number
  lon: number
  routes: string[]
  wheelchairBoarding: boolean
}
```

- [ ] **Step 2: Run the TypeScript compiler to verify the file compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/lib/pace-types.ts
git commit -m "feat(pace): add PaceRoute, PaceStop, PaceDirection types"
```

---

### Task 1.2: Add Pace test fixtures

**Files:**
- Modify: `__tests__/fixtures.ts`

- [ ] **Step 1: Open `__tests__/fixtures.ts` and append the Pace fixtures**

Append these exports after `mockMetraStation`. Keep the existing imports and exports untouched.

```typescript
import type { PaceRoute, PaceStop } from '@lib/pace-types'

export const mockPaceRoute: PaceRoute = {
  slug: '208',
  shortName: '208',
  longName: 'Golf Road',
  serviceType: 'local',
  region: 'north',
  color: '#005DAA',
  textColor: '#FFFFFF',
  description: 'Connects Evanston with Schaumburg via Golf Road.',
  directions: [
    { id: '0', name: 'East to Evanston' },
    { id: '1', name: 'West to Schaumburg' },
  ],
}

export const mockPacePulseRoute: PaceRoute = {
  slug: 'milwaukee-pulse',
  shortName: 'Milwaukee Pulse',
  longName: 'Milwaukee Avenue',
  serviceType: 'pulse',
  region: 'northwest',
  color: '#FF6C0C',
  textColor: '#FFFFFF',
  description: 'Limited-stop Pulse service along Milwaukee Avenue.',
  directions: [
    { id: '0', name: 'Golf Mill' },
    { id: '1', name: 'Jefferson Park' },
  ],
}

export const mockPaceStop: PaceStop = {
  slug: 'golf-rd-waukegan-rd',
  name: 'Golf Rd & Waukegan Rd',
  lat: 42.0586,
  lon: -87.7972,
  routes: ['208', '626'],
  wheelchairBoarding: true,
}
```

Add `@lib/pace-types` to the top of the file alongside the existing `@lib/types` import (do not merge the lines — the import is distinct).

- [ ] **Step 2: Verify fixtures compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add __tests__/fixtures.ts
git commit -m "test(pace): add mockPaceRoute, mockPacePulseRoute, mockPaceStop fixtures"
```

---

### Task 1.3: Write failing test for `getAllPaceRoutes`

**Files:**
- Create: `__tests__/lib/pace.test.ts`

- [ ] **Step 1: Create the test file with the first failing test**

Create `__tests__/lib/pace.test.ts`:

```typescript
/**
 * @jest-environment node
 */

jest.mock('@lib/firebase-admin', () => {
  const mockGet = jest.fn()
  const mockWhere = jest.fn().mockReturnValue({ get: mockGet })
  const mockDoc = jest.fn().mockReturnValue({ get: mockGet })
  const mockCollection = jest.fn().mockReturnValue({
    get: mockGet,
    where: mockWhere,
    doc: mockDoc,
  })
  return {
    getFirestore: jest.fn().mockReturnValue({ collection: mockCollection }),
    db: { collection: mockCollection },
    __mocks: { mockGet, mockWhere, mockDoc, mockCollection },
  }
})

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { __mocks } = require('@lib/firebase-admin')
const { mockGet, mockCollection } = __mocks

beforeEach(() => {
  jest.clearAllMocks()
})

describe('getAllPaceRoutes', () => {
  it('reads all documents from the pace-routes collection', async () => {
    mockGet.mockResolvedValue({
      docs: [
        {
          id: '208',
          data: () => ({
            slug: '208',
            shortName: '208',
            longName: 'Golf Road',
            serviceType: 'local',
            region: 'north',
            color: '#005DAA',
            textColor: '#FFFFFF',
            description: null,
            directions: [{ id: '0', name: 'East' }],
          }),
        },
      ],
    })

    const { getAllPaceRoutes } = await import('@lib/pace')
    const routes = await getAllPaceRoutes()

    expect(mockCollection).toHaveBeenCalledWith('pace-routes')
    expect(routes).toHaveLength(1)
    expect(routes[0].slug).toBe('208')
    expect(routes[0].shortName).toBe('208')
    expect(routes[0].longName).toBe('Golf Road')
    expect(routes[0].region).toBe('north')
  })
})
```

- [ ] **Step 2: Run the test and confirm it fails with a missing-module error**

Run: `npm test -- __tests__/lib/pace.test.ts`
Expected: FAIL with `Cannot find module '@lib/pace' from '__tests__/lib/pace.test.ts'`

- [ ] **Step 3: Commit the failing test**

```bash
git add __tests__/lib/pace.test.ts
git commit -m "test(pace): add failing test for getAllPaceRoutes"
```

---

### Task 1.4: Implement `getAllPaceRoutes`

**Files:**
- Create: `app/lib/pace.ts`

- [ ] **Step 1: Create the file with the first helper and a `toPaceRoute` row mapper**

Create `app/lib/pace.ts`:

```typescript
import { cache } from 'react'
import type { DocumentData } from 'firebase-admin/firestore'
import { getFirestore } from './firebase-admin'
import type { PaceRoute, PaceStop, PaceRegion, PaceRouteServiceType } from './pace-types'

function toPaceRoute(id: string, d: DocumentData): PaceRoute {
  return {
    slug: d.slug ?? id,
    shortName: d.shortName,
    longName: d.longName,
    serviceType: (d.serviceType ?? 'local') as PaceRouteServiceType,
    region: (d.region ?? 'north') as PaceRegion,
    color: d.color ?? '#005DAA',
    textColor: d.textColor ?? '#FFFFFF',
    description: d.description ?? null,
    directions: d.directions ?? [],
  }
}

function toPaceStop(id: string, d: DocumentData): PaceStop {
  return {
    slug: d.slug ?? id,
    name: d.name,
    lat: d.lat ?? 0,
    lon: d.lon ?? 0,
    routes: d.routes ?? [],
    wheelchairBoarding: d.wheelchairBoarding ?? false,
  }
}

export const getAllPaceRoutes = cache(async (): Promise<PaceRoute[]> => {
  const db = getFirestore()
  const snap = await db.collection('pace-routes').get()
  return snap.docs
    .map((d) => toPaceRoute(d.id, d.data()))
    .sort((a, b) => a.shortName.localeCompare(b.shortName, undefined, { numeric: true }))
})
```

- [ ] **Step 2: Run the test and confirm it passes**

Run: `npm test -- __tests__/lib/pace.test.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/lib/pace.ts
git commit -m "feat(pace): implement getAllPaceRoutes"
```

---

### Task 1.5: Add `getPaceRoute` (by slug)

**Files:**
- Modify: `__tests__/lib/pace.test.ts`
- Modify: `app/lib/pace.ts`

- [ ] **Step 1: Add the failing test**

Append to `__tests__/lib/pace.test.ts` after the existing `describe` block:

```typescript
describe('getPaceRoute', () => {
  it('returns the route for a valid slug', async () => {
    mockGet.mockResolvedValue({
      exists: true,
      id: '208',
      data: () => ({
        slug: '208',
        shortName: '208',
        longName: 'Golf Road',
        serviceType: 'local',
        region: 'north',
        color: '#005DAA',
        textColor: '#FFFFFF',
        description: null,
        directions: [],
      }),
    })

    const { getPaceRoute } = await import('@lib/pace')
    const route = await getPaceRoute('208')

    expect(mockCollection).toHaveBeenCalledWith('pace-routes')
    expect(route).not.toBeNull()
    expect(route?.slug).toBe('208')
  })

  it('returns null for a missing slug', async () => {
    mockGet.mockResolvedValue({ exists: false })

    const { getPaceRoute } = await import('@lib/pace')
    const route = await getPaceRoute('nonexistent')

    expect(route).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test and confirm it fails with an undefined-import error**

Run: `npm test -- __tests__/lib/pace.test.ts`
Expected: FAIL with `getPaceRoute is not a function` or similar.

- [ ] **Step 3: Add the implementation**

Append to `app/lib/pace.ts`:

```typescript
export const getPaceRoute = cache(async (slug: string): Promise<PaceRoute | null> => {
  const db = getFirestore()
  const doc = await db.collection('pace-routes').doc(slug).get()
  if (!doc.exists) return null
  return toPaceRoute(doc.id, doc.data()!)
})
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npm test -- __tests__/lib/pace.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add __tests__/lib/pace.test.ts app/lib/pace.ts
git commit -m "feat(pace): implement getPaceRoute"
```

---

### Task 1.6: Add `getAllPaceStops`

**Files:**
- Modify: `__tests__/lib/pace.test.ts`
- Modify: `app/lib/pace.ts`

- [ ] **Step 1: Add the failing test**

Append to `__tests__/lib/pace.test.ts`:

```typescript
describe('getAllPaceStops', () => {
  it('reads all documents from the pace-stops collection', async () => {
    mockGet.mockResolvedValue({
      docs: [
        {
          id: 'golf-rd-waukegan-rd',
          data: () => ({
            slug: 'golf-rd-waukegan-rd',
            name: 'Golf Rd & Waukegan Rd',
            lat: 42.0586,
            lon: -87.7972,
            routes: ['208'],
            wheelchairBoarding: true,
          }),
        },
      ],
    })

    const { getAllPaceStops } = await import('@lib/pace')
    const stops = await getAllPaceStops()

    expect(mockCollection).toHaveBeenCalledWith('pace-stops')
    expect(stops).toHaveLength(1)
    expect(stops[0].name).toBe('Golf Rd & Waukegan Rd')
  })
})
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npm test -- __tests__/lib/pace.test.ts`
Expected: FAIL with undefined-function error.

- [ ] **Step 3: Add the implementation**

Append to `app/lib/pace.ts`:

```typescript
export const getAllPaceStops = cache(async (): Promise<PaceStop[]> => {
  const db = getFirestore()
  const snap = await db.collection('pace-stops').get()
  return snap.docs
    .map((d) => toPaceStop(d.id, d.data()))
    .sort((a, b) => a.name.localeCompare(b.name))
})
```

- [ ] **Step 4: Run and confirm pass**

Run: `npm test -- __tests__/lib/pace.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add __tests__/lib/pace.test.ts app/lib/pace.ts
git commit -m "feat(pace): implement getAllPaceStops"
```

---

### Task 1.7: Add `getPaceStop` and `getPaceRouteStops`

**Files:**
- Modify: `__tests__/lib/pace.test.ts`
- Modify: `app/lib/pace.ts`

- [ ] **Step 1: Add failing tests for both helpers**

Append to `__tests__/lib/pace.test.ts`:

```typescript
describe('getPaceStop', () => {
  it('returns the stop for a valid slug', async () => {
    mockGet.mockResolvedValue({
      exists: true,
      id: 'golf-rd-waukegan-rd',
      data: () => ({
        slug: 'golf-rd-waukegan-rd',
        name: 'Golf Rd & Waukegan Rd',
        lat: 42.0586,
        lon: -87.7972,
        routes: ['208'],
        wheelchairBoarding: true,
      }),
    })

    const { getPaceStop } = await import('@lib/pace')
    const stop = await getPaceStop('golf-rd-waukegan-rd')
    expect(stop?.name).toBe('Golf Rd & Waukegan Rd')
  })

  it('returns null for a missing slug', async () => {
    mockGet.mockResolvedValue({ exists: false })
    const { getPaceStop } = await import('@lib/pace')
    expect(await getPaceStop('nope')).toBeNull()
  })
})

describe('getPaceRouteStops', () => {
  it('returns the direction-specific stop sequence for a route', async () => {
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({
        directions: {
          '0': [
            { slug: 'stop-a', name: 'Stop A', lat: 0, lon: 0, sequence: 1 },
            { slug: 'stop-b', name: 'Stop B', lat: 0, lon: 0, sequence: 2 },
          ],
          '1': [
            { slug: 'stop-b', name: 'Stop B', lat: 0, lon: 0, sequence: 1 },
            { slug: 'stop-a', name: 'Stop A', lat: 0, lon: 0, sequence: 2 },
          ],
        },
      }),
    })

    const { getPaceRouteStops } = await import('@lib/pace')
    const stops = await getPaceRouteStops('208', '0')

    expect(mockCollection).toHaveBeenCalledWith('pace-route-stops')
    expect(stops).toHaveLength(2)
    expect(stops[0].slug).toBe('stop-a')
    expect(stops[1].slug).toBe('stop-b')
  })

  it('returns empty array when route has no stops for the direction', async () => {
    mockGet.mockResolvedValue({ exists: true, data: () => ({ directions: {} }) })
    const { getPaceRouteStops } = await import('@lib/pace')
    expect(await getPaceRouteStops('208', '0')).toEqual([])
  })
})
```

- [ ] **Step 2: Run and confirm it fails**

Run: `npm test -- __tests__/lib/pace.test.ts`
Expected: FAIL with undefined-function errors.

- [ ] **Step 3: Add the implementations**

Append to `app/lib/pace.ts`:

```typescript
export const getPaceStop = cache(async (slug: string): Promise<PaceStop | null> => {
  const db = getFirestore()
  const doc = await db.collection('pace-stops').doc(slug).get()
  if (!doc.exists) return null
  return toPaceStop(doc.id, doc.data()!)
})

export interface PaceRouteStopEntry {
  slug: string
  name: string
  lat: number
  lon: number
  sequence: number
}

export const getPaceRouteStops = cache(
  async (routeSlug: string, directionId: string): Promise<PaceRouteStopEntry[]> => {
    const db = getFirestore()
    const doc = await db.collection('pace-route-stops').doc(routeSlug).get()
    if (!doc.exists) return []
    const data = doc.data() as { directions?: Record<string, PaceRouteStopEntry[]> }
    return data.directions?.[directionId] ?? []
  },
)
```

- [ ] **Step 4: Run and confirm it passes**

Run: `npm test -- __tests__/lib/pace.test.ts`
Expected: PASS.

- [ ] **Step 5: Run full lint to confirm no warnings**

Run: `npm run lint`
Expected: no errors or warnings.

- [ ] **Step 6: Commit**

```bash
git add __tests__/lib/pace.test.ts app/lib/pace.ts
git commit -m "feat(pace): implement getPaceStop and getPaceRouteStops"
```

---

### Task 1.8: PR 1 — Run full suite and open PR

- [ ] **Step 1: Run full test suite and lint**

Run: `npm test && npm run lint`
Expected: all tests pass, zero lint warnings.

- [ ] **Step 2: Create a branch and push**

```bash
git checkout -b pace-phase-1-data-layer
git push -u origin pace-phase-1-data-layer
```

- [ ] **Step 3: Open PR 1**

```bash
gh pr create --base main --title "feat(pace): types and data-access layer (phase 1/5)" --body "$(cat <<'EOF'
## Summary
- Add `PaceRoute`, `PaceStop`, `PaceDirection` types
- Add data-access module `app/lib/pace.ts` with `getAllPaceRoutes`, `getPaceRoute`, `getAllPaceStops`, `getPaceStop`, `getPaceRouteStops`
- Add test fixtures

Phase 1 of 5 for the Pace section. No user-visible changes. Unblocks phases 2–5.

Spec: docs/superpowers/specs/2026-04-11-pace-bus-section-design.md

## Test plan
- [x] Unit tests for every exported data-access helper
- [x] Lint and full test suite clean
EOF
)"
```

- [ ] **Step 4: Merge PR 1**

After CI passes:

```bash
gh pr merge --squash
git checkout main && git pull
```

---

# Phase 2 — Cloud Function Sync and Parser (PR 2)

Goal: Ship the `syncPaceGtfs` Cloud Function and its parser module. On deploy, the new Firestore collections (`pace-routes`, `pace-stops`, `pace-route-stops`, `pace-schedules`) are populated for the first time. Nothing user-visible yet.

All work in this phase happens in the `functions/` sub-package. The functions package has its own `tsconfig.json` and `package.json` — build with `cd functions && npm run build`.

---

### Task 2.1: Add Pace feed URL constant and change-detection helpers

**Files:**
- Modify: `functions/src/lib/change-detection.ts`
- Modify: `__tests__/functions/change-detection.test.ts`

- [ ] **Step 1: Read the existing change-detection module**

Open `functions/src/lib/change-detection.ts`. You'll see `hasCtaFeedChanged` (HEAD + Last-Modified/ETag) and `hasMetraFeedChanged` (published.txt). Pace uses the CTA style.

- [ ] **Step 2: Add a failing test for `hasPaceFeedChanged`**

Open `__tests__/functions/change-detection.test.ts`. Add a new test block modeled on the existing CTA tests. At the top of the file, read the current mocks for `headRequest` and `getFirestore` — mirror them for Pace.

Append this `describe` at the bottom of the file:

```typescript
describe('hasPaceFeedChanged', () => {
  it('reports changed when no prior meta exists', async () => {
    mockHeadRequest.mockResolvedValue({ 'last-modified': 'Mon, 01 Jan 2024 00:00:00 GMT', etag: 'abc' })
    mockMetaGet.mockResolvedValue({ data: () => undefined })

    const { hasPaceFeedChanged } = await import('@functions/lib/change-detection')
    const result = await hasPaceFeedChanged()

    expect(result.changed).toBe(true)
    expect(result.lastModified).toBe('Mon, 01 Jan 2024 00:00:00 GMT')
    expect(result.etag).toBe('abc')
  })

  it('reports unchanged when headers match stored meta', async () => {
    mockHeadRequest.mockResolvedValue({ 'last-modified': 'Mon, 01 Jan 2024 00:00:00 GMT', etag: 'abc' })
    mockMetaGet.mockResolvedValue({
      data: () => ({ lastModified: 'Mon, 01 Jan 2024 00:00:00 GMT', etag: 'abc' }),
    })

    const { hasPaceFeedChanged } = await import('@functions/lib/change-detection')
    const result = await hasPaceFeedChanged()

    expect(result.changed).toBe(false)
  })
})
```

If the existing test file has named mocks different from `mockHeadRequest` or `mockMetaGet`, use the existing names. Open the file and check before adding.

- [ ] **Step 3: Run the test and confirm it fails**

Run: `npm test -- __tests__/functions/change-detection.test.ts`
Expected: FAIL with `hasPaceFeedChanged is not a function`.

- [ ] **Step 4: Add the implementation**

Append to `functions/src/lib/change-detection.ts`:

```typescript
const PACE_GTFS_URL = 'https://www.pacebus.com/gtfsdownload'

/**
 * Check whether the Pace GTFS feed has changed since the last sync.
 * Uses Last-Modified / ETag headers via HEAD request, same strategy as CTA.
 */
export async function hasPaceFeedChanged(): Promise<{
  changed: boolean
  lastModified?: string
  etag?: string
}> {
  const db = getFirestore()
  const metaRef = db.collection('gtfs-meta').doc('pace')
  const metaSnap = await metaRef.get()
  const stored = metaSnap.data() as GtfsMeta | undefined

  const headers = await headRequest(PACE_GTFS_URL)
  const lastModified = headers['last-modified']
  const etag = headers['etag']

  await metaRef.set({ lastCheckedAt: Timestamp.now() }, { merge: true })

  if (!stored) {
    return { changed: true, lastModified, etag }
  }

  const changed =
    (lastModified !== undefined && lastModified !== stored.lastModified) ||
    (etag !== undefined && etag !== stored.etag)

  return { changed, lastModified, etag }
}

/** Update the stored metadata after a successful Pace sync. */
export async function updatePaceMeta(lastModified?: string, etag?: string): Promise<void> {
  const db = getFirestore()
  await db
    .collection('gtfs-meta')
    .doc('pace')
    .set(
      {
        lastModified: lastModified ?? null,
        etag: etag ?? null,
        lastSyncedAt: Timestamp.now(),
        lastCheckedAt: Timestamp.now(),
      },
      { merge: true },
    )
}
```

- [ ] **Step 5: Run tests and confirm pass**

Run: `npm test -- __tests__/functions/change-detection.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add functions/src/lib/change-detection.ts __tests__/functions/change-detection.test.ts
git commit -m "feat(functions): add hasPaceFeedChanged and updatePaceMeta"
```

---

### Task 2.2: Start the Pace parser — route service type derivation

**Files:**
- Create: `functions/src/lib/parsers/pace-schedules.ts`
- Create: `__tests__/functions/parsers/pace-schedules.test.ts`

This task begins the parser. Build it in pieces — pure derivation functions first, then combine into the top-level `parsePaceGtfs` export.

- [ ] **Step 1: Write the failing test for `deriveServiceType`**

Create `__tests__/functions/parsers/pace-schedules.test.ts`:

```typescript
import { deriveServiceType } from '@functions/lib/parsers/pace-schedules'

describe('deriveServiceType', () => {
  it('classifies Pulse routes by short name suffix', () => {
    expect(deriveServiceType({ route_short_name: 'Milwaukee Pulse', route_long_name: '' })).toBe(
      'pulse',
    )
    expect(deriveServiceType({ route_short_name: 'Dempster Pulse', route_long_name: '' })).toBe(
      'pulse',
    )
  })

  it('classifies express routes by long name', () => {
    expect(
      deriveServiceType({ route_short_name: '755', route_long_name: 'Plainfield-IMD Express' }),
    ).toBe('express')
  })

  it('classifies feeder routes by leading digit 8', () => {
    expect(deriveServiceType({ route_short_name: '890', route_long_name: 'Feeder' })).toBe(
      'feeder',
    )
  })

  it('defaults to local for regular numbered routes', () => {
    expect(deriveServiceType({ route_short_name: '208', route_long_name: 'Golf Road' })).toBe(
      'local',
    )
    expect(deriveServiceType({ route_short_name: '626', route_long_name: 'Evanston CTA' })).toBe(
      'local',
    )
  })
})
```

- [ ] **Step 2: Run and confirm fail**

Run: `npm test -- __tests__/functions/parsers/pace-schedules.test.ts`
Expected: FAIL — `Cannot find module '@functions/lib/parsers/pace-schedules'`.

- [ ] **Step 3: Create the parser file with the `deriveServiceType` helper**

Create `functions/src/lib/parsers/pace-schedules.ts`:

```typescript
/**
 * Pace GTFS schedule parser.
 *
 * Reads a downloaded Pace GTFS zip and emits maps of Firestore documents
 * for pace-routes, pace-stops, pace-route-stops, and pace-schedules.
 */

import AdmZip from 'adm-zip'
import { parseGTFS, readZipFile, buildServiceTypeMap, type ServiceType } from '../gtfs-utils'

export type PaceRouteServiceType = 'pulse' | 'local' | 'express' | 'feeder'

export type PaceRegion =
  | 'north'
  | 'northwest'
  | 'west'
  | 'southwest'
  | 'south'
  | 'heritage'

interface GtfsRouteRow {
  route_short_name: string
  route_long_name: string
}

/** Classify a Pace route's service type from its GTFS row. */
export function deriveServiceType(row: GtfsRouteRow): PaceRouteServiceType {
  const short = row.route_short_name?.trim() ?? ''
  const long = row.route_long_name?.trim() ?? ''

  if (/\bpulse\b/i.test(short)) return 'pulse'
  if (/express/i.test(long)) return 'express'
  if (/^8\d{2}$/.test(short)) return 'feeder'
  return 'local'
}
```

- [ ] **Step 4: Run and confirm pass**

Run: `npm test -- __tests__/functions/parsers/pace-schedules.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add functions/src/lib/parsers/pace-schedules.ts __tests__/functions/parsers/pace-schedules.test.ts
git commit -m "feat(functions): add Pace parser skeleton with deriveServiceType"
```

---

### Task 2.3: Add region derivation with digit heuristic + override map

**Files:**
- Modify: `functions/src/lib/parsers/pace-schedules.ts`
- Modify: `__tests__/functions/parsers/pace-schedules.test.ts`

- [ ] **Step 1: Add failing tests for `deriveRegion`**

Append to the test file:

```typescript
import { deriveRegion } from '@functions/lib/parsers/pace-schedules'

describe('deriveRegion', () => {
  it('maps route 208 to north', () => {
    expect(deriveRegion('208')).toBe('north')
  })

  it('maps route 353 to northwest', () => {
    expect(deriveRegion('353')).toBe('northwest')
  })

  it('maps route 423 to west', () => {
    expect(deriveRegion('423')).toBe('west')
  })

  it('maps route 513 to southwest', () => {
    expect(deriveRegion('513')).toBe('southwest')
  })

  it('maps route 633 to south', () => {
    expect(deriveRegion('633')).toBe('south')
  })

  it('maps 9xx routes to heritage', () => {
    expect(deriveRegion('904')).toBe('heritage')
  })

  it('defaults to north for unrecognized patterns', () => {
    expect(deriveRegion('ABC')).toBe('north')
  })

  it('uses override map when present', () => {
    // An 8xx feeder route with an explicit override should win.
    // (Overrides are loaded from a sibling module; empty by default in v1.)
    expect(deriveRegion('890')).toBe('north') // default for 8xx
  })
})
```

- [ ] **Step 2: Run and confirm fail**

Run: `npm test -- __tests__/functions/parsers/pace-schedules.test.ts`
Expected: FAIL — `deriveRegion is not a function`.

- [ ] **Step 3: Add `deriveRegion` to the parser**

Append to `functions/src/lib/parsers/pace-schedules.ts`:

```typescript
/**
 * Region override map. Populate this with route short names whose digit-based
 * region assignment is incorrect. Empty by default in v1; we'll add entries
 * as we identify miscategorizations after the first real sync.
 */
const REGION_OVERRIDES: Record<string, PaceRegion> = {
  // Example: '890': 'north',
}

/** Known Pulse routes with hardcoded regions (overrides digit heuristic). */
const PULSE_REGIONS: Record<string, PaceRegion> = {
  'milwaukee-pulse': 'northwest',
  'dempster-pulse': 'north',
}

/** Classify a Pace route's region from its short name. */
export function deriveRegion(shortName: string): PaceRegion {
  const trimmed = shortName.trim()
  if (REGION_OVERRIDES[trimmed]) return REGION_OVERRIDES[trimmed]

  const firstDigit = trimmed.match(/^\d/)?.[0]
  switch (firstDigit) {
    case '2':
      return 'north'
    case '3':
      return 'northwest'
    case '4':
      return 'west'
    case '5':
    case '7':
      return 'southwest'
    case '6':
      return 'south'
    case '8':
      // Feeder routes: default to north (parent division) unless overridden above.
      return 'north'
    case '9':
      return 'heritage'
    default:
      return 'north'
  }
}
```

- [ ] **Step 4: Run and confirm pass**

Run: `npm test -- __tests__/functions/parsers/pace-schedules.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add functions/src/lib/parsers/pace-schedules.ts __tests__/functions/parsers/pace-schedules.test.ts
git commit -m "feat(functions): add deriveRegion with digit heuristic and override map"
```

---

### Task 2.4: Add color derivation with Pulse hardcoding and GTFS fallback

**Files:**
- Modify: `functions/src/lib/parsers/pace-schedules.ts`
- Modify: `__tests__/functions/parsers/pace-schedules.test.ts`

- [ ] **Step 1: Add failing test for `deriveColor`**

Append to the test file:

```typescript
import { deriveColor } from '@functions/lib/parsers/pace-schedules'

describe('deriveColor', () => {
  it('uses GTFS route_color when populated and not the default', () => {
    expect(
      deriveColor({ shortName: '208', gtfsColor: '336699', gtfsTextColor: 'FFFFFF' }),
    ).toEqual({ color: '#336699', textColor: '#FFFFFF' })
  })

  it('falls back to Pace corporate blue when GTFS color is missing', () => {
    expect(deriveColor({ shortName: '208', gtfsColor: '', gtfsTextColor: '' })).toEqual({
      color: '#005DAA',
      textColor: '#FFFFFF',
    })
  })

  it('hardcodes Milwaukee Pulse to its branded orange', () => {
    expect(
      deriveColor({ shortName: 'Milwaukee Pulse', gtfsColor: '', gtfsTextColor: '' }),
    ).toEqual({ color: '#FF6C0C', textColor: '#FFFFFF' })
  })

  it('hardcodes Dempster Pulse to its branded teal', () => {
    expect(
      deriveColor({ shortName: 'Dempster Pulse', gtfsColor: '', gtfsTextColor: '' }),
    ).toEqual({ color: '#00A3A1', textColor: '#FFFFFF' })
  })
})
```

- [ ] **Step 2: Run and confirm fail**

Run: `npm test -- __tests__/functions/parsers/pace-schedules.test.ts`
Expected: FAIL.

- [ ] **Step 3: Add `deriveColor` and related constants**

Append to `functions/src/lib/parsers/pace-schedules.ts`:

```typescript
const PACE_CORPORATE_BLUE = '#005DAA'
const DEFAULT_TEXT_COLOR = '#FFFFFF'

/** Branded colors for known Pulse routes — overrides GTFS. */
const PULSE_COLORS: Record<string, { color: string; textColor: string }> = {
  'Milwaukee Pulse': { color: '#FF6C0C', textColor: '#FFFFFF' },
  'Dempster Pulse': { color: '#00A3A1', textColor: '#FFFFFF' },
}

interface DeriveColorInput {
  shortName: string
  gtfsColor: string
  gtfsTextColor: string
}

/** Compute the route's display color and text color. */
export function deriveColor(input: DeriveColorInput): { color: string; textColor: string } {
  const override = PULSE_COLORS[input.shortName.trim()]
  if (override) return override

  const raw = input.gtfsColor?.trim() ?? ''
  if (raw && raw.toUpperCase() !== '005DAA') {
    return {
      color: `#${raw.toUpperCase()}`,
      textColor: input.gtfsTextColor ? `#${input.gtfsTextColor.toUpperCase()}` : DEFAULT_TEXT_COLOR,
    }
  }

  return { color: PACE_CORPORATE_BLUE, textColor: DEFAULT_TEXT_COLOR }
}
```

- [ ] **Step 4: Run and confirm pass**

Run: `npm test -- __tests__/functions/parsers/pace-schedules.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add functions/src/lib/parsers/pace-schedules.ts __tests__/functions/parsers/pace-schedules.test.ts
git commit -m "feat(functions): add deriveColor with Pulse hardcoding and Pace blue fallback"
```

---

### Task 2.5: Add route slug builder

**Files:**
- Modify: `functions/src/lib/parsers/pace-schedules.ts`
- Modify: `__tests__/functions/parsers/pace-schedules.test.ts`

- [ ] **Step 1: Add failing tests**

Append to the test file:

```typescript
import { routeSlug } from '@functions/lib/parsers/pace-schedules'

describe('routeSlug', () => {
  it('returns the numeric short name as slug', () => {
    expect(routeSlug('208')).toBe('208')
  })

  it('slugifies Pulse route names', () => {
    expect(routeSlug('Milwaukee Pulse')).toBe('milwaukee-pulse')
    expect(routeSlug('Dempster Pulse')).toBe('dempster-pulse')
  })

  it('handles mixed case and punctuation', () => {
    expect(routeSlug('Route 208A')).toBe('route-208a')
  })
})
```

- [ ] **Step 2: Run and confirm fail**

Run: `npm test -- __tests__/functions/parsers/pace-schedules.test.ts`
Expected: FAIL.

- [ ] **Step 3: Add `routeSlug`**

Append to the parser:

```typescript
/** Normalize a Pace route short name into a URL-safe slug. */
export function routeSlug(shortName: string): string {
  return shortName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
```

- [ ] **Step 4: Run and confirm pass**

Run: `npm test -- __tests__/functions/parsers/pace-schedules.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add functions/src/lib/parsers/pace-schedules.ts __tests__/functions/parsers/pace-schedules.test.ts
git commit -m "feat(functions): add routeSlug helper"
```

---

### Task 2.6: Add stop slug builder with disambiguation

**Files:**
- Modify: `functions/src/lib/parsers/pace-schedules.ts`
- Modify: `__tests__/functions/parsers/pace-schedules.test.ts`

- [ ] **Step 1: Add failing tests**

Append to the test file:

```typescript
import { buildStopSlugMap } from '@functions/lib/parsers/pace-schedules'

describe('buildStopSlugMap', () => {
  it('generates unique slugs from stop names', () => {
    const stops = [
      { stop_id: '1001', stop_name: 'Golf Rd & Waukegan Rd' },
      { stop_id: '1002', stop_name: 'Dempster St & Skokie Blvd' },
    ]
    const map = buildStopSlugMap(stops)
    expect(map.get('1001')).toBe('golf-rd-waukegan-rd')
    expect(map.get('1002')).toBe('dempster-st-skokie-blvd')
  })

  it('disambiguates duplicate names with a numeric suffix', () => {
    const stops = [
      { stop_id: '1001', stop_name: 'Main St' },
      { stop_id: '1002', stop_name: 'Main St' },
      { stop_id: '1003', stop_name: 'Main St' },
    ]
    const map = buildStopSlugMap(stops)
    expect(map.get('1001')).toBe('main-st')
    expect(map.get('1002')).toBe('main-st-2')
    expect(map.get('1003')).toBe('main-st-3')
  })
})
```

- [ ] **Step 2: Run and confirm fail**

Run: `npm test -- __tests__/functions/parsers/pace-schedules.test.ts`
Expected: FAIL.

- [ ] **Step 3: Add `buildStopSlugMap`**

Append to the parser:

```typescript
interface GtfsStopRow {
  stop_id: string
  stop_name: string
}

/**
 * Build a map of GTFS stop_id → unique slug. When the same name appears
 * multiple times, append a -2, -3, ... suffix in stop_id order.
 */
export function buildStopSlugMap(stops: GtfsStopRow[]): Map<string, string> {
  const slugCounts = new Map<string, number>()
  const result = new Map<string, string>()

  const baseSlug = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

  for (const stop of stops) {
    const base = baseSlug(stop.stop_name)
    const count = (slugCounts.get(base) ?? 0) + 1
    slugCounts.set(base, count)
    result.set(stop.stop_id, count === 1 ? base : `${base}-${count}`)
  }
  return result
}
```

- [ ] **Step 4: Run and confirm pass**

Run: `npm test -- __tests__/functions/parsers/pace-schedules.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add functions/src/lib/parsers/pace-schedules.ts __tests__/functions/parsers/pace-schedules.test.ts
git commit -m "feat(functions): add buildStopSlugMap with disambiguation"
```

---

### Task 2.7: Add direction extraction from trip headsigns

**Files:**
- Modify: `functions/src/lib/parsers/pace-schedules.ts`
- Modify: `__tests__/functions/parsers/pace-schedules.test.ts`

- [ ] **Step 1: Add failing tests**

Append to the test file:

```typescript
import { extractDirections } from '@functions/lib/parsers/pace-schedules'

describe('extractDirections', () => {
  it('returns the two most common (direction_id, headsign) pairs for a route', () => {
    const trips = [
      { route_id: '208', direction_id: '0', trip_headsign: 'Evanston' },
      { route_id: '208', direction_id: '0', trip_headsign: 'Evanston' },
      { route_id: '208', direction_id: '0', trip_headsign: 'Evanston' },
      { route_id: '208', direction_id: '1', trip_headsign: 'Schaumburg' },
      { route_id: '208', direction_id: '1', trip_headsign: 'Schaumburg' },
      { route_id: '208', direction_id: '0', trip_headsign: 'Skokie' }, // short-turn
    ]

    const directions = extractDirections('208', trips)
    expect(directions).toHaveLength(2)
    expect(directions).toContainEqual({ id: '0', name: 'Evanston' })
    expect(directions).toContainEqual({ id: '1', name: 'Schaumburg' })
  })

  it('handles single-direction routes', () => {
    const trips = [
      { route_id: '999', direction_id: '0', trip_headsign: 'Loop' },
      { route_id: '999', direction_id: '0', trip_headsign: 'Loop' },
    ]
    expect(extractDirections('999', trips)).toEqual([{ id: '0', name: 'Loop' }])
  })

  it('returns empty array when no trips match', () => {
    expect(extractDirections('208', [])).toEqual([])
  })
})
```

- [ ] **Step 2: Run and confirm fail**

Run: `npm test -- __tests__/functions/parsers/pace-schedules.test.ts`
Expected: FAIL.

- [ ] **Step 3: Add `extractDirections`**

Append to the parser:

```typescript
interface GtfsTripRow {
  route_id: string
  direction_id: string
  trip_headsign: string
}

/** Derive the two most common (direction_id, headsign) pairs for a route. */
export function extractDirections(routeId: string, trips: GtfsTripRow[]): PaceDirection[] {
  const counts = new Map<string, { id: string; name: string; count: number }>()
  for (const t of trips) {
    if (t.route_id !== routeId) continue
    const headsign = t.trip_headsign?.trim()
    if (!headsign) continue
    const key = `${t.direction_id}|${headsign}`
    const cur = counts.get(key)
    if (cur) cur.count++
    else counts.set(key, { id: t.direction_id, name: headsign, count: 1 })
  }

  const sorted = [...counts.values()].sort((a, b) => b.count - a.count)

  // Pick the highest-count entry per direction id.
  const byDir = new Map<string, { id: string; name: string }>()
  for (const entry of sorted) {
    if (!byDir.has(entry.id)) {
      byDir.set(entry.id, { id: entry.id, name: entry.name })
    }
  }

  return [...byDir.values()]
}

export interface PaceDirection {
  id: string
  name: string
}
```

- [ ] **Step 4: Run and confirm pass**

Run: `npm test -- __tests__/functions/parsers/pace-schedules.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add functions/src/lib/parsers/pace-schedules.ts __tests__/functions/parsers/pace-schedules.test.ts
git commit -m "feat(functions): add extractDirections helper"
```

---

### Task 2.8: Assemble the top-level `parsePaceGtfs` with an in-memory zip fixture test

**Files:**
- Modify: `functions/src/lib/parsers/pace-schedules.ts`
- Modify: `__tests__/functions/parsers/pace-schedules.test.ts`

This is the largest parser task. It combines all the derivation helpers into a single `parsePaceGtfs(zip)` function that returns four maps: `routes`, `stops`, `routeStops`, `schedules`.

- [ ] **Step 1: Add the failing test with an in-memory Pace-shaped GTFS zip**

Append to the test file:

```typescript
import AdmZip from 'adm-zip'
import { parsePaceGtfs } from '@functions/lib/parsers/pace-schedules'

function makePaceGtfsZip(): AdmZip {
  const zip = new AdmZip()

  zip.addFile(
    'routes.txt',
    Buffer.from(
      `route_id,route_short_name,route_long_name,route_desc,route_color,route_text_color
R208,208,Golf Road,,005DAA,FFFFFF
R_MIL,Milwaukee Pulse,Milwaukee Avenue,BRT service,,
R755,755,Plainfield-IMD Express,,,`,
    ),
  )

  zip.addFile(
    'stops.txt',
    Buffer.from(
      `stop_id,stop_name,stop_lat,stop_lon,wheelchair_boarding
S1,Golf Rd & Waukegan Rd,42.0586,-87.7972,1
S2,Skokie Blvd & Dempster,42.0401,-87.7336,1
S3,Milwaukee & Touhy,42.0123,-87.8234,1`,
    ),
  )

  zip.addFile(
    'calendar.txt',
    Buffer.from(
      `service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday
WK,1,1,1,1,1,0,0
SAT,0,0,0,0,0,1,0
SUN,0,0,0,0,0,0,1`,
    ),
  )

  zip.addFile(
    'trips.txt',
    Buffer.from(
      `route_id,service_id,trip_id,trip_headsign,direction_id
R208,WK,T208_1,Evanston,0
R208,WK,T208_2,Schaumburg,1
R_MIL,WK,T_MIL_1,Jefferson Park,0
R755,WK,T755_1,IMD,0`,
    ),
  )

  zip.addFile(
    'stop_times.txt',
    Buffer.from(
      `trip_id,stop_id,stop_sequence,departure_time
T208_1,S1,1,06:30:00
T208_1,S2,2,06:45:00
T208_2,S2,1,07:00:00
T208_2,S1,2,07:15:00
T_MIL_1,S3,1,06:10:00
T755_1,S1,1,08:00:00`,
    ),
  )

  return zip
}

describe('parsePaceGtfs', () => {
  it('parses a minimal Pace GTFS zip into route, stop, route-stop, and schedule maps', () => {
    const zip = makePaceGtfsZip()
    const result = parsePaceGtfs(zip)

    expect(result.routes.size).toBe(3)

    const route208 = result.routes.get('208')!
    expect(route208.shortName).toBe('208')
    expect(route208.longName).toBe('Golf Road')
    expect(route208.serviceType).toBe('local')
    expect(route208.region).toBe('north')
    expect(route208.color).toBe('#005DAA')
    expect(route208.directions).toHaveLength(2)

    const milwaukee = result.routes.get('milwaukee-pulse')!
    expect(milwaukee.serviceType).toBe('pulse')
    expect(milwaukee.color).toBe('#FF6C0C')
    expect(milwaukee.region).toBe('northwest')

    const r755 = result.routes.get('755')!
    expect(r755.serviceType).toBe('express')

    expect(result.stops.size).toBe(3)
    const s1 = result.stops.get('golf-rd-waukegan-rd')!
    expect(s1.name).toBe('Golf Rd & Waukegan Rd')
    expect(s1.routes).toContain('208')
    expect(s1.routes).toContain('755')

    expect(result.routeStops.size).toBe(3)
    const route208Stops = result.routeStops.get('208')!
    expect(route208Stops.directions['0']).toHaveLength(2)
    expect(route208Stops.directions['1']).toHaveLength(2)

    expect(result.schedules.size).toBe(3)
    const s1Schedule = result.schedules.get('golf-rd-waukegan-rd')!
    expect(s1Schedule.routes).toBeDefined()
    expect(s1Schedule.routes['208']).toBeDefined()
  })
})
```

- [ ] **Step 2: Run and confirm fail**

Run: `npm test -- __tests__/functions/parsers/pace-schedules.test.ts`
Expected: FAIL — `parsePaceGtfs is not a function`.

- [ ] **Step 3: Implement `parsePaceGtfs`**

Append to `functions/src/lib/parsers/pace-schedules.ts`:

```typescript
export interface ParsedPaceRoute {
  slug: string
  shortName: string
  longName: string
  serviceType: PaceRouteServiceType
  region: PaceRegion
  color: string
  textColor: string
  description: string | null
  directions: PaceDirection[]
}

export interface ParsedPaceStop {
  slug: string
  name: string
  lat: number
  lon: number
  routes: string[]
  wheelchairBoarding: boolean
}

export interface PaceRouteStopsDoc {
  directions: Record<string, { slug: string; name: string; lat: number; lon: number; sequence: number }[]>
}

export interface PaceStopScheduleDoc {
  routes: Record<
    string,
    {
      directions: Record<
        string,
        { weekday: number[]; saturday: number[]; sunday: number[] }
      >
    }
  >
}

export interface ParsePaceResult {
  routes: Map<string, ParsedPaceRoute>
  stops: Map<string, ParsedPaceStop>
  routeStops: Map<string, PaceRouteStopsDoc>
  schedules: Map<string, PaceStopScheduleDoc>
}

export function parsePaceGtfs(zip: AdmZip): ParsePaceResult {
  const rawRoutes = parseGTFS(readZipFile(zip, 'routes.txt'))
  const rawStops = parseGTFS(readZipFile(zip, 'stops.txt'))
  const rawTrips = parseGTFS(readZipFile(zip, 'trips.txt'))
  const rawStopTimes = parseGTFS(readZipFile(zip, 'stop_times.txt'))
  const rawCalendar = parseGTFS(readZipFile(zip, 'calendar.txt'))

  const serviceTypeMap = buildServiceTypeMap(rawCalendar)
  const stopSlugMap = buildStopSlugMap(rawStops as GtfsStopRow[])

  // Pass 1: routes
  const routes = new Map<string, ParsedPaceRoute>()
  const routeIdToSlug = new Map<string, string>()
  for (const r of rawRoutes) {
    const slug = routeSlug(r.route_short_name)
    if (!slug) continue
    routeIdToSlug.set(r.route_id, slug)

    const { color, textColor } = deriveColor({
      shortName: r.route_short_name,
      gtfsColor: r.route_color ?? '',
      gtfsTextColor: r.route_text_color ?? '',
    })

    routes.set(slug, {
      slug,
      shortName: r.route_short_name,
      longName: r.route_long_name ?? '',
      serviceType: deriveServiceType({
        route_short_name: r.route_short_name,
        route_long_name: r.route_long_name ?? '',
      }),
      region: deriveRegion(r.route_short_name),
      color,
      textColor,
      description: r.route_desc?.trim() || null,
      directions: extractDirections(r.route_id, rawTrips as GtfsTripRow[]),
    })
  }

  // Pass 2: stops (routes field filled in Pass 3)
  const stops = new Map<string, ParsedPaceStop>()
  for (const s of rawStops) {
    const slug = stopSlugMap.get(s.stop_id)
    if (!slug) continue
    stops.set(slug, {
      slug,
      name: s.stop_name,
      lat: parseFloat(s.stop_lat ?? '0'),
      lon: parseFloat(s.stop_lon ?? '0'),
      routes: [],
      wheelchairBoarding: s.wheelchair_boarding === '1',
    })
  }

  // Trip lookup tables
  const tripRouteSlug = new Map<string, string>()
  const tripDirection = new Map<string, string>()
  const tripServiceType = new Map<string, ServiceType>()
  for (const t of rawTrips) {
    const slug = routeIdToSlug.get(t.route_id)
    if (!slug) continue
    tripRouteSlug.set(t.trip_id, slug)
    tripDirection.set(t.trip_id, t.direction_id ?? '0')
    tripServiceType.set(t.trip_id, serviceTypeMap.get(t.service_id) ?? 'weekday')
  }

  // Pass 3: route-stops (canonical sequence = longest pattern per direction)
  // and stop → routes mapping
  const routeStops = new Map<string, PaceRouteStopsDoc>()
  const stopRoutesSet = new Map<string, Set<string>>()

  // Group stop_times by trip
  const stopsByTrip = new Map<
    string,
    { stopId: string; sequence: number; departure: string }[]
  >()
  for (const st of rawStopTimes) {
    const arr = stopsByTrip.get(st.trip_id) ?? []
    arr.push({
      stopId: st.stop_id,
      sequence: parseInt(st.stop_sequence, 10),
      departure: st.departure_time,
    })
    stopsByTrip.set(st.trip_id, arr)
  }

  // For each (routeSlug, directionId), find the trip with the most stops
  const longestPatterns = new Map<string, { tripId: string; count: number }>()
  for (const [tripId, list] of stopsByTrip) {
    const slug = tripRouteSlug.get(tripId)
    if (!slug) continue
    const dir = tripDirection.get(tripId) ?? '0'
    const key = `${slug}|${dir}`
    const cur = longestPatterns.get(key)
    if (!cur || list.length > cur.count) {
      longestPatterns.set(key, { tripId, count: list.length })
    }

    // Stop → routes
    for (const entry of list) {
      const stopSlug = stopSlugMap.get(entry.stopId)
      if (!stopSlug) continue
      const set = stopRoutesSet.get(stopSlug) ?? new Set()
      set.add(slug)
      stopRoutesSet.set(stopSlug, set)
    }
  }

  for (const [key, { tripId }] of longestPatterns) {
    const [slug, dir] = key.split('|')
    const list = (stopsByTrip.get(tripId) ?? []).sort((a, b) => a.sequence - b.sequence)
    const doc: PaceRouteStopsDoc = routeStops.get(slug) ?? { directions: {} }
    doc.directions[dir] = list
      .map((e) => {
        const stopSlug = stopSlugMap.get(e.stopId)
        if (!stopSlug) return null
        const stop = stops.get(stopSlug)
        if (!stop) return null
        return {
          slug: stopSlug,
          name: stop.name,
          lat: stop.lat,
          lon: stop.lon,
          sequence: e.sequence,
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
    routeStops.set(slug, doc)
  }

  // Fill routes[].routes — sorted for stable output
  for (const [stopSlug, routeSet] of stopRoutesSet) {
    const stop = stops.get(stopSlug)
    if (!stop) continue
    stop.routes = [...routeSet].sort()
  }

  // Pass 4: per-stop schedules
  const schedules = new Map<string, PaceStopScheduleDoc>()
  for (const [tripId, list] of stopsByTrip) {
    const routeSlugForTrip = tripRouteSlug.get(tripId)
    if (!routeSlugForTrip) continue
    const direction = tripDirection.get(tripId) ?? '0'
    const serviceType = tripServiceType.get(tripId) ?? 'weekday'

    for (const entry of list) {
      const stopSlug = stopSlugMap.get(entry.stopId)
      if (!stopSlug) continue

      let doc = schedules.get(stopSlug)
      if (!doc) {
        doc = { routes: {} }
        schedules.set(stopSlug, doc)
      }
      let routeDoc = doc.routes[routeSlugForTrip]
      if (!routeDoc) {
        routeDoc = { directions: {} }
        doc.routes[routeSlugForTrip] = routeDoc
      }
      let dirDoc = routeDoc.directions[direction]
      if (!dirDoc) {
        dirDoc = { weekday: [], saturday: [], sunday: [] }
        routeDoc.directions[direction] = dirDoc
      }
      const [h, m] = entry.departure.split(':').map(Number)
      const minutes = h * 60 + m
      dirDoc[serviceType].push(minutes)
    }
  }

  // Sort schedule times
  for (const doc of schedules.values()) {
    for (const r of Object.values(doc.routes)) {
      for (const d of Object.values(r.directions)) {
        d.weekday.sort((a, b) => a - b)
        d.saturday.sort((a, b) => a - b)
        d.sunday.sort((a, b) => a - b)
      }
    }
  }

  return { routes, stops, routeStops, schedules }
}
```

- [ ] **Step 4: Run and confirm pass**

Run: `npm test -- __tests__/functions/parsers/pace-schedules.test.ts`
Expected: PASS on every `describe` block including the new `parsePaceGtfs` tests.

- [ ] **Step 5: Build the functions package to confirm TypeScript compiles**

Run: `cd functions && npm run build && cd ..`
Expected: clean build with no errors.

- [ ] **Step 6: Commit**

```bash
git add functions/src/lib/parsers/pace-schedules.ts __tests__/functions/parsers/pace-schedules.test.ts
git commit -m "feat(functions): implement parsePaceGtfs top-level parser"
```

---

### Task 2.9: Wire `syncPaceGtfs` into the Cloud Functions entry point

**Files:**
- Modify: `functions/src/index.ts`

- [ ] **Step 1: Read `functions/src/index.ts`**

Open it and review the `syncCtaGtfs` and `syncMetraGtfs` exports. The new `syncPaceGtfs` follows the same shape.

- [ ] **Step 2: Add the Pace imports at the top of the file**

Add to the existing imports:

```typescript
import { hasPaceFeedChanged, updatePaceMeta } from './lib/change-detection'
import { parsePaceGtfs } from './lib/parsers/pace-schedules'
```

And add the feed URL constant alongside the other constants:

```typescript
const PACE_GTFS_URL = 'https://www.pacebus.com/gtfsdownload'
```

- [ ] **Step 3: Append the new scheduled function at the end of the file**

Append after `syncMetraGtfs`:

```typescript
// ---------------------------------------------------------------------------
// Pace Sync — runs at :10 past every hour
// ---------------------------------------------------------------------------

export const syncPaceGtfs = onSchedule(
  {
    schedule: '10 * * * *',
    region: 'us-central1',
    memory: '2GiB',
    timeoutSeconds: 540,
  },
  async () => {
    const { changed, lastModified, etag } = await hasPaceFeedChanged()

    if (!changed) {
      logger.info('Pace GTFS feed unchanged, skipping sync')
      return
    }

    logger.info('Pace GTFS feed changed, starting sync', { lastModified, etag })

    const buf = await downloadBuffer(PACE_GTFS_URL)
    const zip = new AdmZip(buf)
    logger.info('Pace GTFS downloaded, parsing')

    const { routes, stops, routeStops, schedules } = parsePaceGtfs(zip)

    const routeDocs = new Map<string, Record<string, unknown>>()
    for (const [slug, r] of routes) routeDocs.set(slug, r as unknown as Record<string, unknown>)
    const routesWritten = await batchWrite('pace-routes', routeDocs)

    const stopDocs = new Map<string, Record<string, unknown>>()
    for (const [slug, s] of stops) stopDocs.set(slug, s as unknown as Record<string, unknown>)
    const stopsWritten = await batchWrite('pace-stops', stopDocs)

    const routeStopsDocs = new Map<string, Record<string, unknown>>()
    for (const [slug, rs] of routeStops)
      routeStopsDocs.set(slug, rs as unknown as Record<string, unknown>)
    const routeStopsWritten = await batchWrite('pace-route-stops', routeStopsDocs)

    const scheduleDocs = new Map<string, Record<string, unknown>>()
    for (const [slug, sc] of schedules)
      scheduleDocs.set(slug, sc as unknown as Record<string, unknown>)
    const schedulesWritten = await batchWrite('pace-schedules', scheduleDocs)

    logger.info('Pace sync complete', {
      routesWritten,
      stopsWritten,
      routeStopsWritten,
      schedulesWritten,
    })

    await updatePaceMeta(lastModified, etag)
  },
)
```

- [ ] **Step 4: Build the functions package**

Run: `cd functions && npm run build && cd ..`
Expected: clean build.

- [ ] **Step 5: Run the full test suite**

Run: `npm test && npm run lint`
Expected: all tests pass, no lint warnings.

- [ ] **Step 6: Commit**

```bash
git add functions/src/index.ts
git commit -m "feat(functions): wire up syncPaceGtfs scheduled sync"
```

---

### Task 2.10: PR 2 — Open and merge

- [ ] **Step 1: Push branch and open PR**

```bash
git checkout -b pace-phase-2-sync-function
git push -u origin pace-phase-2-sync-function
gh pr create --base main --title "feat(pace): sync Cloud Function and GTFS parser (phase 2/5)" --body "$(cat <<'EOF'
## Summary
- Add `parsePaceGtfs` parser producing routes, stops, route-stops, schedules
- Add `hasPaceFeedChanged` / `updatePaceMeta` change detection
- Add `syncPaceGtfs` scheduled Cloud Function running hourly at :10

First deploy populates the new `pace-routes`, `pace-stops`, `pace-route-stops`, `pace-schedules` collections. Nothing user-visible yet.

Spec: docs/superpowers/specs/2026-04-11-pace-bus-section-design.md

## Test plan
- [x] Unit tests for every derivation helper and the top-level parser
- [x] Change detection tests
- [x] Local `cd functions && npm run build` succeeds
- [ ] After merge: deploy via `firebase deploy --only functions:syncPaceGtfs` and verify first run populates Firestore
EOF
)"
```

- [ ] **Step 2: Merge after CI passes**

```bash
gh pr merge --squash
git checkout main && git pull
```

- [ ] **Step 3: Deploy the Cloud Function**

```bash
firebase deploy --only functions:syncPaceGtfs
```

- [ ] **Step 4: Trigger the first run manually**

Either wait for the next `:10` mark or trigger via the Firebase Console → Cloud Scheduler. Verify logs via `firebase functions:log --only syncPaceGtfs`.

- [ ] **Step 5: Spot-check Firestore**

Open the Firebase Console → Firestore and verify `pace-routes` has ~240 docs, `pace-stops` has several thousand, `pace-route-stops` mirrors the route count, and `pace-schedules` matches the stop count. If any counts look wrong, stop and investigate before proceeding to phase 3.

---

# Phase 3 — API Routes (PR 3)

Goal: Ship the two API routes the Phase 4 client components will consume. Both are read-only Firestore proxies with 1-hour cache headers.

---

### Task 3.1: Add `/api/pace/schedules/[slug]` route

**Files:**
- Create: `__tests__/api/pace-schedules.test.ts`
- Create: `app/api/pace/schedules/[slug]/route.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/api/pace-schedules.test.ts`:

```typescript
/**
 * @jest-environment node
 */

jest.mock('@lib/firebase-admin', () => {
  const mockGet = jest.fn()
  const mockDoc = jest.fn().mockReturnValue({ get: mockGet })
  const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc })
  return {
    db: { collection: mockCollection },
    getFirestore: jest.fn(),
    __mocks: { mockGet, mockDoc, mockCollection },
  }
})

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { __mocks } = require('@lib/firebase-admin')
const { mockGet, mockCollection } = __mocks

beforeEach(() => jest.clearAllMocks())

describe('GET /api/pace/schedules/[slug]', () => {
  it('returns schedule data for a valid stop slug', async () => {
    const data = {
      routes: {
        '208': {
          directions: {
            '0': { weekday: [400, 415], saturday: [], sunday: [] },
          },
        },
      },
    }
    mockGet.mockResolvedValue({ exists: true, data: () => data })

    const { GET } = await import('@/app/api/pace/schedules/[slug]/route')
    const req = new Request('http://localhost/api/pace/schedules/golf-rd-waukegan-rd')
    const res = await GET(req as never, {
      params: Promise.resolve({ slug: 'golf-rd-waukegan-rd' }),
    })

    expect(mockCollection).toHaveBeenCalledWith('pace-schedules')
    expect(res.status).toBe(200)
    expect(res.headers.get('Cache-Control')).toContain('s-maxage=3600')
    const body = await res.json()
    expect(body.routes['208']).toBeDefined()
  })

  it('returns 404 for a missing slug', async () => {
    mockGet.mockResolvedValue({ exists: false })
    const { GET } = await import('@/app/api/pace/schedules/[slug]/route')
    const req = new Request('http://localhost/api/pace/schedules/nope')
    const res = await GET(req as never, { params: Promise.resolve({ slug: 'nope' }) })
    expect(res.status).toBe(404)
  })
})
```

- [ ] **Step 2: Run and confirm fail**

Run: `npm test -- __tests__/api/pace-schedules.test.ts`
Expected: FAIL with `Cannot find module '@/app/api/pace/schedules/[slug]/route'`.

- [ ] **Step 3: Create the route file**

Create `app/api/pace/schedules/[slug]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@lib/firebase-admin'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const doc = await db.collection('pace-schedules').doc(slug).get()

  if (!doc.exists) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(doc.data(), {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
```

- [ ] **Step 4: Run and confirm pass**

Run: `npm test -- __tests__/api/pace-schedules.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add __tests__/api/pace-schedules.test.ts app/api/pace/schedules/[slug]/route.ts
git commit -m "feat(api): add /api/pace/schedules/[slug] route"
```

---

### Task 3.2: Add `/api/pace/route-stops/[route]` route

**Files:**
- Create: `__tests__/api/pace-route-stops.test.ts`
- Create: `app/api/pace/route-stops/[route]/route.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/api/pace-route-stops.test.ts` modeled on `pace-schedules.test.ts`:

```typescript
/**
 * @jest-environment node
 */

jest.mock('@lib/firebase-admin', () => {
  const mockGet = jest.fn()
  const mockDoc = jest.fn().mockReturnValue({ get: mockGet })
  const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc })
  return {
    db: { collection: mockCollection },
    getFirestore: jest.fn(),
    __mocks: { mockGet, mockDoc, mockCollection },
  }
})

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { __mocks } = require('@lib/firebase-admin')
const { mockGet, mockCollection } = __mocks

beforeEach(() => jest.clearAllMocks())

describe('GET /api/pace/route-stops/[route]', () => {
  it('returns stop sequences for a valid route', async () => {
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({
        directions: {
          '0': [{ slug: 'a', name: 'A', lat: 0, lon: 0, sequence: 1 }],
          '1': [{ slug: 'a', name: 'A', lat: 0, lon: 0, sequence: 1 }],
        },
      }),
    })

    const { GET } = await import('@/app/api/pace/route-stops/[route]/route')
    const req = new Request('http://localhost/api/pace/route-stops/208')
    const res = await GET(req as never, { params: Promise.resolve({ route: '208' }) })

    expect(mockCollection).toHaveBeenCalledWith('pace-route-stops')
    expect(res.status).toBe(200)
    expect(res.headers.get('Cache-Control')).toContain('s-maxage=3600')
    const body = await res.json()
    expect(body.directions['0']).toHaveLength(1)
  })

  it('returns 404 for a missing route', async () => {
    mockGet.mockResolvedValue({ exists: false })
    const { GET } = await import('@/app/api/pace/route-stops/[route]/route')
    const req = new Request('http://localhost/api/pace/route-stops/nope')
    const res = await GET(req as never, { params: Promise.resolve({ route: 'nope' }) })
    expect(res.status).toBe(404)
  })
})
```

- [ ] **Step 2: Run and confirm fail**

Run: `npm test -- __tests__/api/pace-route-stops.test.ts`
Expected: FAIL.

- [ ] **Step 3: Create the route file**

Create `app/api/pace/route-stops/[route]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@lib/firebase-admin'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ route: string }> },
) {
  const { route } = await params
  const doc = await db.collection('pace-route-stops').doc(route).get()

  if (!doc.exists) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(doc.data(), {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
```

- [ ] **Step 4: Run and confirm pass**

Run: `npm test -- __tests__/api/pace-route-stops.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add __tests__/api/pace-route-stops.test.ts app/api/pace/route-stops/[route]/route.ts
git commit -m "feat(api): add /api/pace/route-stops/[route] route"
```

---

### Task 3.3: PR 3 — Open and merge

- [ ] **Step 1: Full suite green**

Run: `npm test && npm run lint`
Expected: clean.

- [ ] **Step 2: Push branch and open PR**

```bash
git checkout -b pace-phase-3-api-routes
git push -u origin pace-phase-3-api-routes
gh pr create --base main --title "feat(pace): API routes (phase 3/5)" --body "$(cat <<'EOF'
## Summary
- Add `GET /api/pace/schedules/[slug]` — reads pace-schedules from Firestore
- Add `GET /api/pace/route-stops/[route]` — reads pace-route-stops from Firestore

Both return JSON with 1-hour cache headers. No callers yet; will be consumed by phase 4 pages.

Spec: docs/superpowers/specs/2026-04-11-pace-bus-section-design.md

## Test plan
- [x] 200, 404, and cache header tests for both routes
EOF
)"
gh pr merge --squash
git checkout main && git pull
```

---

# Phase 4 — Pages and Components (PR 4)

Goal: Ship the four new pages (`/pace`, `/pace/pulse`, `/pace/[route]`, `/pace/[route]/[stop]`), the four new components (`PaceRouteChip`, `PaceBrowseList`, `PaceRouteSearch`, `PaceScheduleTable`), and the sitemap update. This is the largest phase. Maps on route and stop pages are NOT in this phase — deferred to a future PR.

---

### Task 4.1: `PaceRouteChip` component

**Files:**
- Create: `app/components/PaceRouteChip.tsx`
- Create: `__tests__/components/PaceRouteChip.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/PaceRouteChip.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import PaceRouteChip from '@components/PaceRouteChip'

describe('PaceRouteChip', () => {
  it('renders the route short name with background and text colors', () => {
    render(<PaceRouteChip shortName="208" color="#005DAA" textColor="#FFFFFF" />)
    const chip = screen.getByText('208')
    expect(chip).toBeInTheDocument()
    expect(chip).toHaveStyle({ backgroundColor: '#005DAA', color: '#FFFFFF' })
  })

  it('wraps in a link when href is provided', () => {
    render(<PaceRouteChip shortName="208" color="#005DAA" textColor="#FFFFFF" href="/pace/208" />)
    const link = screen.getByRole('link', { name: '208' })
    expect(link).toHaveAttribute('href', '/pace/208')
  })
})
```

- [ ] **Step 2: Run and confirm fail**

Run: `npm test -- __tests__/components/PaceRouteChip.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Create the component**

Create `app/components/PaceRouteChip.tsx`:

```typescript
import Link from 'next/link'

interface Props {
  shortName: string
  color: string
  textColor: string
  href?: string
  className?: string
}

export default function PaceRouteChip({ shortName, color, textColor, href, className }: Props) {
  const base = `inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${className ?? ''}`
  const style = { backgroundColor: color, color: textColor }

  if (href) {
    return (
      <Link href={href} className={base} style={style}>
        {shortName}
      </Link>
    )
  }

  return (
    <span className={base} style={style}>
      {shortName}
    </span>
  )
}
```

- [ ] **Step 4: Run and confirm pass**

Run: `npm test -- __tests__/components/PaceRouteChip.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/components/PaceRouteChip.tsx __tests__/components/PaceRouteChip.test.tsx
git commit -m "feat(pace): add PaceRouteChip component"
```

---

### Task 4.2: `PaceRouteSearch` client component

**Files:**
- Create: `app/components/PaceRouteSearch.tsx`
- Create: `__tests__/components/PaceRouteSearch.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/PaceRouteSearch.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import PaceRouteSearch from '@components/PaceRouteSearch'
import { mockPaceRoute, mockPacePulseRoute } from '../fixtures'

describe('PaceRouteSearch', () => {
  const routes = [
    mockPaceRoute,
    mockPacePulseRoute,
    { ...mockPaceRoute, slug: '250', shortName: '250', longName: 'Dempster Street' },
  ]

  it('renders the search input', () => {
    render(<PaceRouteSearch routes={routes} />)
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
  })

  it('filters by short name prefix on input', () => {
    render(<PaceRouteSearch routes={routes} />)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '208' } })
    expect(screen.getByText(/Golf Road/i)).toBeInTheDocument()
    expect(screen.queryByText(/Dempster Street/i)).not.toBeInTheDocument()
  })

  it('filters by long name substring', () => {
    render(<PaceRouteSearch routes={routes} />)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Dempster' } })
    expect(screen.getByText(/Dempster Street/i)).toBeInTheDocument()
    expect(screen.queryByText(/Golf Road/i)).not.toBeInTheDocument()
  })

  it('shows nothing when query has no matches', () => {
    render(<PaceRouteSearch routes={routes} />)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzzzz' } })
    expect(screen.getByText(/No routes match/i)).toBeInTheDocument()
  })

  it('is case insensitive', () => {
    render(<PaceRouteSearch routes={routes} />)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'milwaukee' } })
    expect(screen.getByText(/Milwaukee Avenue/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run and confirm fail**

Run: `npm test -- __tests__/components/PaceRouteSearch.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Create the component**

Create `app/components/PaceRouteSearch.tsx`:

```typescript
'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { PaceRoute } from '@lib/pace-types'
import PaceRouteChip from './PaceRouteChip'

interface Props {
  routes: PaceRoute[]
}

export default function PaceRouteSearch({ routes }: Props) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return routes.filter((r) => {
      const short = r.shortName.toLowerCase()
      const long = r.longName.toLowerCase()
      return short.startsWith(q) || long.includes(q)
    })
  }, [routes, query])

  return (
    <div className="mb-8">
      <label htmlFor="pace-route-search" className="sr-only">
        Search Pace routes
      </label>
      <input
        id="pace-route-search"
        type="search"
        role="searchbox"
        placeholder="Search by route number or street name…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
      />

      {query.trim() && (
        <div className="mt-4">
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No routes match your search.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {filtered.map((r) => (
                <li key={r.slug}>
                  <Link
                    href={`/pace/${r.slug}`}
                    className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 transition hover:border-gray-300 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900"
                  >
                    <PaceRouteChip
                      shortName={r.shortName}
                      color={r.color}
                      textColor={r.textColor}
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {r.longName}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run and confirm pass**

Run: `npm test -- __tests__/components/PaceRouteSearch.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/components/PaceRouteSearch.tsx __tests__/components/PaceRouteSearch.test.tsx
git commit -m "feat(pace): add PaceRouteSearch client component"
```

---

### Task 4.3: `PaceBrowseList` server component

**Files:**
- Create: `app/components/PaceBrowseList.tsx`
- Create: `__tests__/components/PaceBrowseList.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/PaceBrowseList.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import PaceBrowseList from '@components/PaceBrowseList'
import { mockPaceRoute, mockPacePulseRoute } from '../fixtures'

describe('PaceBrowseList', () => {
  const routes = [
    mockPaceRoute, // 208, local, north
    mockPacePulseRoute, // Milwaukee Pulse, pulse, northwest
    { ...mockPaceRoute, slug: '353', shortName: '353', longName: 'Cumberland', region: 'northwest' as const },
    { ...mockPaceRoute, slug: '634', shortName: '634', longName: 'Harvey', region: 'south' as const },
  ]

  it('shows the Pulse feature block', () => {
    render(<PaceBrowseList routes={routes} />)
    expect(screen.getByRole('heading', { name: /Pulse/i })).toBeInTheDocument()
    expect(screen.getByText(/Milwaukee Avenue/i)).toBeInTheDocument()
  })

  it('shows region headings for non-Pulse routes', () => {
    render(<PaceBrowseList routes={routes} />)
    expect(screen.getByRole('heading', { name: /North$/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Northwest/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /South$/i })).toBeInTheDocument()
  })

  it('lists routes under their region heading', () => {
    render(<PaceBrowseList routes={routes} />)
    expect(screen.getByText(/Golf Road/i)).toBeInTheDocument()
    expect(screen.getByText(/Harvey/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run and confirm fail**

Run: `npm test -- __tests__/components/PaceBrowseList.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Create the component**

Create `app/components/PaceBrowseList.tsx`:

```typescript
import Link from 'next/link'
import type { PaceRoute, PaceRegion } from '@lib/pace-types'
import PaceRouteChip from './PaceRouteChip'

interface Props {
  routes: PaceRoute[]
}

const REGION_ORDER: PaceRegion[] = [
  'north',
  'northwest',
  'west',
  'southwest',
  'south',
  'heritage',
]

const REGION_LABELS: Record<PaceRegion, string> = {
  north: 'North',
  northwest: 'Northwest',
  west: 'West',
  southwest: 'Southwest',
  south: 'South',
  heritage: 'Heritage Corridor',
}

function RouteItem({ route }: { route: PaceRoute }) {
  return (
    <li>
      <Link
        href={`/pace/${route.slug}`}
        className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 transition hover:border-gray-300 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900"
      >
        <PaceRouteChip
          shortName={route.shortName}
          color={route.color}
          textColor={route.textColor}
        />
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {route.longName}
        </span>
      </Link>
    </li>
  )
}

export default function PaceBrowseList({ routes }: Props) {
  const pulse = routes.filter((r) => r.serviceType === 'pulse')
  const byRegion = new Map<PaceRegion, PaceRoute[]>()
  for (const r of routes) {
    if (r.serviceType === 'pulse') continue
    const list = byRegion.get(r.region) ?? []
    list.push(r)
    byRegion.set(r.region, list)
  }

  return (
    <div className="flex flex-col gap-10">
      {pulse.length > 0 && (
        <section aria-labelledby="pulse-heading">
          <h2
            id="pulse-heading"
            className="mb-4 text-xs font-semibold tracking-widest text-gray-400 uppercase dark:text-gray-500"
          >
            Pulse — Bus Rapid Transit
          </h2>
          <ul className="flex flex-col gap-2">
            {pulse.map((r) => (
              <RouteItem key={r.slug} route={r} />
            ))}
          </ul>
        </section>
      )}

      {REGION_ORDER.map((region) => {
        const list = byRegion.get(region)
        if (!list || list.length === 0) return null
        return (
          <section key={region} aria-labelledby={`region-${region}-heading`}>
            <h2
              id={`region-${region}-heading`}
              className="mb-4 text-xs font-semibold tracking-widest text-gray-400 uppercase dark:text-gray-500"
            >
              {REGION_LABELS[region]}
            </h2>
            <ul className="flex flex-col gap-2">
              {list.map((r) => (
                <RouteItem key={r.slug} route={r} />
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Run and confirm pass**

Run: `npm test -- __tests__/components/PaceBrowseList.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/components/PaceBrowseList.tsx __tests__/components/PaceBrowseList.test.tsx
git commit -m "feat(pace): add PaceBrowseList component"
```

---

### Task 4.4: `PaceScheduleTable` client component

**Files:**
- Create: `app/components/PaceScheduleTable.tsx`
- Create: `__tests__/components/PaceScheduleTable.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/PaceScheduleTable.test.tsx`:

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import PaceScheduleTable from '@components/PaceScheduleTable'

global.fetch = jest.fn()

beforeEach(() => {
  ;(global.fetch as jest.Mock).mockReset()
})

describe('PaceScheduleTable', () => {
  const directions = [
    { id: '0', name: 'East to Evanston' },
    { id: '1', name: 'West to Schaumburg' },
  ]

  it('shows a loading state while fetching', () => {
    ;(global.fetch as jest.Mock).mockReturnValue(new Promise(() => {}))
    render(
      <PaceScheduleTable stopSlug="golf" routeSlug="208" directions={directions} />,
    )
    expect(screen.getByText(/Loading/i)).toBeInTheDocument()
  })

  it('renders departure times for the selected direction and day', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        routes: {
          '208': {
            directions: {
              '0': { weekday: [390, 405, 420], saturday: [], sunday: [] },
              '1': { weekday: [600, 615], saturday: [], sunday: [] },
            },
          },
        },
      }),
    })

    render(
      <PaceScheduleTable stopSlug="golf" routeSlug="208" directions={directions} />,
    )

    await waitFor(() => expect(screen.getByText('6:30 AM')).toBeInTheDocument())
    expect(screen.getByText('6:45 AM')).toBeInTheDocument()
    expect(screen.getByText('7:00 AM')).toBeInTheDocument()
  })

  it('shows an empty state when no trips run on the selected day', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        routes: {
          '208': {
            directions: {
              '0': { weekday: [390], saturday: [], sunday: [] },
            },
          },
        },
      }),
    })

    render(
      <PaceScheduleTable
        stopSlug="golf"
        routeSlug="208"
        directions={directions}
        initialServiceType="sunday"
      />,
    )

    await waitFor(() =>
      expect(screen.getByText(/No scheduled service/i)).toBeInTheDocument(),
    )
  })

  it('shows an error state if fetch fails', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('network'))
    render(
      <PaceScheduleTable stopSlug="golf" routeSlug="208" directions={directions} />,
    )
    await waitFor(() =>
      expect(screen.getByText(/Unable to load schedule/i)).toBeInTheDocument(),
    )
  })
})
```

- [ ] **Step 2: Run and confirm fail**

Run: `npm test -- __tests__/components/PaceScheduleTable.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Create the component**

Create `app/components/PaceScheduleTable.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import type { PaceDirection } from '@lib/pace-types'

type ServiceType = 'weekday' | 'saturday' | 'sunday'

interface DirectionSchedule {
  weekday: number[]
  saturday: number[]
  sunday: number[]
}

interface ScheduleDoc {
  routes: Record<string, { directions: Record<string, DirectionSchedule> }>
}

interface Props {
  stopSlug: string
  routeSlug: string
  directions: PaceDirection[]
  initialServiceType?: ServiceType
}

function minutesToDisplay(minutes: number): string {
  const h24 = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  const period = h24 < 12 ? 'AM' : 'PM'
  const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`
}

export default function PaceScheduleTable({
  stopSlug,
  routeSlug,
  directions,
  initialServiceType = 'weekday',
}: Props) {
  const [data, setData] = useState<ScheduleDoc | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [serviceType, setServiceType] = useState<ServiceType>(initialServiceType)
  const [activeDir, setActiveDir] = useState(directions[0]?.id ?? '0')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/pace/schedules/${stopSlug}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((json: ScheduleDoc) => {
        if (!cancelled) {
          setData(json)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Unable to load schedule.')
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [stopSlug])

  if (loading) return <p className="text-sm text-gray-500">Loading schedule…</p>
  if (error) return <p className="text-sm text-red-500">Unable to load schedule.</p>

  const routeDoc = data?.routes?.[routeSlug]
  const dirDoc = routeDoc?.directions?.[activeDir]
  const times: number[] = dirDoc?.[serviceType] ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2" role="tablist" aria-label="Service type">
        {(['weekday', 'saturday', 'sunday'] as const).map((type) => (
          <button
            key={type}
            role="tab"
            aria-selected={serviceType === type}
            onClick={() => setServiceType(type)}
            className={`rounded-full px-4 py-1 text-xs font-semibold ${
              serviceType === type
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
            }`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {directions.length > 1 && (
        <div className="flex gap-2" role="tablist" aria-label="Direction">
          {directions.map((d) => (
            <button
              key={d.id}
              role="tab"
              aria-selected={activeDir === d.id}
              onClick={() => setActiveDir(d.id)}
              className={`rounded-full px-4 py-1 text-xs font-semibold ${
                activeDir === d.id
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
              }`}
            >
              {d.name}
            </button>
          ))}
        </div>
      )}

      {times.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No scheduled service for this day.
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {times.map((t, i) => (
            <li
              key={`${t}-${i}`}
              className="rounded-lg bg-gray-100 px-3 py-2 text-center text-sm font-medium text-gray-900 dark:bg-gray-800 dark:text-white"
            >
              {minutesToDisplay(t)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run and confirm pass**

Run: `npm test -- __tests__/components/PaceScheduleTable.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/components/PaceScheduleTable.tsx __tests__/components/PaceScheduleTable.test.tsx
git commit -m "feat(pace): add PaceScheduleTable client component"
```

---

### Task 4.5: `/pace` landing page

**Files:**
- Create: `app/pace/page.tsx`
- Create: `__tests__/pages/pace-landing.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/pages/pace-landing.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { mockPaceRoute, mockPacePulseRoute } from '../fixtures'

jest.mock('@lib/pace', () => ({
  getAllPaceRoutes: jest.fn(),
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getAllPaceRoutes } = require('@lib/pace')

describe('/pace landing page', () => {
  beforeEach(() => {
    ;(getAllPaceRoutes as jest.Mock).mockResolvedValue([mockPaceRoute, mockPacePulseRoute])
  })

  it('renders the page title and description', async () => {
    const PacePage = (await import('@/app/pace/page')).default
    render(await PacePage())
    expect(screen.getByRole('heading', { name: /Pace Suburban Bus/i })).toBeInTheDocument()
  })

  it('renders the search input', async () => {
    const PacePage = (await import('@/app/pace/page')).default
    render(await PacePage())
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
  })

  it('renders the alerts disclaimer linking to pacebus.com', async () => {
    const PacePage = (await import('@/app/pace/page')).default
    render(await PacePage())
    const link = screen.getByRole('link', { name: /pacebus\.com/i })
    expect(link).toHaveAttribute('href', expect.stringContaining('pacebus.com'))
  })

  it('renders Pulse and region sections', async () => {
    const PacePage = (await import('@/app/pace/page')).default
    render(await PacePage())
    expect(screen.getByRole('heading', { name: /Pulse/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run and confirm fail**

Run: `npm test -- __tests__/pages/pace-landing.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Create the landing page**

Create `app/pace/page.tsx`:

```typescript
import type { Metadata } from 'next'
import { getAllPaceRoutes } from '@lib/pace'
import PageHeader from '@components/PageHeader'
import PaceBrowseList from '@components/PaceBrowseList'
import PaceRouteSearch from '@components/PaceRouteSearch'
import { siteConfig } from '@lib/siteConfig'

const description =
  'Explore Pace Suburban Bus — 240+ routes across the Chicago suburbs. Schedules, routes, and stops, including Pulse bus rapid transit.'

export const metadata: Metadata = {
  title: 'Pace Suburban Bus',
  description,
  openGraph: {
    title: `Pace Suburban Bus | ${siteConfig.name}`,
    description,
    url: `${siteConfig.url}/pace`,
    images: [siteConfig.ogImage],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `Pace Suburban Bus | ${siteConfig.name}`,
    description,
    images: [siteConfig.ogImage],
  },
}

export default async function PacePage() {
  const routes = await getAllPaceRoutes()

  return (
    <main>
      <PageHeader
        title="Pace Suburban Bus"
        description="Schedules, routes, and stops for 240+ Pace bus routes across the Chicago suburbs."
        breadcrumbItems={[{ label: 'Pace Suburban Bus' }]}
      />

      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        For Pace service advisories, visit{' '}
        <a
          href="https://www.pacebus.com/service-alerts"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline hover:text-blue-800 dark:text-blue-400"
        >
          pacebus.com
        </a>
        .
      </p>

      <PaceRouteSearch routes={routes} />
      <PaceBrowseList routes={routes} />
    </main>
  )
}
```

- [ ] **Step 4: Run and confirm pass**

Run: `npm test -- __tests__/pages/pace-landing.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/pace/page.tsx __tests__/pages/pace-landing.test.tsx
git commit -m "feat(pace): add /pace landing page"
```

---

### Task 4.6: `/pace/pulse` feature page

**Files:**
- Create: `app/pace/pulse/page.tsx`
- Create: `__tests__/pages/pace-pulse.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/pages/pace-pulse.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { mockPaceRoute, mockPacePulseRoute } from '../fixtures'

jest.mock('@lib/pace', () => ({
  getAllPaceRoutes: jest.fn(),
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getAllPaceRoutes } = require('@lib/pace')

describe('/pace/pulse page', () => {
  beforeEach(() => {
    ;(getAllPaceRoutes as jest.Mock).mockResolvedValue([mockPaceRoute, mockPacePulseRoute])
  })

  it('renders a Pulse-specific hero', async () => {
    const PulsePage = (await import('@/app/pace/pulse/page')).default
    render(await PulsePage())
    expect(screen.getByRole('heading', { name: /Pulse/i })).toBeInTheDocument()
  })

  it('lists only Pulse routes', async () => {
    const PulsePage = (await import('@/app/pace/pulse/page')).default
    render(await PulsePage())
    expect(screen.getByText(/Milwaukee Avenue/i)).toBeInTheDocument()
    expect(screen.queryByText(/Golf Road/i)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run and confirm fail**

Run: `npm test -- __tests__/pages/pace-pulse.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Create the page**

Create `app/pace/pulse/page.tsx`:

```typescript
import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllPaceRoutes } from '@lib/pace'
import PageHeader from '@components/PageHeader'
import PaceRouteChip from '@components/PaceRouteChip'
import { siteConfig } from '@lib/siteConfig'

const description =
  'Pulse is Pace Suburban Bus rapid transit — limited-stop service with branded stations, off-board fare payment, and higher-frequency service.'

export const metadata: Metadata = {
  title: 'Pulse — Pace Bus Rapid Transit',
  description,
  openGraph: {
    title: `Pulse | ${siteConfig.name}`,
    description,
    url: `${siteConfig.url}/pace/pulse`,
    images: [siteConfig.ogImage],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `Pulse | ${siteConfig.name}`,
    description,
    images: [siteConfig.ogImage],
  },
}

export default async function PulsePage() {
  const allRoutes = await getAllPaceRoutes()
  const pulseRoutes = allRoutes.filter((r) => r.serviceType === 'pulse')

  return (
    <main>
      <PageHeader
        title="Pulse — Pace Bus Rapid Transit"
        description="Limited-stop service with branded stations, off-board fare payment, and higher-frequency service along Pace's busiest corridors."
        breadcrumbItems={[
          { label: 'Pace', href: '/pace' },
          { label: 'Pulse' },
        ]}
      />

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          What makes Pulse different
        </h2>
        <ul className="flex flex-col gap-2 text-sm text-gray-700 dark:text-gray-300">
          <li>• Branded shelters with real-time arrival information</li>
          <li>• Off-board fare payment for faster boarding</li>
          <li>• Limited-stop service along major corridors</li>
          <li>• Service every 10–15 minutes during peak hours</li>
        </ul>
      </section>

      <section>
        <h2 className="mb-4 text-xs font-semibold tracking-widest text-gray-400 uppercase dark:text-gray-500">
          Pulse Lines
        </h2>
        <ul className="flex flex-col gap-2">
          {pulseRoutes.map((r) => (
            <li key={r.slug}>
              <Link
                href={`/pace/${r.slug}`}
                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 transition hover:border-gray-300 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900"
              >
                <PaceRouteChip
                  shortName={r.shortName}
                  color={r.color}
                  textColor={r.textColor}
                />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {r.longName}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
```

- [ ] **Step 4: Run and confirm pass**

Run: `npm test -- __tests__/pages/pace-pulse.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/pace/pulse/page.tsx __tests__/pages/pace-pulse.test.tsx
git commit -m "feat(pace): add /pace/pulse feature page"
```

---

### Task 4.7: `/pace/[route]` route detail page

**Files:**
- Create: `app/pace/[route]/page.tsx`
- Create: `__tests__/pages/pace-route.test.tsx`

Note: this page uses `getPaceRouteStops` to fetch the canonical stop sequence for the first direction. A client-side direction toggle is left as a future enhancement; v1 renders the primary direction only to keep scope tight. If you decide to add the toggle now, write a small `PaceDirectionToggle` client component following the `PaceScheduleTable` pattern.

- [ ] **Step 1: Write the failing test**

Create `__tests__/pages/pace-route.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { mockPaceRoute } from '../fixtures'

jest.mock('@lib/pace', () => ({
  getAllPaceRoutes: jest.fn(),
  getPaceRoute: jest.fn(),
  getPaceRouteStops: jest.fn(),
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getPaceRoute, getPaceRouteStops, getAllPaceRoutes } = require('@lib/pace')

describe('/pace/[route] route detail page', () => {
  beforeEach(() => {
    ;(getAllPaceRoutes as jest.Mock).mockResolvedValue([mockPaceRoute])
    ;(getPaceRoute as jest.Mock).mockResolvedValue(mockPaceRoute)
    ;(getPaceRouteStops as jest.Mock).mockResolvedValue([
      { slug: 'a', name: 'Stop A', lat: 0, lon: 0, sequence: 1 },
      { slug: 'b', name: 'Stop B', lat: 0, lon: 0, sequence: 2 },
    ])
  })

  it('renders the route name and description', async () => {
    const Page = (await import('@/app/pace/[route]/page')).default
    render(await Page({ params: Promise.resolve({ route: '208' }) }))
    expect(screen.getByRole('heading', { name: /Golf Road/i })).toBeInTheDocument()
  })

  it('lists the stop sequence', async () => {
    const Page = (await import('@/app/pace/[route]/page')).default
    render(await Page({ params: Promise.resolve({ route: '208' }) }))
    expect(screen.getByText('Stop A')).toBeInTheDocument()
    expect(screen.getByText('Stop B')).toBeInTheDocument()
  })

  it('renders a not-found message for unknown routes', async () => {
    ;(getPaceRoute as jest.Mock).mockResolvedValue(null)
    const Page = (await import('@/app/pace/[route]/page')).default
    render(await Page({ params: Promise.resolve({ route: 'nope' }) }))
    expect(screen.getByText(/not found/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run and confirm fail**

Run: `npm test -- __tests__/pages/pace-route.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Create the page**

Create `app/pace/[route]/page.tsx`:

```typescript
import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllPaceRoutes, getPaceRoute, getPaceRouteStops } from '@lib/pace'
import PageHeader from '@components/PageHeader'
import PaceRouteChip from '@components/PaceRouteChip'
import { siteConfig } from '@lib/siteConfig'

type Props = { params: Promise<{ route: string }> }

export async function generateStaticParams() {
  const routes = await getAllPaceRoutes()
  return routes.map((r) => ({ route: r.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { route: slug } = await params
  const route = await getPaceRoute(slug)
  if (!route) return {}
  const title = `Route ${route.shortName} — ${route.longName}`
  const description = route.description ?? `Pace Route ${route.shortName} — ${route.longName}.`
  return {
    title,
    description,
    openGraph: {
      title: `${title} | ${siteConfig.name}`,
      description,
      url: `${siteConfig.url}/pace/${slug}`,
      images: [siteConfig.ogImage],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${siteConfig.name}`,
      description,
      images: [siteConfig.ogImage],
    },
  }
}

export default async function PaceRoutePage({ params }: Props) {
  const { route: slug } = await params
  const route = await getPaceRoute(slug)

  if (!route) {
    return (
      <main>
        <p>Route not found.</p>
      </main>
    )
  }

  const primaryDirection = route.directions[0]
  const stops = primaryDirection
    ? await getPaceRouteStops(route.slug, primaryDirection.id)
    : []

  return (
    <main>
      <PageHeader
        title={`Route ${route.shortName}`}
        description={route.description ?? route.longName}
        breadcrumbItems={[
          { label: 'Pace', href: '/pace' },
          { label: `Route ${route.shortName}` },
        ]}
        badges={
          <>
            <PaceRouteChip
              shortName={route.shortName}
              color={route.color}
              textColor={route.textColor}
            />
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              {route.serviceType === 'pulse' ? 'Pulse BRT' : route.serviceType}
            </span>
          </>
        }
      />

      {primaryDirection && (
        <section>
          <h2 className="mb-4 text-xs font-semibold tracking-widest text-gray-400 uppercase dark:text-gray-500">
            Stops — {primaryDirection.name}
          </h2>
          <ul className="flex flex-col gap-2">
            {stops.map((stop) => (
              <li key={stop.slug}>
                <Link
                  href={`/pace/${route.slug}/${stop.slug}`}
                  className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 transition hover:border-gray-300 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900"
                >
                  <span className="w-8 text-center text-xs font-semibold text-gray-400">
                    {stop.sequence}
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {stop.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}
```

- [ ] **Step 4: Run and confirm pass**

Run: `npm test -- __tests__/pages/pace-route.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/pace/[route]/page.tsx __tests__/pages/pace-route.test.tsx
git commit -m "feat(pace): add /pace/[route] route detail page"
```

---

### Task 4.8: `/pace/[route]/[stop]` stop detail page

**Files:**
- Create: `app/pace/[route]/[stop]/page.tsx`
- Create: `__tests__/pages/pace-stop.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/pages/pace-stop.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { mockPaceRoute, mockPaceStop } from '../fixtures'

jest.mock('@lib/pace', () => ({
  getAllPaceRoutes: jest.fn(),
  getPaceRoute: jest.fn(),
  getPaceStop: jest.fn(),
  getAllPaceStops: jest.fn(),
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getPaceRoute, getPaceStop } = require('@lib/pace')

describe('/pace/[route]/[stop] stop detail page', () => {
  beforeEach(() => {
    ;(getPaceRoute as jest.Mock).mockResolvedValue(mockPaceRoute)
    ;(getPaceStop as jest.Mock).mockResolvedValue(mockPaceStop)
  })

  it('renders the stop name and route chip', async () => {
    const Page = (await import('@/app/pace/[route]/[stop]/page')).default
    render(
      await Page({ params: Promise.resolve({ route: '208', stop: 'golf-rd-waukegan-rd' }) }),
    )
    expect(screen.getByRole('heading', { name: /Golf Rd & Waukegan Rd/i })).toBeInTheDocument()
    expect(screen.getByText('208')).toBeInTheDocument()
  })

  it('renders not found when route or stop is missing', async () => {
    ;(getPaceStop as jest.Mock).mockResolvedValue(null)
    const Page = (await import('@/app/pace/[route]/[stop]/page')).default
    render(await Page({ params: Promise.resolve({ route: '208', stop: 'nope' }) }))
    expect(screen.getByText(/not found/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run and confirm fail**

Run: `npm test -- __tests__/pages/pace-stop.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Create the page**

Create `app/pace/[route]/[stop]/page.tsx`:

```typescript
import type { Metadata } from 'next'
import {
  getAllPaceRoutes,
  getAllPaceStops,
  getPaceRoute,
  getPaceStop,
} from '@lib/pace'
import PageHeader from '@components/PageHeader'
import PaceRouteChip from '@components/PaceRouteChip'
import PaceScheduleTable from '@components/PaceScheduleTable'
import { siteConfig } from '@lib/siteConfig'

type Props = { params: Promise<{ route: string; stop: string }> }

export async function generateStaticParams() {
  const routes = await getAllPaceRoutes()
  const stops = await getAllPaceStops()
  const params: { route: string; stop: string }[] = []
  for (const route of routes) {
    for (const stop of stops) {
      if (stop.routes.includes(route.slug)) {
        params.push({ route: route.slug, stop: stop.slug })
      }
    }
  }
  return params
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { route: routeSlug, stop: stopSlug } = await params
  const [route, stop] = await Promise.all([getPaceRoute(routeSlug), getPaceStop(stopSlug)])
  if (!route || !stop) return {}
  const title = `${stop.name} — Route ${route.shortName}`
  const description = `Schedule and route information for ${stop.name} on Pace Route ${route.shortName}.`
  return {
    title,
    description,
    openGraph: {
      title: `${title} | ${siteConfig.name}`,
      description,
      url: `${siteConfig.url}/pace/${routeSlug}/${stopSlug}`,
      images: [siteConfig.ogImage],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${siteConfig.name}`,
      description,
      images: [siteConfig.ogImage],
    },
  }
}

export default async function PaceStopPage({ params }: Props) {
  const { route: routeSlug, stop: stopSlug } = await params
  const [route, stop] = await Promise.all([getPaceRoute(routeSlug), getPaceStop(stopSlug)])

  if (!route || !stop) {
    return (
      <main>
        <p>Stop not found.</p>
      </main>
    )
  }

  return (
    <main>
      <PageHeader
        title={stop.name}
        description={`Routes and schedules for ${stop.name}.`}
        breadcrumbItems={[
          { label: 'Pace', href: '/pace' },
          { label: `Route ${route.shortName}`, href: `/pace/${route.slug}` },
          { label: stop.name },
        ]}
        badges={
          <div className="flex flex-wrap gap-2">
            {stop.routes.map((r) => (
              <PaceRouteChip
                key={r}
                shortName={r}
                color={r === route.slug ? route.color : '#005DAA'}
                textColor="#FFFFFF"
                href={`/pace/${r}/${stop.slug}`}
              />
            ))}
          </div>
        }
      />

      <section>
        <h2 className="mb-4 text-xs font-semibold tracking-widest text-gray-400 uppercase dark:text-gray-500">
          Schedule — Route {route.shortName}
        </h2>
        <PaceScheduleTable
          stopSlug={stop.slug}
          routeSlug={route.slug}
          directions={route.directions}
        />
      </section>
    </main>
  )
}
```

- [ ] **Step 4: Run and confirm pass**

Run: `npm test -- __tests__/pages/pace-stop.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/pace/[route]/[stop]/page.tsx __tests__/pages/pace-stop.test.tsx
git commit -m "feat(pace): add /pace/[route]/[stop] stop detail page"
```

---

### Task 4.9: Update sitemap with Pace entries

**Files:**
- Modify: `app/sitemap.ts`

- [ ] **Step 1: Open `app/sitemap.ts` and review the current structure**

The file enumerates CTA and Metra lines, stations, and Metra trips. Pace entries follow the same pattern.

- [ ] **Step 2: Add Pace imports and data fetches at the top of `sitemap()`**

Add this import at the top of the file:

```typescript
import { getAllPaceRoutes, getAllPaceStops } from '@lib/pace'
```

Inside `sitemap()`, after the existing `Promise.all` fetching CTA and Metra lines, add:

```typescript
const [paceRoutes, paceStops] = await Promise.all([getAllPaceRoutes(), getAllPaceStops()])
```

- [ ] **Step 3: Add Pace entries to the returned array**

Append these entries inside the returned `[...]` (place them after the Metra entries, before the Metra trip entries at the bottom):

```typescript
{ url: `${baseUrl}/pace`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.9 },
{
  url: `${baseUrl}/pace/pulse`,
  lastModified: new Date(),
  changeFrequency: 'weekly' as const,
  priority: 0.7,
},
...paceRoutes.map((r) => ({
  url: `${baseUrl}/pace/${r.slug}`,
  lastModified: new Date(),
  changeFrequency: 'weekly' as const,
  priority: 0.7,
})),
...paceRoutes.flatMap((r) =>
  paceStops
    .filter((s) => s.routes.includes(r.slug))
    .map((s) => ({
      url: `${baseUrl}/pace/${r.slug}/${s.slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
),
```

- [ ] **Step 4: Run the full suite and lint to confirm no regressions**

Run: `npm test && npm run lint`
Expected: all tests pass, lint clean.

- [ ] **Step 5: Commit**

```bash
git add app/sitemap.ts
git commit -m "feat(pace): add Pace routes and stops to sitemap"
```

---

### Task 4.10: PR 4 — Open and merge

- [ ] **Step 1: Full build sanity check**

Run: `npm run build`
Expected: build completes. This will pre-render all Pace routes and stops. If it fails with memory or time errors, abort and investigate — the fallback is adding `export const dynamic = 'force-dynamic'` to `app/pace/[route]/[stop]/page.tsx` as a last resort.

- [ ] **Step 2: Full test and lint**

Run: `npm test && npm run lint`
Expected: clean.

- [ ] **Step 3: Push and open PR**

```bash
git checkout -b pace-phase-4-pages
git push -u origin pace-phase-4-pages
gh pr create --base main --title "feat(pace): pages and components (phase 4/5)" --body "$(cat <<'EOF'
## Summary
- Add `/pace`, `/pace/pulse`, `/pace/[route]`, `/pace/[route]/[stop]` pages
- Add `PaceRouteChip`, `PaceBrowseList`, `PaceRouteSearch`, `PaceScheduleTable` components
- Update sitemap with Pace routes and stops

Largest phase of the rollout. Section is now reachable by direct URL but not yet linked from the home page or navbar — phase 5 ships that.

Spec: docs/superpowers/specs/2026-04-11-pace-bus-section-design.md

## Test plan
- [x] Component tests for all four new components
- [x] Page tests for all four new pages
- [x] Full `npm run build` completes
- [x] Lint clean
- [ ] Post-merge: spot-check `/pace`, `/pace/pulse`, `/pace/208`, `/pace/208/<some-stop>` in production
EOF
)"
gh pr merge --squash
git checkout main && git pull
```

---

# Phase 5 — Home Hero and Navbar Integration (PR 5)

Goal: Make the Pace section discoverable from the home page and global navbar. Small final PR.

---

### Task 5.1: Update the Hero component to a three-card grid

**Files:**
- Modify: `app/components/Hero.tsx`
- Modify: `__tests__/components/Hero.test.tsx`

- [ ] **Step 1: Update the Hero test**

Open `__tests__/components/Hero.test.tsx`. Add a new test case:

```typescript
it('renders three service cards including Pace', () => {
  render(<Hero />)
  expect(screen.getByRole('link', { name: /Explore CTA/i })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /Explore Metra/i })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /Explore Pace/i })).toBeInTheDocument()
})

it('Pace card is labeled Schedules & Routes', () => {
  render(<Hero />)
  expect(screen.getByText(/Schedules & Routes/i)).toBeInTheDocument()
})
```

Check existing tests in the file and remove or update any that hard-code a two-card assertion.

- [ ] **Step 2: Run and confirm fail**

Run: `npm test -- __tests__/components/Hero.test.tsx`
Expected: FAIL on the new Pace-related assertions.

- [ ] **Step 3: Update `app/components/Hero.tsx`**

Three changes to `app/components/Hero.tsx`:

1. Change the grid class from `sm:grid-cols-2` to `lg:grid-cols-3 sm:grid-cols-2` (stays two-wide on tablets, three-wide on desktop, one-wide on mobile):

```typescript
<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
```

2. Add a `PACE_LINES` constant below `METRA_LINES`:

```typescript
const PACE_LINES = [
  { name: 'Pulse', color: '#FF6C0C' },
  { name: '208', color: '#005DAA' },
  { name: '250', color: '#005DAA' },
  { name: '353', color: '#005DAA' },
  { name: '757', color: '#005DAA' },
  { name: '890', color: '#005DAA' },
]
```

3. Update the `ServiceCardProps` to accept an optional `accentLabel` (so Pace can say "Schedules & Routes" where CTA/Metra imply live data). Alternatively, just rely on the description prop. The cleaner change is to append a third `<ServiceCard>` and set its description to start with "Schedules & Routes". Inside the grid, after the Metra card, add:

```typescript
<ServiceCard
  href="/pace"
  label="Pace"
  description="Schedules & Routes — explore Pace Suburban Bus's 240+ routes across the Chicago suburbs."
  accent="#005DAA"
  lines={PACE_LINES}
/>
```

Also update the CTA description to say `"Live Tracking & Schedules — 8 color-coded rapid transit lines serving Chicago, with 24-hour service on the Red and Blue lines."` and Metra to `"Live Tracking & Schedules — 11 commuter rail lines connecting Chicago to the suburbs across 6 counties and 243 stations."` to match the spec's honesty guidance.

- [ ] **Step 4: Run and confirm pass**

Run: `npm test -- __tests__/components/Hero.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/components/Hero.tsx __tests__/components/Hero.test.tsx
git commit -m "feat(home): add Pace service card to Hero, label live-data services honestly"
```

---

### Task 5.2: Add Pace link to the Navbar

**Files:**
- Modify: `app/components/Navbar.tsx`
- Modify: `__tests__/components/Navbar.test.tsx`

- [ ] **Step 1: Update the Navbar test**

Open `__tests__/components/Navbar.test.tsx`. Add:

```typescript
it('renders a Pace link', () => {
  render(<Navbar />)
  expect(screen.getByRole('link', { name: 'Pace' })).toHaveAttribute('href', '/pace')
})
```

- [ ] **Step 2: Run and confirm fail**

Run: `npm test -- __tests__/components/Navbar.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Add Pace to the `navLinks` array in `app/components/Navbar.tsx`**

Change:

```typescript
const navLinks = [
  { href: '/cta', label: 'CTA' },
  { href: '/metra', label: 'Metra' },
]
```

To:

```typescript
const navLinks = [
  { href: '/cta', label: 'CTA' },
  { href: '/metra', label: 'Metra' },
  { href: '/pace', label: 'Pace' },
]
```

- [ ] **Step 4: Run and confirm pass**

Run: `npm test -- __tests__/components/Navbar.test.tsx`
Expected: PASS.

- [ ] **Step 5: Full suite and lint**

Run: `npm test && npm run lint`
Expected: all clean.

- [ ] **Step 6: Commit**

```bash
git add app/components/Navbar.tsx __tests__/components/Navbar.test.tsx
git commit -m "feat(nav): add Pace link to global Navbar"
```

---

### Task 5.3: PR 5 — Open, merge, ship

- [ ] **Step 1: Push and open PR**

```bash
git checkout -b pace-phase-5-nav-hero
git push -u origin pace-phase-5-nav-hero
gh pr create --base main --title "feat(pace): home Hero and Navbar integration (phase 5/5)" --body "$(cat <<'EOF'
## Summary
- Add Pace service card to home page Hero (three-card grid)
- Update CTA/Metra card copy to say "Live Tracking & Schedules"; Pace says "Schedules & Routes"
- Add Pace link to global Navbar

Final phase — this makes the Pace section discoverable to users.

Spec: docs/superpowers/specs/2026-04-11-pace-bus-section-design.md

## Test plan
- [x] Hero renders three cards
- [x] Pace card is labeled honestly
- [x] Navbar Pace link renders and points to /pace
- [x] Full lint and test clean
- [ ] Post-merge: visit production, verify Pace card appears, Navbar link works
EOF
)"
gh pr merge --squash
git checkout main && git pull
```

- [ ] **Step 2: Verify production deploy**

After Firebase App Hosting finishes deploying from the merge:

- Visit `https://chicagotransittracker.com/`
- Confirm three cards on home page
- Click the Pace card → lands on `/pace`
- Visit `/pace/208` and `/pace/208/<an-actual-stop>`
- Verify the Navbar Pace link is present on all pages

If anything looks wrong, open a hotfix PR or roll back the merge as appropriate.

---

## Final Checklist (run after all 5 PRs merged)

- [ ] `/pace` loads and shows Pulse feature block + regional browse list
- [ ] `/pace/pulse` shows only Pulse routes
- [ ] `/pace/208` (or any real route) shows route detail with stop list
- [ ] `/pace/208/<stop-slug>` shows schedule table with day tabs
- [ ] Home page shows three service cards
- [ ] Navbar has a Pace link
- [ ] Sitemap contains Pace URLs (check `https://chicagotransittracker.com/sitemap.xml`)
- [ ] Cloud Function logs show successful hourly sync: `firebase functions:log --only syncPaceGtfs`
- [ ] No Pace logo is rendered anywhere (license compliance)
- [ ] Footer or landing page credits Pace as the data source
