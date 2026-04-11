# CTA Service Pulse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "service pulse" card row to each CTA line detail page showing realtime health per terminal direction, using CTA Train Tracker `ttpositions` data plus the existing alerts feed.

**Architecture:** Server-side proxy for CTA Train Tracker (with dev fallback) + client-side container component that polls the proxy and the existing alerts proxy every 30s + a pure presentational card row + pure aggregation helpers in a shared lib. Mirrors the Metra CurrentService component split (presentational / container / pure lib / proxy) so the pattern is legible.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Tailwind CSS v4, Jest + React Testing Library. Secrets via `process.env.CTA_TRAIN_TRACKER_KEY` (already provisioned in `.env.local`, `apphosting.yaml`, and Secret Manager as `cta-train-tracker-key`).

**Spec:** [docs/superpowers/specs/2026-04-11-cta-current-service-design.md](../specs/2026-04-11-cta-current-service-design.md)

---

## File Structure

| Path | Responsibility |
|---|---|
| `app/api/cta/train-locations/route.ts` | Server-side proxy. Validates `?rt=` query param, calls `ttpositions.aspx` with the secret key, returns JSON with cache headers. Returns dev fixture when key is missing. |
| `app/lib/cta-train-tracker.ts` | Client-side `fetchCtaTrainLocations(rt)` helper + TypeScript types for the `ttpositions` JSON response shape. |
| `app/lib/cta-pulse.ts` | Pure aggregation + health helpers: `terminalKeyFor`, `aggregateByTerminal`, `computeHealth`, `nextArrivalFor`. No React, no fetching. Fully unit-tested. |
| `app/components/CtaServicePulse.tsx` | Presentational card row. Takes `DirectionPulse[]` and renders one card per terminal with tone styling. No fetching. |
| `app/components/CtaServicePulseContainer.tsx` | Client data wrapper. Takes `line: Line`, polls both feeds on 30s intervals, merges alert severity into health, renders `CtaServicePulse`. |

The CTA Train Tracker icon SVG is optional per CTA branding rules (attribution text is the required element), so it is intentionally not in scope for this plan. Can be added as a follow-up if wanted.

Tests live in mirror paths under `__tests__/`.

---

## Task 1: Add dev fallback fixture

**Files:**
- Create: `app/api/cta/train-locations/fixture.ts`

A static, realistic fixture returned from the proxy when `CTA_TRAIN_TRACKER_KEY` is unset. Used by local dev and tests so the component renders without a real secret.

- [ ] **Step 1: Create the fixture**

```ts
// app/api/cta/train-locations/fixture.ts

// Matches the shape of CTA ttpositions.aspx JSON response, trimmed to the
// fields this project actually consumes. Returned by the proxy when
// CTA_TRAIN_TRACKER_KEY is missing so local dev and tests can render the
// component end-to-end.

export const DEV_FALLBACK_RESPONSE = {
  ctatt: {
    tmst: '2026-04-11T08:00:00',
    errCd: '0',
    errNm: null,
    route: [
      {
        '@name': 'red',
        train: [
          {
            rn: '801',
            destSt: '30173',
            destNm: 'Howard',
            trDr: '1',
            nextStaId: '30174',
            nextStaNm: 'Clark/Lake',
            prdt: '2026-04-11T08:00:00',
            arrT: '2026-04-11T08:03:00',
            isApp: '0',
            isDly: '0',
            lat: '41.88',
            lon: '-87.63',
            heading: '0',
          },
          {
            rn: '802',
            destSt: '30173',
            destNm: 'Howard',
            trDr: '1',
            nextStaId: '40560',
            nextStaNm: 'Grand',
            prdt: '2026-04-11T08:00:00',
            arrT: '2026-04-11T08:06:00',
            isApp: '0',
            isDly: '0',
            lat: '41.89',
            lon: '-87.63',
            heading: '0',
          },
          {
            rn: '901',
            destSt: '30089',
            destNm: '95th/Dan Ryan',
            trDr: '5',
            nextStaId: '41450',
            nextStaNm: 'Roosevelt',
            prdt: '2026-04-11T08:00:00',
            arrT: '2026-04-11T08:04:00',
            isApp: '0',
            isDly: '0',
            lat: '41.87',
            lon: '-87.63',
            heading: '180',
          },
        ],
      },
    ],
  },
} as const
```

- [ ] **Step 2: Commit**

```bash
git add app/api/cta/train-locations/fixture.ts
git commit -m "feat(cta): add ttpositions dev fallback fixture"
```

---

## Task 2: Add proxy route (TDD)

**Files:**
- Create: `app/api/cta/train-locations/route.ts`
- Test: `__tests__/api/cta-train-locations.test.ts`

New GET route that proxies `ttpositions.aspx` with allowlist validation, cache headers, and the dev fallback.

- [ ] **Step 1: Write the failing tests**

