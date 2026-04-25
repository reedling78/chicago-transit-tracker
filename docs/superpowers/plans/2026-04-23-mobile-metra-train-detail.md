# Mobile Metra Train Detail — Plan

> Once approved, rename to `docs/superpowers/plans/2026-04-23-mobile-metra-train-detail.md`.

## Context

Web shipped a polished Metra train-detail page in PR #74 — a hero status card plus a Steps-based vertical stop timeline that polls live tripupdates/positions every 30s. The mobile equivalent at `apps/mobile/app/(tabs)/metra/[line]/train/[trainNumber].tsx` is currently a blank placeholder ("Train detail coming soon"). Internal entry points already link to this route — `apps/mobile/components/ArrivalsCard.tsx:215` and `apps/mobile/components/MetraTimetable.tsx:54` both push `/(tabs)/metra/${lineSlug}/train/${tripId}` — so users tapping a Metra arrival today land on a dead screen.

This plan brings the web train-detail UX to mobile and locks in the cross-platform Steps API contract that was deliberately reserved during the web spec (`docs/superpowers/specs/2026-04-22-steps-component-design.md`). Along the way it closes a real infrastructure gap: there's no Cloud Functions proxy for Metra tripupdates/positions today — only `metraAlerts` exists — and mobile can't call the Next.js `/api/metra/...` route directly.

User-confirmed scope (brainstorming):
- **In:** mobile `Steps` primitive, mobile train-detail screen, two new Cloud Functions returning decoded JSON, move pure `metra-status` helpers into `@ctt/shared`.
- **Out:** migrating the existing mobile `StationTimeline` (line detail screen) to consume `Steps` — it already uses per-row segments and looks correct. Defer to a follow-up.

## Approach

Five layers, built bottom-up so each is independently testable.

### Layer 1 — Move pure helpers into `@ctt/shared`

Both files are pure TypeScript (no React, no DOM, no Node-only deps):

- Move `apps/web/app/lib/metra-status.ts` → `packages/shared/src/metra-status.ts`
- Move `apps/web/app/lib/metra-trip-realtime-helpers.ts` → `packages/shared/src/metra-trip-realtime-helpers.ts`
- Replace the web files with re-export shims that match the existing pattern in `apps/web/app/lib/cta-pulse.ts` and `apps/web/app/lib/metra-trip-matching.ts`:
  ```ts
  export * from '@ctt/shared'
  ```
- Add the two modules to `packages/shared/src/index.ts`'s barrel.

The existing test `apps/web/__tests__/lib/metra-status.test.ts` is the safety net — it must continue to pass after the move with no edits beyond import paths if needed.

### Layer 2 — Cloud Functions for Metra realtime feeds

Add two HTTP functions to `apps/functions/src/index.ts`, mirroring the existing `metraAlerts` pattern at lines 79–111:

- `metraTripUpdates` — fetches `https://gtfspublic.metrarr.com/gtfs/public/tripupdates` with `api_token` from `METRA_API_TOKEN` secret, decodes the protobuf using `gtfs-realtime-bindings` (already a dep — see `apps/web/package.json`; verify and add to `apps/functions/package.json` if absent), returns the `FeedMessage` as JSON. `Access-Control-Allow-Origin: *`. Short cache header (`max-age=15`) so repeated requests within a polling window can be served from edge cache.
- `metraPositions` — identical shape against the `/positions` feed.

Both fail closed: 500 with a generic error string if the upstream is non-200 or `METRA_API_TOKEN` is unset (never echo the token).

Tests in `apps/web/__tests__/functions/metra-realtime-proxies.test.ts` (mocking `fetch` and `gtfs-realtime-bindings.GtfsRealtimeBindings.transit_realtime.FeedMessage.decode`) — happy path, upstream 503, missing token. Follow the existing pattern in `apps/web/__tests__/functions/cta-alerts.test.ts`.

### Layer 3 — Mobile `Steps` primitive

Mirror the web public API exactly so the contract is locked across platforms.

Create:

- `apps/mobile/components/Steps/Steps.tsx` — container, takes `color: string` and `children`.
- `apps/mobile/components/Steps/Step.tsx` — item with `status`, `bullet`, `href`, `trailing`, `below`, `children`. Per-row segments (top/bullet/bottom) inside a 24px-wide column, identical to the existing `apps/mobile/components/StationTimeline.tsx` rail approach.
- `apps/mobile/components/Steps/index.ts` — barrel.

