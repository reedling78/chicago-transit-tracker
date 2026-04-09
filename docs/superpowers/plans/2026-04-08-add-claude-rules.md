# Plan: Add Claude Rules Files

## Context

This project serves as both a production transit site and a teaching tool for learning Claude Code workflows. The team needs structured, discoverable guidance files so that anyone using Claude Code in this repo gets consistent behavior around code style, testing, and security — without having to read the entire CLAUDE.md.

The root `CLAUDE.md` stays as-is. The new `.claude/rules/` files layer on focused, project-specific conventions derived from the codebase's actual config and patterns.

## Files to Create

### 1. `.claude/rules/code-style.md`

Derived from the project's actual Prettier, ESLint, and TypeScript config:

- **Prettier rules**: No semicolons, single quotes, trailing commas, 2-space indent, 100 char width, Tailwind class sorting
- **ESLint**: Next.js core-web-vitals + TypeScript + Prettier compat (flat config format)
- **TypeScript**: Strict mode enabled, `@/*` path alias for root imports, `isolatedModules`
- **Tailwind v4**: Class-based dark mode via `@custom-variant dark`, use `dark:` prefix
- **Component conventions**: Server components by default, explicit `'use client'` only when needed. Never import `firebase-admin` in client components
- **Import conventions**: Use `@/*` path alias, import site constants from `app/lib/siteConfig.ts`

### 2. `.claude/rules/testing.md`

Derived from `jest.config.ts`, `jest.setup.ts`, and existing test files in `__tests__/`:

- **Framework**: Jest 30 + React Testing Library (`@testing-library/react`, `@testing-library/jest-dom`)
- **File location**: All tests in `__tests__/` mirroring source structure (`components/`, `api/`, `pages/`, `functions/`)
- **Naming**: `*.test.ts` or `*.test.tsx`
- **Shared fixtures**: Use `__tests__/fixtures.ts` for mock data (`mockLine`, `mockStation`, etc.)
- **Mocking patterns**: `jest.mock()` for modules, `jest.MockedFunction<typeof fn>` for type safety, `global.fetch = jest.fn()` for API calls, manual Firestore chain mocks
- **Async patterns**: `waitFor()` for async assertions, `jest.useFakeTimers()` with `doNotFake` for polling components
- **API route tests**: Use `@jest-environment node`, test success + error cases, verify cache headers
- **Standing rule**: Every source file change must have a corresponding test update (enforced by PostSourceFileEdit hook)
- **CI requirement**: Tests must pass with zero warnings before pushing

### 3. `.claude/rules/security.md`

Derived from API routes, `.gitignore`, `apphosting.yaml`, and Firebase config:

- **Secrets**: Never commit `service-account.json`, `.env*.local`, or API tokens. Secrets live in Firebase Secret Manager, configured in `apphosting.yaml`
- **API tokens**: `METRA_API_TOKEN` is server-only via `process.env` — validate presence before use, return 500 if missing
- **Firebase Admin**: Server components and API routes only — never import in `'use client'` files
- **API route patterns**: Validate route params, return proper HTTP status codes (404/500), set cache headers on Firestore-backed routes
- **External API proxying**: All external API calls go through `app/api/` server routes to avoid CORS and hide credentials
- **No client-side secrets**: Never expose API keys, tokens, or service account details in client-side code or browser network requests

## Verification

1. Confirm all three files exist in `.claude/rules/`
2. Run `npm run lint` — rules files should be in ESLint's global ignores (`.claude/` is already excluded)
3. Start a new Claude Code conversation in the repo and verify the rules are loaded as context
