# Favorites + Persisted Local Store — Design

> Companion to `docs/superpowers/plans/2026-04-25-favorites-and-persisted-store.md`. The plan covers implementation steps, file touch list, and verification matrix; this doc captures the design decisions and architecture they execute.

## Context

The site has no global state layer on either platform today — both `apps/web` and `apps/mobile` rely on React Context and ad-hoc `useState`/`useEffect` fetches. There's no client-side persistence beyond Firebase Auth tokens (mobile `AsyncStorage`) and the dark-mode preference (web `localStorage`). Profiles are minimal: `uid`, `email`, `displayName`, `photoUrl`, `provider`, timestamps.

We want signed-in users to favorite lines, stations, and Metra trains, see those favorites on a dashboard (web home `/` and mobile My Trains tab), and have favorites round-trip cleanly between Firestore and local persisted state on both platforms. This also seeds a unified data-fetching pattern (TanStack Query) that subsequent phases can adopt for the rest of the codebase. CTA + Metra only — Pace is out of scope.

---

## Validated Design

### 1. State management

- **TanStack Query** for server state (Firestore reads, Cloud Function reads, third-party API reads).
- **Zustand** with `persist` middleware for owned local state — favorites + profile mirror.
- **Persistence adapters:**
  - Web: `@tanstack/query-sync-storage-persister` (`localStorage`) for query cache; Zustand uses `localStorage`.
  - Mobile: `@tanstack/query-async-storage-persister` (`AsyncStorage`) for query cache; Zustand uses `AsyncStorage`.
- **`useMetraFeed` stays unchanged.** Its module-level subscriber model is already proven and well-suited to its job; revisit in a later phase.

### 2. Migration scope (phased)

- **Phase 1 (current plan):** introduce TanStack Query + Zustand. Use them for the *new* reads/writes only — the profile snapshot listener and the favorite mutation. Existing data hooks stay as-is.
- **Phase 2 (separate brainstorm + plan, future PR):** migrate `apps/mobile/lib/hooks.ts` (`useLines`, `useStation`, `useStationTrips`, `useAlerts`, `useMetraTrip`, etc.) and the web client fetches in `CTAAlerts`, `MetraAlerts`, `MetraCurrentService`, `MetraTripRealtime`, `CtaServicePulseContainer` onto TanStack Query.
- **Phase 3 (later):** decide whether `useMetraFeed`'s subscriber polling wraps into TanStack Query or stays bespoke.

### 3. Favorites data model

- **Logical shape (used in code, Zustand, and `UserProfile` type):** an ordered array of typed entries.
  ```ts
  type FavoriteType = 'line' | 'station' | 'train'
  type Favorite = { type: FavoriteType; id: string; addedAt: string /* ISO 8601 */ }
  // UserProfile.favorites: Favorite[]
  ```
- **Firestore on-disk shape:** a map keyed by `${type}:${id}` to allow atomic per-favorite writes and avoid `arrayRemove` exact-match issues.
  ```ts
  // profiles/{uid}.favorites = {
  //   'line:red':                    { type, id, addedAt },
  //   'station:union-station-metra': { type, id, addedAt },
  //   'train:bnsf_1234':             { type, id, addedAt },
  // }
  ```
- **Projection helpers** in `packages/shared/src/favorites.ts`:
  - `mapToArray(map): Favorite[]` (sorted by `addedAt` desc)
  - `arrayToMap(arr): Record<string, Favorite>`
  - `favoriteKey(type, id): string`
- **IDs:**
  - Line: line slug (`red`, `bnsf`).
  - Station: station slug (`clark-lake`, `union-station-metra`) — matches existing CTA/Metra disambiguation.
  - Train: `${lineSlug}_${trainNumber}` — matches the `metra-trips` doc ID convention; represents the recurring trip identity.
- **No denormalized names/colors.** Dashboard renders by resolving IDs against TanStack-Query-cached `lines` and `stations` collections.

### 4. Sync strategy (cross-device live)

- **Optimistic local writes.** Tap heart → Zustand updates immediately → Firestore `updateDoc` with map-keyed atomic field write fires in the background.
  - Add: `updateDoc(profileRef, { [\`favorites.${key}\`]: { type, id, addedAt: serverTimestamp() }})`.
  - Remove: `updateDoc(profileRef, { [\`favorites.${key}\`]: deleteField() })`.
- **Live `onSnapshot` listener** on `profiles/{uid}` from `AuthProvider` (web + mobile) — pipes remote changes into Zustand. Multi-device updates surface within ~1 second.
- **Offline:** Firebase JS SDK's built-in offline write queue handles retry on reconnect.
- **Initial hydration:** Zustand's `persist` middleware rehydrates from local storage at app boot for instant render. The `onSnapshot` listener then reconciles when Firestore connects.
- **Logged out:** local Zustand favorites slice is cleared on sign-out; tapping a heart while signed out opens the existing `AuthModal` (web) / pushes `/auth` (mobile) and applies the favorite after successful sign-in.

### 5. Dashboard structure (Personal-first)

Same vertical order on web and mobile, single column on mobile.

```
┌───────────────────────────────────────────┐
│  "Welcome back, Reed"   [profile / login] │
├───────────────────────────────────────────┤
│  Favorite Trains    [live status rows]    │  realtime first; most urgent
│  Favorite Stations  [LinkCard list]       │
│  Favorite Lines     [chip list]           │
├───────────────────────────────────────────┤
│  CTA hero card    │   Metra hero card     │  service nav as a foothold
└───────────────────────────────────────────┘
```

