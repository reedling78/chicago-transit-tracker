# Plan: Unified Alert Infrastructure — Cloud Functions + Mobile Components

## Context

The web app has CTA and Metra alert components that fetch data through Next.js API route proxies. The mobile app has no alert display at all. To support both platforms cleanly, we're creating Firebase Cloud Functions that normalize alert data into a shared format, migrating the web to call those functions, and building new mobile alert screens.

**Three deliverables:**
1. Cloud Function alert proxies (normalize data server-side)
2. Web migration to call Cloud Functions instead of local API proxies
3. Mobile alert screens (dedicated CTA/Metra alerts pages)

---

## Step 1: Shared Alert Types

**Files to modify:**
- `packages/shared/src/types.ts` — add `NormalizedAlert` and `NormalizedAlertRoute` interfaces
- `packages/shared/src/index.ts` — re-export new types

```typescript
export interface NormalizedAlertRoute {
  routeId: string       // "Red", "BNSF"
  routeName: string     // "Red Line", "BNSF Railway"
  color: string         // "#c60c30"
  textColor: string     // "#ffffff"
}

export interface NormalizedAlert {
  id: string
  headline: string
  description: string
  url: string | null
  routes: NormalizedAlertRoute[]
  severity: string | null
  impact: string | null
  startTime: string | null
  endTime: string | null
  service: 'cta' | 'metra'
}
```

Also re-export from `apps/web/app/lib/types.ts`.

---

## Step 2: Cloud Function Parsers (Pure Logic)

