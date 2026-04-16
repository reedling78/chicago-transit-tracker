# Plan: Jest unit tests + ESLint for `apps/mobile/`

## Context

The mobile Expo app at `apps/mobile/` currently has **no tests, no ESLint config, and no Prettier config**. The web app at `apps/web/` has a full Jest + React Testing Library + ESLint + Prettier setup that's enforced in CI via `pnpm -w run test` and `pnpm -w run lint` (both wired through Turborepo). Because `apps/mobile/` has no `test` or `lint` scripts, Turborepo silently skips it — mobile code ships with zero automated checks.

This plan adds the canonical Expo-flavored equivalents:
- **Jest** via the official `jest-expo` preset (the web's `next/jest` setup can't be reused — it targets Next.js transforms, not React Native).
- **`@testing-library/react-native`** for component tests (not `@testing-library/react`, which targets the DOM).
- **ESLint** via `eslint-config-expo` (flat config), matching the web's shape but with an RN-aware base.
- **Prettier** using the same conventions as web (minus the Tailwind plugin — mobile doesn't use Tailwind).
- **Comprehensive initial test coverage**: `ScheduleTable`, all 5 hooks in `lib/hooks.ts` (with Firestore mocks), and smoke tests for every screen in `app/`.

Outcome: `pnpm -w run test` and `pnpm -w run lint` will exercise mobile code, and the project's existing CI (`.github/workflows/deploy.yml`) will begin enforcing mobile quality without any CI workflow changes.

## Approach

### 1. Dependencies

Add to `apps/mobile/package.json` devDependencies:

```
"jest": "^30.3.0",
"jest-expo": "~54.0.0",
"@testing-library/react-native": "^13.3.1",
"@testing-library/jest-native": "^5.4.3",
"@types/jest": "^30.0.0",
"react-test-renderer": "19.1.0",
"eslint": "^9",
"eslint-config-expo": "~10.0.0",
"eslint-config-prettier": "^10.1.8",
"prettier": "^3.8.1"
```

Notes:
- `jest-expo` is pinned to the Expo SDK 54 line (it ships RN + Expo module transforms).
- `react-test-renderer` must match `react` (19.1.0) exactly — RN testing uses the test renderer under the hood.
- Use the Expo CLI recipe `npx expo install --dev jest-expo jest @types/jest @testing-library/react-native` for version resolution if the pinned versions drift — Expo picks the versions that match SDK 54.

### 2. Jest config — `apps/mobile/jest.config.js`

```js
/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@ctt/shared$': '<rootDir>/../../packages/shared/src',
    '^@ctt/shared/(.*)$': '<rootDir>/../../packages/shared/src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native|expo(nent)?|@expo(nent)?/.*|expo-router|expo-modules-core|@react-navigation/.*|firebase|@firebase/.*))',
  ],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/__tests__/fixtures.ts'],
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    '!lib/firebase.ts',
  ],
}
```

Why the differences vs. web:
- `preset: 'jest-expo'` replaces `next/jest` — handles RN + Expo transforms, flow types in RN core, and sets the right test environment.
- No `jest.resolver.js`: web's resolver exists to force `firebase-admin` to a single instance. Mobile uses `firebase` (JS SDK) only, with no cross-workspace source aliasing, so the issue doesn't apply.
- `transformIgnorePatterns` explicitly allows `firebase` and `@firebase/*` through Babel — they ship ESM that Jest otherwise can't parse.
- `moduleNameMapper` only needs `@ctt/shared` (mobile tsconfig has no other aliases today).

### 3. Jest setup — `apps/mobile/jest.setup.ts`

```ts
import '@testing-library/jest-native/extend-expect'
```

Adds RN-specific matchers (`toBeVisible`, `toHaveTextContent`, etc.). This is the RN analogue of web's `@testing-library/jest-dom` import.

### 4. ESLint config — `apps/mobile/eslint.config.mjs`

```js
import { defineConfig, globalIgnores } from 'eslint/config'
import expoConfig from 'eslint-config-expo/flat.js'
import prettierConfig from 'eslint-config-prettier'

export default defineConfig([
  ...expoConfig,
  prettierConfig,
  globalIgnores([
    '.expo/**',
    'android/**',
    'ios/**',
    'node_modules/**',
    'scripts/**',
    'babel.config.js',
    'metro.config.js',
  ]),
])
```

Mirrors the web's structure (base config + prettier-conflict suppression + ignores). The `scripts/` ignore matches web's pattern (keeps `distribute.mjs` out of scope).

### 5. Prettier config — `apps/mobile/.prettierrc`

Identical to web minus the Tailwind plugin:

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all",
  "tabWidth": 2,
  "printWidth": 100
}
```

### 6. `apps/mobile/package.json` scripts

Add (matching web's names exactly so `pnpm -w run test` / `lint` pick them up via Turborepo):

```json
"test": "jest",
"test:watch": "jest --watch",
"test:coverage": "jest --coverage",
"test:snapshots": "jest --updateSnapshot",
"lint": "eslint && prettier --check .",
"lint:fix": "eslint --fix && prettier --write .",
"format": "prettier --write .",
"format:check": "prettier --check ."
```

### 7. tsconfig update — `apps/mobile/tsconfig.json`

Add `@types/jest` visibility. Expo's base already includes RN types; we just need to make sure test files type-check:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "types": ["jest", "node"],
    "paths": {
      "@ctt/shared": ["../../packages/shared/src"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

### 8. Test files — `apps/mobile/__tests__/`

Directory layout (mirrors web):

```
apps/mobile/__tests__/
├── fixtures.ts                    # mock data — reuse web's shape, import types from @ctt/shared
├── components/
│   └── ScheduleTable.test.tsx
├── lib/
│   └── hooks.test.tsx             # covers all 5 hooks in one file
└── screens/
    ├── home.test.tsx
    ├── cta-index.test.tsx
    ├── cta-line.test.tsx
    ├── cta-station.test.tsx
    ├── metra-index.test.tsx
    ├── metra-line.test.tsx
    └── metra-station.test.tsx
