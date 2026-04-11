# CurrentService Component — Metra Line Detail Page

> Note for implementation: this plan file was auto-generated with a temporary name. Before committing, rename to `docs/superpowers/plans/2026-04-11-current-service-component.md` and write the corresponding design spec to `docs/superpowers/specs/2026-04-11-current-service-component-design.md` per the project's standing rule on plan/spec docs.

## Context

The Metra and CTA line detail pages currently show static reference info (stats, termini, schedule link) plus alerts and a station list. Nothing on these pages tells a rider what is actually happening on the line right now. Metra already has the infrastructure for per-train realtime — tripupdates + positions feeds, a working train detail page, and status-derivation logic baked into `MetraTripRealtime.tsx` — but that data is only surfaced on the train detail page, one train at a time.

This plan adds a `CurrentService` component to the line detail page that lists the trains currently in motion (plus a few upcoming ones) with a status pill and a link to the train detail page. It is scoped to Metra in this cycle. CTA is intentionally deferred to a follow-up (no CTA Train Tracker proxy exists today and CTA has no train detail pages), but the component boundary is designed so that dropping in a CTA wrapper later is additive, not a rewrite.

## Goals

- A rider hitting `/metra/bnsf` during the commute sees, at the top of the page, which trains are running now, whether they're on time, and where each one is — with one click to the train detail page.
- At 3am the same page still tells the rider when the next BNSF train is.
- Status-derivation logic that lives today inside `MetraTripRealtime.tsx` is extracted to a shared module so both the train detail page and `CurrentService` use the same code path.
- The component boundary is CTA-ready: adding CTA later means writing a new data-wrapper component that reuses the same presentational list.

## Non-Goals

- Any CTA Train Tracker API integration. That is a separate project.
- CTA train detail pages. Also separate.
- A map view of live train positions. The component is a list.
- Changes to the train detail page itself beyond importing the extracted status helpers.

## Design Summary

### Selection rules — "currently active" trains

- Always prioritize trains whose realtime phase is `active` (between origin and terminal).
- Fill the remaining slots with trains scheduled to depart in the next 60 minutes, sorted by scheduled departure.
- Hard cap at 8 trains shown.
- If nothing is active and nothing is upcoming within 60 minutes, show a single "Next service" row for the next scheduled train regardless of how far out it is. Never render empty.

### Layout

- CurrentService renders at the **top of the left column**, above `LineDetail`, on `app/metra/[line]/page.tsx`.
- Internally it is a vertical list of rows (matches the visual language of `LinkCard`/`StationList`), not a grid of cards.
- Each row is one clickable link to `/metra/{lineSlug}/train/{trainNumber}`.

### Per-row content (Standard)

- Train number + destination ("BNSF #1274 → Aurora")
- Next stop and ETA to next stop ("Next: Naperville · 3 min")
- Status pill using the existing tone system: On time, Delayed N min, Early N min, Scheduled H:MM, Completed, No data.

### Polling and data flow

- Polling interval: 30 seconds, matching `MetraTripRealtime.tsx`.
- **Initial render is server-side.** `app/metra/[line]/page.tsx` fetches the line's trip index + station-trips (already cached in Firestore via the existing API routes / `app/lib/transit.ts` patterns) and passes the schedule skeleton to `MetraCurrentService` as a prop. The component mounts with the schedule already known and only polls realtime feeds for deltas.
- Realtime fetching uses the existing `app/lib/metra-realtime.ts` helpers and the existing `app/api/metra/[...path]/route.ts` proxy. No new API routes.

### Component split (CTA-ready)

Three new files:

1. **`app/components/CurrentServiceList.tsx`** — pure presentational component. Takes a normalized `CurrentServiceTrain[]` and renders the list. Knows nothing about Metra or CTA. Client component (pill styling + link rendering only; no fetching).
2. **`app/components/MetraCurrentService.tsx`** — data wrapper. Client component. Receives the server-fetched schedule skeleton as a prop, starts polling Metra realtime feeds, normalizes results into `CurrentServiceTrain[]` using the extracted status helpers, and renders `CurrentServiceList`. Handles empty/loading/error states.
3. **`app/lib/metra-status.ts`** — extracted status helpers (see below).

The future `CtaCurrentService.tsx` will be a sibling wrapper producing the same `CurrentServiceTrain[]` shape and rendering the same `CurrentServiceList`.

### Normalized row shape

```ts
// in CurrentServiceList.tsx
export type CurrentServiceTrain = {
  trainNumber: string
  href: string
  destination: string
  nextStop: string | null
  nextStopEta: string | null          // "3 min" or "4:12 PM" when no realtime
  statusLabel: string                  // "On time", "Delayed 5 min", "Scheduled 4:32 PM"
  statusTone: 'ontime' | 'delayed' | 'early' | 'scheduled' | 'completed' | 'nodata'
}
```

### Status logic extraction

Move the following from `app/components/MetraTripRealtime.tsx` into a new `app/lib/metra-status.ts`:

