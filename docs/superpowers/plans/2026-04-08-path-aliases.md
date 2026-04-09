# Cleanup: Commit remaining project files

## Context

After shipping the path-aliases PR, several project files remain uncommitted: Claude rules, superpowers config, plan/spec docs, and a source image that should be deleted. This plan covers cleaning those up in a single PR.

## Steps

- [ ] **Step 1: Delete the source OG image**
  - `rm docs/61247124879129058273568906.jpg`

- [ ] **Step 2: Rename auto-generated plan files**
  - `docs/superpowers/plans/cuddly-tinkering-hejlsberg.md` → `docs/superpowers/plans/2026-04-08-add-claude-rules.md`
  - `docs/superpowers/plans/iterative-weaving-nygaard.md` → `docs/superpowers/plans/2026-04-08-path-aliases.md`

- [ ] **Step 3: Create branch, stage, commit, push, PR**
  - Branch: `cleanup-project-docs`
  - Files to stage:
    - `.claude/rules/security.md`
    - `.claude/rules/testing.md`
    - `.superpowers/`
    - `docs/superpowers/plans/2026-04-08-add-claude-rules.md` (renamed)
    - `docs/superpowers/plans/2026-04-08-path-aliases.md` (renamed)
    - `docs/superpowers/specs/2026-04-08-path-aliases-design.md`

## Verification
  - `git status` shows clean working tree after commit

**Architecture:** Two new TypeScript path aliases (`@components/*` → `app/components/*`, `@lib/*` → `app/lib/*`) added alongside the existing `@/*`. All relative component/lib imports in source files and all `@/app/components/` and `@/app/lib/` imports in test files get migrated. Config, source, tests, and docs are updated in separate commits.

**Tech Stack:** TypeScript (tsconfig paths), Jest (moduleNameMapper), Next.js (reads tsconfig automatically)

**Spec:** `docs/superpowers/specs/2026-04-08-path-aliases-design.md`

---

### Task 1: Configure path aliases

**Files:**
- Modify: `tsconfig.json`
- Modify: `jest.config.ts`

- [ ] **Step 1: Add aliases to tsconfig.json**

In `tsconfig.json`, replace the `paths` block:

```json
"paths": {
  "@/*": ["./*"],
  "@components/*": ["./app/components/*"],
  "@lib/*": ["./app/lib/*"]
}
```

- [ ] **Step 2: Add moduleNameMapper entries to jest.config.ts**

In `jest.config.ts`, replace the `moduleNameMapper` block (specific aliases before generic):

```typescript
moduleNameMapper: {
  '^@components/(.*)$': '<rootDir>/app/components/$1',
  '^@lib/(.*)$': '<rootDir>/app/lib/$1',
  '^@functions/(.*)$': '<rootDir>/functions/src/$1',
},
```

- [ ] **Step 3: Verify config doesn't break anything**

Run: `npm run build && npm test`
Expected: Both pass (no imports use new aliases yet)

- [ ] **Step 4: Commit**

```bash
git add tsconfig.json jest.config.ts
git commit -m "Add @components and @lib path aliases to tsconfig and jest config"
```

---

### Task 2: Migrate page and route file imports

**Files (20 files in `app/`):**
- Modify: `app/layout.tsx`
- Modify: `app/page.tsx`
- Modify: `app/not-found.tsx`
- Modify: `app/opengraph-image.tsx`
- Modify: `app/sitemap.ts`
- Modify: `app/privacy/page.tsx`
- Modify: `app/terms/page.tsx`
- Modify: `app/cta/page.tsx`
- Modify: `app/metra/page.tsx`
- Modify: `app/cta/alerts/page.tsx`
- Modify: `app/metra/alerts/page.tsx`
- Modify: `app/cta/[line]/page.tsx`
- Modify: `app/metra/[line]/page.tsx`
- Modify: `app/cta/[line]/[station]/page.tsx`
- Modify: `app/metra/[line]/[station]/page.tsx`
- Modify: `app/metra/[line]/train/[tripId]/page.tsx`
- Modify: `app/api/schedules/[slug]/route.ts`
- Modify: `app/api/metra/trip-index/[line]/route.ts`
- Modify: `app/api/metra/station-trips/[slug]/route.ts`
- Modify: `app/api/metra/trips/[tripId]/route.ts`

**Migration rule:** Replace all relative `./components/`, `../components/`, `../../components/`, `../../../components/`, `../../../../components/` with `@components/`. Same for `lib/` → `@lib/`. Do NOT touch sibling imports or external packages.

