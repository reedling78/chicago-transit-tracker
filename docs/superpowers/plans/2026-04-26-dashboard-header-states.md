# Dashboard Header — three auth/state variants

## Context

The home page (`apps/web/app/page.tsx`) renders `<Dashboard />`, which today stacks `<DashboardGrid />` on top of `<Hero />`. `DashboardGrid` is doing double duty: it renders the favorites grid for authed-with-favorites users AND inlines empty/unauthed CTAs. It has no header — there's nothing on the home page that says "Your Dashboard" or welcomes the user.

A previous Hero headline ("Chicago Transit Tracker" + tagline) was removed in commit `bcfcdfe` because it pushed content below the fold for signed-in returning users. But for **unauthed visitors** (first impression, SEO landing) we still want a real marketing hero with site name + tagline + a sign-up CTA.

This plan introduces a new `DashboardHeader` component that owns all three visual states, and trims `DashboardGrid` down to a single responsibility (render the favorites grid for users who actually have favorites).

## Goal

Three states rendered above `<Hero />`:

| State | DashboardHeader renders | DashboardGrid renders |
| --- | --- | --- |
| Unauthed | Big marketing hero (site name + tagline) + "Sign up to customize…" row with Sign up / Log in buttons | nothing |
| Authed, no favorites | "Your Dashboard" header row + empty-state card with quick links to `/cta` and `/metra` | nothing |
| Authed, has favorites | "Your Dashboard" header row | favorites grid (drag-to-reorder, as today) |

`<Hero />` (the three service cards) continues to render below in all states.

## Files to modify

- **Create** `apps/web/app/components/dashboard/DashboardHeader.tsx` — new client component, owns all three states.
- **Edit** `apps/web/app/components/dashboard/Dashboard.tsx` — render `<DashboardHeader />` then `<DashboardGrid />` then `<Hero />`.
- **Edit** `apps/web/app/components/dashboard/DashboardGrid.tsx` — remove the unauthed-button branch (lines 56–72) and the no-favorites branch (lines 74–83). When `loading || !user || favorites.length === 0`, return `null`. Drop the `useState`/`AuthModal` imports that become unused.
- **Create** `apps/web/__tests__/components/dashboard/DashboardHeader.test.tsx` — covers the three states.
- **Update** `apps/web/__tests__/components/dashboard/DashboardGrid.test.tsx` (if it exists; otherwise create) — verify it returns `null` for unauthed and zero-favorites cases.

No mobile changes (the user's brief was web-only — the headline/tagline language is web's Hero copy and the mobile dashboard already has its own `DashboardHero` + empty-state pattern).

## DashboardHeader.tsx — design

Client component (`'use client'`) that consumes `useAuth()` and `useFavoritesStore`, mirroring the same gating logic `DashboardGrid` uses today.

```
loading       → return null  (avoid flashing the unauthed hero for half a tick)
!user         → <UnauthedHero />
favorites=0   → <AuthedHeaderRow /> + <EmptyFavoritesCard />
otherwise     → <AuthedHeaderRow />
```

### Unauthed hero

Re-introduces the headline + subhead removed in `bcfcdfe`. Recommended copy (matches what was removed):

- Headline: **"Chicago Transit Tracker"**
- Subhead: **"Real-time schedules, routes, and station info for every line in the Chicago metro area."**

Below it, a row that reads roughly: **"Sign up to customize your dashboard with your favorite lines, stations, and trains."** with two buttons: **Sign up** (primary) and **Log in** (secondary). Both open the existing `AuthModal` (already used by `DashboardGrid` today). `AuthModal` already supports a `mode` param — pass `'signup'` for the primary button and `'signin'` for the secondary so the modal opens on the right tab.

Layout: full-width section, centered text, large display heading. Mirror the visual rhythm of the existing `<Hero />` section's outer wrapper (gray-50 / dark:gray-950 background, grid pattern, radial glow) so the page feels intentional rather than two unrelated heroes stacked. Bottom margin so it visually separates from `<Hero />`'s service cards below.

### Authed header row

For both authed states. Simple `<h2>` with greeting text — recommended: **"Your Dashboard"** (or "Welcome back, {firstName}" if `profile?.displayName` is available; fall back to "Your Dashboard"). Styled as a section header (e.g. `text-2xl font-semibold mb-4`).

### Empty-favorites card

Replaces the inline empty-state block currently in `DashboardGrid` (lines 74–83). Card with:

- Title: **"No favorites yet"**
- Body: **"Tap the heart on any line, station, or train to save it here."**
- Two `LinkCard`-style quick links: **Browse CTA → `/cta`** and **Browse Metra → `/metra`**.

Use the existing `<LinkCard />` component at `apps/web/app/components/LinkCard.tsx` if its prop shape fits; otherwise inline two anchors styled to match the favorite-card look (see `apps/web/app/components/dashboard/cards/cardClassNames.ts`).

## Reused utilities

- `useAuth()` — `apps/web/app/components/AuthProvider.tsx` (gives `user`, `profile`, `loading`)
- `useFavoritesStore` — `apps/web/app/lib/store/favorites.ts` (selector: `(s) => s.favorites`)
- `AuthModal` — `apps/web/app/components/AuthModal.tsx` (already accepts a mode for sign-in vs sign-up)
- `LinkCard` — `apps/web/app/components/LinkCard.tsx` (for the quick links in the empty state)
- Hero-section visual treatment to copy — `apps/web/app/components/Hero.tsx:90-103`

## Tests

`apps/web/__tests__/components/dashboard/DashboardHeader.test.tsx` (new):

1. Renders nothing while `useAuth()` is loading.
2. Unauthed: shows the headline "Chicago Transit Tracker", the tagline, a "Sign up" button, and a "Log in" button. Clicking either opens `AuthModal` (assert by mocking `AuthModal` and verifying it mounts; assert prop indicates correct mode if `AuthModal` exposes one).
3. Authed + zero favorites: shows "Your Dashboard" heading + "No favorites yet" card + two quick-link anchors with hrefs `/cta` and `/metra`.
4. Authed + ≥1 favorite: shows "Your Dashboard" heading and does **not** render the empty-state card.

`apps/web/__tests__/components/dashboard/DashboardGrid.test.tsx` (update or create):

5. Returns `null` when unauthed.
6. Returns `null` when authed with zero favorites.
7. Renders the dnd grid when authed with favorites (smoke test — already implicitly covered if the file exists today).

Mock `useAuth` and `useFavoritesStore` per the patterns in `apps/web/__tests__/fixtures.ts` and existing dashboard tests.

## Compliance / standing rules

- No new pages → no sitemap update needed.
- No SEO metadata change (home page metadata unchanged).
- No `firebase-admin` imports in any client component.
- Responsive: unauthed hero must look right at 375 / 768 / 1280 widths — headline scales (`text-4xl sm:text-5xl lg:text-6xl`), buttons stack on narrow screens (`flex-col sm:flex-row`).
- No CTA/Metra trademark text in the new copy — generic phrasing only.

## Verification

1. `pnpm run:web` — visit `/` while signed out: see the new headline + tagline + sign-up row, no favorites grid, service cards still below.
2. Sign in (no favorites yet): see "Your Dashboard" + empty card with `/cta` and `/metra` links, no grid.
3. Favorite a line: see "Your Dashboard" + the favorites grid, no empty card.
4. Sign out: returns to unauthed hero with no flash of empty state.
5. Resize to 375px and 1280px in DevTools — confirm layout holds.
6. `pnpm test:web` — all suites green, including the new `DashboardHeader.test.tsx`.
7. `pnpm lint:web` — clean.