```

**`fixtures.ts`** — copy the relevant mock objects (`mockLine`, `mockMetraLine`, `mockStation`, `mockMetraStation`, plus a `mockSchedule` for `ScheduleTable`) from `apps/web/__tests__/fixtures.ts`. Types come from `@ctt/shared`, so the fixtures stay platform-agnostic. Keep only what mobile actually needs (drop Pace fixtures — not used in mobile).

**`components/ScheduleTable.test.tsx`** — pure component, no mocks:
- Renders without crashing given a `StationSchedule`.
- Renders each direction heading from the fixture.
- Renders weekday / saturday / sunday sections correctly.
- Verifies `formatTime` output by asserting rendered time strings (e.g. `6:32 AM`, `12:00 PM`, `11:45 PM` — edge cases around midnight and noon).
- Snapshot test.

Reference file: `apps/mobile/components/ScheduleTable.tsx` — note the internal `formatTime` helper isn't exported, so it's tested indirectly through render output.

**`lib/hooks.test.tsx`** — mocks `firebase/firestore` at the module level:

```ts
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  getDocs: jest.fn(),
  getDoc: jest.fn(),
  doc: jest.fn(),
  getFirestore: jest.fn(() => ({})),
}))
jest.mock('../../lib/firebase', () => ({ db: {} }))
```

Tests (one `describe` per hook):
- `useLines(service)` — returns `loading: true` initially, then `{ data: Line[], loading: false }` after `getDocs` resolves. Verify the query uses the correct `where('service', '==', service)` clause by asserting mock call args.
- `useStation(slug)` — returns station doc on success, `null` on `exists() === false`.
- `useLine(slug)` — same pattern as `useStation`.
- `useLineStations(lineSlug, lineShortName)` — verify `array-contains` is passed and results are sorted.
- `useSchedule(stationSlug)` — verify `getDoc` call shape and data mapping.

Pattern: render a small probe component that calls the hook and renders the result, then use `waitFor` to assert the rendered output. This matches web's `useMetraFeed.test.tsx` approach.

**`screens/*.test.tsx`** — smoke tests only. For each screen, mock:
- `expo-router` (`useLocalSearchParams`, `Link`, `Stack`) — return stub values.
- The data hooks from `lib/hooks` — return the fixture data.

Assert the screen renders without throwing and shows one identifying piece of content (e.g. the line name, or a known station). These are deliberately shallow — they catch import regressions and prop-shape drift, not visual correctness. Full-fidelity screen tests are out of scope here.

Example mock block (shared across screen tests, can live inline per file for clarity):

```ts
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ line: 'red', station: 'clark-lake' }),
  Link: ({ children }: { children: React.ReactNode }) => children,
  Stack: { Screen: () => null },
}))
jest.mock('../../lib/hooks', () => ({
  useLines: () => ({ data: [mockLine], loading: false }),
  useLine: () => ({ data: mockLine, loading: false }),
  useStation: () => ({ data: mockStation, loading: false }),
  useLineStations: () => ({ data: [mockStation], loading: false }),
  useSchedule: () => ({ data: mockSchedule, loading: false }),
}))
```

### 9. Critical files to modify or create

**Modify:**
- `apps/mobile/package.json` — add deps + scripts
- `apps/mobile/tsconfig.json` — add `types: ["jest", "node"]`

**Create:**
- `apps/mobile/jest.config.js`
- `apps/mobile/jest.setup.ts`
- `apps/mobile/eslint.config.mjs`
- `apps/mobile/.prettierrc`
- `apps/mobile/.prettierignore` (ignore `.expo/`, `android/`, `ios/`, `node_modules/`)
- `apps/mobile/__tests__/fixtures.ts`
- `apps/mobile/__tests__/components/ScheduleTable.test.tsx`
- `apps/mobile/__tests__/lib/hooks.test.tsx`
- `apps/mobile/__tests__/screens/home.test.tsx`
- `apps/mobile/__tests__/screens/cta-index.test.tsx`
- `apps/mobile/__tests__/screens/cta-line.test.tsx`
- `apps/mobile/__tests__/screens/cta-station.test.tsx`
- `apps/mobile/__tests__/screens/metra-index.test.tsx`
- `apps/mobile/__tests__/screens/metra-line.test.tsx`
- `apps/mobile/__tests__/screens/metra-station.test.tsx`

**No changes needed:**
- `turbo.json` — already has empty `lint` and `test` task entries; they'll pick up the mobile scripts automatically.
- Root `package.json` — `turbo run lint` / `turbo run test` already fan out to all workspaces.
- `.github/workflows/deploy.yml` — already runs `pnpm -w run lint` and `pnpm -w run test`; no edit required.
- `apps/mobile/metro.config.js` — unrelated to tests; Jest uses its own transform pipeline via `jest-expo`.

### 10. Reuse from existing code

- **Fixture shapes** — `apps/web/__tests__/fixtures.ts` (copy only `mockLine`, `mockMetraLine`, `mockStation`, `mockMetraStation`; adapt or add a `mockSchedule` matching `StationSchedule` from `@ctt/shared`).
- **Hook-testing pattern** — `apps/web/__tests__/lib/hooks/useMetraFeed.test.tsx` (probe component + `waitFor`).
- **Types** — always import from `@ctt/shared`, never redeclare.
- **Prettier conventions** — copy from `apps/web/.prettierrc` verbatim minus the Tailwind plugin.
- **Mobile source under test** — `apps/mobile/components/ScheduleTable.tsx`, `apps/mobile/lib/hooks.ts`, screens in `apps/mobile/app/`.

## Verification

End-to-end checks to run after implementation:

1. **Install deps**
   ```
   pnpm install
   ```

2. **Type-check mobile**
   ```
   cd apps/mobile && npx tsc --noEmit
   ```
   Must pass clean — confirms `@types/jest` is picked up by test files.

3. **Run mobile tests in isolation**
   ```
   cd apps/mobile && pnpm test
   ```
   All tests pass. Coverage report (`pnpm test -- --coverage`) should show meaningful numbers for `components/`, `lib/hooks.ts`, and `app/*`.

4. **Run mobile lint in isolation**
   ```
   cd apps/mobile && pnpm lint
   ```
   ESLint + Prettier both clean. If existing mobile source has style violations, fix them in the same PR (part of the test/lint rollout).

5. **Run Turborepo aggregate commands from the repo root** (this is what CI runs):
   ```
   pnpm -w run lint
   pnpm -w run test
   ```
   Both must be **zero warnings, zero errors** — matches the standing rule in `.claude/rules/testing.md`.

6. **Confirm Turborepo discovers mobile tasks**
   ```
   pnpm -w run test --dry-run
   ```
   Output should list `@ctt/mobile#test` alongside `@ctt/web#test`.

7. **Smoke-test the mobile app still runs**
   ```
   cd apps/mobile && npx expo start
   ```
   Launch on an iOS simulator or Expo Go and confirm the home screen renders. This catches any accidental runtime regressions from the new configs (e.g. a Babel/Metro interaction with the new Jest setup, though none is expected since Jest has its own transform pipeline).

8. **Update CLAUDE.md** — add a brief note under the Commands section documenting `pnpm --filter mobile run test` and `pnpm --filter mobile run lint`, and mention in the "Project Structure" section that `apps/mobile/__tests__/` now exists. Not strictly required for functionality, but keeps the teaching-tool docs in sync (per the project's dual-purpose guidance).
