# Plan: Add React Native Expo App + pnpm Monorepo Migration

## Context

The project is a single-package Next.js 16 app at the repo root with a separate `functions/` directory for Firebase Cloud Functions. We want to add a React Native Expo mobile app that replicates the website's read-only browse experience (v1: home, line lists, line detail, station detail with schedules). This requires restructuring the repo into a pnpm workspaces monorepo with shared code extracted to a common package.

**Why now:** The mobile app will use the same Firestore data, the same CTA branding constants, and the same TypeScript types as the web app — sharing these avoids drift and duplication.

**Intended outcome:** A monorepo with `apps/web`, `apps/mobile`, `apps/functions`, and `packages/shared`, where the Expo app can render all v1 screens using shared types/constants and the Firebase JS SDK for client-side Firestore reads.

---

## Phase 0: pnpm Migration (no restructure yet)

Switch the package manager before moving files so we can verify the existing app still works.

1. Install pnpm globally if needed: `npm install -g pnpm`
2. Delete `package-lock.json`
3. Create `/.npmrc`:
   ```
   node-linker=hoisted
   shamefully-hoist=true
   ```
4. Run `pnpm install` to generate `pnpm-lock.yaml`
5. Update `/.github/workflows/deploy.yml`:
   - Add `pnpm/action-setup@v4` step before `setup-node`
   - Change `cache: 'npm'` to `cache: 'pnpm'`
   - Replace `npm ci` with `pnpm install --frozen-lockfile`
   - Replace `npm run lint` / `npm test` with `pnpm run lint` / `pnpm test`

**Verify:** `pnpm run dev`, `pnpm run lint`, `pnpm test`, `pnpm run build` all pass locally.

**Critical files:**
- `/package.json` (no changes yet, just lock file swap)
- `/.npmrc` (new)
- `/.github/workflows/deploy.yml`

---

## Phase 1: Monorepo Restructure

Move the Next.js app, functions, and tests into workspace packages.

### File moves

| From (root) | To |
|---|---|
| `app/`, `public/`, `next.config.ts`, `postcss.config.mjs`, `next-env.d.ts` | `apps/web/` |
| `jest.config.ts`, `jest.setup.ts`, `jest.resolver.js` | `apps/web/` |
| `eslint.config.mjs`, `.prettierrc` | `apps/web/` (keep copies at root too for IDE) |
| `__tests__/` | `apps/web/__tests__/` |
| `scripts/`, `scripts/tsconfig.json` | `apps/web/scripts/` |
| `functions/` | `apps/functions/` |

**Keep at root:** `firebase.json`, `firestore.rules`, `firestore.indexes.json`, `.firebaserc`, `apphosting.yaml`, `.github/`, `docs/`, `CLAUDE.md`

### New root files

**`/pnpm-workspace.yaml`:**
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

