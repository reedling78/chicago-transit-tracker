# CTA Service Alerts — Implementation Plan

## Context

The Metra pages already have real-time service alerts (MetraAlerts component + API proxy + 30s polling). The CTA pages have nothing equivalent. We're building a `CTAAlerts` component with the same look, feel, and page placement — powered by the CTA Customer Alerts REST API (`transitchicago.com/api/1.0/alerts.aspx`). The API requires no auth and returns JSON. We filter to rail-only alerts (8 'L' lines). Full design spec at `docs/superpowers/specs/2026-04-04-cta-service-alerts-design.md`.

---

## Step 1: API Proxy Route

**Create** `app/api/cta/alerts/route.ts`

- GET handler
- Forward to `https://www.transitchicago.com/api/1.0/alerts.aspx?outputType=JSON`
- Pass through optional `routeid` query param from `request.nextUrl.searchParams`
- Return `NextResponse.json()` with the parsed response
- Error handling: forward upstream status on failure
- Pattern reference: `app/api/metra/[...path]/route.ts`

## Step 2: Fetch Library + Types

**Create** `app/lib/cta-alerts.ts`

- TypeScript interfaces: `CTAAlert`, `CTAAlertService`, `CTAAlertsResponse`
- `fetchCTAAlerts(routeId?: string): Promise<CTAAlert[]>`
  - Fetches from `/api/cta/alerts` (with optional `?routeid=` param)
  - Extracts `CTAAlerts.Alert` array (handle single-object case — CTA API returns object instead of array when there's only 1 alert)
  - `RAIL_ROUTE_IDS = new Set(['Red','Blue','Brn','G','Org','P','Pink','Y'])`
  - Filters to alerts where at least one `ImpactedService.Service` has `ServiceId` in `RAIL_ROUTE_IDS`
  - Normalizes `ImpactedService.Service` to always be an array (CTA API returns object when single service)

## Step 3: CTAAlerts Component

**Create** `app/components/CTAAlerts.tsx`

Clone the structure of `app/components/MetraAlerts.tsx` and adapt:

- **Props:** `{ line?: Line }`
- **State:** `data` (CTAAlert[]), `loading`, `error`, `selectedRoute` (filter chip state)
- **Slug-to-routeId map:** `{ red: 'Red', blue: 'Blue', brown: 'Brn', green: 'G', orange: 'Org', purple: 'P', pink: 'Pink', yellow: 'Y' }`
- **Polling:** `useEffect` with 30s interval, cleanup, active flag — identical to MetraAlerts
- **When `line` prop provided:** pass `routeId` to `fetchCTAAlerts()` and hide filter chips
- **Sub-components:**
  - `AlertCard` — left border color from first rail service `ServiceBackColor`, line badge pills from all rail services, headline, short description, "More info" link
  - `SkeletonCard` — animated pulse placeholder (same as MetraAlerts)
- **Filter chips:** derive active routes from alerts data, use `ServiceBackColor`/`ServiceTextColor` for colors, `hexToRgba` for unselected state
- **States:** loading (3 skeletons), error (red box + retry), empty (green check + optional "show all"), loaded (card grid)
- **Color source:** Use `ServiceBackColor`/`ServiceTextColor` from the API response directly (these are the official CTA colors)

## Step 4: Update CTA Service List Page

**Modify** `app/cta/page.tsx`

- Import `CTAAlerts`
- Wrap existing content in `grid grid-cols-1 gap-8 md:grid-cols-3` (matching Metra page)
- Lines list in `md:col-span-2` with "8 CTA Lines" section header
- `<CTAAlerts />` in right column `<div>`

## Step 5: Update CTA Line Detail Page

**Modify** `app/cta/[line]/page.tsx`

- Import `CTAAlerts`
- Add `<CTAAlerts line={line} />` after `<LineDetail line={line} />`

## Step 6: Tests

**Create** `__tests__/lib/cta-alerts.test.ts`

- Fetch routing, JSON parsing, rail-only filtering, single-alert normalization, error handling

**Create** `__tests__/components/CTAAlerts.test.tsx`

- Loading skeleton, successful render, alert count, headline/description, filter chips, line prop filtering, empty state, error + retry, more info link

## Step 7: Verification

- `npm run lint`
- `npm test`
- `npm run build`
- Manual check: `/cta` page shows alerts in right column, `/cta/red` shows filtered alerts

---

## Key Files

| File                                      | Action |
| ----------------------------------------- | ------ |
| `app/api/cta/alerts/route.ts`             | Create |
| `app/lib/cta-alerts.ts`                   | Create |
| `app/components/CTAAlerts.tsx`            | Create |
| `app/cta/page.tsx`                        | Modify |
| `app/cta/[line]/page.tsx`                 | Modify |
| `__tests__/lib/cta-alerts.test.ts`        | Create |
| `__tests__/components/CTAAlerts.test.tsx` | Create |

## Reference Files (patterns to follow)

| File                               | Why                                           |
| ---------------------------------- | --------------------------------------------- |
| `app/api/metra/[...path]/route.ts` | API proxy pattern                             |
| `app/lib/metra-realtime.ts`        | Fetch library pattern                         |
| `app/components/MetraAlerts.tsx`   | Component structure, styling, polling, states |
| `app/metra/page.tsx`               | Service list page grid layout                 |
| `app/metra/[line]/page.tsx`        | Line detail page alert placement              |
| `app/components/StationDetail.tsx` | LINE_COLORS export                            |