- [ ] **Step 1: Migrate `app/layout.tsx`**

```
'./components/Navbar'       → '@components/Navbar'
'./components/Footer'       → '@components/Footer'
'./components/Analytics'    → '@components/Analytics'
'./lib/siteConfig'          → '@lib/siteConfig'
```

- [ ] **Step 2: Migrate `app/page.tsx`**

```
'./components/Hero'             → '@components/Hero'
'./components/MetraAlerts'      → '@components/MetraAlerts'
'./components/MetraPositions'   → '@components/MetraPositions'
'./components/MetraTripUpdates' → '@components/MetraTripUpdates'
'./lib/siteConfig'              → '@lib/siteConfig'
```

- [ ] **Step 3: Migrate `app/not-found.tsx`**

```
'./components/LinkCard' → '@components/LinkCard'
'./lib/siteConfig'      → '@lib/siteConfig'
```

- [ ] **Step 4: Migrate `app/opengraph-image.tsx`**

```
'./lib/siteConfig' → '@lib/siteConfig'
```

- [ ] **Step 5: Migrate `app/sitemap.ts`**

```
'./lib/transit'        → '@lib/transit'
'./lib/firebase-admin' → '@lib/firebase-admin'
```

- [ ] **Step 6: Migrate `app/privacy/page.tsx`**

```
'../components/PageHeader' → '@components/PageHeader'
'../lib/siteConfig'        → '@lib/siteConfig'
```

- [ ] **Step 7: Migrate `app/terms/page.tsx`**

```
'../components/PageHeader' → '@components/PageHeader'
'../lib/siteConfig'        → '@lib/siteConfig'
```

- [ ] **Step 8: Migrate `app/cta/page.tsx`**

```
'../lib/transit'           → '@lib/transit'
'../components/LinkCard'   → '@components/LinkCard'
'../components/PageHeader' → '@components/PageHeader'
'../components/CTALineIcon'→ '@components/CTALineIcon'
'../components/CTAAlerts'  → '@components/CTAAlerts'
'../lib/siteConfig'        → '@lib/siteConfig'
```

- [ ] **Step 9: Migrate `app/metra/page.tsx`**

```
'../lib/transit'            → '@lib/transit'
'../components/LinkCard'    → '@components/LinkCard'
'../components/PageHeader'  → '@components/PageHeader'
'../components/MetraAlerts' → '@components/MetraAlerts'
'../lib/siteConfig'         → '@lib/siteConfig'
```

- [ ] **Step 10: Migrate `app/cta/alerts/page.tsx`**

```
'../../components/PageHeader' → '@components/PageHeader'
'../../components/CTAAlerts'  → '@components/CTAAlerts'
'../../lib/siteConfig'        → '@lib/siteConfig'
```

- [ ] **Step 11: Migrate `app/metra/alerts/page.tsx`**

```
'../../components/PageHeader'  → '@components/PageHeader'
'../../components/MetraAlerts' → '@components/MetraAlerts'
'../../lib/siteConfig'         → '@lib/siteConfig'
```

- [ ] **Step 12: Migrate `app/cta/[line]/page.tsx`**

```
'../../lib/transit'            → '@lib/transit'
'../../components/Breadcrumb'  → '@components/Breadcrumb'
'../../components/CTALineIcon' → '@components/CTALineIcon'
'../../components/CTAAlerts'   → '@components/CTAAlerts'
'../../components/LineDetail'  → '@components/LineDetail'
'../../components/PageHeader'  → '@components/PageHeader'
'../../components/StationList' → '@components/StationList'
'../../lib/siteConfig'         → '@lib/siteConfig'
```

- [ ] **Step 13: Migrate `app/metra/[line]/page.tsx`**

```
'../../lib/transit'             → '@lib/transit'
'../../components/Breadcrumb'   → '@components/Breadcrumb'
'../../components/LineDetail'   → '@components/LineDetail'
'../../components/MetraAlerts'  → '@components/MetraAlerts'
'../../components/PageHeader'   → '@components/PageHeader'
'../../components/StationList'  → '@components/StationList'
'../../lib/siteConfig'          → '@lib/siteConfig'
```

- [ ] **Step 14: Migrate `app/cta/[line]/[station]/page.tsx`**

```
'../../../lib/transit'              → '@lib/transit'
'../../../components/Breadcrumb'    → '@components/Breadcrumb'
'../../../components/PageHeader'    → '@components/PageHeader'
'../../../components/StationDetail' → '@components/StationDetail'
'../../../components/StationMap'    → '@components/StationMap'
'../../../components/Arrivals'      → '@components/Arrivals'
'../../../lib/siteConfig'           → '@lib/siteConfig'
```

