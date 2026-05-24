# Firebase Analytics — Web + Mobile

Date: 2026-05-21

## Context

The Chicago Transit Tracker is approaching its public launch. Today the web app reports usage to a standalone GA4 property (`G-KQ1MNGBQP2`) via an inline gtag snippet, and the mobile (Expo) app has no analytics SDK wired up at all — its privacy page references "Google Analytics" but nothing actually collects events. The product owner wants unified usage analytics across web and mobile so that launch decisions (which lines/stations users open, whether sign-ups convert into dashboard usage, what surfaces drive engagement) can be made from one Firebase Analytics property covering both apps.

Outcome: one Firebase project receives auto-tracked screen/page views + a small set of meaningful business events from both web and mobile, with events linked to Firebase Auth UIDs for signed-in users.

## Decisions (locked via brainstorming)

1. **Scope:** Web + mobile, unified under one Firebase Analytics property.
2. **Event coverage:** Auto events + targeted business events (see catalog below).
3. **User identification:** `setUserId(uid)` on sign-in. No PII (email, name, photo) in event params.
4. **Web migration:** Replace the standalone gtag snippet with `firebase/analytics`. Use a fresh Firebase Web App / measurement ID. Existing `G-KQ1MNGBQP2` property becomes orphaned — user will archive it in GA4 Admin when ready.
5. **Mobile SDK:** `@react-native-firebase/analytics` (the only path that works in React Native — the Firebase JS SDK's analytics module is browser-only). Coexists with the existing JS SDK used for Auth/Firestore.

## Out of scope

- User-facing analytics opt-out toggle.
- DebugView verification in CI.
- Conversion event marking + audience configuration (post-launch Firebase Console work).
- Linking/adopting the old `G-KQ1MNGBQP2` property into the Firebase project.

---

## Architecture

### Shared event constants (`packages/shared/`)

New module `packages/shared/src/analytics-events.ts`. Exports:

- `AnalyticsEventName` — string-literal union of every custom event name.
- `AnalyticsEventParams` — discriminated union mapping each event name to its allowed param shape.
- `AnalyticsUserProperty` — string-literal union of user property names.

Both apps import from this module so event names and shapes can't drift across platforms. Re-exported from `packages/shared/src/index.ts`. Module stays platform-agnostic — must not import firebase, next, react-native, etc. (per existing guardrail in CLAUDE.md).

### Web (`apps/web/`)

- **Drop** the inline gtag `<Script>` block in `apps/web/app/layout.tsx:74-90`.
- **Drop** the `gaId` field from `packages/shared/src/siteConfig.ts` (unused after gtag removal).
- **Update** `apps/web/app/lib/firebase-client.ts` — extend the existing client config with `measurementId`, and add `getAnalytics()` / `isSupported()` initialization. `isSupported()` must be awaited and the analytics instance must be conditional — SSR returns false, so server renders cannot import the instance directly.
- **Add** `apps/web/app/lib/analytics.ts` — thin wrapper exposing `trackEvent(name, params)`, `setUser(uid | null)`, `setUserProperty(name, value)`. Each no-ops if the analytics instance is unresolved (SSR, unsupported browser, etc.).
- **Rewrite** `apps/web/app/components/Analytics.tsx` — instead of calling `gtag('config', ...)` it now calls `trackEvent('page_view', { page_path, page_location, page_title })` on pathname change. Stays a `'use client'` component.
- **Hook** `AuthProvider` (`apps/web/app/components/AuthProvider.tsx`) — on auth state change, call `setUser(user?.uid ?? null)` and `setUserProperty('auth_provider', user.providerData[0]?.providerId ?? 'unknown')`.

### Mobile (`apps/mobile/`)

- **Install** `@react-native-firebase/app`, `@react-native-firebase/analytics` (pin to versions compatible with Expo SDK 54 — current latest is the 21.x line).
- **Add** the `@react-native-firebase/app` config plugin to `apps/mobile/app.json` (`expo.plugins`), plus the existing `expo-build-properties` block already in the repo if needed for iOS use_frameworks settings (verify during implementation).
- **Place** Firebase native config files:
  - `apps/mobile/GoogleService-Info.plist` (iOS) — reference from `app.json` via `expo.ios.googleServicesFile`.
  - `apps/mobile/google-services.json` (Android) — reference from `app.json` via `expo.android.googleServicesFile`.
  - Both files are public-by-design per Google's docs; commit to the repo, not Secret Manager.
- **Add** `apps/mobile/lib/analytics.ts` with the same surface as web (`trackEvent`, `setUser`, `setUserProperty`). Wraps `@react-native-firebase/analytics`. No-ops in the Jest environment (the native module is unavailable in tests).
- **Hook** `AuthContext` (`apps/mobile/lib/AuthContext.tsx`) — same `setUser` + `setUserProperty` calls as web.
- **Auto screen tracking** — `@react-native-firebase/analytics` does not auto-track screens with expo-router. Add a tiny `useAnalyticsScreenTracking()` hook (called once in `app/(app)/_layout.tsx`) that subscribes to `usePathname()` / route segments and calls `analytics().logScreenView({ screen_name, screen_class })` on change.

### Per-event instrumentation

Call sites (one `trackEvent` line each):

| Event | Web call site | Mobile call site |
|---|---|---|
| `sign_up` | `AuthProvider` profile auto-create branch | `AuthContext` profile auto-create branch |
| `login` | `AuthProvider` returning-user branch | `AuthContext` returning-user branch |
| `logout` | `auth.ts` `signOut` helper | `auth.ts` `signOut` helper |
| `dashboard_item_added` | `useToggleDashboardItem` add path | `useToggleDashboardItem` add path |
| `dashboard_item_removed` | `useToggleDashboardItem` remove path | `useToggleDashboardItem` remove path |
| `dashboard_items_cleared` | `useClearAllDashboardItems` | `useClearAllDashboardItems` |
| `dashboard_items_reordered` | `useReorderDashboardItems` | `useReorderDashboardItems` |
| `line_opened` | `apps/web/app/cta/[line]/page.tsx`, `apps/web/app/metra/[line]/page.tsx` (client effect in `LineDetail`) | `apps/mobile/app/(app)/cta/[line].tsx`, `apps/mobile/app/(app)/metra/[line]/index.tsx` |
| `station_opened` | `StationDetail` mount effect | Mobile station screens mount effect |
| `train_opened` | Web train detail page mount effect | `apps/mobile/app/(app)/metra/[line]/train/[trainNumber].tsx` |
| `alerts_opened` | `apps/web/app/cta/alerts/page.tsx`, `apps/web/app/metra/alerts/page.tsx` (client effect) | `apps/mobile/app/(app)/cta/alerts.tsx`, `apps/mobile/app/(app)/metra/alerts.tsx` |
| `alert_link_clicked` | `AlertCard` / `CTAAlerts` / `MetraAlerts` link click handler | Same on mobile components |

### Event catalog (final)

All names `snake_case`, ≤40 chars. All param values strings ≤100 chars unless typed otherwise. No PII.

- `sign_up` — `{ method: 'apple' | 'google' | 'password' }`
- `login` — `{ method: 'apple' | 'google' | 'password' }`
- `logout` — `{}`
- `dashboard_item_added` — `{ item_type: 'line' | 'station' | 'train', item_id: string }`
- `dashboard_item_removed` — `{ item_type, item_id }`
- `dashboard_items_cleared` — `{ count: number }`
- `dashboard_items_reordered` — `{ count: number }`
- `line_opened` — `{ service: 'cta' | 'metra', line_id: string }`
- `station_opened` — `{ service: 'cta' | 'metra', station_id: string }`
- `train_opened` — `{ line_id: string, train_number: string }`
- `alerts_opened` — `{ service: 'cta' | 'metra' }`
- `alert_link_clicked` — `{ service: 'cta' | 'metra', alert_id: string }`

User properties:

- `auth_provider` — `'apple' | 'google' | 'password' | 'unknown'`

---

## Privacy + compliance updates

- **`apps/web/app/privacy/page.tsx`** — rename "Google Analytics 4 (GA4)" mentions to "Google Analytics 4 (via Firebase Analytics)". Add a paragraph stating that when signed in, the Firebase Auth user ID is associated with analytics events to enable per-user usage analysis, and that no email/display name/photo is sent.
- **`apps/mobile/app/(app)/privacy.tsx`** — mirror the web wording. Add a sentence: "The app does not collect IDFA (iOS) or AAID (Android). Firebase Analytics on iOS does not trigger App Tracking Transparency."
- **`.claude/rules/security.md`** — add a short note clarifying that the Firebase Web measurement ID (`NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`), the iOS `GoogleService-Info.plist`, and the Android `google-services.json` are public-by-design Firebase client config and are committed to the repo, not Secret Manager. This is an explicit exception to the general "no credentials in client bundle" rule.
- **No change** to `.claude/rules/transit-compliance.md` — analytics does not touch agency data display.
- **No change** to `apps/web/app/terms/page.tsx`.

---

## Prerequisites (Firebase Console — manual, must happen before implementation)

1. Register a **Web App** in the existing Firebase project. Copy the new `measurementId` into a deploy-time env var (`NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`) — and into `apps/web/apphosting.yaml` if it isn't already inheriting from `.env`.
2. Register an **iOS App** in the existing Firebase project with bundle ID matching `apps/mobile/app.json` `expo.ios.bundleIdentifier`. Download `GoogleService-Info.plist`.
3. Register an **Android App** in the same project with package name matching `expo.android.package`. Download `google-services.json`.
4. In Firebase Console → Analytics, enable Analytics on the project (if not already enabled). Confirm the data retention setting (default 2 months, optional 14 months).

These must be done by a human with Firebase Console access — they unblock implementation.

---

## Critical files

Will be created:

- `packages/shared/src/analytics-events.ts`
- `apps/web/app/lib/analytics.ts`
- `apps/mobile/lib/analytics.ts`
- `apps/mobile/lib/useAnalyticsScreenTracking.ts`
- `apps/mobile/GoogleService-Info.plist` (from Firebase Console)
- `apps/mobile/google-services.json` (from Firebase Console)
- Test files mirroring the new wrappers under `apps/web/__tests__/` and `apps/mobile/__tests__/`

Will be modified:

- `packages/shared/src/index.ts` — export the events module
- `packages/shared/src/siteConfig.ts` — drop `gaId`
- `apps/web/app/layout.tsx` — drop inline gtag `<Script>` block
- `apps/web/app/components/Analytics.tsx` — rewrite around `trackEvent('page_view', ...)`
- `apps/web/app/lib/firebase-client.ts` — add `measurementId`, init analytics conditionally
- `apps/web/app/components/AuthProvider.tsx` — `setUser`/`setUserProperty` on auth change, `sign_up`/`login` events
- `apps/web/app/lib/auth.ts` — `logout` event
- `apps/web/app/lib/hooks/useToggleDashboardItem.ts`, `useClearAllDashboardItems.ts`, `useReorderDashboardItems.ts` — emit dashboard events
- `apps/web/app/components/{LineDetail,StationDetail}.tsx` plus the train detail page — emit `line_opened` / `station_opened` / `train_opened`
- `apps/web/app/{cta,metra}/alerts/page.tsx` and the alerts client components — emit `alerts_opened` / `alert_link_clicked`
- `apps/web/app/privacy/page.tsx` — copy update
- `apps/mobile/package.json` — add `@react-native-firebase/app`, `@react-native-firebase/analytics`
- `apps/mobile/app.json` — add `expo.plugins` entry for `@react-native-firebase/app`, set `expo.ios.googleServicesFile` and `expo.android.googleServicesFile`
- `apps/mobile/app/(app)/_layout.tsx` — call `useAnalyticsScreenTracking()` once
- `apps/mobile/lib/AuthContext.tsx` — `setUser`/`setUserProperty` + `sign_up`/`login` events
- `apps/mobile/lib/auth.ts` — `logout` event
- `apps/mobile/lib/{useToggleDashboardItem,useClearAllDashboardItems,useReorderDashboardItems}.ts` — emit dashboard events
- `apps/mobile/app/(app)/cta/[line].tsx`, `metra/[line]/index.tsx`, `metra/[line]/train/[trainNumber].tsx`, station screens, alerts screens, alert components — emit per-screen events
- `apps/mobile/app/(app)/privacy.tsx` — copy update
- `.claude/rules/security.md` — public-by-design Firebase client config note

---

## Implementation order

1. **Shared events module** — `packages/shared/src/analytics-events.ts` + export. No-op until consumed; lands first so both apps can import.
2. **Web wrapper + page_view rewrite** — `apps/web/app/lib/analytics.ts`, update `firebase-client.ts`, rewrite `Analytics.tsx`, drop inline gtag, update `layout.tsx`, drop `siteConfig.gaId`. Privacy page copy update. Tests.
3. **Web business events** — wire `AuthProvider`, `auth.ts`, dashboard hooks, detail-page mount effects, alerts pages. Tests for each hook/component.
4. **Mobile native setup** — install packages, add config plugin, drop in `GoogleService-Info.plist` + `google-services.json`, update `app.json`. Verify `expo prebuild --clean` produces an iOS/Android project that compiles. EAS dev build to confirm.
5. **Mobile wrapper + screen tracking** — `apps/mobile/lib/analytics.ts`, `useAnalyticsScreenTracking.ts`, wire into `app/(app)/_layout.tsx`. Privacy screen copy update. Tests.
6. **Mobile business events** — wire `AuthContext`, `auth.ts`, dashboard hooks, detail screens, alerts screens. Tests.
7. **Security rules update** — add the public-by-design client-config note to `.claude/rules/security.md`.
8. **Smoke test** — enable Firebase DebugView, run `pnpm run:web` + a dev build on iOS sim + Android emulator. For each: sign in, add a dashboard item, open a line, open a station, open a train, open alerts. Confirm all events arrive in DebugView within ~30s.
9. **EAS rebuild + distribute** — `pnpm --filter mobile run distribute` for the first build that includes the native module change.

---

## Verification

Automated:

- `pnpm -w run test` — clean, including new tests for `analytics.ts` wrappers (web + mobile) verifying no-op behavior when SDK absent and pass-through with correct params when present; new assertions on `Analytics.tsx`, privacy pages; updated snapshot for `layout.tsx` (gtag block gone).
- `pnpm -w run lint` — clean.
- `cd apps/functions && npm run build` — unaffected, should still build (sanity).

Manual (Firebase DebugView):

- Web: load home → see `page_view`; navigate to `/cta/red` → second `page_view` + `line_opened`; navigate to a station → `page_view` + `station_opened`; sign in → `login` (or `sign_up` if first time) + `user_id` set on subsequent events; add the station to dashboard → `dashboard_item_added`; remove it → `dashboard_item_removed`; visit `/cta/alerts` → `alerts_opened`; click an alert link → `alert_link_clicked`.
- iOS sim (dev build): repeat the same walkthrough including `screen_view` (auto) on each route change, plus a `train_opened` after picking a Metra train.
- Android emulator: same as iOS.

Post-launch (Firebase Console — not gating):

- 24 hours after deploy, confirm events appear in the standard reports (Realtime → Events → DebugView is real-time; the standard reports take ~24h to populate).
- Mark `sign_up` and `dashboard_item_added` as conversion events.
