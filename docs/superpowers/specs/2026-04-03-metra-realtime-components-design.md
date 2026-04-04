# Metra GTFS Realtime Components — Design Spec

**Date:** 2026-04-03
**Status:** Draft

---

## Context

The site currently uses static GTFS schedule data for Metra (pre-generated JSON files). Metra provides a GTFS Realtime API with three feeds — Alerts, Vehicle Positions, and Trip Updates — that return live data as Protocol Buffers. This spec covers adding three client-side debug components that fetch, decode, and `console.log` the raw feed data so we can inspect the protobuf structure before building real UI around it.

---

## Decisions

| Decision            | Choice                                | Rationale                                                                                    |
| ------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------- |
| API key exposure    | Client-side (exposed in browser)      | Static export site, no server runtime. Key is free/public-tier.                              |
| Key storage         | `NEXT_PUBLIC_METRA_API_TOKEN` env var | Next.js convention for browser-exposed vars. `.env.local` for dev, GitHub secret for CI.     |
| Protobuf library    | `gtfs-realtime-bindings`              | Official Google GTFS Realtime JS bindings. Purpose-built.                                    |
| Component structure | Three separate components             | Matches existing patterns (Arrivals.tsx), single responsibility, easy to relocate later.     |
| Placement           | Home page below Hero                  | Temporary debug placement. Will move to appropriate pages once data structure is understood. |
| Polling interval    | 30 seconds                            | Matches Metra's stated update frequency.                                                     |

---

## Metra GTFS Realtime API Reference

- **Base URL:** `https://gtfspublic.metrarr.com`
- **Auth:** Query parameter `?api_token=<key>`
- **Format:** Protocol Buffers (binary)
- **Update frequency:** Every 30 seconds
- **Endpoints:**
  - `GET /gtfs/public/alerts` — Service alerts (disruptions, delays, detours)
  - `GET /gtfs/public/positions` — Vehicle positions (lat/lng, trip assignment, status)
  - `GET /gtfs/public/tripupdates` — Trip updates (predicted arrival/departure times per stop)

---

## New Files

### 1. `app/lib/metra-realtime.ts` — Shared fetch + decode utility

```typescript
import GtfsRealtimeBindings from 'gtfs-realtime-bindings'

type FeedType = 'alerts' | 'positions' | 'tripupdates'

const BASE_URL = 'https://gtfspublic.metrarr.com/gtfs/public'

export async function fetchMetraFeed(feedType: FeedType) {
  const token = process.env.NEXT_PUBLIC_METRA_API_TOKEN
  if (!token) throw new Error('NEXT_PUBLIC_METRA_API_TOKEN is not set')

  const res = await fetch(`${BASE_URL}/${feedType}?api_token=${token}`)
  if (!res.ok) throw new Error(`Metra API error: ${res.status}`)

  const buffer = await res.arrayBuffer()
  const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer))
  return feed
}
```

**Responsibilities:**

- Constructs the URL with auth token
- Fetches binary response
- Decodes protobuf into a JS object using `gtfs-realtime-bindings`
- Throws on missing key or HTTP errors

### 2. `app/components/MetraAlerts.tsx`

```
'use client'
- useState: data, loading, error
- useEffect: fetch on mount, poll every 30s
- console.log('Metra Alerts:', data) on each fetch
- Renders: card with feed name, entity count, loading/error states
- Cleanup: clearInterval on unmount
```

### 3. `app/components/MetraPositions.tsx`

Same pattern as MetraAlerts, targeting `/gtfs/public/positions`.

### 4. `app/components/MetraTripUpdates.tsx`

Same pattern as MetraAlerts, targeting `/gtfs/public/tripupdates`.

### Component template (shared pattern)

```typescript
'use client'
import { useEffect, useState } from 'react'
import { fetchMetraFeed } from '../lib/metra-realtime'

export default function Metra{Feed}() {
  const [data, setData] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const feed = await fetchMetraFeed('{feedType}')
        if (!active) return
        console.log('Metra {Feed}:', feed)
        console.log('Metra {Feed} entities:', feed.entity)
        setData(feed)
        setError(null)
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    const interval = setInterval(load, 30_000)
    return () => { active = false; clearInterval(interval) }
  }, [])

  // Minimal debug UI — card showing feed name, entity count, status
  return (
    <div className="rounded-xl border p-6 ...">
      <h3>{Feed}</h3>
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {data && <p>{data.entity?.length ?? 0} entities — check console</p>}
    </div>
  )
}
```

---

## Modified Files

### `app/page.tsx`

Add the three components below `<Hero />`:

```tsx
import Hero from './components/Hero'
import MetraAlerts from './components/MetraAlerts'
import MetraPositions from './components/MetraPositions'
import MetraTripUpdates from './components/MetraTripUpdates'

export default function HomePage() {
  return (
    <div>
      <Hero />
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <h2 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">
          Metra Realtime Feeds (Debug)
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <MetraAlerts />
          <MetraPositions />
          <MetraTripUpdates />
        </div>
      </section>
    </div>
  )
}
```

---

## API Key Setup (Step-by-step)

### Local Development

1. Create `.env.local` in the project root (already gitignored):
   ```
   NEXT_PUBLIC_METRA_API_TOKEN=your_metra_api_key_here
   ```
2. Restart the dev server (`npm run dev`) — Next.js reads `.env.local` automatically.

### Firebase Hosting (CI/CD)

1. Add a new GitHub Actions secret:
   - Go to repo Settings → Secrets and variables → Actions
   - Add `METRA_API_TOKEN` with the API key value
2. Update `.github/workflows/deploy.yml` to expose the secret as an env var during build:
   ```yaml
   - name: Build
     run: npm run build
     env:
       NEXT_PUBLIC_METRA_API_TOKEN: ${{ secrets.METRA_API_TOKEN }}
   ```
   This makes the key available at build time so Next.js inlines it into the client bundle.

---

## New Dependency

```bash
npm install gtfs-realtime-bindings
```

This package provides `GtfsRealtimeBindings.transit_realtime.FeedMessage.decode()` for decoding protobuf binary data into JavaScript objects.

---

## Testing Strategy

### Manual verification

1. Run `npm run dev` with `.env.local` set
2. Open browser to `http://localhost:3000`
3. Open DevTools Console
4. Confirm three `console.log` outputs appear with decoded feed data
5. Wait 30+ seconds, confirm logs repeat (polling working)
6. Check that each component card shows entity count

### Unit tests

- Test `fetchMetraFeed` utility with mocked fetch responses
- Test each component renders loading → loaded states
- Test error state when API key is missing
- Test cleanup (interval cleared on unmount)

### Build verification

- `npm run build` succeeds (static export still works with client-only components)
- No `firebase-admin` or server-only imports in the new components

---

## Out of Scope

- Rendering actual alert/position/trip data in the UI (this is a debug/exploration phase)
- Filtering feeds by line or station
- Moving components to their final page locations
- CORS issues (Metra API supports cross-origin requests based on their public API documentation)