**New files:**
- `apps/functions/src/lib/parsers/alert-types.ts` — local copy of NormalizedAlert types (functions package uses CommonJS, doesn't consume @ctt/shared)
- `apps/functions/src/lib/alert-constants.ts` — local copy of LINE_COLORS (Metra subset), METRA_LINE_NAMES, CTA_ROUTE_ID_TO_NAME, RAIL_ROUTE_IDS. Comment references `packages/shared/src/constants.ts` as source of truth.
- `apps/functions/src/lib/parsers/cta-alerts.ts` — pure normalizer:
  - Accept raw CTA JSON response
  - Normalize `ImpactedService.Service` (single object → array)
  - Filter to rail-only (`RAIL_ROUTE_IDS`)
  - Flatten CDATA fields (`AlertURL['#cdata-section']`, `FullDescription['#cdata-section']`)
  - Prepend `#` to `ServiceBackColor`/`ServiceTextColor`
  - Map to `NormalizedAlert[]`
  - Support optional `routeId` filter
- `apps/functions/src/lib/parsers/metra-alerts.ts` — pure normalizer:
  - Accept decoded GTFS Realtime FeedMessage
  - Extract entities with `.alert` property
  - Map `informedEntity[].routeId` → names/colors via constants
  - Extract `.headerText.translation[0].text`, `.descriptionText.translation[0].text`, `.url.translation[0].text`
  - Map to `NormalizedAlert[]`
  - Support optional `routeId` filter

---

## Step 3: Cloud Function HTTP Endpoints

**Files to modify:**
- `apps/functions/package.json` — add `gtfs-realtime-bindings` dependency
- `apps/functions/src/index.ts` — add two `onRequest` functions

**`ctaAlerts` function:**
- `onRequest({ region: 'us-central1', cors: true })`
- Optional `?routeId=Red` query param
- Fetch `https://www.transitchicago.com/api/1.0/alerts.aspx?outputType=JSON`
- Parse JSON → normalize → return `NormalizedAlert[]`
- `Cache-Control: public, max-age=30`

**`metraAlerts` function:**
- `onRequest({ region: 'us-central1', cors: true, secrets: [metraApiToken] })`
- `const metraApiToken = defineSecret('METRA_API_TOKEN')` at module level
- Optional `?routeId=BNSF` query param
- Fetch `https://gtfspublic.metrarr.com/gtfs/public/alerts?api_token=...`
- Decode protobuf → normalize → return `NormalizedAlert[]`
- `Cache-Control: public, max-age=30`

---

## Step 4: Cloud Function Tests

**New files:**
- `apps/functions/jest.config.js` — Jest config for TypeScript (ts-jest, CommonJS)
- `apps/functions/src/lib/parsers/__tests__/cta-alerts.test.ts`
- `apps/functions/src/lib/parsers/__tests__/metra-alerts.test.ts`

**Modify:** `apps/functions/package.json` — add jest, @types/jest, ts-jest to devDependencies; add `"test": "jest"` script

Test coverage: single/multi service normalization, rail filtering, CDATA flattening, routeId filtering, missing fields

---

## Step 5: Web Migration

**Files to modify:**
- `apps/web/app/lib/cta-alerts.ts` — change `fetchCTAAlerts()` to call Cloud Function URL, return `NormalizedAlert[]`, remove client-side XML parsing and rail filtering
- `apps/web/app/lib/metra-realtime.ts` — add `fetchMetraAlerts()` calling Cloud Function, return `NormalizedAlert[]`. Keep `fetchMetraFeed()` for positions/tripupdates.
- `apps/web/app/components/CTAAlerts.tsx` — use `NormalizedAlert` type, update field names (`alert.headline` not `alert.Headline`), use `alert.routes` instead of `getRailServices()`, update badge rendering to use `route.color`/`route.textColor`
- `apps/web/app/components/MetraAlerts.tsx` — call `fetchMetraAlerts()` instead of `fetchMetraFeed('alerts')`, use `NormalizedAlert` type, remove protobuf handling
- `apps/web/app/api/metra/[...path]/route.ts` — remove `'alerts'` from `ALLOWED_PATHS` (keep `positions`, `tripupdates`)

**File to delete:**
- `apps/web/app/api/cta/alerts/route.ts` — replaced by Cloud Function

**Environment:** Add `NEXT_PUBLIC_FUNCTIONS_BASE_URL` to `apps/web/apphosting.yaml` and `.env.local`. Value: the Cloud Functions base URL (shown after `firebase deploy --only functions`).

---

## Step 6: Web Test Updates

**Files to modify:**
- `apps/web/__tests__/components/CTAAlerts.test.tsx` — mock returns `NormalizedAlert[]`, update assertions for normalized field names
- `apps/web/__tests__/components/MetraAlerts.test.tsx` — same treatment, remove protobuf mocking
- `apps/web/__tests__/api/metra-proxy.test.ts` — update ALLOWED_PATHS expectation, add test that `alerts` path returns 400

**File to delete:**
- `apps/web/__tests__/api/cta-alerts.test.ts` — API route no longer exists

---

## Step 7: Mobile Data Layer

**New file:** `apps/mobile/lib/config.ts` — export `FUNCTIONS_BASE_URL` constant

**File to modify:** `apps/mobile/lib/hooks.ts` — add `useAlerts(service, routeId?)` hook:
- useState for alerts (`NormalizedAlert[]`), loading, error
- useEffect with 30s polling (same pattern as web)
- Fetch from `${FUNCTIONS_BASE_URL}/ctaAlerts` or `metraAlerts`
- Return `{ alerts, loading, error, retry }`

---

## Step 8: Mobile Alert Components

**New files:**
- `apps/mobile/components/CTAAlerts.tsx`
- `apps/mobile/components/MetraAlerts.tsx`

Both follow existing mobile conventions (`StyleSheet.create()`, dark theme colors):
- Optional `routeId` prop for pre-filtering
- Call `useAlerts()` hook
- States: loading (ActivityIndicator), error (card with retry button), empty (checkmark + message)
- Filter chips: horizontal `ScrollView` of `Pressable` chips ("All" + per active route)
- Alert cards: `View` with 4px left border accent, route badges, headline, description, URL link (via `Linking.openURL`)
- Uses `LINE_COLORS` from `@ctt/shared` for route badge colors

---

## Step 9: Mobile Alert Screens + Navigation

**New files:**
- `apps/mobile/app/cta/alerts.tsx` — screen wrapping `<CTAAlerts />`
- `apps/mobile/app/metra/alerts.tsx` — screen wrapping `<MetraAlerts />`

**Files to modify:**
- `apps/mobile/app/cta/index.tsx` — add a `LineListItem` or button linking to `/cta/alerts`
- `apps/mobile/app/metra/index.tsx` — same for Metra

---

## Step 10: Mobile Tests

**New files:**
- `apps/mobile/__tests__/components/CTAAlerts.test.tsx`
- `apps/mobile/__tests__/components/MetraAlerts.test.tsx`

**File to modify:** `apps/mobile/__tests__/fixtures.ts` — add `mockNormalizedAlert` fixture

Test coverage: loading/error/empty states, alert card rendering, filter chip interaction

---

## Verification

1. **Cloud Functions:** Build (`cd apps/functions && npm run build`), run tests (`npm test`), deploy to emulator (`firebase emulators:start --only functions`), test with curl
2. **Web:** Run dev server (`pnpm run:web`), verify CTA/Metra alerts pages load from Cloud Functions, check filter chips and polling work
3. **Mobile:** Run iOS simulator (`pnpm run:ios`), navigate to CTA/Metra → Alerts, verify loading/error/empty/populated states
4. **CI:** `pnpm -w run lint` and `pnpm -w run test` must pass clean