```tsx
// __tests__/api/cta-train-locations.test.ts
/**
 * @jest-environment node
 */

const originalFetch = global.fetch
const originalKey = process.env.CTA_TRAIN_TRACKER_KEY

afterEach(() => {
  global.fetch = originalFetch
  if (originalKey == null) delete process.env.CTA_TRAIN_TRACKER_KEY
  else process.env.CTA_TRAIN_TRACKER_KEY = originalKey
  jest.resetModules()
})

describe('GET /api/cta/train-locations', () => {
  it('returns 400 when rt query param is missing', async () => {
    process.env.CTA_TRAIN_TRACKER_KEY = 'test-key'
    const { GET } = await import('@/app/api/cta/train-locations/route')
    const req = new Request('http://localhost/api/cta/train-locations')
    const res = await GET(req as never)
    expect(res.status).toBe(400)
  })

  it('returns 400 when rt is not in the allowlist', async () => {
    process.env.CTA_TRAIN_TRACKER_KEY = 'test-key'
    const { GET } = await import('@/app/api/cta/train-locations/route')
    const req = new Request('http://localhost/api/cta/train-locations?rt=evil')
    const res = await GET(req as never)
    expect(res.status).toBe(400)
  })

  it('returns dev fallback when CTA_TRAIN_TRACKER_KEY is missing', async () => {
    delete process.env.CTA_TRAIN_TRACKER_KEY
    const { GET } = await import('@/app/api/cta/train-locations/route')
    const req = new Request('http://localhost/api/cta/train-locations?rt=red')
    const res = await GET(req as never)
    expect(res.status).toBe(200)
    expect(res.headers.get('x-dev-fallback')).toBe('1')
    const body = await res.json()
    expect(body.ctatt).toBeDefined()
  })

  it('proxies upstream when key is present and returns JSON with cache headers', async () => {
    process.env.CTA_TRAIN_TRACKER_KEY = 'test-key'
    const upstream = { ctatt: { route: [{ '@name': 'red', train: [] }] } }
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => upstream,
    }) as unknown as typeof fetch

    const { GET } = await import('@/app/api/cta/train-locations/route')
    const req = new Request('http://localhost/api/cta/train-locations?rt=red')
    const res = await GET(req as never)

    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toContain('s-maxage=20')
    const body = await res.json()
    expect(body).toEqual(upstream)

    const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>
    const calledUrl = String(fetchMock.mock.calls[0][0])
    expect(calledUrl).toContain('ttpositions.aspx')
    expect(calledUrl).toContain('key=test-key')
    expect(calledUrl).toContain('rt=red')
    expect(calledUrl).toContain('outputType=JSON')
  })

  it('returns 502 when upstream errors', async () => {
    process.env.CTA_TRAIN_TRACKER_KEY = 'test-key'
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'boom',
    }) as unknown as typeof fetch

    const { GET } = await import('@/app/api/cta/train-locations/route')
    const req = new Request('http://localhost/api/cta/train-locations?rt=red')
    const res = await GET(req as never)
    expect(res.status).toBe(502)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/api/cta-train-locations.test.ts`
Expected: FAIL with "Cannot find module '@/app/api/cta/train-locations/route'"

- [ ] **Step 3: Implement the route**

```ts
// app/api/cta/train-locations/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { DEV_FALLBACK_RESPONSE } from './fixture'

const ALLOWED_ROUTES = new Set(['red', 'blue', 'brn', 'g', 'org', 'p', 'pink', 'y'])
const UPSTREAM = 'https://lapi.transitchicago.com/api/1.0/ttpositions.aspx'

export async function GET(req: NextRequest) {
  const rt = new URL(req.url).searchParams.get('rt')
  if (!rt) {
    return NextResponse.json({ error: 'Missing rt query parameter' }, { status: 400 })
  }
  if (!ALLOWED_ROUTES.has(rt.toLowerCase())) {
    return NextResponse.json({ error: 'Unknown route' }, { status: 400 })
  }

  const key = process.env.CTA_TRAIN_TRACKER_KEY
  if (!key) {
    return NextResponse.json(DEV_FALLBACK_RESPONSE, {
      status: 200,
      headers: {
        'X-Dev-Fallback': '1',
        'Cache-Control': 'no-store',
      },
    })
  }

  const url = new URL(UPSTREAM)
  url.searchParams.set('key', key)
  url.searchParams.set('rt', rt.toLowerCase())
  url.searchParams.set('outputType', 'JSON')

  const upstream = await fetch(url.toString())
  if (!upstream.ok) {
    return NextResponse.json(
      { error: `Upstream error ${upstream.status}` },
      { status: 502 },
    )
  }

  const body = await upstream.json()
  return NextResponse.json(body, {
    status: 200,
    headers: {
      'Cache-Control': 'public, s-maxage=20, stale-while-revalidate=40',
    },
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/api/cta-train-locations.test.ts`
Expected: 5 tests passing.

- [ ] **Step 5: Commit**

```bash
git add app/api/cta/train-locations/route.ts __tests__/api/cta-train-locations.test.ts
git commit -m "feat(cta): add ttpositions proxy route with dev fallback"
```

---

## Task 3: Client-side fetch helper + types (TDD)

**Files:**
- Create: `app/lib/cta-train-tracker.ts`
- Test: `__tests__/lib/cta-train-tracker.test.ts`

Client helper that calls the proxy from React components, plus the response types used everywhere downstream.

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/lib/cta-train-tracker.test.ts
import { fetchCtaTrainLocations } from '@lib/cta-train-tracker'

beforeEach(() => {
  global.fetch = jest.fn()
})

describe('fetchCtaTrainLocations', () => {
  it('hits the proxy with the correct route', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ ctatt: { route: [] } }),
    })
    await fetchCtaTrainLocations('red')
    expect(global.fetch).toHaveBeenCalledWith('/api/cta/train-locations?rt=red')
  })

  it('returns the parsed response', async () => {
    const body = { ctatt: { route: [{ '@name': 'red', train: [] }] } }
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => body })
    const result = await fetchCtaTrainLocations('red')
    expect(result).toEqual(body)
  })

  it('throws on HTTP error', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 502 })
    await expect(fetchCtaTrainLocations('red')).rejects.toThrow('CTA API error: 502')
  })

  it('normalizes a single-train response to an array', async () => {
    const body = {
      ctatt: {
        route: [
          {
            '@name': 'y',
            train: {
              rn: '1',
              destSt: '40900',
              destNm: 'Dempster-Skokie',
              trDr: '5',
              nextStaId: '40900',
              nextStaNm: 'Dempster-Skokie',
              prdt: '2026-04-11T08:00:00',
              arrT: '2026-04-11T08:05:00',
              isApp: '0',
              isDly: '0',
              lat: '42.04',
              lon: '-87.75',
              heading: '0',
            },
          },
        ],
      },
    }
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => body })
    const result = await fetchCtaTrainLocations('y')
    expect(Array.isArray(result.ctatt.route[0].train)).toBe(true)
    expect(result.ctatt.route[0].train).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/lib/cta-train-tracker.test.ts`
Expected: FAIL with "Cannot find module '@lib/cta-train-tracker'"

- [ ] **Step 3: Implement the helper and types**

```ts
// app/lib/cta-train-tracker.ts

export interface CtaTrain {
  rn: string           // run number
  destSt: string       // destination station id
  destNm: string       // destination station name
  trDr: string         // direction ("1" or "5")
  nextStaId: string
  nextStaNm: string
  prdt: string         // ISO-ish "2026-04-11T08:00:00"
  arrT: string         // ISO-ish predicted arrival at next station
  isApp: '0' | '1'     // approaching
  isDly: '0' | '1'     // delayed
  lat: string
  lon: string
  heading: string
}

export interface CtaRouteGroup {
  '@name': string
  train?: CtaTrain | CtaTrain[]
}

