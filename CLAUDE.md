# Chicago Transit Tracker — CLAUDE.md

This file provides guidance for Claude Code when working in this repository.

---

## Project Purpose

This project serves two purposes: it is a real, production-deployed transit information site **and** a teaching tool used to train a team on Claude Code workflows (planning, brainstorming, skills, subagents, etc.). When working in this repo, keep both audiences in mind:

- **As a product:** correctness, SEO, and CTA branding compliance matter
- **As a learning resource:** prefer clear, well-documented approaches over clever ones; follow the full superpowers workflow (brainstorm → spec → plan → implement) so the team can see the process modeled correctly; leave decisions explained in spec and plan docs rather than only in code comments

When introducing a new feature or workflow pattern, consider whether it would make a good example for someone learning Claude Code for the first time.

---

## Repository State

A pnpm workspaces monorepo containing:

- **`apps/web/`** — Next.js 16 / Tailwind CSS v4 / TypeScript web app for exploring CTA and Metra transit lines and stations. Deployed to Firebase App Hosting (SSR).
- **`apps/mobile/`** — React Native Expo app replicating the web experience on iOS/Android. Uses Firebase JS SDK for client-side Firestore reads.
- **`apps/functions/`** — Firebase Cloud Functions (2nd gen) for automated GTFS schedule sync.
- **`packages/shared/`** — Shared TypeScript types, constants, and pure helpers used by both web and mobile.

Data is stored in Firebase Firestore. The web app reads at build time via Firebase Admin SDK. The mobile app reads at runtime via Firebase JS SDK. CTA and Metra service alerts are fetched via Cloud Function HTTP proxies (`ctaAlerts`, `metraAlerts`) that normalize data into a shared `NormalizedAlert` format — used by both web and mobile. Metra positions and trip updates are still fetched via a server-side API proxy (web only).

---

## Project Structure

