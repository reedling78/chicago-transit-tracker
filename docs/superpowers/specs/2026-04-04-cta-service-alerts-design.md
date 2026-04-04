# CTA Service Alerts — Design Spec

**Date:** 2026-04-04
**Status:** Draft

---

## Context

The Metra service list and line detail pages already display real-time service alerts via a `MetraAlerts` client component that polls a server-side API proxy every 30 seconds. The CTA pages have no equivalent. This spec describes building a `CTAAlerts` component with the same look, feel, and placement — powered by the CTA Customer Alerts REST API.

---

## CTA Customer Alerts API

- **Endpoint:** `https://www.transitchicago.com/api/1.0/alerts.aspx`
- **Auth:** None required
- **Format:** JSON via `?outputType=JSON`
- **Route filter:** `?routeid=Red` (optional)
- **No rate limit documented**

### Route IDs for CTA Rail Lines

| Line   | API routeid |
| ------ | ----------- |
| Red    | `Red`       |
| Blue   | `Blue`      |
| Brown  | `Brn`       |
| Green  | `G`         |
| Orange | `Org`       |
| Purple | `P`         |
| Pink   | `Pink`      |
| Yellow | `Y`         |

### Response Shape (simplified)

```json
{
  "CTAAlerts": {
    "TimeStamp": "2026-04-04T00:20:35",
    "ErrorCode": "0",
    "ErrorMessage": null,
    "Alert": [
      {
        "AlertId": "112506",
        "Headline": "Red Line: Signal work at ...",
        "ShortDescription": "Expect delays...",
        "FullDescription": { "#cdata-section": "<html content>" },
        "SeverityScore": "25",
        "SeverityColor": "#ff0000",
        "SeverityCSS": "planned",
        "Impact": "Planned Work",
        "EventStart": "2026-04-01T00:00:00",
        "EventEnd": null,
        "TBD": "0",
        "MajorAlert": "1",
        "AlertURL": { "#cdata-section": "https://..." },
        "ImpactedService": {
          "Service": [
            {
              "ServiceType": "R",
              "ServiceTypeDescription": "Route",
              "ServiceName": "Red Line",
              "ServiceId": "Red",
              "ServiceBackColor": "#c60c30",
              "ServiceTextColor": "#ffffff",
              "ServiceURL": { "#cdata-section": "https://..." }
            }
          ]
        }
      }
    ]
  }
}
```

---

## Architecture

### 1. Server-Side API Proxy

**File:** `app/api/cta/alerts/route.ts`

- GET handler that forwards to `https://www.transitchicago.com/api/1.0/alerts.aspx?outputType=JSON`
- Passes through optional `routeid` query param from the client request
- Returns the JSON response as-is
- Mirrors the pattern in `app/api/metra/[...path]/route.ts`

### 2. Client Fetch Library

**File:** `app/lib/cta-alerts.ts`

- `fetchCTAAlerts(routeId?: string): Promise<CTAAlert[]>` — fetches from `/api/cta/alerts`, optionally with `?routeid=X`
- TypeScript interface `CTAAlert` matching the API response shape
- Extracts `Alert` array from the `CTAAlerts` wrapper
- Filters to rail-only alerts: keeps alerts where at least one `ImpactedService.Service` entry has a `ServiceId` matching one of the 8 rail route IDs

### 3. Client Component

**File:** `app/components/CTAAlerts.tsx`

- `'use client'` component
- **Props:** `{ line?: Line }` — optional line to pre-filter alerts
- **Polling:** 30-second interval with cleanup, identical to MetraAlerts
- **States:** loading (3 skeleton cards), error (red box + retry), empty (green checkmark), loaded (alert card grid)

#### Route ID Mapping (component-level)

```ts
const SLUG_TO_ROUTE_ID: Record<string, string> = {
  red: 'Red',
  blue: 'Blue',
  brown: 'Brn',
  green: 'G',
  orange: 'Org',
  purple: 'P',
  pink: 'Pink',
  yellow: 'Y',
}
```

Used to convert `line.slug` to the CTA API `routeid` when the `line` prop is provided.

#### Alert Card Content

| Field             | Source                                                                                         |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| Left border color | First matching rail service's `ServiceBackColor`                                               |
| Line badges       | All rail `Service` entries — pill with `ServiceBackColor` / `ServiceTextColor` + `ServiceName` |
| Headline          | `alert.Headline`                                                                               |
| Description       | `alert.ShortDescription`                                                                       |
| More info link    | `alert.AlertURL["#cdata-section"]`                                                             |

#### Filter Chips

- Shown only when `line` prop is NOT provided (service list page)
- "All" chip + one chip per rail route that has active alerts
- Chip colors: use `ServiceBackColor` from API (matches official CTA colors)
- Selected/unselected styling identical to MetraAlerts (filled vs. 10% opacity)

#### Visual Design

Identical to MetraAlerts:

- `rounded-xl border border-gray-200 bg-white p-5 shadow-sm` + dark mode variants
- `borderLeftWidth: '4px'` with dynamic color
- Line badge pills: `rounded-full px-2.5 py-0.5 text-xs font-semibold`
- Section header: `text-xs font-semibold tracking-widest text-gray-400 uppercase`
- Grid: `grid grid-cols-1 gap-4`

### 4. Page Placements

#### CTA Service List Page (`app/cta/page.tsx`)

Change from single-column to 2/3 + 1/3 grid (matching Metra service list page):

```tsx
<div className="grid grid-cols-1 gap-8 md:grid-cols-3">
  <div className="md:col-span-2">
    <h2>8 CTA Lines</h2>
    {/* LinkCard list */}
  </div>
  <div>
    <CTAAlerts />
  </div>
</div>
```

#### CTA Line Detail Page (`app/cta/[line]/page.tsx`)

Add below `<LineDetail>` in the 2-column span (matching Metra line detail page):

```tsx
<CTAAlerts line={line} />
```

### 5. Tests

**File:** `__tests__/components/CTAAlerts.test.tsx`

Mirror MetraAlerts test cases:

- Loading skeleton state
- Successful fetch and render
- Alert count display
- Headline and description rendering
- Filter chip rendering and interaction
- Line prop filtering
- Empty state
- Error state with retry
- More info link rendering

**File:** `__tests__/lib/cta-alerts.test.ts`

- Fetch routing to proxy endpoint
- JSON parsing
- Rail-only filtering
- Error handling

---

## Files to Create

| File                                      | Type                  |
| ----------------------------------------- | --------------------- |
| `app/api/cta/alerts/route.ts`             | API proxy route       |
| `app/lib/cta-alerts.ts`                   | Fetch library + types |
| `app/components/CTAAlerts.tsx`            | Client component      |
| `__tests__/components/CTAAlerts.test.tsx` | Component tests       |
| `__tests__/lib/cta-alerts.test.ts`        | Library tests         |

## Files to Modify

| File                      | Change                            |
| ------------------------- | --------------------------------- |
| `app/cta/page.tsx`        | Add grid layout + `<CTAAlerts />` |
| `app/cta/[line]/page.tsx` | Add `<CTAAlerts line={line} />`   |

---

## Verification

1. `npm run dev` — visit `/cta` and `/cta/red`, confirm alerts render
2. Verify 30-second polling in Network tab
3. Verify filter chips work on `/cta` page
4. Verify line-filtered alerts on `/cta/[line]` pages
5. Test error state by killing dev server proxy
6. Test empty state (may need to filter to a line with no active alerts)
7. `npm test` — all new and existing tests pass
8. `npm run lint` — no lint errors
9. `npm run build` — production build succeeds