- [ ] **Step 15: Migrate `app/metra/[line]/[station]/page.tsx`**

```
'../../../lib/transit'                  → '@lib/transit'
'../../../components/Breadcrumb'        → '@components/Breadcrumb'
'../../../components/PageHeader'        → '@components/PageHeader'
'../../../components/StationDetail'     → '@components/StationDetail'
'../../../components/StationMap'        → '@components/StationMap'
'../../../components/Arrivals'          → '@components/Arrivals'
'../../../components/StationTimetable'  → '@components/StationTimetable'
'../../../lib/siteConfig'               → '@lib/siteConfig'
```

- [ ] **Step 16: Migrate `app/metra/[line]/train/[tripId]/page.tsx`**

```
'../../../../lib/firebase-admin'    → '@lib/firebase-admin'
'../../../../lib/transit'           → '@lib/transit'
'../../../../components/Breadcrumb' → '@components/Breadcrumb'
'../../../../components/PageHeader' → '@components/PageHeader'
'../../../../lib/siteConfig'        → '@lib/siteConfig'
```

- [ ] **Step 17: Migrate API route files**

`app/api/schedules/[slug]/route.ts`:
```
'../../../lib/firebase-admin' → '@lib/firebase-admin'
```

`app/api/metra/trip-index/[line]/route.ts`:
```
'../../../../lib/firebase-admin' → '@lib/firebase-admin'
```

`app/api/metra/station-trips/[slug]/route.ts`:
```
'../../../../lib/firebase-admin' → '@lib/firebase-admin'
```

`app/api/metra/trips/[tripId]/route.ts`:
```
'../../../../lib/firebase-admin' → '@lib/firebase-admin'
```

- [ ] **Step 18: Verify build**

Run: `npm run build`
Expected: Build succeeds with all aliases resolved

- [ ] **Step 19: Commit**

```bash
git add app/
git commit -m "Migrate page and route imports to @components and @lib aliases"
```

---

### Task 3: Migrate component file imports

**Files (8 files in `app/components/`):**
- Modify: `app/components/CTAAlerts.tsx`
- Modify: `app/components/Footer.tsx`
- Modify: `app/components/LineDetail.tsx`
- Modify: `app/components/MetraAlerts.tsx`
- Modify: `app/components/MetraPositions.tsx`
- Modify: `app/components/MetraTripUpdates.tsx`
- Modify: `app/components/StationDetail.tsx`
- Modify: `app/components/StationList.tsx`

**Rule:** Convert `../lib/*` imports to `@lib/*`. Leave sibling imports (e.g., `./ThemeToggle`, `./CTALineIcon`, `./StationDetail`) as relative.

- [ ] **Step 1: Migrate all 8 component files**

`app/components/CTAAlerts.tsx`:
```
'../lib/cta-alerts' → '@lib/cta-alerts' (both import lines)
'../lib/types'      → '@lib/types'
```

`app/components/Footer.tsx`:
```
'../lib/siteConfig' → '@lib/siteConfig'
```

`app/components/LineDetail.tsx`:
```
'../lib/types' → '@lib/types'
```

`app/components/MetraAlerts.tsx`:
```
'../lib/metra-realtime' → '@lib/metra-realtime'
'../lib/types'          → '@lib/types'
```

`app/components/MetraPositions.tsx`:
```
'../lib/metra-realtime' → '@lib/metra-realtime'
```

`app/components/MetraTripUpdates.tsx`:
```
'../lib/metra-realtime' → '@lib/metra-realtime'
```

`app/components/StationDetail.tsx`:
```
'../lib/types' → '@lib/types'
```

`app/components/StationList.tsx`:
```
'../lib/types' → '@lib/types'
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add app/components/
git commit -m "Migrate component lib imports to @lib alias"
```

---

### Task 4: Migrate test file imports