```
apps/
  web/
    app/
      layout.tsx                  Root layout — Navbar, GA scripts, dark mode init
      page.tsx                    Home page — Hero component
      globals.css                 Tailwind imports + dark mode custom variant
      sitemap.ts                  Dynamic XML sitemap — fetches all routes from Firestore
      sitemap/
        page.tsx                  Human-facing HTML site map at /sitemap
      robots.ts                   Robots.txt config
      not-found.tsx               Custom 404 page — transit-themed with navigation cards
      cta/
        page.tsx                  CTA service list page
        alerts/
          page.tsx                CTA service alerts page
        [line]/
          page.tsx                CTA line detail page
          [station]/
            page.tsx              CTA station detail page
      metra/
        page.tsx                  Metra service list page
        alerts/
          page.tsx                Metra service alerts page
        [line]/
          page.tsx                Metra line detail page
          [station]/
            page.tsx              Metra station detail page
      api/
        apple-redirect/
          route.ts                Apple OAuth bridge — POST/GET handler that bounces Apple's form_post response to a ctt:// deep link (Android Sign in with Apple)
        cta/train-locations/
          route.ts                Server-side proxy for CTA Train Tracker ttpositions
        metra/[...path]/
          route.ts                Server-side proxy for Metra GTFS Realtime (positions + tripupdates only)
        metra/station-trips/[slug]/
          route.ts                Metra station trips from Firestore
        metra/trip-index/[line]/
          route.ts                Metra trip index by line from Firestore
        metra/trips/[trainNumber]/
          route.ts                Metra trip detail from Firestore (requires ?line= query param)
        schedules/[slug]/
          route.ts                Station schedule data from Firestore
      components/
        Navbar.tsx                Top nav — links, ThemeToggle, UserMenu, MobileMenuToggle
        MobileMenuToggle.tsx      Hamburger menu (client component)
        ThemeToggle.tsx           Light/dark toggle — persisted to localStorage
        Hero.tsx                  Home page banner with CTA and Metra service cards
        CTAAlerts.tsx             CTA realtime rail alerts feed (client component)
        MetraAlerts.tsx           Metra realtime alerts feed (client component)
        MetraPositions.tsx        Metra realtime vehicle positions (client component, debug)
        MetraTripUpdates.tsx      Metra realtime trip updates (client component, debug)
        MetraTripRealtime.tsx     Train detail client component — Steps-based stop timeline + hero status card, polls tripupdates/positions
        MetraTripStopTimeline.tsx Per-stop timeline for the active trip — wraps Steps with status mapping and a StopMeta trailing slot
        Steps/                    Reusable vertical-step primitive (Steps + Steps.Item) — per-row rail segments, bullet/status/halo variants
        CurrentServiceList.tsx    Presentational list of active/upcoming trains with status pills (service-agnostic)
        MetraCurrentService.tsx   Line detail client component — polls realtime feeds, applies selection rules, renders CurrentServiceList
        CtaServicePulse.tsx       Presentational card row for CTA service health per terminal
        CtaServicePulseContainer.tsx  CTA data wrapper — polls ttpositions + alerts
        PageHeader.tsx            Full-bleed photo hero with breadcrumb, badges, title
        Breadcrumb.tsx            Semantic breadcrumb — rendered inside PageHeader
        LineChipList.tsx          Clickable line color chips linking to line pages
        LinkCard.tsx              Clickable list card used on service and line pages
        LineDetail.tsx            Full line detail layout
        StationDetail.tsx         Full station detail layout
        AuthProvider.tsx          Auth context + onSnapshot live profile listener; hydrates favorites store (client component)
        UserMenu.tsx              Navbar user icon / avatar dropdown (client component)
        AuthModal.tsx             Sign in/up/reset modal (client component)
        QueryProvider.tsx         TanStack Query + persist-client wrapper (localStorage)
        FavoriteButton.tsx        Heart toggle for line/station/train detail headers
        dashboard/
          Dashboard.tsx           Home dashboard orchestrator (renders Hero + DashboardGrid)
          DashboardHeader.tsx     Greeting + Profile / Sign-in CTA on the dashboard
          DashboardGrid.tsx       Unified mixed-type favorites list — drag (mouse/touch) to reorder, ⋯ to open menu
          FavoriteMenu.tsx        Anchored dropdown invoked from each card's ⋯ button
          TrainStopPickerModal.tsx Stop picker for train favorites — sets origin/destination override
          cards/
            cardClassNames.ts     Shared Tailwind strings for all favorite card rows
            CardMenuButton.tsx    Trailing ⋯ Pressable used on every card
            LineCard.tsx          Favorite-line row (title + termini + accent left border)
            StationCard.tsx       Favorite-station row — direction filter + density + arrivals
            TrainCard.tsx         Favorite-train row — origin/destination title + "{line} #{num}" subheader; live: header pulse + compact status/destination panel
        profile/
          FavoritesManager.tsx    Profile favorites manager (Lines/Stations/Trains sections + Clear all)
          FavoritesSection.tsx    Section header + list of FavoriteRows
          FavoriteRow.tsx         Single favorite row with deep link + trash button
      profile/
        page.tsx                  User profile page (server shell + metadata)
        ProfileContent.tsx        Profile display (client component) — renders FavoritesManager
      lib/
        firebase-admin.ts         Firestore singleton (Admin SDK) — web only
        firebase-client.ts        Firebase client SDK init — Auth + Firestore (client-side)
        auth.ts                   Auth helpers — sign in/up/out, reset, social providers
        cta-alerts.ts             Client-side fetch + types for CTA Customer Alerts API
        metra-realtime.ts         Client-side fetch + protobuf decode for Metra feeds
        metra-status.ts           Shared status derivation for Metra trips
        cta-train-tracker.ts      Client-side fetch + types for CTA Train Tracker positions
        ../components/MetraTripHeroStatusCardCompact.tsx TrainCard live panel — StationCard-style gray status/last-reported bar + line-colored next-stop | destination-ETA row
        transit.ts                Data access — getLinesForService, getLine, getMetraLineTrips, etc.
        types.ts                  Re-exports from @ctt/shared
        constants.ts              Re-exports from @ctt/shared
        siteConfig.ts             Re-exports from @ctt/shared
        cta-pulse.ts              Re-exports from @ctt/shared
        metra-trip-matching.ts    Re-exports from @ctt/shared
        favorites.ts              Re-exports from @ctt/shared (Favorite, favoriteKey, mapToArray)
        queryClient.ts            TanStack Query client factory (browser-cached singleton)
        store/
          favorites.ts            Zustand store for favorites (localStorage-persisted)
        hooks/
          useToggleFavorite.ts    Optimistic favorite toggle + map-keyed Firestore writes (writes `position` for fully-reordered users)
          useReorderFavorites.ts  Optimistic drag-end reorder + batched `favorites.{key}.position` Firestore write
          useClearAllFavorites.ts Optimistic clear-all + Firestore `favorites: {}` write (revert on error)
          useDashboardQueries.ts  TanStack Query reads for lines/stations/metra-trip/station-schedule/station-trips on the dashboard
          useUpdateFavoriteSettings.ts  Persist per-favorite settings (direction filter, density, train stop overrides) to Firestore + store
          useMetraTripLiveStatus.ts  Polling hook returning derived realtime state for a Metra trip (used by TrainCard mini hero)
        favoriteRoute.ts          Pure helper: resolves a Favorite to its deep-link route
    __tests__/                    Jest + React Testing Library test suites
    scripts/
      seed-lines.ts               Seeds 19 lines into Firestore
      seed-stations.ts            Seeds stations from CTA API + Metra GTFS
      upload-station-image.ts     Check/upload station hero photo to Firebase Storage
      cleanup-metra-trips.ts      One-time cleanup of stale metra-trips docs (dry-run by default)
      tsconfig.json               CommonJS tsconfig for ts-node script execution
  mobile/
    app/
      _layout.tsx                 Root Stack — transparent header, AuthProvider, HeaderBackButton (left)
      index.tsx                   Home screen — renders Dashboard
      auth.tsx                    Sign in/up/reset screen (modal presentation)
      profile.tsx                 User profile screen
      terms.tsx                   Terms of Use screen — mirrors web copy, includes Metra non-affiliation wording
      privacy.tsx                 Privacy Policy screen — mirrors web copy
      cta/
        index.tsx                 CTA line list
        alerts.tsx                CTA service alerts screen
        [line].tsx                CTA line detail
        station/[station].tsx     CTA station detail
      metra/
        index.tsx                 Metra line list
        alerts.tsx                Metra service alerts screen
        [line]/
          index.tsx               Metra line detail
          train/[trainNumber].tsx Metra train detail screen — fetches via useMetraTrip + renders MetraTripRealtime
        station/[station].tsx     Metra station detail
    components/
      AlertBanner.tsx             Alert link banner with live count (used on index pages)
      AlertCard.tsx               Single alert card with route badges and link
      CTAAlerts.tsx               CTA alerts list with filter chips (client component)
      CTALineIcon.tsx             CTA 'L' train icon (react-native-svg)
      LineListItem.tsx             Reusable line list card with accent border
      MetraAlerts.tsx             Metra alerts list with filter chips (client component)
      PageHeader.tsx              Full-bleed photo hero with overlays, title, badges (matches web)
      TimetableFilterBar.tsx      Shared direction + service type toggle bar
      CTAScheduleTable.tsx        CTA timetable with direction filtering and service type tabs
      MetraTimetable.tsx          Metra timetable with trip rows, direction + service type filters
      MetraTripRealtime.tsx       Train detail orchestrator — polls tripupdates+positions, derives stop state, renders hero card + Steps timeline
      MetraTripStopTimeline.tsx   Per-stop timeline for the active trip — wraps Steps with status mapping
      MetraTripHeroStatusCard.tsx Two-panel live status card (RN port of the web component)
      Steps/                      Reusable vertical-step primitive (Steps + Steps.Item) — RN port; per-row segments, halo bullet for current
      HeaderUserIcon.tsx          Stack header user icon — navigates to auth/profile
      HeaderBackButton.tsx        Translucent circle back button used as Stack headerLeft (returns null at root)
      QueryProvider.tsx           TanStack Query + persist-client wrapper (AsyncStorage)
      FavoriteButton.tsx          Heart toggle for line/station/train detail headers
      Footer.tsx                  Two-link footer (Terms · Privacy) appended at the end of every scrolling screen
      PressableButton.tsx         Snappy press primitive — Pressable + tuned scale/opacity feedback, Android ripple, opt-in expo-haptics
      dashboard/
        Dashboard.tsx             Home screen orchestrator — DashboardGrid is the single scroller (header + DashboardHero passed as ListHeader/ListFooter)
        DashboardHero.tsx         CTA + Metra service nav cards
        DashboardGrid.tsx         Unified mixed-type favorites list — long-press to drag-reorder, ⋯ to open menu
        FavoriteMenuSheet.tsx     @gorhom/bottom-sheet menu invoked from each card's ⋯ button
        TrainStopPickerSheet.tsx  Stop picker bottom sheet for train favorites — sets origin/destination override
        cards/
          cardStyles.ts           Shared `useCardStyles()` hook returning theme-aware StyleSheet for all favorite card rows
          CardMenuButton.tsx      Trailing ⋯ Pressable used on every card
          LineCard.tsx            Favorite-line row (title + termini + colored chip)
          StationCard.tsx         Favorite-station row — direction filter + density + arrivals
          TrainCard.tsx           Favorite-train row — origin/destination title + "{line} #{num}" subheader; live: header pulse + compact status/destination panel
      profile/
        FavoritesManager.tsx      Profile favorites manager (Lines/Stations/Trains sections + Clear all)
        FavoritesSection.tsx      Section header + list of FavoriteRows
        FavoriteRow.tsx           Single favorite row with deep link + trash button
    lib/
      config.ts                   Cloud Functions base URL constant
      firebase.ts                 Firebase JS SDK init — App, Auth (with AsyncStorage persistence), Firestore
      hooks.ts                    Firestore data hooks (useLines, useStation, useStationTrips, useAlerts, useMetraTrip)
      useMetraFeed.ts             Metra GTFS-RT feed subscriber — polls Cloud Functions, AppState-aware
      useNavHeaderInset.ts        Top inset for screens under the transparent navigator header (Android-safe fallback)
      useToggleFavorite.ts        Optimistic favorite toggle + map-keyed Firestore writes (writes `position` for fully-reordered users)
      useReorderFavorites.ts      Optimistic drag-end reorder + batched `favorites.{key}.position` Firestore write
      useClearAllFavorites.ts     Optimistic clear-all + Firestore `favorites: {}` write (revert on error)
      useDashboardQueries.ts      TanStack Query reads for lines/stations/metra-trip/station-schedule/station-trips on the dashboard
      useUpdateFavoriteSettings.ts  Persist per-favorite settings (direction filter, density, train stop overrides) to Firestore + store
      useMetraTripLiveStatus.ts   Polling hook returning derived realtime state for a Metra trip (used by TrainCard mini hero)
      favoriteRoute.ts            Pure helper: resolves a Favorite to its deep-link route
      queryClient.ts              TanStack Query client factory (singleton)
      store/
        favorites.ts              Zustand store for favorites (AsyncStorage-persisted) + reorder action + pendingWrites guard
      auth.ts                     Auth helpers — email/password, social (Apple, Google)
      AuthContext.tsx              Auth context + onSnapshot live profile listener; hydrates favorites store (skipped while pendingWrites>0)
      theme/
        tokens.ts                 Light + dark token objects (semantic colors, numeric space + radius scales)
        ThemeProvider.tsx         Provider — resolves system/light/dark + persists choice to AsyncStorage
        useTheme.ts               Hook returning { theme, mode, resolvedMode, setMode }
        useSystemColorScheme.ts   Thin wrapper around RN's useColorScheme (mockable for tests)
        index.ts                  Barrel export
    __tests__/                    Jest + React Native Testing Library test suites
  functions/
    src/
      index.ts                    Cloud Functions entry — syncCtaGtfs, syncMetraGtfs, ctaAlerts, metraAlerts, metraTripUpdates, metraPositions
      lib/
        alert-constants.ts        Alert-related constants (local copy from shared, for CommonJS compat)
        gtfs-utils.ts             Shared GTFS parsing utilities
        change-detection.ts       CTA/Metra feed change detection (HEAD + published.txt)
        firestore-writer.ts       Batched Firestore writer (500-op chunks)
        parsers/
          alert-types.ts          NormalizedAlert types (local copy from shared)
          cta-alerts.ts           CTA alerts API → NormalizedAlert[] normalizer
          metra-alerts.ts         Metra GTFS-RT alerts → NormalizedAlert[] normalizer
          cta-schedules.ts        CTA GTFS → per-station schedule data
          metra-schedules.ts      Metra GTFS → per-station schedule data
          metra-trips.ts          Metra GTFS → trip details, indexes, station trips
    package.json                  Separate deps for Cloud Functions runtime
    tsconfig.json                 TypeScript config for Cloud Functions
scripts/
  generate-icons.sh               Regenerate all web + mobile app icons from apps/web/public/logo.svg (ImageMagick)
packages/
  shared/
    src/
      index.ts                    Barrel export of all shared modules
      types.ts                    Line, Station, UserProfile, Favorite, FavoriteType TypeScript interfaces
      gtfs-types.ts               Schedule and trip type definitions
      pace-types.ts               Pace transit types
      constants.ts                CTA/Metra line colors, names, route mappings
      siteConfig.ts               Site name, URL, OG image config
      cta-pulse.ts                Pure aggregation + health helpers for CTA service pulse
      metra-trip-matching.ts      Helpers for matching Metra realtime entities
      favorites.ts                Pure helpers for favorites (favoriteKey, mapToArray, arrayToMap)
      station-arrivals.ts         Pure helpers for arrival groups, per-favorite direction filters, and station-name shortening
```

