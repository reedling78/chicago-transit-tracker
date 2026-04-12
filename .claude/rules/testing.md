# Testing Conventions

All source file changes must include corresponding test updates. This is enforced by a PostSourceFileEdit hook.

---

## Framework

- **Jest 30** with `jest-environment-jsdom` for component tests
- **React Testing Library** (`@testing-library/react` + `@testing-library/jest-dom`)
- Config: `apps/web/jest.config.ts` and `apps/web/jest.setup.ts`

---

## File Organization

- All tests live in `apps/web/__tests__/`, mirroring the source structure:
  - `apps/web/__tests__/components/` — React component tests
  - `apps/web/__tests__/api/` — API route handler tests
  - `apps/web/__tests__/pages/` — Page component tests
  - `apps/web/__tests__/functions/` — Cloud Functions tests (parsers, utilities)
- Test files are named `*.test.ts` or `*.test.tsx`
- Shared mock data lives in `apps/web/__tests__/fixtures.ts` — use `mockLine`, `mockMetraLine`, `mockStation`, `mockMetraStation` instead of creating inline mocks

---

## Mocking Patterns

- **Module mocks**: `jest.mock('../../app/lib/module-name')` at the top of test files
- **Typed mocks**: Use `jest.MockedFunction<typeof originalFunction>` for type-safe mock references
- **Fetch mocks**: `global.fetch = jest.fn()` for components that call APIs
- **Firestore mocks**: Build manual chain mocks (`collection().doc().get()`) — see existing API tests for examples
- **Virtual mocks**: Use `jest.doMock(..., { virtual: true })` for modules not in root `node_modules` (e.g., `firebase-functions`)

---

## Async and Timer Patterns

- Use `waitFor()` from React Testing Library for assertions on async state changes
- For polling components, use `jest.useFakeTimers()` with `doNotFake: ['setTimeout', 'setInterval', ...]` to keep real timers working alongside faked ones
- To test loading/skeleton states, mock with `new Promise(() => {})` (a promise that never resolves)

---

## API Route Tests

- Set `@jest-environment node` at the top of the file (API routes run in Node, not jsdom)
- Test both success (200) and error (404, 500) response codes
- Verify cache headers (`s-maxage`, `stale-while-revalidate`) on Firestore-backed routes
- Mock Firestore reads — do not hit a real database in tests

---

## CI Requirements

- `pnpm -w run test` must pass with **zero warnings and zero errors** before pushing
- `pnpm -w run lint` must also be fully clean
- Both checks run in GitHub Actions on every PR and push to `main`

---

## Commands

```bash
pnpm -w run test           # Run full test suite (via turbo)
cd apps/web && pnpm test   # Run web tests directly
pnpm run test:watch        # Watch mode for development (from apps/web)
pnpm run test:coverage     # Generate coverage report (from apps/web)
pnpm run test:snapshots    # Update Jest snapshots (from apps/web)
```