**`/turbo.json`:**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": [".next/**", "lib/**"] },
    "lint": {},
    "test": {},
    "dev": { "cache": false, "persistent": true }
  }
}
```

**`/package.json`** (root — replace current):
```json
{
  "name": "chicago-transit-tracker",
  "private": true,
  "scripts": {
    "dev": "turbo run dev --filter=@ctt/web",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "test": "turbo run test"
  },
  "devDependencies": {
    "turbo": "^2"
  },
  "pnpm": {
    "overrides": {
      "firebase": "^11"
    }
  }
}
```

**`/tsconfig.json`** (root base — minimal):
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "jsx": "react-jsx"
  }
}
```

### Config updates

**`/firebase.json`:** Change `"source": "functions"` to `"source": "apps/functions"`

**`/apphosting.yaml`:** Add `rootDirectory: apps/web` at the top level

**`apps/web/package.json`:** Move current root deps here, add `"name": "@ctt/web"`, add `"@ctt/shared": "workspace:*"` to dependencies

**`apps/web/tsconfig.json`:** Extend `../../tsconfig.json`, keep path aliases (`@components/*`, `@lib/*`, `@/*`), add `@ctt/shared` mapping

**`apps/web/next.config.ts`:** Add `transpilePackages: ['@ctt/shared']`

**`apps/web/jest.config.ts`:** Add `moduleNameMapper` entry for `@ctt/shared` pointing to `../../packages/shared/src`

**Verify:** `turbo run build lint test` passes from root. Firebase preview deploy works with `rootDirectory: apps/web`.

**Critical files:**
- `/firebase.json` — `functions.source` path update
- `/apphosting.yaml` — `rootDirectory` addition
- `apps/web/package.json` — all deps moved here
- `apps/web/tsconfig.json` — path aliases preserved
- `apps/web/next.config.ts` — `transpilePackages`

---

## Phase 2: packages/shared

Extract platform-agnostic code into a shared workspace package.

### Files to extract from `apps/web/app/lib/` → `packages/shared/src/`

| File | Contents | Safe to share? |
|---|---|---|
| `types.ts` | `Line`, `Station` interfaces | Yes — pure types |
| `gtfs-types.ts` | GTFS type definitions | Yes — pure types |
| `pace-types.ts` | Pace transit types | Yes — pure types |
| `constants.ts` | CTA/Metra colors, names, route mappings | Yes — pure data |
| `siteConfig.ts` | Site name, URL, OG image config | Yes — pure object |
| `metra-status.ts` | `deriveStopState`, `computeHeroStatus`, `TONE_CLASSES` | Yes — pure logic |
| `cta-pulse.ts` | Aggregation helpers | Yes — pure logic |
| `metra-trip-matching.ts` | Realtime entity matching | Yes — pure logic |

**NOT extracted** (stay in `apps/web/app/lib/`):
- `firebase-admin.ts` — imports `firebase-admin`
- `transit.ts` — imports `firebase-admin`
- `cta-alerts.ts` — uses `fetch` + DOM-adjacent patterns
- `metra-realtime.ts` — uses `gtfs-realtime-bindings` (protobuf, may not work on RN)
- `cta-train-tracker.ts` — web-specific fetch

### Package setup

**`packages/shared/package.json`:**
```json
{
  "name": "@ctt/shared",
  "version": "0.0.1",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts"
}
```

No build step — consumed as TypeScript source via `transpilePackages` (web) and Metro (mobile).

**`packages/shared/src/index.ts`:** Barrel export of all shared modules.

**`packages/shared/tsconfig.json`:** Extends root, `composite: true`.

### Import updates

Find-and-replace across `apps/web/`:
- `@lib/types` → `@ctt/shared`
- `@lib/constants` → `@ctt/shared`
- `@lib/siteConfig` → `@ctt/shared`
- (and similar for each moved file)

Leave re-export stubs in `apps/web/app/lib/` if needed to avoid touching every import at once (optional — clean removal is preferred).

### Guard rail

Add ESLint `no-restricted-imports` in `packages/shared/` forbidding: `firebase-admin`, `next`, `next/*`, `react-dom`.

**Verify:** `turbo run build lint test` passes. Web pages render correctly with shared imports.

---

## Phase 3: Expo App Scaffold

### Commands

```bash
cd apps && npx create-expo-app mobile --template blank-typescript
cd apps/mobile
npx expo install expo-router expo-linking expo-constants expo-status-bar
npx expo install react-native-safe-area-context react-native-screens
npx expo install firebase
```

### Key files to create/configure

**`apps/mobile/package.json`:** Add `"@ctt/shared": "workspace:*"` to dependencies

**`apps/mobile/metro.config.js`:**
```js
const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const monorepoRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)
config.watchFolders = [monorepoRoot]
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
]
module.exports = config
```

**`apps/mobile/lib/firebase.ts`:** Initialize Firebase with the web client config (same project, public config — `apiKey`, `projectId`, `appId`). Uses `firebase/app` + `firebase/firestore`.

**`apps/mobile/lib/api.ts`:** Firestore read helpers using `getDocs`, `getDoc`, `collection`, `query`, `where`, `orderBy` — same queries as `apps/web/app/lib/transit.ts` but using the client SDK instead of Admin SDK.

**`apps/mobile/tsconfig.json`:** Extend root, add path for `@ctt/shared`.

### Navigation (expo-router)

File-based routing matching the web structure:
```
apps/mobile/app/
  _layout.tsx       — root Stack layout
  index.tsx         — home screen
  cta/
    index.tsx       — CTA line list
    [line].tsx      — CTA line detail
    station/
      [station].tsx — CTA station detail
  metra/
    index.tsx       — Metra line list
    [line].tsx      — Metra line detail
    station/
      [station].tsx — Metra station detail
```

### Styling

Use NativeWind v4 for Tailwind-like `className` syntax on React Native, keeping visual parity with the web. If NativeWind adds too much setup friction, fall back to `StyleSheet.create` with the same color tokens from `@ctt/shared/constants`.

**Verify:** `npx expo start` launches. Home screen renders data from Firestore.

---

## Phase 4: v1 Screens

### Screens to build

| Screen | Route | Data source |
|---|---|---|
| Home | `index.tsx` | Static — hero + CTA/Metra cards |
| CTA Lines | `cta/index.tsx` | Firestore `lines` where `service == 'cta'` |
| Metra Lines | `metra/index.tsx` | Firestore `lines` where `service == 'metra'` |
| Line Detail | `cta/[line].tsx`, `metra/[line].tsx` | Firestore `lines` doc + `stations` query |
| Station Detail | `cta/station/[station].tsx`, `metra/station/[station].tsx` | Firestore `stations` doc + `schedules` doc |

### Shared data hooks (`apps/mobile/lib/hooks.ts`)

- `useLines(service: 'cta' | 'metra')` — query `lines` collection
- `useStation(slug: string)` — get single station doc
- `useLineStations(lineSlug: string)` — query stations for a line, sorted by `lineOrder`
- `useSchedule(stationSlug: string)` — get schedule doc

All hooks use `firebase/firestore` client SDK. Types come from `@ctt/shared`.

### Reused from `@ctt/shared`

- `Line`, `Station` types for all data
- `CTA_LINE_COLORS`, `LINE_COLORS` for line chip backgrounds
- `METRA_LINE_NAMES` for display names
- `siteConfig.name` for app header

### Not in v1

- Realtime service pulse / alerts
- Map views
- Push notifications
- Offline support

**Verify:** Navigate through all screens on iOS simulator. Data loads from Firestore. Line colors match the web.

---

## Phase 5: CI + EAS Build

### CI updates (`/.github/workflows/deploy.yml`)

- Use `turbo run lint test` from root (covers both web and shared)
- Add pnpm store cache and `.turbo/` cache
- Mobile is NOT built in CI — use EAS Build for that

### EAS setup

- `apps/mobile/eas.json` — configure `development`, `preview`, `production` profiles
- `apps/mobile/app.json` — set `expo.slug: "chicago-transit-tracker"`, bundle IDs
- Run `eas build:configure` to link Expo account

### Future: app store submission

- Apple Developer account + App Store Connect setup
- Play Store developer account + listing
- EAS Submit for automated uploads

**Verify:** CI passes on a PR with the full monorepo. `eas build --platform ios --profile preview` produces a working build.

---

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Firebase App Hosting breaks during restructure | Update `rootDirectory` in `apphosting.yaml` and `functions.source` in `firebase.json` in the same commit as file moves. Test with preview deploy before merging. |
| Test paths break after moving to `apps/web/` | Move `jest.config.ts` + `__tests__/` together. All `<rootDir>` paths stay relative. Add `moduleNameMapper` for `@ctt/shared`. |
| pnpm hoisting issues with firebase-admin | `.npmrc` has `node-linker=hoisted` + `shamefully-hoist=true`. Pin versions via `pnpm.overrides` if needed. |
| Metro can't resolve workspace packages | `expo/metro-config` handles this in SDK 54+. Explicit `watchFolders` as fallback. |
| Firestore security rules block mobile reads | Current rules must allow unauthenticated reads on `lines`, `stations`, `schedules`. Verify before building screens. |

---

## Verification Plan

After each phase, run the full check:
1. `turbo run lint test build` — all packages pass
2. `pnpm run dev` (web) — pages render at localhost:3000
3. `npx expo start` (mobile, phases 3+) — app runs on simulator
4. Firebase preview deploy — App Hosting serves the web app correctly
5. Manual smoke test — navigate CTA Red Line → Clark/Lake station on both web and mobile