---

## Tech Stack

- **Monorepo:** pnpm workspaces + Turborepo
- **Web:** Next.js 16 (App Router, SSR with `generateStaticParams` for pre-rendering)
- **Mobile:** React Native Expo (SDK 54) with expo-router
- React 19
- TypeScript 5
- Tailwind CSS v4 (web, class-based dark mode via `@custom-variant dark`)
- Firebase Admin SDK (build-time Firestore reads, web only)
- Firebase JS SDK v11 (client-side Firestore reads + Auth, web and mobile)
- Firebase Authentication (Email/Password, Apple, Google)
- Firebase App Hosting (SSR deployment target for web)
- gtfs-realtime-bindings (protobuf decode for Metra GTFS Realtime feeds)
- Google Analytics 4 (G-KQ1MNGBQP2, loaded via `next/script afterInteractive`)
- Firebase Cloud Functions (2nd gen) with Cloud Scheduler (automated GTFS sync)
- react-native-gesture-handler + react-native-reanimated + react-native-draggable-flatlist (mobile dashboard drag-to-reorder)
- @gorhom/bottom-sheet (mobile favorite-card overflow menu)
- expo-haptics (mobile — opt-in tactile feedback on `PressableButton`)
- @dnd-kit/core + @dnd-kit/sortable + @dnd-kit/utilities (web dashboard drag-to-reorder)
- Jest 30 + React Testing Library

