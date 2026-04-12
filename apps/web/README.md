# @ctt/web

Next.js 16 web app for Chicago Transit Tracker. Server-side rendered and deployed via Firebase App Hosting.

## Development

```bash
pnpm run dev          # Dev server at http://localhost:3000
pnpm run lint         # ESLint + Prettier
pnpm test             # Jest test suite
pnpm run build        # Production build
```

## Key directories

- `app/` — Next.js App Router pages and components
- `app/api/` — Server-side API routes (CTA/Metra proxies, Firestore reads)
- `app/components/` — React components (server and client)
- `app/lib/` — Utilities, data access, re-exports from `@ctt/shared`
- `__tests__/` — Jest + React Testing Library test suites
- `scripts/` — Firestore seed scripts (ts-node)

## Environment

Requires `service-account.json` (symlinked from repo root) and `.env.local` with `METRA_API_TOKEN` for local development.