**Files (36 files in `__tests__/`):**
- Modify: `__tests__/fixtures.ts`
- Modify: All 20 files in `__tests__/components/`
- Modify: `__tests__/lib/cta-alerts.test.ts`
- Modify: `__tests__/lib/metra-realtime.test.ts`
- Modify: `__tests__/pages/home.test.tsx`
- Modify: `__tests__/pages/cta-list.test.tsx`
- Modify: `__tests__/pages/cta-alerts.test.tsx`
- Modify: `__tests__/pages/cta-line.test.tsx`
- Modify: `__tests__/pages/cta-station.test.tsx`
- Modify: `__tests__/pages/metra-alerts.test.tsx`
- Modify: `__tests__/pages/metra-list.test.tsx`
- Modify: `__tests__/pages/metra-line.test.tsx`
- Modify: `__tests__/pages/metra-station.test.tsx`
- Modify: `__tests__/pages/metra-train.test.tsx`
- Modify: `__tests__/api/schedules.test.ts`
- Modify: `__tests__/api/metra-routes.test.ts`

**Migration rules:**
- `@/app/components/*` → `@components/*`
- `@/app/lib/*` → `@lib/*`
- `../../app/lib/*` → `@lib/*`
- `../../app/components/*` → `@components/*`
- Apply same changes inside `jest.mock()`, `jest.requireActual()`, `require()`, and `await import()` calls

**DO NOT change:**
- Page imports like `@/app/cta/[line]/page` — no alias for pages
- `@functions/*` imports
- `../fixtures` imports

- [ ] **Step 1: Migrate `__tests__/fixtures.ts`**

```
'@/app/lib/types' → '@lib/types'
```

- [ ] **Step 2: Migrate component test files (20 files)**

For each file in `__tests__/components/`, replace:
- `@/app/components/ComponentName` → `@components/ComponentName`

Additionally, these 4 files have `../../app/lib/` imports and `jest.mock` paths to update:

`CTAAlerts.test.tsx`:
```
import: '../../app/lib/cta-alerts' → '@lib/cta-alerts'
import: '@/app/components/CTAAlerts' → '@components/CTAAlerts'
jest.mock('../../app/lib/cta-alerts', ...) → jest.mock('@lib/cta-alerts', ...)
jest.requireActual('../../app/lib/cta-alerts') → jest.requireActual('@lib/cta-alerts')
```

`MetraAlerts.test.tsx`:
```
import: '../../app/lib/metra-realtime' → '@lib/metra-realtime'
import: '@/app/components/MetraAlerts' → '@components/MetraAlerts'
jest.mock('../../app/lib/metra-realtime') → jest.mock('@lib/metra-realtime')
```

`MetraPositions.test.tsx`:
```
import: '../../app/lib/metra-realtime' → '@lib/metra-realtime'
import: '@/app/components/MetraPositions' → '@components/MetraPositions'
jest.mock('../../app/lib/metra-realtime') → jest.mock('@lib/metra-realtime')
```

`MetraTripUpdates.test.tsx`:
```
import: '../../app/lib/metra-realtime' → '@lib/metra-realtime'
import: '@/app/components/MetraTripUpdates' → '@components/MetraTripUpdates'
jest.mock('../../app/lib/metra-realtime') → jest.mock('@lib/metra-realtime')
```

And these files have `@/app/lib/types` to update:

`LineDetail.test.tsx`: `@/app/lib/types` → `@lib/types`
`StationDetail.test.tsx`: `@/app/lib/types` → `@lib/types`
`StationList.test.tsx`: `@/app/lib/types` → `@lib/types`

- [ ] **Step 3: Migrate lib test files (2 files)**

`__tests__/lib/cta-alerts.test.ts`:
```
'@/app/lib/cta-alerts' → '@lib/cta-alerts' (both lines — import and type import)
```

`__tests__/lib/metra-realtime.test.ts`:
```
'@/app/lib/metra-realtime' → '@lib/metra-realtime'
```

- [ ] **Step 4: Migrate page test files (11 files)**

`home.test.tsx`:
```
jest.mock('../../app/lib/metra-realtime', ...) → jest.mock('@lib/metra-realtime', ...)
```

`cta-alerts.test.tsx`:
```
jest.mock('../../app/components/CTAAlerts', ...) → jest.mock('@components/CTAAlerts', ...)
```

`cta-list.test.tsx`:
```
jest.mock('../../app/lib/transit', ...)         → jest.mock('@lib/transit', ...)
jest.mock('../../app/components/CTAAlerts', ...) → jest.mock('@components/CTAAlerts', ...)
```

`cta-line.test.tsx`:
```
jest.mock('../../app/lib/transit', ...)          → jest.mock('@lib/transit', ...)
jest.mock('../../app/components/CTAAlerts', ...) → jest.mock('@components/CTAAlerts', ...)
await import('../../app/lib/transit')            → await import('@lib/transit')
```