---

## Commands

```bash
# Root
pnpm run:web               # Dev server for web at http://localhost:3000
pnpm run:ios               # Launch iOS simulator via Expo
pnpm run:android           # Launch Android emulator via Expo
pnpm test                  # Run all test suites (via Turborepo)
pnpm test:web              # Run web tests only
pnpm test:mobile           # Run mobile tests only
pnpm lint                  # Lint all packages (via Turborepo)
pnpm lint:web              # Lint web only
pnpm lint:mobile           # Lint mobile only

# Web (from apps/web/)
pnpm run dev               # Dev server directly
pnpm run lint:fix          # Auto-fix lint issues
pnpm test                  # Jest tests
pnpm run seed:lines        # Seed Firestore lines collection
pnpm run seed:stations     # Seed Firestore stations collection

# Mobile (from apps/mobile/)
npx expo start             # Start Expo dev server
npx expo start --ios       # Launch iOS simulator
npx expo start --android   # Launch Android emulator
pnpm test                  # Jest tests (jest-expo preset)
pnpm run lint              # ESLint (eslint-config-expo) + Prettier

# Mobile distribution (Firebase App Distribution — from repo root)
pnpm --filter mobile run distribute:android   # Build + upload Android APK to testers
pnpm --filter mobile run distribute:ios       # Build + upload iOS IPA to testers
pnpm --filter mobile run distribute           # Both platforms, sequential

# Firebase
firebase deploy --only firestore         # Deploy Firestore rules
firebase deploy --only functions         # Deploy Cloud Functions
cd apps/functions && npm run build       # Build Cloud Functions
firebase functions:log                   # View function logs
# Web deploys automatically via Firebase App Hosting on push to main
```

