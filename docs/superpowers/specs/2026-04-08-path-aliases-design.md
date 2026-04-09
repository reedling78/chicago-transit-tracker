# Path Alias Design Spec

**Date:** 2026-04-08
**Status:** Approved

## Problem

Import paths in `app/` source files use deep relative traversals like `../../../../lib/firebase-admin` and `../../components/PageHeader`. The project has `@/*` configured in tsconfig but source files don't use it — and even when used (in tests), it produces verbose paths like `@/app/components/Hero`.

## Solution

Add two new TypeScript path aliases — `@components/*` and `@lib/*` — alongside the existing `@/*`. Migrate all component and lib imports across source and test files.

## Config Changes

### tsconfig.json

Add two entries to `compilerOptions.paths`:

```json
"paths": {
  "@/*": ["./*"],
  "@components/*": ["./app/components/*"],
  "@lib/*": ["./app/lib/*"]
}
```

### jest.config.ts

Add matching `moduleNameMapper` entries (order matters — specific aliases before generic):

```typescript
moduleNameMapper: {
  '^@components/(.*)$': '<rootDir>/app/components/$1',
  '^@lib/(.*)$': '<rootDir>/app/lib/$1',
  '^@functions/(.*)$': '<rootDir>/functions/src/$1',
}
```

### next.config.ts

No changes needed. Next.js reads `tsconfig.json` paths directly.

## Import Migration Rules

### Source files (`app/`)

| Before | After |
|--------|-------|
| `../../components/PageHeader` | `@components/PageHeader` |
| `../components/LinkCard` | `@components/LinkCard` |
| `../../../../lib/firebase-admin` | `@lib/firebase-admin` |
| `../lib/siteConfig` | `@lib/siteConfig` |
| `../lib/types` | `@lib/types` |

**Do NOT change:**
- Sibling imports within `app/components/` (e.g., `./ThemeToggle` in Navbar.tsx) — aliases don't help for same-directory imports
- External package imports (`next`, `react`, etc.)

### Test files (`__tests__/`)

| Before | After |
|--------|-------|
| `@/app/components/Hero` | `@components/Hero` |
| `@/app/lib/cta-alerts` | `@lib/cta-alerts` |
| `@/app/lib/types` | `@lib/types` |
| `../../app/lib/metra-realtime` | `@lib/metra-realtime` |

**Do NOT change:**
- Page imports like `@/app/cta/[line]/page` — no alias covers pages
- `@functions/*` imports — already short
- `../fixtures` imports — test-internal

## Documentation Updates

- **CLAUDE.md** — Update the path alias reference in the Architecture section
- **.claude/rules/code-style.md** — Update the Imports section to document `@components/*` and `@lib/*` as the preferred import form for components and lib modules

## What Stays The Same

- `@/*` alias remains for paths not under `components/` or `lib/` (e.g., page imports in tests)
- `@functions/*` Jest-only alias unchanged
- `functions/src/` internal imports unchanged (separate tsconfig)
- Sibling/local relative imports unchanged

## Verification

1. `npm run build` — Next.js resolves all aliases correctly
2. `npm test` — Jest resolves all aliases correctly
3. `npm run lint` — No import errors
