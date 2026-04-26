# Persisted Local Store + Favorites + Dashboards — Implementation Plan

> Companion to `docs/superpowers/specs/2026-04-25-favorites-and-persisted-store-design.md`. This doc covers the implementation steps, file touch list, and verification matrix; the spec captures the validated design decisions and architecture.

## Context

Implements the favorites + persisted-store feature designed in the companion spec. Phase 1 only — introduce TanStack Query + Zustand on both `apps/web` and `apps/mobile`, wire profile snapshot listening + favorite mutations, surface favorites on a new dashboard (web `/`, mobile `My Trains` tab), and add heart buttons to line/station/train detail headers. CTA + Metra only; Pace and broader fetch migration are out of scope (covered in Phases 2 and 3 in the spec).

---

## Implementation Steps

Each step ends with running `pnpm -w run lint` + `pnpm -w run test` clean. Tests get written alongside the code per the project's PostSourceFileEdit rule.

### Step 1 — Shared types + helpers
- `packages/shared/src/types.ts`: add `FavoriteType`, `Favorite`, extend `UserProfile.favorites: Favorite[]` (logical shape; Firestore stores as map but the TypeScript surface is the array).
- `packages/shared/src/favorites.ts`: `favoriteKey()`, `mapToArray()`, `arrayToMap()` — pure functions, fully tested.
- `packages/shared/src/index.ts`: export new symbols.

### Step 2 — Web: TanStack Query + Zustand wiring
- Add deps: `@tanstack/react-query`, `@tanstack/react-query-persist-client`, `@tanstack/query-sync-storage-persister`, `zustand`.
- `apps/web/app/lib/queryClient.ts` and `apps/web/app/components/QueryProvider.tsx`.
- `apps/web/app/lib/store/favorites.ts` — Zustand store with actions (`hydrate`, `addOptimistic`, `removeOptimistic`, `clear`) + `persist` middleware.
- Wrap root layout with `QueryProvider` (inside `AuthProvider`).
- Tests: store unit tests; provider mounts cleanly.

### Step 3 — Mobile: TanStack Query + Zustand wiring
- Add deps: same as web but `@tanstack/query-async-storage-persister` instead of sync-storage.
- `apps/mobile/lib/queryClient.ts`, `apps/mobile/components/QueryProvider.tsx`.
- `apps/mobile/lib/store/favorites.ts` — same store API, `AsyncStorage` adapter for `persist`.
- Wrap `apps/mobile/app/_layout.tsx` with `QueryProvider`.
- Tests using `jest-expo` preset.

### Step 4 — AuthProvider: live profile snapshot + Zustand hydration
- Web `apps/web/app/components/AuthProvider.tsx`: replace one-shot `getDoc` with `onSnapshot(profileRef)`. On every snapshot, project `profile.favorites` map → array → call Zustand `hydrate`. On sign-out, call Zustand `clear`.
- Mobile `apps/mobile/lib/AuthContext.tsx`: same change.
- Tests: simulate snapshot updates, assert store state changes.

### Step 5 — `useToggleFavorite` mutation
- New hook on each platform. Wraps a TanStack Query `useMutation` that writes to Firestore with `updateDoc(profileRef, { [\`favorites.${key}\`]: value | deleteField() })`.
- Hook does optimistic update via Zustand action, calls mutation, lets `onSnapshot` reconcile.
- Tests: optimistic add/remove, signed-out tap surfaces auth modal.

### Step 6 — `FavoriteButton` component
- Web: heart SVG, hover/focus styles, dark mode, ≥44×44 tap target. Receives `{ type, id }`. Reads favorited-state from Zustand by key.
- Mobile: react-native-svg heart. Same API.
- Tests: render, click toggles state, signed-out click opens auth.

### Step 7 — `PageHeader` integration
- Web `apps/web/app/components/PageHeader.tsx` and mobile `apps/mobile/components/PageHeader.tsx`: optional `favorite?: { type: FavoriteType; id: string }` prop. When provided, render `FavoriteButton` next to the title.
- Wire it into:
  - Web: `LineDetail`, `StationDetail`, train detail page (`apps/web/app/metra/[line]/train/[trainNumber]/page.tsx`).
  - Mobile: line detail screen, station detail screen, **and** introduce `PageHeader` to `apps/mobile/app/(tabs)/metra/[line]/train/[trainNumber].tsx` (currently bare ScrollView).