- `computeScheduledEpoch()` (currently ~lines 87–96)
- `deriveStopState()` (currently ~lines 135–215)
- `computeHeroStatus()` (currently ~lines 252–277)
- The `TONE_CLASSES` map and the status tone type (currently ~lines 225–250)

`MetraTripRealtime.tsx` then imports from `app/lib/metra-status.ts`. Behavior is unchanged — this is a pure move. Existing tests for `MetraTripRealtime` should continue to pass; new unit tests are added directly against `metra-status.ts`.

The presentational component imports `TONE_CLASSES` and the tone type from the same module so styling stays consistent.

## Files to Create

| Path | Purpose |
|---|---|
| `app/lib/metra-status.ts` | Extracted status helpers + tone type + `TONE_CLASSES` map |
| `app/components/CurrentServiceList.tsx` | Presentational list component + `CurrentServiceTrain` type |
| `app/components/MetraCurrentService.tsx` | Metra data wrapper, polling, normalization |
| `__tests__/lib/metra-status.test.ts` | Unit tests for extracted status helpers |
| `__tests__/components/CurrentServiceList.test.tsx` | Presentational rendering tests (status pills, links, empty state) |
| `__tests__/components/MetraCurrentService.test.tsx` | Data wrapper tests (selection rules, polling, mocked feeds) |

## Files to Modify

| Path | Change |
|---|---|
| `app/metra/[line]/page.tsx` | Fetch trip index + station-trips for the line; render `<MetraCurrentService />` at top of left column above `<LineDetail />`; pass schedule skeleton as prop |
| `app/components/MetraTripRealtime.tsx` | Delete extracted helpers; import them from `app/lib/metra-status.ts` |
| `__tests__/components/MetraTripRealtime.test.tsx` | Update any tests that reached into extracted internals |
| `app/sitemap.ts` | No change — no new routes added |

## Implementation Steps

1. **Extract status logic to `app/lib/metra-status.ts`.** Pure move, no behavior change. Land this on its own so the diff is reviewable.
2. **Update `MetraTripRealtime.tsx` to import from `metra-status.ts`.** Run existing test suite to confirm no regression.
3. **Write `CurrentServiceList.tsx`** as a pure presentational component with the `CurrentServiceTrain` type. Render rows + status pill using `TONE_CLASSES`. Handle an explicit empty state (should never fire in practice, but the type allows it).
4. **Write `MetraCurrentService.tsx`.** Start with a server-prop shape: `{ line, scheduleSkeleton }`. Implement the selection rules (active first, then next-60-min, cap at 8, fall back to next scheduled). Poll the Metra feeds with the existing `metra-realtime.ts` helpers on a 30s interval. Normalize into `CurrentServiceTrain[]` using `metra-status.ts`. Render `CurrentServiceList`.
5. **Wire into `app/metra/[line]/page.tsx`.** Fetch the schedule skeleton server-side. Insert the component at the top of the left column. Verify responsive layout on mobile (component should render before the station list).
6. **Tests.** Follow the repo's existing patterns (see `.claude/rules/testing.md`):
   - `metra-status.test.ts`: unit-test each helper against fixture tripupdate/position data.
   - `CurrentServiceList.test.tsx`: render with a handful of trains across every status tone; assert pills and links.
   - `MetraCurrentService.test.tsx`: mock `metra-realtime.ts` feeds, assert the selection rules (active-first, 8-cap, next-service fallback) and that polling triggers re-renders. Use `doNotFake` pattern for polling tests as per the repo convention.
7. **Lint + test green.** `npm run lint` and `npm test` must pass with zero warnings before the PR.

## Verification

End-to-end manual check:

1. `npm run dev`, open `/metra/bnsf` during a weekday commute window.
2. Confirm CurrentService renders at the top of the left column on desktop, and above the station list on mobile.
3. Confirm at least one row shows an "active" train with a next stop and ETA; clicking it navigates to `/metra/bnsf/train/{n}` and that page renders.
4. Confirm status pill tones match what the train detail page shows for the same train (shared logic sanity check).
5. Open `/metra/ncs` (lower-frequency line) late at night to verify the "Next service" fallback renders.
6. DevTools network tab: confirm feeds are polled on a 30s interval, nothing bundles `firebase-admin` client-side, no duplicate requests.
7. `npm run build` succeeds and `/metra/[line]` pages still pre-render via `generateStaticParams`.

Automated:

- `npm test` — all suites pass, including the three new files.
- `npm run lint` — clean.

## Out of Scope / Follow-ups

- **CTA CurrentService.** Separate spec. Requires: CTA Train Tracker API proxy under `app/api/cta/...`, secret provisioning, CTA train detail pages at `/cta/[line]/train/[runNumber]` or similar, a `CtaCurrentService.tsx` wrapper reusing `CurrentServiceList`, plus CTA Train Tracker branding/attribution per CLAUDE.md.
- Map view of live positions.
- Push notifications / subscribe to a specific train.
