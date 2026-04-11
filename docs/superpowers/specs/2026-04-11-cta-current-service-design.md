# CTA Current Service — Line Detail Page

## Context

The Metra CurrentService component (shipped in PR #36) lists currently-active trains with status pills and links to per-train detail pages. Riders want the same kind of at-a-glance service info on CTA line pages, but CTA service works fundamentally differently from Metra commuter rail:

- CTA riders don't know or care about run numbers the way Metra riders know train numbers.
- CTA peak service is every 5–8 minutes. "Next 60 minutes of scheduled trains" would be 8–12 trains per direction, which nobody reads.
- Every CTA train stops at every station on its branch. Per-train stop schedules don't add value the way they do on Metra express/local trains.

So CTA CurrentService is not a port of the Metra version. It is a **service pulse view**: one card per terminal showing whether that direction of the line is running normally, delayed, or not running. The question it answers is the one a rider actually asks when they open a CTA line page: *is the Red Line running OK right now, or is something wrong?*

## Goals

- A rider opening `/cta/red` during the commute sees, at the top of the page, a clear green / yellow / red health indicator for each direction of the line, plus the next arrival time and train count.
- The component reflects active CTA service alerts: a major alert downgrades the health tone so the card never shows "Running normally" while something is broken.
- The component degrades gracefully: empty feeds, API errors, and dev environments without an API key all render a useful state instead of crashing.
- Boundaries mirror the Metra equivalent (presentational + data-wrapper + pure aggregation helpers) so the pattern is legible to future readers of the codebase.

## Non-Goals

- Per-train detail pages for CTA. Run numbers are not rider-facing identity; there is nothing to click through to.
- A live map of CTA train positions. The `getlocations` feed has lat/lon but this component is a list.
- Predictions at a specific station. The existing `Arrivals` component on station pages already covers that.
- Schedule/timetable data. The pulse view is strictly realtime-driven.
- Any change to the Metra CurrentService component.

## Design Summary

### Placement

- Top of the left column on `app/cta/[line]/page.tsx`, above `LineDetail`.
- On mobile (single column), renders above the station list. Same pattern as Metra.

### Selection rule — cards per line

- One card per entry in `line.termini` (already stored on the Firestore line doc).
- Red gets 2 cards, Blue gets 3, Green gets 3, Yellow gets 1–2, Purple gets 2, Orange gets 2, Brown gets 2, Pink gets 2.
- Each card filters the `getlocations` response by matching each train's `destNm` against the terminal name. Trains whose destination doesn't match any terminal (rare) are ignored.
- Purple Line peak express trains naturally appear under whichever terminal they're heading toward. No special case needed.

### Per-card content

- Terminal name, large and bold: "To Howard"
- Health indicator: colored dot + label (see thresholds below)
- Train count: "8 trains running"
- Next arrival: "Next train in 3 min near Clark/Lake" (smallest `arrT` among the direction's trains, plus that train's `nextStaNm`)
- Delay summary: "2 of 8 trains delayed" — hidden when `delayedCount === 0`

### Health thresholds (first pass)

| Tone | Label | Rule |
|---|---|---|
| `normal` | Running normally | ≥3 active trains, 0 delayed, no high-severity alert |
| `minor` | Minor delays | any delayed train, OR any active high-severity alert, OR 1–2 active trains |
| `major` | Major delays | majority of trains delayed, OR 0 active trains during scheduled service hours |
| `no-service` | No service | 0 active trains outside scheduled service hours |
| `nodata` | No data | proxy error or empty feed from `ttpositions` |

"Scheduled service hours" for non-24-hour lines: 4:00 AM – 1:30 AM. For lines where `line.operatesOvernight === true` (Red and Blue), `no-service` is never used — 0 active trains on a 24-hour line always means `major` (something is wrong). The health helper takes `line.operatesOvernight` into account.

### Alerts integration

The container polls the existing `/api/cta/alerts` proxy in addition to `/api/cta/train-locations`. Any alert whose `severity` is `High` or similar (following the `cta-alerts.ts` parsing) and whose `impactedRoutes` includes the current line bumps every card on the line to at least `minor` tone, and the component shows a one-line alert snippet under the pulse row linking to `/cta/alerts`.

### Data sources

| Data | Endpoint | Proxy | Polling |
|---|---|---|---|
| Train positions | `https://lapi.transitchicago.com/api/1.0/ttpositions.aspx?key=...&rt={route}&outputType=JSON` | New `app/api/cta/train-locations/route.ts` | 30 s |
| Alerts | CTA Customer Alerts API | Existing `app/api/cta/alerts/route.ts` | 30 s (reuse) |

`rt` values (allowlist): `red`, `blue`, `brn`, `g`, `org`, `p`, `pink`, `y`. These match CTA's route codes and are stored on each line doc as `line.ctaRouteId` already.

### Caching

- Proxy response: `Cache-Control: public, s-maxage=20, stale-while-revalidate=40`. Keeps upstream call rate bounded under traffic.
- CTA Train Tracker free tier is capped at 100k requests/day. Twenty-second shared cache + 30 s client polling means `ceil(86400 / 20) ≈ 4320` upstream calls per line per day, well under cap for all 8 lines.

### Dev fallback

If `process.env.CTA_TRAIN_TRACKER_KEY` is missing, the proxy returns a canned fixture (2 trains per terminal, realistic `destNm` and `nextStaNm` values, both marked on-time) with `X-Dev-Fallback: 1`. This lets local dev, tests, and preview builds render the component without any secret. Production builds always have the secret via Secret Manager, so the fallback never fires there.

### Component split (CTA-ready for future features)

Three new components + two new lib modules:

1. **`app/components/CtaServicePulse.tsx`** — pure presentational. Takes `{ directions: DirectionPulse[], lineColor: string, lastUpdated: Date | null, error: string | null, alertSnippet: string | null }` and renders the card row. No fetching, no polling. Knows nothing about CTA Train Tracker or alerts — just renders `DirectionPulse` objects.
2. **`app/components/CtaServicePulseContainer.tsx`** — client component. Takes `{ line: Line }`, polls the two feeds on 30 s intervals, normalizes into `DirectionPulse[]`, merges alert data, and renders `CtaServicePulse`. Handles loading/error/visibility-pause states. Mirrors `MetraCurrentService`.
3. **`app/api/cta/train-locations/route.ts`** — server-side proxy. Validates `?rt=` against the allowlist, calls upstream with the secret, returns JSON. Dev fallback path.
4. **`app/lib/cta-train-tracker.ts`** — `fetchCtaTrainLocations(rt: string)` client helper + TypeScript types for the `ttpositions` response. Mirrors `app/lib/metra-realtime.ts`.
5. **`app/lib/cta-pulse.ts`** — pure functions. `aggregateByTerminal(feed, termini)`, `computeHealth(count, delayed, hasHighAlert, inService)`, `formatNextArrival(trains)`. Unit-tested directly, no React.

### Normalized row shape

```ts
// in CtaServicePulse.tsx
export type PulseTone = 'normal' | 'minor' | 'major' | 'no-service' | 'nodata'

export interface DirectionPulse {
  terminalName: string                    // "Howard"
  trainCount: number                      // 8
  delayedCount: number                    // 2
  nextArrivalMinutes: number | null       // 3  (null when no trains)
  nextArrivalNearStation: string | null   // "Clark/Lake"
  healthLabel: string                     // "Running normally"
  healthTone: PulseTone
}
```

### Branding

Footer on the component, rendered once below the card row:

> Powered by CTA Train Tracker. CTA Train Tracker (SM) logo icon is a trademark of the Chicago Transit Authority.

Plus the CTA Train Tracker icon (black/white/grey SVG) inline next to the footer text. Icon is never colorized. This satisfies the attribution and logo rules in CLAUDE.md (CTA Branding Guidelines section).

## Files to Create

| Path | Purpose |
|---|---|
| `app/lib/cta-train-tracker.ts` | Fetch helper and response types for `ttpositions` |
| `app/lib/cta-pulse.ts` | Pure aggregation + health-threshold helpers |
| `app/api/cta/train-locations/route.ts` | Server-side proxy with allowlist and dev fallback |
| `app/components/CtaServicePulse.tsx` | Presentational card row |
| `app/components/CtaServicePulseContainer.tsx` | Data wrapper (polling, normalization, alert merging) |
| `public/cta-train-tracker-icon.svg` | Black/white/grey Train Tracker icon asset |
| `__tests__/lib/cta-train-tracker.test.ts` | Unit tests for fetch helper |
| `__tests__/lib/cta-pulse.test.ts` | Unit tests for aggregation + thresholds |
| `__tests__/api/cta-train-locations.test.ts` | Proxy tests (allowlist, fallback, secret missing) |
| `__tests__/components/CtaServicePulse.test.tsx` | Presentational tests against every tone |
| `__tests__/components/CtaServicePulseContainer.test.tsx` | Data-wrapper tests (polling, alerts merge, visibility) |

## Files to Modify

| Path | Change |
|---|---|
| `app/cta/[line]/page.tsx` | Render `<CtaServicePulseContainer line={line} />` at top of left column |
| `__tests__/pages/cta-line.test.tsx` | Mock the container, assert wiring, refresh snapshot |
| `README.md` | Add `CtaServicePulse` and `CtaServicePulseContainer` rows to the Components table |
| `CLAUDE.md` | Add new components, lib files, and proxy route to the Project Structure tree |

## Verification

End-to-end manual check:

1. `npm run dev`, open `/cta/red` during the morning commute.
2. Confirm two cards render (Howard, 95th/Dan Ryan) at the top of the left column on desktop, and above the station list on mobile.
3. Confirm each card shows a train count, next arrival, and a green/yellow/red health dot.
4. Open `/cta/blue` and confirm three cards (O'Hare, Forest Park, 54th/Cermak if the tracker shows those trains running).
5. Stop the dev server, remove `CTA_TRAIN_TRACKER_KEY` from `.env.local`, restart, reload the page. Confirm the component renders with the dev fallback fixture and shows `X-Dev-Fallback: 1` in DevTools Network.
6. DevTools network tab: confirm `/api/cta/train-locations?rt=red` is polled every 30 s, nothing bundles `firebase-admin` client-side, cache headers are set.
7. `npm run build` succeeds and `/cta/[line]` pages still pre-render via `generateStaticParams`.

Automated:

- `npm test` — all suites pass including new ones.
- `npm run lint` — clean.

## Out of Scope / Follow-ups

- **CTA train detail pages.** Run numbers are not rider-facing. If a future feature wants to show "every train currently running on the Red Line" as a list (e.g., for nerds or for QA), it's a separate component that can reuse `app/lib/cta-train-tracker.ts`.
- **Live map / positions view.** Interesting, but a much bigger component.
- **Historical health trends.** "Red Line has had minor delays 3 of the last 5 commutes." Would require storing snapshots in Firestore over time — out of scope.