- **Empty / unauthenticated states.** Each favorites section renders a one-line CTA when empty (`"Sign in to save your favorite stations"` / `"Tap the heart on a station to save it here"`). Hero cards remain fully usable below.
- **Live status on Favorite Trains.** Re-uses the existing `useMetraFeed` polling. If a favorited train isn't running today, the row shows its scheduled service days (read from `metra-trips` doc).
- **Profile / login link on the dashboard.** Even though both platforms already have an account icon in the chrome (web `Navbar.tsx` `UserMenu`, mobile `HeaderUserIcon`), the dashboard explicitly hosts its own visible profile/sign-in affordance per request. When signed in: shows display name + avatar, links to `/profile`. When signed out: shows a "Sign in" button that opens `AuthModal` (web) / pushes `/auth` (mobile). The chrome-level account icons stay as they are.

### 6. Favorite button

- Heart icon, outline / filled, ≥44×44 hit target.
- Lives in the **detail page header only** (line, station, train detail pages — web and mobile). No hearts on list rows in v1.
- Optimistic fill animation; no spinner.
- Tap while signed out → opens auth modal/screen; favorite is applied automatically after sign-in completes.

---

## Architecture

### Module map

```
packages/shared/src/
├── types.ts          ← extend UserProfile; export Favorite, FavoriteType
└── favorites.ts      ← favoriteKey(), mapToArray(), arrayToMap()  [pure, NEW]

apps/web/app/
├── lib/
│   ├── queryClient.ts        ← TanStack Query + sync-storage persister  [NEW]
│   ├── store/favorites.ts    ← Zustand store + persist (localStorage)   [NEW]
│   └── firebase-client.ts    (existing)
├── components/
│   ├── QueryProvider.tsx     ← QueryClientProvider wrapper              [NEW]
│   ├── AuthProvider.tsx      ← extend: onSnapshot listener, hydrate store
│   ├── FavoriteButton.tsx    ← heart toggle component                   [NEW]
│   ├── PageHeader.tsx        ← optional `favorite={{type,id}}` prop
│   └── dashboard/
│       ├── Dashboard.tsx     ← orchestrator                              [NEW]
│       ├── FavoriteTrains.tsx, FavoriteStations.tsx, FavoriteLines.tsx   [NEW]
│       └── DashboardHero.tsx ← thin wrapper around existing Hero         [NEW]
├── layout.tsx                ← wrap children with QueryProvider
└── page.tsx                  ← render Dashboard instead of bare Hero

apps/mobile/
├── lib/
│   ├── queryClient.ts             ← TanStack Query + async-storage persister  [NEW]
│   ├── store/favorites.ts         ← Zustand store + persist (AsyncStorage)    [NEW]
│   └── AuthContext.tsx            ← extend: onSnapshot listener, hydrate store
├── components/
│   ├── QueryProvider.tsx          [NEW]
│   ├── FavoriteButton.tsx         [NEW]
│   ├── PageHeader.tsx             ← optional `favorite={{type,id}}` prop
│   └── dashboard/
│       ├── Dashboard.tsx, FavoriteTrains.tsx, FavoriteStations.tsx,
│       │ FavoriteLines.tsx, DashboardHero.tsx   [NEW]
└── app/
    ├── _layout.tsx                ← wrap with QueryProvider
    ├── (tabs)/my-trains.tsx       ← render Dashboard instead of placeholder
    └── (tabs)/metra/[line]/train/[trainNumber].tsx
                                   ← introduce PageHeader so FavoriteButton has a home
```

### Data flow

1. **Sign in** → `AuthProvider` reads/creates `profiles/{uid}` → opens `onSnapshot` subscription → hydrates Zustand `favorites` slice from `profile.favorites` map (projected to array).
2. **Boot (already signed in)** → Zustand rehydrates from `localStorage`/`AsyncStorage` instantly → `AuthProvider` reconciles via `onSnapshot` shortly after.
3. **Tap heart** → `FavoriteButton` calls `useToggleFavorite()` → optimistic Zustand mutation → TanStack Query `mutate` issues `updateDoc` with map-keyed atomic write.
4. **Remote change (other device)** → `onSnapshot` fires → Zustand reconciles to remote map (overwrites local optimistic state with authoritative server state).
5. **Sign out** → Zustand favorites slice clears; persisted state purged for that user.

### Cache strategy (TanStack Query, Phase 1 only)

- `['profile', uid]` — driven by `onSnapshot`; `staleTime: Infinity` since the listener is the source of truth.
- `['lines']` and `['stations']` — Phase 1 introduces TanStack Query reads for these *only on the dashboard* (so favorites can resolve names/colors/lines from cached data). Long `staleTime` (e.g. 24h) — these collections change rarely. Existing line/station detail pages still use their current build-time fetches; Phase 2 will sweep them.

---

## Out of scope (explicit)

- CTA train favorites — there are no CTA per-trip detail pages.
- Pace anything.
- Migrating existing data hooks to TanStack Query (Phase 2).
- Wrapping `useMetraFeed` into TanStack Query (Phase 3).
- Reordering favorites by drag.
- Notification on favorite-train alerts.
