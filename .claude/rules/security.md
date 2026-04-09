# Security Requirements

These rules protect API keys, service credentials, and user-facing data integrity.

---

## Secrets Management

- **Never commit** `service-account.json`, `.env*.local`, or any file containing API tokens
- All secrets are managed via **Firebase Secret Manager** and configured in `apphosting.yaml`
- `METRA_API_TOKEN` is injected at runtime only (`availability: RUNTIME`) — it is never available at build time
- Before using any environment variable for an API token, validate that it exists and return a 500 error if missing

---

## Firebase Admin SDK

- **Server components and API routes only** — never import `firebase-admin` or `app/lib/firebase-admin.ts` in a `'use client'` file
- The Admin SDK is listed in `serverExternalPackages` in `next.config.ts` to prevent client-side bundling
- `app/lib/firebase-admin.ts` checks for `service-account.json` first, then falls back to `applicationDefault()` — this is intentional for local dev vs. deployed environments

---

## API Route Security

- **Validate route parameters** extracted from `params` before using them in database queries or upstream API calls
- **Return proper HTTP status codes**: 404 for missing resources, 500 for server errors — never return raw error objects to the client
- **Set cache headers** on Firestore-backed routes: `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`
- **Preserve Content-Type** when proxying binary data (e.g., protobuf from Metra GTFS feeds)

---

## External API Proxying

All external API calls must go through server-side API routes (`app/api/`):

- **CTA alerts**: `app/api/cta/alerts/route.ts` proxies to `transitchicago.com`
- **Metra feeds**: `app/api/metra/[...path]/route.ts` proxies authenticated requests to Metra's GTFS endpoint

This pattern prevents CORS issues and keeps API credentials out of client-side code. Never call external transit APIs directly from client components.

---

## Client-Side Boundaries

- No API keys, tokens, or service account details in client-side code
- No secrets in `console.log`, error messages, or UI text
- Client components fetch data through the project's own `/api/` routes, never directly from external services