---

## Key Architecture Decisions

### Monorepo with pnpm workspaces

The repo uses pnpm workspaces with Turborepo for task orchestration. Key config files:
- `pnpm-workspace.yaml` — declares `apps/*` and `packages/*` as workspace packages
- `turbo.json` — defines `build`, `lint`, `test`, `dev` task pipelines
- `.npmrc` — `node-linker=hoisted` + `shamefully-hoist=true` for compatibility
- Root `package.json` has `pnpm.overrides` to pin React version across workspaces

### Shared package (`packages/shared`)

Platform-agnostic types, constants, and pure helpers consumed by both web and mobile. No build step — consumed as TypeScript source via `transpilePackages` (Next.js) and Metro (Expo). **Must never import** `firebase-admin`, `next`, `next/*`, or `react-dom`.

### SSR with static pre-rendering + Firestore at build time

The web app runs as a server-side rendered Next.js app deployed to Firebase App Hosting. Pages with `generateStaticParams` are pre-rendered at build time (SSG). API routes (`apps/web/app/api/`) run server-side on Cloud Run.

- `generateStaticParams` enumerates slugs for all dynamic routes (pre-rendered as static HTML)
- Server components fetch line/station data as props
- `serverExternalPackages: ['firebase-admin']` prevents Next.js from bundling the Admin SDK client-side
- `apps/web/app/api/metra/[...path]/route.ts` proxies Metra GTFS Realtime requests server-side (avoids CORS, hides API key)
- `apps/web/next.config.ts` includes `transpilePackages: ['@ctt/shared']` for shared code

### Mobile app (Expo)

The mobile app uses Firebase JS SDK (not Admin SDK) for client-side Firestore reads. It shares types and constants from `@ctt/shared` but has its own data hooks in `apps/mobile/lib/hooks.ts`. Navigation uses expo-router (file-based routing) with a single flat root Stack — no bottom tabs. The home screen (`app/index.tsx`) hides the navigator header (`headerShown: false`) and renders the Dashboard ("My Trains") edge-to-edge — `DashboardHeader` provides the in-screen greeting and Profile/Sign-in CTAs. CTA and Metra browsing happens by tapping cards on the dashboard. The Stack uses `headerTransparent: true` with a transparent `headerStyle.backgroundColor` so full-bleed `PageHeader` photos extend edge-to-edge under the navigator on every screen that has one. `HeaderBackButton` is the custom `headerLeft` (returns `null` at root). All detail screens (`/cta/[line]`, `/metra/[line]`, station and train screens) render `PageHeader` with `compact` enabled — station screens use `station.photoUrl` with the service default as fallback; line and train screens use the service default directly (`hero-header.jpg` for CTA, `hero-header-metra.jpg` for Metra). The favorite heart sits in the navigator's `headerRight` on detail screens (translucent circle matching `HeaderBackButton`). Screens without a `PageHeader` use `useNavHeaderInset()` to inset their content below the header.

### Dark mode