`cta-station.test.tsx`:
```
jest.mock('../../app/components/Arrivals', ...)  → jest.mock('@components/Arrivals', ...)
jest.mock('../../app/lib/transit', ...)          → jest.mock('@lib/transit', ...)
await import('../../app/lib/transit')            → await import('@lib/transit')
```

`metra-alerts.test.tsx`:
```
jest.mock('../../app/components/MetraAlerts', ...) → jest.mock('@components/MetraAlerts', ...)
```

`metra-list.test.tsx`:
```
jest.mock('../../app/lib/transit', ...)              → jest.mock('@lib/transit', ...)
jest.mock('../../app/components/MetraAlerts', ...)   → jest.mock('@components/MetraAlerts', ...)
```

`metra-line.test.tsx`:
```
jest.mock('../../app/lib/transit', ...)              → jest.mock('@lib/transit', ...)
jest.mock('../../app/components/MetraAlerts', ...)   → jest.mock('@components/MetraAlerts', ...)
await import('../../app/lib/transit')                → await import('@lib/transit')
```

`metra-station.test.tsx`:
```
jest.mock('../../app/components/Arrivals', ...)          → jest.mock('@components/Arrivals', ...)
jest.mock('../../app/components/StationTimetable', ...)  → jest.mock('@components/StationTimetable', ...)
jest.mock('../../app/lib/transit', ...)                  → jest.mock('@lib/transit', ...)
await import('../../app/lib/transit')                    → await import('@lib/transit')
```

`metra-train.test.tsx`:
```
jest.mock('../../app/lib/firebase-admin', ...) → jest.mock('@lib/firebase-admin', ...)
jest.mock('../../app/lib/transit', ...)        → jest.mock('@lib/transit', ...)
```

- [ ] **Step 5: Migrate API test files (2 files)**

`__tests__/api/schedules.test.ts`:
```
jest.mock('../../app/lib/firebase-admin', ...) → jest.mock('@lib/firebase-admin', ...)
require('../../app/lib/firebase-admin')        → require('@lib/firebase-admin')
```

`__tests__/api/metra-routes.test.ts`:
```
jest.mock('../../app/lib/firebase-admin', ...) → jest.mock('@lib/firebase-admin', ...)
require('../../app/lib/firebase-admin')        → require('@lib/firebase-admin')
```

- [ ] **Step 6: Run tests**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add __tests__/
git commit -m "Migrate test imports to @components and @lib aliases"
```

---

### Task 5: Update documentation

**Files:**
- Modify: `CLAUDE.md`
- Modify: `.claude/rules/code-style.md`

- [ ] **Step 1: Update CLAUDE.md**

In the SEO Rules section, update the example import from:
```typescript
import { siteConfig } from '../lib/siteConfig'
```
to:
```typescript
import { siteConfig } from '@lib/siteConfig'
```

- [ ] **Step 2: Update `.claude/rules/code-style.md`**

In the **TypeScript** section, replace the path alias bullet:
```
- **Path alias**: Use `@/*` for root-level imports (e.g., `import { siteConfig } from '@/app/lib/siteConfig'`)
```
with:
```
- **Path aliases**: Use `@components/*` for component imports and `@lib/*` for lib imports. Use `@/*` for other root-level imports not covered by the above (e.g., page imports in tests).
```

In the **Imports** section, replace:
```
- Use the `@/*` path alias for imports from the project root
```
with:
```
- Use `@components/*` for imports from `app/components/` (e.g., `import PageHeader from '@components/PageHeader'`)
- Use `@lib/*` for imports from `app/lib/` (e.g., `import { siteConfig } from '@lib/siteConfig'`)
- Use `@/*` for other root-level imports not covered by the above aliases
- Sibling imports within the same directory stay relative (e.g., `./ThemeToggle`)
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md .claude/rules/code-style.md
git commit -m "Update docs to reflect @components and @lib path aliases"
```

---

### Task 6: Final verification

- [ ] **Step 1: Run full build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 2: Run full test suite**

Run: `npm test`
Expected: All tests pass with zero warnings

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 4: Audit for stale imports**

Run these greps to confirm no old patterns remain:

In `app/` (excluding `app/components/` sibling imports): search for `from '\.\./.*components/` and `from '\.\./.*lib/` and `from '\./components/` and `from '\./lib/`

In `__tests__/`: search for `@/app/components/`, `@/app/lib/`, `../../app/lib/`, `../../app/components/`

Expected: No matches (all migrated)

- [ ] **Step 5: Fix any stale imports found, re-run verification, commit if needed**
