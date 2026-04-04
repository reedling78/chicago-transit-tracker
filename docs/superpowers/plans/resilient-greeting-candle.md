# Implementation Plan: Metra GTFS Realtime Components

**Spec:** `docs/superpowers/specs/2026-04-03-metra-realtime-components-design.md`

---

## Context

Adding three client-side debug components (MetraAlerts, MetraPositions, MetraTripUpdates) to the home page that fetch, decode, and console.log Metra's GTFS Realtime protobuf feeds. This is an exploration phase — the goal is to see the data structure before building real UI.

---

## Steps

### Step 1: Install dependency and set up API key

- `npm install gtfs-realtime-bindings`
- Create `.env.local` with `NEXT_PUBLIC_METRA_API_TOKEN=<user's key>` (user will provide the key)
- Verify `.env.local` is in `.gitignore` (it already should be via `.env*.local` pattern)

### Step 2: Create shared fetch utility

**New file:** `app/lib/metra-realtime.ts`

- Export `fetchMetraFeed(feedType: 'alerts' | 'positions' | 'tripupdates')`
- Read API token from `process.env.NEXT_PUBLIC_METRA_API_TOKEN`
- Fetch from `https://gtfspublic.metrarr.com/gtfs/public/{feedType}?api_token={token}`
- Decode response ArrayBuffer with `GtfsRealtimeBindings.transit_realtime.FeedMessage.decode()`
- Throw on missing key or HTTP errors

### Step 3: Create the three components

**New files:**
- `app/components/MetraAlerts.tsx`
- `app/components/MetraPositions.tsx`
- `app/components/MetraTripUpdates.tsx`

Each component follows the same pattern:
- `'use client'` directive
- `useState` for `data`, `loading`, `error`
- `useEffect` that calls `fetchMetraFeed()` on mount and every 30 seconds
- `console.log` the full decoded feed + entities array on each successful fetch
- Cleanup: `clearInterval` + `active` flag on unmount
- Minimal card UI: feed name, entity count, loading/error states, "check console" message
- Dark mode support using existing Tailwind patterns

### Step 4: Add components to home page

**Modify:** `app/page.tsx`

- Import the three components
- Add a section below `<Hero />` with a debug heading and a 3-column grid containing the components

### Step 5: Update CI/CD for API key

**Modify:** `.github/workflows/deploy.yml`

- Add `NEXT_PUBLIC_METRA_API_TOKEN: ${{ secrets.METRA_API_TOKEN }}` as an env var on the "Build Next.js static export" step
- User must add `METRA_API_TOKEN` secret in GitHub repo settings

### Step 6: Write unit tests

- Test `fetchMetraFeed` utility with mocked fetch (mock the protobuf decode)
- Test each component renders loading state, then loaded state with entity count
- Test error state when API token is missing

### Step 7: Verify

- `npm run dev` — open localhost:3000, check DevTools console for three feed logs
- Wait 30+ seconds, confirm polling produces new logs
- `npm run build` — confirm static export still works
- `npm test` — all tests pass
- `npm run lint` — no lint errors

---

## Critical Files

| File | Action |
|------|--------|
| `app/lib/metra-realtime.ts` | Create |
| `app/components/MetraAlerts.tsx` | Create |
| `app/components/MetraPositions.tsx` | Create |
| `app/components/MetraTripUpdates.tsx` | Create |
| `app/page.tsx` | Modify |
| `.github/workflows/deploy.yml` | Modify |
| `.env.local` | Create (not committed) |
| `__tests__/metra-realtime.test.ts` | Create |
| `__tests__/MetraAlerts.test.tsx` | Create |
| `__tests__/MetraPositions.test.tsx` | Create |
| `__tests__/MetraTripUpdates.test.tsx` | Create |

## Existing code to reuse

- Component pattern from `app/components/Arrivals.tsx` — same useEffect/useState/polling structure
- Tailwind dark mode classes from existing components
- Card styling from `app/components/LinkCard.tsx`