RN-specific notes:
- `View` for layout, `StyleSheet.create` for static styles, inline `style={{ ... }}` for color-driven values.
- When `href` is set, wrap content in `<Link href={href} asChild><Pressable>...</Pressable></Link>` from `expo-router` (matches `apps/mobile/components/StationTimeline.tsx` lines 44–46).
- **Halo bullet**: RN has no `box-shadow`. Render an outer `View` (h-5/w-5, `backgroundColor: hexWithAlpha(color, 0.3)`, fully rounded) absolutely-centered behind the inner 12px solid disc. Helper `hexWithAlpha` already exists in the web's `Step.tsx`; copy it (or move it to `@ctt/shared` if a second use surfaces).
- Mobile is dark-only. Use the palette already in `apps/mobile/components/StationTimeline.tsx`: `#0f0f23` for the open-bullet inner fill, `#9ca3af` for muted text. No `dark:` prefix logic.

Tests in `apps/mobile/__tests__/components/Steps.test.tsx` mirroring the web's 14-test coverage, adapted for `@testing-library/react-native`. Use `testID` props in the same role as the web's `data-steps-*` attributes.

### Layer 4 — Mobile data layer

Add two pieces:

- **`apps/mobile/lib/useMetraFeed.ts`** — RN equivalent of `apps/web/app/lib/hooks/useMetraFeed.ts`. Same external API: `useMetraFeed(feedType, { intervalMs, enabled })` → `{ data, error, fetchedAt, loading }`. Module-level cache keyed by feedType. Polls `${FUNCTIONS_BASE_URL}/metraTripUpdates` and `${FUNCTIONS_BASE_URL}/metraPositions` (URLs from `apps/mobile/lib/config.ts`). Pauses on `AppState.addEventListener('change')` when the app is backgrounded; resumes on foreground. Same 30s cadence default. Same FeedData shape as the web's hook so `filterFeedForTrip`/`isTripCompleted` from `@ctt/shared` work unchanged.
- **`useMetraTrip(lineSlug, trainNumber)`** in `apps/mobile/lib/hooks.ts` — reads `metra-trips/{lineSlug}_{trainNumber}` from Firestore via the existing client SDK. Mirrors the web's `getMetraTrip` data shape (returns `TripDetail | null`). Pattern matches existing hooks in the same file.

### Layer 5 — Mobile screen + components

Create:

- **`apps/mobile/components/MetraTripStopTimeline.tsx`** — wraps mobile `Steps`. Same `mapStatus` (skipped → 'skipped', past → 'past', current → 'current', upcoming → 'default') as the web component (`apps/web/app/components/MetraTripStopTimeline.tsx`). Local `StopMeta` subcomponent renders the "Next stop"/"Skipped" pill + departure time + delay chip in the `trailing` slot. Imports `DerivedStop`, `StepStatus` from `@ctt/shared`.
- **`apps/mobile/components/MetraTripHeroStatusCard.tsx`** — RN port of `apps/web/app/components/MetraTripHeroStatusCard.tsx`. Same prop shape: `{ status, phase, currentDerived, firstStop, lastStop, vehiclePosition, lineColor, error, nowMs }`. Two-column layout via `flexDirection: 'row'`.
- **`apps/mobile/components/MetraTripRealtime.tsx`** — orchestrator, mirroring the web file 1:1 except for: imports `useMetraFeed` from `apps/mobile/lib/useMetraFeed.ts`, renders RN versions of HeroStatusCard + StopTimeline, and the footer's Refresh button is a `<Pressable>` with native styling. All polling/derivation/effect logic from the web is verbatim — that's the whole point of moving the helpers to `@ctt/shared`.
- **Rewrite `apps/mobile/app/(tabs)/metra/[line]/train/[trainNumber].tsx`** to fetch the trip via `useMetraTrip`, set `Stack.Screen options={{ title: \`Train ${trainNumber}\` }}`, and render `MetraTripRealtime`. Loading state: ActivityIndicator. Not-found state: friendly message + back link.

Tests:
- `apps/mobile/__tests__/components/MetraTripStopTimeline.test.tsx`
- `apps/mobile/__tests__/components/MetraTripHeroStatusCard.test.tsx`
- `apps/mobile/__tests__/components/MetraTripRealtime.test.tsx` (mock `useMetraFeed`, mock timers, assert past/current/upcoming derivation works end-to-end — port the web equivalent at `apps/web/__tests__/components/MetraTripRealtime.test.tsx`)
- `apps/mobile/__tests__/screens/metra-train.test.tsx` (rewrite the placeholder test)

## Critical files