**Web** uses Tailwind v4 class-based dark mode. A blocking inline `<script>` in `<head>` applies `.dark` to `<html>` before first paint to prevent flash. `suppressHydrationWarning` is set on `<html>`. `ThemeToggle` uses a mount-only render pattern to avoid hydration mismatch.

**Mobile** has its own design-token system at `apps/mobile/lib/theme/` — semantic color tokens (`bg/text/border/accent/status/onScrim`), a numeric 4-pt `space` scale, and `radius` scale. `ThemeProvider` wraps the root and resolves a three-state `mode` setting (`'system' | 'light' | 'dark'`) against `useColorScheme()`, persisting the choice to AsyncStorage. Components consume tokens via `useTheme()` and a `makeStyles(theme)` factory + `useMemo` (instead of a static `StyleSheet.create`). The light palette mirrors web's Tailwind defaults so the brand stays consistent cross-platform; the dark palette preserves the mobile values shipped before the migration. CTA/Metra **line identity colors** continue to come from `@ctt/shared` (Pantone-correct, non-theme-aware) — the tokens are for chrome only. The user-facing toggle lives on the profile screen as a System/Light/Dark segmented control.

### Firebase Authentication

Both web and mobile use Firebase Auth with three providers: Email/Password, Apple, and Google. Auth state is managed via a React context (`AuthProvider` + `useAuth()` hook) on each platform.

- **Web:** `apps/web/app/lib/firebase-client.ts` initializes the Firebase client SDK (separate from the Admin SDK in `firebase-admin.ts`). Auth helpers in `apps/web/app/lib/auth.ts` use popup-based OAuth for social providers. `AuthProvider` wraps `<body>` children in the root layout.
- **Mobile:** `apps/mobile/lib/firebase.ts` initializes Auth with `getReactNativePersistence(AsyncStorage)` so auth state persists between app sessions. Auth helpers in `apps/mobile/lib/auth.ts` use `expo-apple-authentication` (iOS) and `expo-auth-session` (Google). `AuthProvider` wraps the app in `_layout.tsx`.
- **Profile auto-creation:** When a user signs in for the first time, `AuthProvider` automatically creates a `profiles/{uid}` document in Firestore.
- **Firestore rules:** The `profiles` collection uses owner-only access (`request.auth.uid == userId`). All other transit collections use explicit rules (no wildcard) to prevent accidental exposure.

### Firestore credentials

`apps/web/app/lib/firebase-admin.ts` checks for `service-account.json` first, then falls back to `applicationDefault()`. `service-account.json` is gitignored. For local dev, it's symlinked from the repo root into `apps/web/`.

### Duplicate station slugs

Some stations share names across CTA and Metra (e.g. Rosemont). The seed script detects duplicates and appends `-cta` / `-metra` to the slug and doc ID.

### Station hero photos

Stations can have a custom hero photo. The `Station.photoUrl` field (Firestore) is read by the station page server component and passed to `PageHeader`'s `imageSrc` prop — when `null`, `PageHeader` falls back to the default CTA hero or the Metra-specific hero. Photos live in Firebase Storage at `stations/{slug}/hero.jpg` in the `chicago-transit-tracker.firebasestorage.app` bucket and are served publicly via `makePublic()`. The `storage.googleapis.com` bucket path is allowlisted in `apps/web/next.config.ts` under `images.remotePatterns` so `next/image` accepts it. Photos are added via the `/station-image` skill, which shells out to ImageMagick to center-crop to 1600×900 and calls `apps/web/scripts/upload-station-image.ts` to handle the upload + Firestore write.

### Automated GTFS schedule sync

Two Cloud Functions (2nd gen) check CTA and Metra GTFS static feeds hourly for updates:

- **`syncCtaGtfs`** — runs at `:00`, checks `Last-Modified`/`ETag` headers via HEAD request on the CTA GTFS zip (~99MB). Only downloads if changed.
- **`syncMetraGtfs`** — runs at `:05`, checks Metra's `published.txt` timestamp file. Only downloads if changed.

When a feed changes, the function downloads the zip, parses it using the shared library in `apps/functions/src/lib/`, and writes results to these Firestore collections:

| Collection            | Contents                                                        | Doc count |
| --------------------- | --------------------------------------------------------------- | --------- |
| `schedules`           | Per-station departure times by direction + service type         | ~336      |
| `metra-trips`         | Individual trip stop sequences (one per train number per line)  | ~1,000    |
| `metra-trip-indexes`  | Trip lists per line by service type                             | 11        |
| `metra-station-trips` | Trips per station by service type                               | ~237      |
| `gtfs-meta`           | Change detection state (lastModified, etag, publishedTimestamp) | 2         |

Client components fetch schedule data through API routes (`/api/schedules/[slug]`, `/api/metra/station-trips/[slug]`, etc.) which read from Firestore with 1-hour cache headers.

