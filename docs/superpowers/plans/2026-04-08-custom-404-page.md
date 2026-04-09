# Implementation Plan: Custom 404 Page

## Context

The site has no custom 404 page. We're adding a transit-themed "End of the line" 404 page with a hero section and navigation cards to keep users on-site. Design spec: `docs/superpowers/specs/2026-04-08-404-page-design.md`.

## Steps

### Step 1: Create `app/not-found.tsx`

Create the 404 page as a server component with:

- Static `metadata` export with title, description, OG, Twitter, and `robots: { index: false }`
- Import `siteConfig` from `app/lib/siteConfig.ts`
- Import `LinkCard` from `app/components/LinkCard`
- Hero section: large 404 in CTA Red, headline, subtext (all centered)
- Divider
- "Popular Destinations" label + 4 LinkCards (Home, CTA, Metra, Alerts) with accent colors
- Full dark mode support using existing Tailwind patterns

**Key files:**

- Create: `app/not-found.tsx`
- Reuse: `app/components/LinkCard.tsx` (no changes needed)
- Reuse: `app/lib/siteConfig.ts` (no changes needed)

### Step 2: Create unit test `__tests__/not-found.test.tsx`

- Verify 404 heading renders
- Verify "You've reached the end of the line" text renders
- Verify all 4 navigation links render with correct hrefs (`/`, `/cta`, `/metra`, `/cta/alerts`)
- Verify metadata export exists with required fields

### Step 3: Manual verification

- Run `npm run dev` and visit a non-existent URL (e.g., `/does-not-exist`)
- Confirm page renders correctly in light and dark mode
- Run `npm run lint` and `npm test` to confirm no regressions

## Verification

```bash
npm test             # All tests pass including new not-found test
npm run lint         # No lint errors
npm run dev          # Visit /does-not-exist to verify visually
```