| Path | Action |
|---|---|
| `packages/shared/src/metra-status.ts` | **create** (move from web) |
| `packages/shared/src/metra-trip-realtime-helpers.ts` | **create** (move from web) |
| `packages/shared/src/index.ts` | modify (export new modules) |
| `apps/web/app/lib/metra-status.ts` | rewrite as re-export shim |
| `apps/web/app/lib/metra-trip-realtime-helpers.ts` | rewrite as re-export shim |
| `apps/functions/src/index.ts` | modify (add `metraTripUpdates`, `metraPositions`) |
| `apps/functions/package.json` | modify if `gtfs-realtime-bindings` not present |
| `apps/web/__tests__/functions/metra-realtime-proxies.test.ts` | **create** |
| `apps/mobile/components/Steps/Steps.tsx` | **create** |
| `apps/mobile/components/Steps/Step.tsx` | **create** |
| `apps/mobile/components/Steps/index.ts` | **create** |
| `apps/mobile/__tests__/components/Steps.test.tsx` | **create** |
| `apps/mobile/lib/useMetraFeed.ts` | **create** |
| `apps/mobile/lib/hooks.ts` | modify (add `useMetraTrip`) |
| `apps/mobile/components/MetraTripStopTimeline.tsx` | **create** |
| `apps/mobile/components/MetraTripHeroStatusCard.tsx` | **create** |
| `apps/mobile/components/MetraTripRealtime.tsx` | **create** |
| `apps/mobile/app/(tabs)/metra/[line]/train/[trainNumber].tsx` | rewrite |
| `apps/mobile/__tests__/components/MetraTripStopTimeline.test.tsx` | **create** |
| `apps/mobile/__tests__/components/MetraTripHeroStatusCard.test.tsx` | **create** |
| `apps/mobile/__tests__/components/MetraTripRealtime.test.tsx` | **create** |
| `apps/mobile/__tests__/screens/metra-train.test.tsx` | rewrite |
| `CLAUDE.md` | update mobile component index and project structure |

## Reuse map (existing code)

- **Cloud Function pattern** — `apps/functions/src/index.ts` lines 79–111 (`metraAlerts`) is the template for both new functions.
- **Mobile RN timeline patterns** — `apps/mobile/components/StationTimeline.tsx` already implements per-row segments, terminal vs mid bullets, and Pressable+Link wrapping. Mobile `Steps` follows the same pattern.
- **`hexWithAlpha` helper** — already present in `apps/web/app/components/Steps/Step.tsx`. Copy (or move to shared if a second use surfaces).
- **`@ctt/shared` constants** — `LINE_COLORS`, `extractMetraTrainNumber`, `routeIdToLineSlug` are already consumable from mobile.
- **Existing mobile data hooks** — `apps/mobile/lib/hooks.ts` is the existing pattern (`useLine`, `useStationTrips`, etc.) — `useMetraTrip` lands alongside them.
- **Existing mobile `useAlerts`** — `apps/mobile/lib/hooks.ts` already polls a Cloud Function (`metraAlerts`) on a 30s cadence with retry handling. `useMetraFeed`'s polling skeleton can borrow the AppState-aware structure from there.
- **Test mocks** — `apps/mobile/jest.config.js` already mocks `expo-router`, `react-native-svg`, and `expo-linear-gradient`; the new tests inherit these.

## Sequencing

1. **Move helpers to shared.** Web tests still pass after the move + shim. Smallest possible diff first; isolates the refactor risk.
2. **Add Cloud Functions + tests.** Stand-alone; can deploy independently. Once deployed, mobile can fetch live data.
3. **Build mobile Steps primitive + tests.** Independent of layers 1 + 2; could be reordered, but easier to land before consumers exist.
4. **Build mobile data hooks (`useMetraFeed`, `useMetraTrip`).** Depends on layer 2 being deployed.
5. **Build mobile components + screen + tests.** Depends on all prior layers.

Each layer ends with a green test run + commit. Five logical commits, ~one per layer.

## Verification

End to end:

1. `pnpm -w run test` — full workspace suite passes (web + mobile + functions). The most important assertion: the existing web tests still pass after Layer 1's helper move.
2. `pnpm -w run lint` — clean.
3. `cd apps/functions && pnpm run build` — Cloud Functions compile.
4. `firebase deploy --only functions:metraTripUpdates,functions:metraPositions` — deploy to Firebase. (User-driven; not automated in this plan.)
5. `pnpm --filter mobile run distribute:android` (or `:ios`) — sanity build the mobile app.
6. **Manual:** open the mobile app → tap any Metra station → tap an arrival in the ArrivalsCard. The train detail screen renders with title `Train <number>`, hero status card, and the stop timeline (halo bullet on current stop, "Next stop" pill, line color rail, dim past stops). Background the app for ~60s and reopen — polling resumes; data refreshes within 30s. Toggle airplane mode — error message surfaces in the hero card without crashing. Stops with `slug: null` render as plain text (no link); stops with a slug push to `/(tabs)/metra/station/<slug>` when tapped.

## Out-of-scope (follow-ups)

- Migrating `apps/mobile/components/StationTimeline.tsx` to consume the new mobile `Steps`. Pure tidiness, no UX change. Land in a separate refactor PR.
- Migrating the **web** `useMetraFeed` to use the new Cloud Functions instead of the Next.js `/api/metra/...` proxy. Single source of truth long-term, but unrelated to mobile shipping. Defer.
- Adding a `pulse?: boolean` prop to `Steps` for animated halos. Web punted this in the original spec. Add when there's product demand.