---

## Firestore Collections

### `lines` — doc ID = slug (e.g. `red`, `bnsf`, `up-n`)

19 documents total (8 CTA rapid transit + 11 Metra commuter rail). Seeded by `apps/web/scripts/seed-lines.ts`.

### `stations` — doc ID = slug (e.g. `clark-lake`, `union-station-metra`)

~388 documents. Seeded by `apps/web/scripts/seed-stations.ts` using:

- CTA: Chicago Open Data Portal Socrata API (no auth required)
- Metra: GTFS static zip from Metra's public schedule feed (no auth required)

### `schedules` — doc ID = station slug

Per-station departure times grouped by direction and service type. Populated automatically by `syncCtaGtfs` and `syncMetraGtfs` Cloud Functions.

### `metra-trips` — doc ID = `{lineSlug}_{trainNumber}` (e.g. `bnsf_1200`)

Individual Metra trip stop sequences, one document per train number per line. Populated automatically by `syncMetraGtfs`, which extracts the train number from the GTFS `trip_id` (e.g. `BNSF_BN1200_V4_A` → `1200`) and deduplicates the `_A` / `_AA` / `_B` calendar variants into a single document. The page at `/metra/[line]/train/[trainNumber]` reads this collection directly. Each doc also carries an `isExpress` boolean — true when the trip's stop count is below 85% of the maximum stop count for the same `(lineSlug, serviceType, directionId)` group; surfaced as an "Express" pill on the dashboard TrainCard.

### `metra-trip-indexes` — doc ID = line slug

Trip lists per Metra line, grouped by service type. Populated automatically by `syncMetraGtfs`.

### `metra-station-trips` — doc ID = station slug

Trips stopping at each Metra station, grouped by service type. Populated automatically by `syncMetraGtfs`.

### `profiles` — doc ID = Firebase Auth UID

User profile documents, auto-created on first sign-in. Fields: `uid`, `email`, `displayName`, `photoUrl`, `provider` (`'apple' | 'google' | 'password'`), `favorites` (map keyed by `${type}:${id}`, each entry storing `type`, `id`, `addedAt`, optional `position` for the mobile drag-reorder UI), `createdAt`, `updatedAt`. Protected by owner-only Firestore rules — users can only read/write their own profile.

### `gtfs-meta` — doc ID = `cta` or `metra`

Change detection state for the GTFS sync functions (lastModified, etag, publishedTimestamp, lastCheckedAt, lastSyncedAt).

---

## CTA Branding Guidelines

All CTA-related UI must comply with the CTA Trademark Guidelines for Developers.

- **Local copy:** `docs/design guidelines/CTA_Trademark_Developer_Guidelines_(with_Branding_Guide)_v1_0.pdf`
- **Online:** `https://www.transitchicago.com/developers/branding/`

### Official 'L' Route Colors — use these exact hex values, no substitutions

| Line      | Hex       | Pantone |
| --------- | --------- | ------- |
| Red       | `#c60c30` | 186C    |
| Blue      | `#00a1de` | 299C    |
| Brown     | `#62361b` | 161C    |
| Green     | `#009b3a` | 355C    |
| Orange    | `#f9461c` | 172C    |
| Purple    | `#522398` | 267C    |
| Pink      | `#e27ea6` | 204C    |
| Yellow    | `#f9e300` | 012C    |
| Sign Grey | `#565a5c` | 425C    |

These are already correctly set in `packages/shared/src/constants.ts` and `apps/web/app/components/StationDetail.tsx`.

### Attribution

- Always credit CTA data with a phrase like "Data provided by Chicago Transit Authority" or "Powered by CTA data"
- Never use "official", "authorized", or "in partnership with CTA"

### Project naming

- **Chicago Transit Tracker** is compliant — CTA is not the first word
- Never name any page or feature in a way that sounds like it was made by or endorsed by CTA

### Logos — what is and isn't allowed

- **Prohibited:** Any CTA agency logo (circle logo, text-based logos, or approximations)
- **Allowed:** CTA Bus Tracker icon — only alongside Bus Tracker API data, black/white/grey only. Must include note: _"CTA Bus Tracker (SM) logo icon is a trademark of the Chicago Transit Authority."_
- **Allowed:** CTA Train Tracker icon — only alongside Train Tracker API data, black/white/grey only. Must include note: _"CTA Train Tracker (SM) logo icon is a trademark of the Chicago Transit Authority."_
- **Allowed:** US DOT bus icon — keep black or white, do not colorize
- **Allowed:** CTA 'L' train icon — can be used for L service information; may be colored to match official route colors

### Other rules

- Do not embed or reproduce official CTA maps or documents — link to them on the CTA website instead
- Do not imply CTA endorsement, sponsorship, or affiliation in any copy or UI

---

## CI / CD