export interface CtaTrainLocationsResponse {
  ctatt: {
    tmst?: string
    errCd?: string
    errNm?: string | null
    route: CtaRouteGroup[]
  }
}

// Normalized shape: route.train is always an array (upstream returns a single
// object when only one train is present, per XML-style serialization).
export interface NormalizedCtaRouteGroup {
  '@name': string
  train: CtaTrain[]
}

export interface NormalizedCtaTrainLocationsResponse {
  ctatt: {
    tmst?: string
    errCd?: string
    errNm?: string | null
    route: NormalizedCtaRouteGroup[]
  }
}

export async function fetchCtaTrainLocations(
  rt: string,
): Promise<NormalizedCtaTrainLocationsResponse> {
  const res = await fetch(`/api/cta/train-locations?rt=${encodeURIComponent(rt)}`)
  if (!res.ok) throw new Error(`CTA API error: ${res.status}`)
  const raw = (await res.json()) as CtaTrainLocationsResponse

  const route = (raw.ctatt?.route ?? []).map((r) => ({
    '@name': r['@name'],
    train: r.train == null ? [] : Array.isArray(r.train) ? r.train : [r.train],
  }))
  return { ctatt: { ...raw.ctatt, route } }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/lib/cta-train-tracker.test.ts`
Expected: 4 tests passing.

- [ ] **Step 5: Commit**

```bash
git add app/lib/cta-train-tracker.ts __tests__/lib/cta-train-tracker.test.ts
git commit -m "feat(cta): add CTA Train Tracker client fetch helper + types"
```

---

## Task 4: Pure pulse helpers (TDD)

**Files:**
- Create: `app/lib/cta-pulse.ts`
- Test: `__tests__/lib/cta-pulse.test.ts`

Pure functions: terminal matching, aggregation per terminal, health computation. No React, no fetching. These are the brain of the feature and must be exhaustively tested before we build any UI on top.

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/lib/cta-pulse.test.ts
/**
 * @jest-environment node
 */
import {
  aggregateByTerminal,
  computeHealth,
  nextArrivalFor,
  terminalKeyFor,
  type PulseInputTrain,
} from '@lib/cta-pulse'

function t(overrides: Partial<PulseInputTrain>): PulseInputTrain {
  return {
    rn: '1',
    destNm: 'Howard',
    nextStaNm: 'Clark/Lake',
    arrTIso: '2026-04-11T08:03:00',
    isDly: false,
    ...overrides,
  }
}

describe('terminalKeyFor', () => {
  const termini = ['Howard', '95th/Dan Ryan']

  it('matches an exact terminal name', () => {
    expect(terminalKeyFor('Howard', termini)).toBe('Howard')
  })

  it('matches case-insensitively', () => {
    expect(terminalKeyFor('HOWARD', termini)).toBe('Howard')
  })

  it('returns null for an unmatched destination', () => {
    expect(terminalKeyFor('Forest Park', termini)).toBeNull()
  })

  it('handles slash-combined termini by matching either side', () => {
    // Green line terminus is "Cottage Grove / Ashland/63rd" — trains may show
    // either branch's own name as destNm.
    const green = ['Harlem/Lake', 'Cottage Grove / Ashland/63rd']
    expect(terminalKeyFor('Cottage Grove', green)).toBe('Cottage Grove / Ashland/63rd')
    expect(terminalKeyFor('Ashland/63rd', green)).toBe('Cottage Grove / Ashland/63rd')
    expect(terminalKeyFor('Harlem/Lake', green)).toBe('Harlem/Lake')
  })

  it('matches Loop to any loop terminal', () => {
    const brown = ['Kimball', 'Loop']
    expect(terminalKeyFor('Loop', brown)).toBe('Loop')
    expect(terminalKeyFor('Kimball', brown)).toBe('Kimball')
  })
})

describe('aggregateByTerminal', () => {
  const termini = ['Howard', '95th/Dan Ryan']

  it('groups trains by matching terminal', () => {
    const trains = [
      t({ rn: '1', destNm: 'Howard' }),
      t({ rn: '2', destNm: 'Howard', isDly: true }),
      t({ rn: '3', destNm: '95th/Dan Ryan' }),
    ]
    const groups = aggregateByTerminal(trains, termini)
    expect(groups.get('Howard')?.length).toBe(2)
    expect(groups.get('95th/Dan Ryan')?.length).toBe(1)
  })

  it('ignores trains that do not match any terminal', () => {
    const trains = [t({ destNm: 'Howard' }), t({ destNm: 'Mystery Station' })]
    const groups = aggregateByTerminal(trains, termini)
    expect(groups.get('Howard')?.length).toBe(1)
  })

  it('returns an empty array for terminals with no trains', () => {
    const groups = aggregateByTerminal([t({ destNm: 'Howard' })], termini)
    expect(groups.get('95th/Dan Ryan')).toEqual([])
  })
})

describe('nextArrivalFor', () => {
  it('returns the train with the smallest arrival time', () => {
    const trains = [
      t({ rn: '1', arrTIso: '2026-04-11T08:10:00', nextStaNm: 'A' }),
      t({ rn: '2', arrTIso: '2026-04-11T08:05:00', nextStaNm: 'B' }),
      t({ rn: '3', arrTIso: '2026-04-11T08:15:00', nextStaNm: 'C' }),
    ]
    const now = new Date('2026-04-11T08:03:00').getTime()
    const result = nextArrivalFor(trains, now)
    expect(result?.minutes).toBe(2)
    expect(result?.nearStation).toBe('B')
  })

  it('returns null for an empty list', () => {
    expect(nextArrivalFor([], Date.now())).toBeNull()
  })

  it('clamps to 0 when the eta is already past', () => {
    const trains = [t({ arrTIso: '2026-04-11T08:00:00', nextStaNm: 'Already there' })]
    const now = new Date('2026-04-11T08:05:00').getTime()
    expect(nextArrivalFor(trains, now)?.minutes).toBe(0)
  })
})

describe('computeHealth', () => {
  it('returns normal when there are 3+ trains, 0 delayed, no alert', () => {
    expect(
      computeHealth({ trainCount: 4, delayedCount: 0, hasHighAlert: false, inService: true }),
    ).toEqual({ tone: 'normal', label: 'Running normally' })
  })

  it('returns minor when 1-2 trains are active', () => {
    expect(
      computeHealth({ trainCount: 2, delayedCount: 0, hasHighAlert: false, inService: true }).tone,
    ).toBe('minor')
  })

  it('returns minor when any train is delayed', () => {
    expect(
      computeHealth({ trainCount: 5, delayedCount: 1, hasHighAlert: false, inService: true }).tone,
    ).toBe('minor')
  })

  it('returns minor when a high-severity alert is present', () => {
    expect(
      computeHealth({ trainCount: 5, delayedCount: 0, hasHighAlert: true, inService: true }).tone,
    ).toBe('minor')
  })

  it('returns major when majority of trains are delayed', () => {
    expect(
      computeHealth({ trainCount: 4, delayedCount: 3, hasHighAlert: false, inService: true }).tone,
    ).toBe('major')
  })

  it('returns major when in service but no trains are running', () => {
    expect(
      computeHealth({ trainCount: 0, delayedCount: 0, hasHighAlert: false, inService: true }).tone,
    ).toBe('major')
  })

  it('returns no-service when outside service hours with no trains', () => {
    expect(
      computeHealth({ trainCount: 0, delayedCount: 0, hasHighAlert: false, inService: false }).tone,
    ).toBe('no-service')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/lib/cta-pulse.test.ts`
Expected: FAIL with "Cannot find module '@lib/cta-pulse'"

- [ ] **Step 3: Implement the helpers**

```ts
// app/lib/cta-pulse.ts

export interface PulseInputTrain {
  rn: string
  destNm: string
  nextStaNm: string
  arrTIso: string  // "2026-04-11T08:03:00"
  isDly: boolean
}

export type PulseTone = 'normal' | 'minor' | 'major' | 'no-service' | 'nodata'

export interface HealthResult {
  tone: PulseTone
  label: string
}

export interface HealthInput {
  trainCount: number
  delayedCount: number
  hasHighAlert: boolean
  inService: boolean
}

/**
 * Map a realtime destination name to one of the line's configured termini.
 * Handles slash-combined Green line termini and exact/startsWith matching for
 * the rest. Returns the matched terminal string (as it appears in line.termini)
 * or null if no match.
 */
export function terminalKeyFor(destNm: string, termini: string[]): string | null {
  const norm = destNm.trim().toLowerCase()
  for (const terminal of termini) {
    const t = terminal.trim().toLowerCase()
    if (t === norm) return terminal
    // Slash-combined: "Cottage Grove / Ashland/63rd" — split into pieces and
    // match the destination against each piece.
    if (t.includes(' / ')) {
      const parts = t.split(' / ').map((p) => p.trim())
      if (parts.includes(norm)) return terminal
    }
  }
  return null
}

export function aggregateByTerminal(
  trains: PulseInputTrain[],
  termini: string[],
): Map<string, PulseInputTrain[]> {
  const groups = new Map<string, PulseInputTrain[]>()
  for (const terminal of termini) groups.set(terminal, [])
  for (const train of trains) {
    const key = terminalKeyFor(train.destNm, termini)
    if (key == null) continue
    groups.get(key)!.push(train)
  }
  return groups
}

export function nextArrivalFor(
  trains: PulseInputTrain[],
  nowMs: number,
): { minutes: number; nearStation: string } | null {
  if (trains.length === 0) return null
  let best: PulseInputTrain | null = null
  let bestEta = Infinity
  for (const train of trains) {
    const eta = Date.parse(train.arrTIso)
    if (Number.isNaN(eta)) continue
    if (eta < bestEta) {
      bestEta = eta
      best = train
    }
  }
  if (best == null) return null
  const minutes = Math.max(0, Math.round((bestEta - nowMs) / 60_000))
  return { minutes, nearStation: best.nextStaNm }
}

export function computeHealth(input: HealthInput): HealthResult {
  const { trainCount, delayedCount, hasHighAlert, inService } = input

  if (trainCount === 0) {
    if (!inService) return { tone: 'no-service', label: 'No service' }
    return { tone: 'major', label: 'Major delays' }
  }

  // Majority delayed → major
  if (delayedCount > trainCount / 2) {
    return { tone: 'major', label: 'Major delays' }
  }

  // Any delay, alert, or thin service → minor
  if (delayedCount > 0 || hasHighAlert || trainCount < 3) {
    return { tone: 'minor', label: 'Minor delays' }
  }

  return { tone: 'normal', label: 'Running normally' }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/lib/cta-pulse.test.ts`
Expected: 16 tests passing.

- [ ] **Step 5: Commit**

```bash
git add app/lib/cta-pulse.ts __tests__/lib/cta-pulse.test.ts
git commit -m "feat(cta): add pure pulse aggregation and health helpers"
```

---

## Task 5: Presentational component (TDD)

**Files:**
- Create: `app/components/CtaServicePulse.tsx`
- Test: `__tests__/components/CtaServicePulse.test.tsx`

Pure presentational component that renders the card row. Takes normalized `DirectionPulse[]` and line color; no fetching, no state.

- [ ] **Step 1: Write the failing tests**

```tsx
// __tests__/components/CtaServicePulse.test.tsx
import { render, screen } from '@testing-library/react'
import CtaServicePulse, { type DirectionPulse } from '@components/CtaServicePulse'

const sampleDirections: DirectionPulse[] = [
  {
    terminalName: 'Howard',
    trainCount: 8,
    delayedCount: 0,
    nextArrivalMinutes: 3,
    nextArrivalNearStation: 'Clark/Lake',
    healthLabel: 'Running normally',
    healthTone: 'normal',
  },
  {
    terminalName: '95th/Dan Ryan',
    trainCount: 6,
    delayedCount: 2,
    nextArrivalMinutes: 5,
    nextArrivalNearStation: 'Roosevelt',
    healthLabel: 'Minor delays',
    healthTone: 'minor',
  },
]

describe('CtaServicePulse', () => {
  it('renders one card per direction with terminal name and health label', () => {
    render(<CtaServicePulse directions={sampleDirections} lineColor="#c60c30" />)
    expect(screen.getByText('To Howard')).toBeInTheDocument()
    expect(screen.getByText('To 95th/Dan Ryan')).toBeInTheDocument()
    expect(screen.getByText('Running normally')).toBeInTheDocument()
    expect(screen.getByText('Minor delays')).toBeInTheDocument()
  })

  it('renders train count, next arrival, and delay summary when > 0', () => {
    render(<CtaServicePulse directions={sampleDirections} lineColor="#c60c30" />)
    expect(screen.getByText('8 trains running')).toBeInTheDocument()
    expect(screen.getByText(/Next train in 3 min/)).toBeInTheDocument()
    expect(screen.getByText(/near Clark\/Lake/)).toBeInTheDocument()
    expect(screen.getByText('2 of 6 trains delayed')).toBeInTheDocument()
  })

  it('hides the delay summary when delayedCount is 0', () => {
    render(<CtaServicePulse directions={[sampleDirections[0]]} lineColor="#c60c30" />)
    expect(screen.queryByText(/trains delayed/)).not.toBeInTheDocument()
  })

  it('renders a data-tone attribute matching each direction tone', () => {
    const { container } = render(
      <CtaServicePulse directions={sampleDirections} lineColor="#c60c30" />,
    )
    const tones = Array.from(container.querySelectorAll('[data-tone]')).map((el) =>
      el.getAttribute('data-tone'),
    )
    expect(tones).toEqual(['normal', 'minor'])
  })

  it('renders the CTA Train Tracker attribution footer', () => {
    render(<CtaServicePulse directions={sampleDirections} lineColor="#c60c30" />)
    expect(screen.getByText(/Powered by CTA Train Tracker/)).toBeInTheDocument()
    expect(
      screen.getByText(/trademark of the Chicago Transit Authority/),
    ).toBeInTheDocument()
  })

  it('renders the alert snippet when provided', () => {
    render(
      <CtaServicePulse
        directions={sampleDirections}
        lineColor="#c60c30"
        alertSnippet="Elevator out at Clark/Lake"
      />,
    )
    expect(screen.getByText(/Elevator out at Clark\/Lake/)).toBeInTheDocument()
  })

  it('renders an error state when error is set', () => {
    render(
      <CtaServicePulse
        directions={[]}
        lineColor="#c60c30"
        error="Network down"
      />,
    )
    expect(screen.getByText(/Live service data unavailable/)).toBeInTheDocument()
  })

  it('renders a skeleton while loading with no directions yet', () => {
    const { container } = render(
      <CtaServicePulse directions={[]} lineColor="#c60c30" loading />,
    )
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/components/CtaServicePulse.test.tsx`
Expected: FAIL with "Cannot find module '@components/CtaServicePulse'"

- [ ] **Step 3: Implement the component**

```tsx
// app/components/CtaServicePulse.tsx
import type { PulseTone } from '@lib/cta-pulse'

export type { PulseTone }

export interface DirectionPulse {
  terminalName: string
  trainCount: number
  delayedCount: number
  nextArrivalMinutes: number | null
  nextArrivalNearStation: string | null
  healthLabel: string
  healthTone: PulseTone
}

export interface CtaServicePulseProps {
  directions: DirectionPulse[]
  lineColor: string
  loading?: boolean
  error?: string | null
  alertSnippet?: string | null
}

const TONE_CLASSES: Record<PulseTone, { dot: string; text: string; pill: string }> = {
  normal: {
    dot: 'bg-green-500',
    text: 'text-green-600 dark:text-green-400',
    pill: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  minor: {
    dot: 'bg-yellow-500',
    text: 'text-yellow-600 dark:text-yellow-400',
    pill: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  major: {
    dot: 'bg-red-500',
    text: 'text-red-600 dark:text-red-400',
    pill: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  'no-service': {
    dot: 'bg-gray-400',
    text: 'text-gray-500 dark:text-gray-400',
    pill: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  },
  nodata: {
    dot: 'bg-gray-400',
    text: 'text-gray-500 dark:text-gray-400',
    pill: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  },
}

export default function CtaServicePulse({
  directions,
  lineColor,
  loading = false,
  error = null,
  alertSnippet = null,
}: CtaServicePulseProps) {
  return (
    <section
      className="mb-8 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900"
      style={{ borderLeftWidth: '4px', borderLeftColor: lineColor }}
      data-testid="cta-service-pulse"
    >
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-800">
        <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase dark:text-gray-500">
          Current service
        </p>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-white/50">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" aria-hidden="true" />
          Live
        </div>
      </div>

      {error && (
        <p className="px-5 py-4 text-sm text-red-500">Live service data unavailable: {error}</p>
      )}

      {loading && directions.length === 0 && !error && (
        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800"
              aria-hidden="true"
            />
          ))}
        </div>
      )}

      {!loading && directions.length > 0 && (
        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
          {directions.map((d) => {
            const tone = TONE_CLASSES[d.healthTone]
            return (
              <div
                key={d.terminalName}
                className="rounded-lg border border-gray-100 p-4 dark:border-gray-800"
                data-tone={d.healthTone}
                data-testid={`pulse-card-${d.terminalName}`}
              >
                <p className="text-xs font-semibold tracking-wide text-gray-400 uppercase dark:text-gray-500">
                  To
                </p>
                <p className="mt-0.5 text-xl font-bold text-gray-900 dark:text-white">
                  To {d.terminalName}
                </p>

                <div className="mt-3 flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} aria-hidden="true" />
                  <span className={`text-sm font-semibold ${tone.text}`}>{d.healthLabel}</span>
                </div>

                <dl className="mt-3 space-y-1 text-sm text-gray-600 dark:text-white/70">
                  <div>
                    <dt className="sr-only">Trains running</dt>
                    <dd className="tabular-nums">
                      {d.trainCount} {d.trainCount === 1 ? 'train' : 'trains'} running
                    </dd>
                  </div>
                  {d.nextArrivalMinutes != null && d.nextArrivalNearStation && (
                    <div>
                      <dt className="sr-only">Next arrival</dt>
                      <dd>
                        Next train in{' '}
                        <span className="tabular-nums">{d.nextArrivalMinutes} min</span> near{' '}
                        {d.nextArrivalNearStation}
                      </dd>
                    </div>
                  )}
                  {d.delayedCount > 0 && (
                    <div>
                      <dt className="sr-only">Delay summary</dt>
                      <dd className="text-yellow-700 dark:text-yellow-400">
                        {d.delayedCount} of {d.trainCount} trains delayed
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            )
          })}
        </div>
      )}

      {alertSnippet && (
        <div className="border-t border-gray-100 bg-yellow-50 px-5 py-3 text-sm text-yellow-900 dark:border-gray-800 dark:bg-yellow-900/20 dark:text-yellow-200">
          <strong className="font-semibold">Alert:</strong> {alertSnippet}
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-gray-100 px-5 py-2 text-xs text-gray-500 dark:border-gray-800 dark:text-white/50">
        Powered by CTA Train Tracker. CTA Train Tracker (SM) logo icon is a trademark of the
        Chicago Transit Authority.
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/components/CtaServicePulse.test.tsx`
Expected: 8 tests passing.

- [ ] **Step 5: Commit**

```bash
git add app/components/CtaServicePulse.tsx __tests__/components/CtaServicePulse.test.tsx
git commit -m "feat(cta): add CtaServicePulse presentational component"
```

---

## Task 6: Data wrapper container (TDD)

**Files:**
- Create: `app/components/CtaServicePulseContainer.tsx`
- Test: `__tests__/components/CtaServicePulseContainer.test.tsx`

Client component. Polls `fetchCtaTrainLocations` and `fetchCTAAlerts` every 30 s, normalizes into `DirectionPulse[]` (using `aggregateByTerminal`, `nextArrivalFor`, `computeHealth`), and renders `CtaServicePulse`. Handles loading, error, visibility-pause.

- [ ] **Step 1: Write the failing tests**

```tsx
// __tests__/components/CtaServicePulseContainer.test.tsx
import { act, render, screen, waitFor } from '@testing-library/react'
import CtaServicePulseContainer from '@components/CtaServicePulseContainer'
import { fetchCtaTrainLocations } from '@lib/cta-train-tracker'
import { fetchCTAAlerts } from '@lib/cta-alerts'
import type { Line } from '@lib/types'

jest.mock('@lib/cta-train-tracker')
jest.mock('@lib/cta-alerts')

const mockFetchLocations = fetchCtaTrainLocations as jest.MockedFunction<
  typeof fetchCtaTrainLocations
>
const mockFetchAlerts = fetchCTAAlerts as jest.MockedFunction<typeof fetchCTAAlerts>

const redLine: Line = {
  id: 'red',
  name: 'Red Line',
  shortName: 'Red',
  slug: 'red',
  service: 'cta',
  color: '#c60c30',
  textColor: '#ffffff',
  termini: ['Howard', '95th/Dan Ryan'],
  stationCount: 33,
  routeMiles: 23,
  operatesOvernight: true,
  peakFrequencyMins: 6,
  offPeakFrequencyMins: 10,
  firstTrainApprox: null,
  lastTrainApprox: null,
  type: 'rapid_transit',
  description: '',
  ctaRouteId: 'Red',
  metraLineCode: null,
  downtownTerminal: null,
  operator: null,
  countiesServed: [],
  photoUrl: null,
  scheduleUrl: null,
}

function mkTrain(overrides: {
  rn: string
  destNm: string
  nextStaNm?: string
  arrT?: string
  isDly?: '0' | '1'
}) {
  return {
    rn: overrides.rn,
    destSt: '0',
    destNm: overrides.destNm,
    trDr: '1',
    nextStaId: '0',
    nextStaNm: overrides.nextStaNm ?? 'Clark/Lake',
    prdt: '2026-04-11T08:00:00',
    arrT: overrides.arrT ?? '2026-04-11T08:05:00',
    isApp: '0' as const,
    isDly: overrides.isDly ?? ('0' as const),
    lat: '0',
    lon: '0',
    heading: '0',
  }
}

beforeEach(() => {
  jest.clearAllMocks()
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
      'performance',
    ],
    now: new Date('2026-04-11T08:00:00'),
  })
})

afterEach(() => {
  jest.useRealTimers()
})

describe('CtaServicePulseContainer', () => {
  it('polls train-locations and alerts and renders one card per terminal', async () => {
    mockFetchLocations.mockResolvedValue({
      ctatt: {
        route: [
          {
            '@name': 'red',
            train: [
              mkTrain({ rn: '1', destNm: 'Howard' }),
              mkTrain({ rn: '2', destNm: 'Howard' }),
              mkTrain({ rn: '3', destNm: 'Howard' }),
              mkTrain({ rn: '4', destNm: '95th/Dan Ryan' }),
              mkTrain({ rn: '5', destNm: '95th/Dan Ryan' }),
              mkTrain({ rn: '6', destNm: '95th/Dan Ryan' }),
            ],
          },
        ],
      },
    })
    mockFetchAlerts.mockResolvedValue([])

    render(<CtaServicePulseContainer line={redLine} />)

    await waitFor(() => {
      expect(screen.getByTestId('pulse-card-Howard')).toBeInTheDocument()
    })
    expect(screen.getByTestId('pulse-card-95th/Dan Ryan')).toBeInTheDocument()
    expect(mockFetchLocations).toHaveBeenCalledWith('red')
    expect(mockFetchAlerts).toHaveBeenCalledWith('Red')
  })

  it('marks the card minor when any train has isDly=1', async () => {
    mockFetchLocations.mockResolvedValue({
      ctatt: {
        route: [
          {
            '@name': 'red',
            train: [
              mkTrain({ rn: '1', destNm: 'Howard', isDly: '1' }),
              mkTrain({ rn: '2', destNm: 'Howard' }),
              mkTrain({ rn: '3', destNm: 'Howard' }),
              mkTrain({ rn: '4', destNm: '95th/Dan Ryan' }),
            ],
          },
        ],
      },
    })
    mockFetchAlerts.mockResolvedValue([])

    render(<CtaServicePulseContainer line={redLine} />)

    await waitFor(() => {
      expect(screen.getByTestId('pulse-card-Howard')).toHaveAttribute('data-tone', 'minor')
    })
  })

  it('bumps health to minor when a high-severity alert exists for the line', async () => {
    mockFetchLocations.mockResolvedValue({
      ctatt: {
        route: [
          {
            '@name': 'red',
            train: [
              mkTrain({ rn: '1', destNm: 'Howard' }),
              mkTrain({ rn: '2', destNm: 'Howard' }),
              mkTrain({ rn: '3', destNm: 'Howard' }),
              mkTrain({ rn: '4', destNm: '95th/Dan Ryan' }),
              mkTrain({ rn: '5', destNm: '95th/Dan Ryan' }),
              mkTrain({ rn: '6', destNm: '95th/Dan Ryan' }),
            ],
          },
        ],
      },
    })
    mockFetchAlerts.mockResolvedValue([
      {
        AlertId: 'A1',
        Headline: 'Major delay',
        ShortDescription: 'Trains stopped',
        FullDescription: { '#cdata-section': '' },
        SeverityScore: '70',
        SeverityColor: '',
        SeverityCSS: '',
        Impact: '',
        EventStart: '',
        EventEnd: null,
        TBD: '',
        MajorAlert: '1',
        AlertURL: { '#cdata-section': '' },
        ImpactedService: {
          Service: {
            ServiceType: '',
            ServiceTypeDescription: '',
            ServiceName: 'Red Line',
            ServiceId: 'Red',
            ServiceBackColor: '',
            ServiceTextColor: '',
            ServiceURL: { '#cdata-section': '' },
          },
        },
      },
    ])

    render(<CtaServicePulseContainer line={redLine} />)

    await waitFor(() => {
      expect(screen.getByTestId('pulse-card-Howard')).toHaveAttribute('data-tone', 'minor')
    })
    expect(screen.getByText(/Alert:/)).toBeInTheDocument()
  })

  it('renders an empty state when the train-locations call errors', async () => {
    mockFetchLocations.mockRejectedValue(new Error('Network down'))
    mockFetchAlerts.mockResolvedValue([])

    render(<CtaServicePulseContainer line={redLine} />)

    await waitFor(() => {
      expect(screen.getByText(/Live service data unavailable/)).toBeInTheDocument()
    })
  })

  it('re-fetches when the tab regains visibility', async () => {
    mockFetchLocations.mockResolvedValue({
      ctatt: { route: [{ '@name': 'red', train: [] }] },
    })
    mockFetchAlerts.mockResolvedValue([])
    render(<CtaServicePulseContainer line={redLine} />)

    await waitFor(() => {
      expect(mockFetchLocations).toHaveBeenCalled()
    })
    mockFetchLocations.mockClear()

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    })
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await waitFor(() => {
      expect(mockFetchLocations).toHaveBeenCalled()
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/components/CtaServicePulseContainer.test.tsx`
Expected: FAIL with "Cannot find module '@components/CtaServicePulseContainer'"

- [ ] **Step 3: Implement the container**

```tsx
// app/components/CtaServicePulseContainer.tsx
'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchCtaTrainLocations, type CtaTrain } from '@lib/cta-train-tracker'
import { fetchCTAAlerts, getRailServices, type CTAAlert } from '@lib/cta-alerts'
import {
  aggregateByTerminal,
  computeHealth,
  nextArrivalFor,
  type PulseInputTrain,
} from '@lib/cta-pulse'
import type { Line } from '@lib/types'
import CtaServicePulse, { type DirectionPulse } from './CtaServicePulse'

const POLL_INTERVAL_MS = 30_000
const HIGH_SEVERITY_THRESHOLD = 50

function toPulseInput(train: CtaTrain): PulseInputTrain {
  return {
    rn: train.rn,
    destNm: train.destNm,
    nextStaNm: train.nextStaNm,
    arrTIso: train.arrT,
    isDly: train.isDly === '1',
  }
}

function hasHighSeverityAlertForLine(alerts: CTAAlert[], serviceId: string | null): boolean {
  if (!serviceId) return false
  return alerts.some((a) => {
    const score = parseInt(a.SeverityScore, 10)
    if (Number.isNaN(score) || score < HIGH_SEVERITY_THRESHOLD) return false
    return getRailServices(a).some((s) => s.ServiceId === serviceId)
  })
}

function firstAlertSnippet(alerts: CTAAlert[], serviceId: string | null): string | null {
  if (!serviceId) return null
  const match = alerts.find((a) =>
    getRailServices(a).some((s) => s.ServiceId === serviceId),
  )
  return match?.Headline ?? null
}

// Scheduled service hours: 4:00 AM - 1:30 AM for non-24-hour lines.
// 24-hour lines (Red, Blue) are always "in service" so zero trains reads as
// `major` rather than `no-service`.
function isInService(now: Date, operatesOvernight: boolean): boolean {
  if (operatesOvernight) return true
  const minutes = now.getHours() * 60 + now.getMinutes()
  return minutes >= 4 * 60 || minutes <= 1 * 60 + 30
}

export default function CtaServicePulseContainer({ line }: { line: Line }) {
  const [trains, setTrains] = useState<PulseInputTrain[] | null>(null)
  const [alerts, setAlerts] = useState<CTAAlert[]>([])
  const [error, setError] = useState<string | null>(null)
  const [nowMs, setNowMs] = useState<number>(() => Date.now())
  const [hasFetched, setHasFetched] = useState(false)

  const mountedRef = useRef(false)

  const routeCode = (line.ctaRouteId ?? '').toLowerCase()

  const load = useCallback(async () => {
    try {
      const [locations, alertList] = await Promise.all([
        fetchCtaTrainLocations(routeCode),
        fetchCTAAlerts(line.ctaRouteId ?? undefined),
      ])
      const route = locations.ctatt.route.find((r) => r['@name'].toLowerCase() === routeCode)
      const rawTrains = route?.train ?? []
      setTrains(rawTrains.map(toPulseInput))
      setAlerts(alertList)
      setNowMs(Date.now())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      // Use functional update so the callback does not depend on current trains
      // state — keeping load's identity stable prevents polling interval thrash.
      setTrains((prev) => prev ?? [])
    } finally {
      setHasFetched(true)
    }
  }, [routeCode, line.ctaRouteId])

  useEffect(() => {
    mountedRef.current = true
    load()
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      load()
    }, POLL_INTERVAL_MS)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') load()
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility)
    }
    return () => {
      mountedRef.current = false
      clearInterval(interval)
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility)
      }
    }
  }, [load])

  const directions = useMemo<DirectionPulse[]>(() => {
    if (trains == null) return []
    const now = new Date(nowMs)
    const groups = aggregateByTerminal(trains, line.termini)
    const hasHighAlert = hasHighSeverityAlertForLine(alerts, line.ctaRouteId)
    const inService = isInService(now, line.operatesOvernight)

    const result: DirectionPulse[] = []
    for (const terminal of line.termini) {
      const direction = groups.get(terminal) ?? []
      const delayed = direction.filter((t) => t.isDly).length
      const health = computeHealth({
        trainCount: direction.length,
        delayedCount: delayed,
        hasHighAlert,
        inService,
      })
      const next = nextArrivalFor(direction, nowMs)
      result.push({
        terminalName: terminal,
        trainCount: direction.length,
        delayedCount: delayed,
        nextArrivalMinutes: next?.minutes ?? null,
        nextArrivalNearStation: next?.nearStation ?? null,
        healthLabel: health.label,
        healthTone: health.tone,
      })
    }
    return result
  }, [trains, alerts, nowMs, line.termini, line.ctaRouteId, line.operatesOvernight])

  const alertSnippet = firstAlertSnippet(alerts, line.ctaRouteId)

  return (
    <CtaServicePulse
      directions={directions}
      lineColor={line.color}
      loading={!hasFetched}
      error={error}
      alertSnippet={alertSnippet}
    />
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/components/CtaServicePulseContainer.test.tsx`
Expected: 5 tests passing.

- [ ] **Step 5: Commit**

```bash
git add app/components/CtaServicePulseContainer.tsx __tests__/components/CtaServicePulseContainer.test.tsx
git commit -m "feat(cta): add CtaServicePulseContainer data wrapper"
```

---

## Task 7: Wire into CTA line detail page (TDD)

**Files:**
- Modify: `app/cta/[line]/page.tsx`
- Modify: `__tests__/pages/cta-line.test.tsx`

Render the container at the top of the left column on every CTA line page.

- [ ] **Step 1: Update the CTA line page test**

Read the existing test first:

```bash
cat __tests__/pages/cta-line.test.tsx
```

Add these entries to the `jest.mock('@lib/transit', ...)` factory and a new mock block. Keep all existing mocks:

```tsx
jest.mock('@components/CtaServicePulseContainer', () => {
  return function MockCtaServicePulseContainer(props: { line: { slug: string } }) {
    return (
      <div data-testid="cta-service-pulse-container-mock" data-line-slug={props.line.slug} />
    )
  }
})
```

Add a new test case:

```tsx
it('renders the CtaServicePulseContainer wired to the line', async () => {
  const ui = await CTALinePage({ params })
  render(ui)
  const mock = screen.getByTestId('cta-service-pulse-container-mock')
  expect(mock).toBeInTheDocument()
  expect(mock.getAttribute('data-line-slug')).toBe('red')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/pages/cta-line.test.tsx -u`
Expected: FAIL (container not yet rendered on the page) or stale snapshot.

- [ ] **Step 3: Wire the container into the page**

Edit `app/cta/[line]/page.tsx`:

```tsx
// add to imports
import CtaServicePulseContainer from '@components/CtaServicePulseContainer'
```

Replace the left-column block:

```tsx
        <div className="lg:col-span-2">
          <CtaServicePulseContainer line={line} />
          <LineDetail line={line} />
          <CTAAlerts line={line} hideChips />
        </div>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest __tests__/pages/cta-line.test.tsx -u`
Expected: PASS (snapshot refreshed).

- [ ] **Step 5: Commit**

```bash
git add app/cta/[line]/page.tsx __tests__/pages/cta-line.test.tsx __tests__/pages/__snapshots__/cta-line.test.tsx.snap
git commit -m "feat(cta): render CtaServicePulseContainer on line detail pages"
```

---

## Task 8: Docs + full verification

**Files:**
- Modify: `README.md`
- Modify: `CLAUDE.md`

Update the two documentation files with the new components and lib modules, then run lint / tests / build end-to-end.

- [ ] **Step 1: Update README.md Components table**

Add two rows to the Components table in `README.md` (find the existing table near line 40):

```md
| `CtaServicePulse`     | Presentational card row — one card per terminal with health indicator   |
| `CtaServicePulseContainer` | CTA data wrapper — polls ttpositions + alerts, feeds CtaServicePulse |
```

- [ ] **Step 2: Update CLAUDE.md Project Structure tree**

In `CLAUDE.md`, add these entries under `app/components/`:

```
    CtaServicePulse.tsx       Presentational card row for CTA service health per terminal
    CtaServicePulseContainer.tsx  CTA data wrapper — polls ttpositions + alerts
```

Under `app/lib/`:

```
    cta-train-tracker.ts      Client-side fetch + types for CTA Train Tracker positions
    cta-pulse.ts              Pure aggregation + health helpers for CTA service pulse
```

Under `app/api/`:

```
    cta/train-locations/
      route.ts                Server-side proxy for CTA Train Tracker ttpositions
```

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: All suites pass, no new failures.

- [ ] **Step 4: Run lint**

Run: `npm run lint`
Expected: clean. If prettier flags any file, run `npx prettier --write <file>` and rerun lint.

- [ ] **Step 5: Run the production build**

Run: `npm run build`
Expected: build succeeds, all CTA line pages pre-render.

- [ ] **Step 6: Commit docs**

```bash
git add README.md CLAUDE.md
git commit -m "docs: add CtaServicePulse components and lib to README + CLAUDE.md"
```

---

## Verification (manual, post-implementation)

1. `npm run dev`, open `/cta/red` in the browser.
2. Confirm two pulse cards render at the top of the left column on desktop; confirm they stack single-column above 768px.
3. Confirm each card shows a train count, next arrival line, and a colored health dot.
4. Open DevTools Network panel. Confirm `/api/cta/train-locations?rt=red` is hit on mount and then every 30 s. Confirm `/api/cta/alerts?routeid=Red` is hit alongside it.
5. Open `/cta/blue` and confirm two cards render (Blue line termini are `O'Hare` and `Forest Park`). Note: a Blue Line train whose `destNm` is "54th/Cermak" will not match any terminal — this is expected per the spec. Only trains heading to configured termini appear.
6. Open `/cta/y` (Yellow/Skokie) and confirm two cards render even though only one direction is typically active.
7. Stop `npm run dev`, comment out `CTA_TRAIN_TRACKER_KEY` in `.env.local`, restart. Reload `/cta/red` and confirm the component still renders from the dev fixture. Network panel should show `x-dev-fallback: 1` on the proxy response.
8. Uncomment the key and restart to leave local dev in a working state.
9. `npm run build` succeeds; all CTA line pages pre-render via `generateStaticParams`.

---

## Out of Scope

- CTA train detail pages (no rider-facing train identity)
- Live map view of CTA positions
- Historical health trends
- Any Metra changes

The only CTA files touched outside this plan's file structure are `README.md` and `CLAUDE.md`.