- CTA train detail pages do not exist (CTA train tracker doesn't have per-trip pages); skip train favorites for CTA in v1. Only Metra trains can be favorited. Lines + stations work for both services.
- Tests for each integration point.

### Step 8 — Dashboard sections
- `FavoriteTrains` — reads favorited train IDs, fetches each `metra-trips/{id}` (TanStack Query), subscribes to `useMetraFeed` for live status pills.
- `FavoriteStations` — reads favorited station IDs, looks up name + lines from cached `stations` collection, renders `LinkCard` rows.
- `FavoriteLines` — reads favorited line IDs, renders chip list using existing `LineChipList`.
- Each section handles three states: signed-out (CTA placeholder), signed-in empty (empty-state copy), populated.
- Tests: render each state.

### Step 9 — Dashboard orchestrator + page integration
- Web: `apps/web/app/components/dashboard/Dashboard.tsx` — composes header, three favorites sections, hero. Replaces `<Hero />` in `apps/web/app/page.tsx`.
- Mobile: `apps/mobile/components/dashboard/Dashboard.tsx` — same composition. Replaces placeholder content in `apps/mobile/app/(tabs)/my-trains.tsx`.
- Update `apps/web/app/sitemap.ts` if any new public route is added (none expected — `/` already in sitemap).
- Update `<title>` / metadata for `/` to reflect dashboard (still SEO-correct for unauthenticated visitors).
- Tests: dashboard renders all three sections + hero in correct order.

### Step 10 — Verification + polish
- Run full lint + test suite on web and mobile. Zero warnings, zero errors.
- Manual check matrix (see Verification below).
- Update `CLAUDE.md` "Project Structure" map with new files (the new dashboard subdirectory and store path).

---

## Critical Files (touch list)

**Will modify:**
- `packages/shared/src/types.ts`, `packages/shared/src/index.ts`
- `apps/web/app/components/AuthProvider.tsx`, `apps/mobile/lib/AuthContext.tsx`
- `apps/web/app/components/PageHeader.tsx`, `apps/mobile/components/PageHeader.tsx`
- `apps/web/app/layout.tsx`, `apps/web/app/page.tsx`
- `apps/mobile/app/_layout.tsx`, `apps/mobile/app/(tabs)/my-trains.tsx`
- `apps/mobile/app/(tabs)/metra/[line]/train/[trainNumber].tsx` (introduce PageHeader)
- `apps/web/app/components/LineDetail.tsx`, `apps/web/app/components/StationDetail.tsx`
- `apps/web/app/metra/[line]/train/[trainNumber]/page.tsx`
- `apps/web/package.json`, `apps/mobile/package.json` (deps)
- `CLAUDE.md` (project structure update)

**Will create:**
- `packages/shared/src/favorites.ts`
- `apps/web/app/lib/queryClient.ts`, `apps/web/app/lib/store/favorites.ts`
- `apps/web/app/components/QueryProvider.tsx`, `apps/web/app/components/FavoriteButton.tsx`
- `apps/web/app/components/dashboard/{Dashboard,FavoriteTrains,FavoriteStations,FavoriteLines,DashboardHero}.tsx`
- `apps/mobile/lib/queryClient.ts`, `apps/mobile/lib/store/favorites.ts`
- `apps/mobile/components/QueryProvider.tsx`, `apps/mobile/components/FavoriteButton.tsx`
- `apps/mobile/components/dashboard/...` (mirror)
- Test files mirroring each new source file under `apps/web/__tests__/...` and `apps/mobile/__tests__/...`

**Will reuse (no changes):**
- `packages/shared/src/cta-pulse.ts`, `metra-trip-matching.ts`
- `apps/web/app/lib/hooks/useMetraFeed.ts`, `apps/mobile/lib/useMetraFeed.ts`
- Existing Hero, LineChipList, LinkCard, Steps, MetraTripStopTimeline

---

## Verification

### Automated
- `pnpm -w run lint` — clean.
- `pnpm -w run test` — clean, zero warnings, zero errors.
- New unit tests cover: shared favorites helpers, Zustand store actions, FavoriteButton interactions, dashboard section render states (signed-out / empty / populated), AuthProvider snapshot reconciliation.

### Manual matrix

| Scenario | Expected |
| --- | --- |
| Visit `/` signed out (web) | Dashboard renders with CTA placeholders in each favorites section + hero cards working. |
| Sign in on web with email, no favorites yet | Dashboard updates to empty-state messages; CTA placeholders gone. |
| Open Red line detail, tap heart | Heart fills instantly; Firestore profile doc gets `favorites.line:red`; reload page → heart still filled; dashboard shows Red line. |
| Open Union Station Metra detail, tap heart | Same flow for stations. |
| Open BNSF train 1234 detail (Metra), tap heart | Same flow for trains; dashboard row shows live status from `useMetraFeed` when train is running. |
| Open same account on mobile, cold launch | Persisted Zustand renders favorites instantly without network; `onSnapshot` reconciles shortly. |
| With both web + mobile open: tap heart on mobile | Web tab updates within ~1 second via `onSnapshot`. |
| Tap heart on a station page while signed out | `AuthModal` opens. Sign in → station is favorited automatically. |
| Toggle airplane mode on mobile, tap heart | Heart fills locally; on reconnect, Firestore write completes (Firebase SDK queue). |
| Sign out | Zustand favorites cleared; dashboard reverts to signed-out CTA placeholders. |
| Run `pnpm run:web`, smoke-test on Chrome at 375px / 768px / 1280px | Layout works at each breakpoint per project responsive rule. |