**Deployment** is handled by Firebase App Hosting. Pushing to `main` (via merged PR) triggers an automatic build and deploy through Firebase's GitHub integration. The backend's **`rootDirectory`** is set to `apps/web` (managed in the Firebase console, NOT in `apphosting.yaml`) — Firebase looks for `apps/web/apphosting.yaml`, `apps/web/package.json`, and `apps/web/next.config.ts` when building. No manual deploy step needed.

**CI checks** run via GitHub Actions (`.github/workflows/deploy.yml`) on every push to `main` and on PRs:

1. `pnpm install --frozen-lockfile` — install dependencies
2. `pnpm -w run lint` — ESLint + Prettier (via Turborepo)
3. `pnpm -w run test` — Jest test suite (via Turborepo)

**Mobile builds** are handled via EAS Build, not in CI.

**Secrets and environment variables:**

| Secret            | Where it lives       | What it is                                |
| ----------------- | -------------------- | ----------------------------------------- |
| `METRA_API_TOKEN` | Cloud Secret Manager | Metra GTFS Realtime API key (server-only) |
| Firebase SA creds | Firebase App Hosting | Managed automatically by App Hosting      |

Secrets are configured in `apps/web/apphosting.yaml` and managed via `firebase apphosting:secrets:set`.

---

## Git Workflow

**Branch protection is enabled on `main`.** Direct pushes to `main` are blocked. All changes must be merged via a pull request. No approving review is required (solo project), so you can open and merge your own PRs.

**Auto-delete is enabled.** GitHub automatically deletes the feature branch after a PR is merged.

**Local cleanup:** `fetch.prune = true` is set globally, so `git pull` always prunes stale remote-tracking refs. The `git tidy` global alias force-deletes any local branch whose remote upstream is gone (i.e. any branch whose PR was merged + auto-deleted) — run it after merging a PR.

Typical workflow:

```bash
git checkout -b your-feature-branch
# make changes, commit
git push origin your-feature-branch
gh pr create --base main
gh pr merge --squash
# branch is deleted on GitHub automatically after merge
git checkout main && git pull && git tidy
```

---

## Standing Rules

**Sitemap:** Any time a new page route is added, `apps/web/app/sitemap.ts` must be updated to include it. No exceptions.

**SSR compatibility:** The web app runs as a server-side rendered app. API routes are available under `apps/web/app/api/`. Dynamic routes should use `generateStaticParams` for pre-rendering where possible.

**Firebase Admin in server components only:** Never import `firebase-admin` or anything from `apps/web/app/lib/firebase-admin.ts` in a client component (`'use client'`) or in `packages/shared/`.

**CTA branding:** All CTA UI must use the official hex colors above and follow the trademark rules. Full guidelines at `https://www.transitchicago.com/developers/branding/`.

**Planning and spec documents:** All planning documents go in `docs/superpowers/plans/YYYY-MM-DD-topic.md` and all design specs go in `docs/superpowers/specs/YYYY-MM-DD-topic-design.md`. Never save these only to Claude's internal plans directory — always write them to the repo so they are versioned with the code.

**Shared package guardrails:** `packages/shared/` must never import from `firebase-admin`, `next`, `next/*`, or `react-dom`. It must remain platform-agnostic so both web and mobile can consume it.

---

## SEO Rules

These rules must be applied whenever a new page is added or an existing page's content changes.

**Every page must export `metadata` or `generateMetadata`.** No exceptions. Static pages use `export const metadata: Metadata = { ... }`. Dynamic routes (`[param]`) must use `export async function generateMetadata(...)`.

**Required metadata fields** on every page:

- `title` — short page-level title (the root layout template appends `| Chicago Transit Tracker`)
- `description` — descriptive sentence specific to the page
- `openGraph` — must include `title`, `description`, `url`, `images`, and `type: 'website'`
- `twitter` — must include `card: 'summary_large_image'`, `title`, `description`, and `images`

**Site constants:** Always import from `@lib/siteConfig` (which re-exports from `@ctt/shared`). Never hardcode the site name, canonical URL, or default OG image path directly in a page file.

```typescript
import { siteConfig } from '@lib/siteConfig'
// siteConfig.name  — 'Chicago Transit Tracker'
// siteConfig.url   — 'https://chicagotransittracker.com'
// siteConfig.ogImage — '/og-default.png'
```

**`og:image` / `twitter:image`:** Use `siteConfig.ogImage` as the minimum fallback. If a page-specific image is available (e.g., `line.photoUrl`), it may be used instead, but `siteConfig.ogImage` must still be the fallback.

**`openGraph.url`:** Must be the full canonical URL of the page — `${siteConfig.url}/path`.

**New dynamic routes checklist:**

1. Add `generateStaticParams` (for pre-rendering at build time)
2. Add `generateMetadata` with all required fields above
3. Update `apps/web/app/sitemap.ts` to include the new route
