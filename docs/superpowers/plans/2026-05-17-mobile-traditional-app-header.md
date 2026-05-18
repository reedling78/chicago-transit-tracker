# Plan: Traditional app header on the mobile home screen

## Context

The mobile home screen (`apps/mobile/app/index.tsx`) currently hides the navigator
header entirely (`headerShown: false`) and renders the Dashboard edge-to-edge.
`DashboardHeader` carries all the chrome: a large "Chicago Transit Tracker" hero
headline when logged out, and a "Welcome back, {firstName}" greeting + a
`HeaderUserIcon` profile button when logged in.

The user wants a conventional app bar on the home screen instead: a fixed header
showing the site name "Chicago Transit Tracker" with the profile button on the
right, with an assigned background color so screen content scrolls underneath it.
When signed in, the now-redundant site title and profile button should be removed
from the in-scroll dashboard content.

Decisions confirmed with the user:
- **Scope: home/dashboard screen only.** Detail screens keep their existing
  transparent full-bleed photo headers (unchanged).
- **Logged out:** drop the duplicated 32px headline from the dashboard hero; keep
  the tagline and Sign up / Log in buttons. Title lives only in the header.
- **Logged in:** keep the "Welcome back, {firstName}" greeting in the dashboard;
  remove only the profile icon (now in the header).
- **Header background:** `theme.colors.bg.canvas` (matches the dashboard so it
  blends and cleanly masks content scrolling underneath).

## Changes

### 1. `apps/mobile/app/index.tsx` — configure the home header

`HomeScreen` becomes theme-aware and sets per-screen `Stack.Screen` options
(these override the global transparent screenOptions in `_layout.tsx` for this
route only):

- `import { useTheme } from '../lib/theme'` and `import HeaderUserIcon from '../components/HeaderUserIcon'`.
- Replace `options={{ headerShown: false }}` with:
  - `headerShown: true`
  - `headerTransparent: true` — content scrolls underneath
  - `headerStyle: { backgroundColor: theme.colors.bg.canvas }` — opaque bar masking scrolled content
  - `headerShadowVisible: false`
  - `headerTitle: 'Chicago Transit Tracker'`
  - `headerTitleAlign: 'left'` (traditional app-bar feel)
  - `headerTitleStyle: { color: theme.colors.text.primary, fontWeight: '700' }`
  - `headerLeft: () => null` — no back slot at root; keeps the title flush-left
  - `headerRight: () => <HeaderUserIcon />`

No change needed to `Dashboard.tsx` — it already offsets content with
`useNavHeaderInset()` (`contentTopInset={headerInset + 8}`), and that hook
(`apps/mobile/lib/useNavHeaderInset.ts`) reads the real header height now that the
header is shown.

### 2. `apps/mobile/components/dashboard/DashboardHeader.tsx` — drop redundant chrome

- **Logged out (`!user`):** remove the `<Text style={styles.heroHeadline}>Chicago Transit Tracker</Text>`
  line (DashboardHeader.tsx:23). Keep tagline, prompt, and the Sign up / Log in
  button row. Remove the now-unused `heroHeadline` style from `makeStyles`.
  Optionally reduce `unauthedHero` top padding since the headline is gone.
- **Logged in:** remove `<HeaderUserIcon />` (DashboardHeader.tsx:60) and the
  `import HeaderUserIcon` line (DashboardHeader.tsx:8). Keep the greeting `Text`.
  Simplify `headingRow` to just the heading (the row's `space-between` only
  existed to place the icon) — render the heading `Text` directly; drop the
  `headingRow` wrapper/style or leave it as a simple container.
- Change the no-name fallback so it does not duplicate the header title:
  `const heading = firstName ? \`Welcome back, ${firstName}\` : 'Welcome back'`
  (DashboardHeader.tsx:54 — was `'Chicago Transit Tracker'`).

### 3. `apps/mobile/components/HeaderUserIcon.tsx` — adapt to an opaque bar

The scrim circle (`theme.colors.bg.scrim`, a 45%-black disc) was for contrast
over photos; on the opaque `bg.canvas` header it reads as a dark blob. Drop the
circle background and color the icon with `theme.colors.text.primary` so it sits
naturally on the header. Keep the `PressableButton`, the 44×44 touch target, and
the `accessibilityLabel` values (`'Profile'` / `'Sign in'`) unchanged — tests
depend on those labels. HeaderUserIcon is only consumed here (and now the home
header), so this is safe.

## Tests to update (required — PostSourceFileEdit hook enforces it)

- **`apps/mobile/__tests__/screens/home.test.tsx`**: the test asserting
  `capturedOptions[0]` equals `{ headerShown: false }` must be rewritten. Assert
  the new shape instead: `headerShown` truthy, `headerTitle === 'Chicago Transit Tracker'`,
  and that `headerRight` is a function (rendering it yields the profile button).
- **`apps/mobile/__tests__/components/dashboard/DashboardHeader.test.tsx`**:
  - unauthed "shows headline, tagline, and both CTA buttons": drop the
    `getByText('Chicago Transit Tracker')` assertion; keep tagline + buttons.
  - authed-no-favorites "shows the generic heading when no displayName": expect
    `getByText('Welcome back')` instead of `'Chicago Transit Tracker'`.
  - authed-no-favorites "renders the profile icon button on the right…": remove
    this test (profile button no longer lives in DashboardHeader).
  - authed-with-favorites "shows the heading and profile icon but not the empty
    card": expect `getByText('Welcome back')`, drop `getByLabelText('Profile')`.
- **`apps/mobile/__tests__/components/HeaderUserIcon.test.tsx`**: label/navigation
  assertions only — should still pass after the styling change; run to confirm.
- **`apps/mobile/__tests__/screens/root-layout.test.tsx`**: unaffected (global
  layout unchanged) — run to confirm still green.

## Verification

1. `cd apps/mobile && pnpm test` — full mobile suite green, zero warnings.
2. `pnpm --filter mobile run lint` — clean (no unused `HeaderUserIcon` import left
   in DashboardHeader, no unused `heroHeadline` style).
3. `pnpm run:ios` (or `run:android`), home screen, manually verify:
   - **Logged out:** header bar shows "Chicago Transit Tracker" left + profile
     (outline) icon right on a `bg.canvas` background; dashboard body shows the
     tagline + Sign up / Log in buttons with no duplicate big headline; content
     scrolls underneath the bar.
   - **Logged in:** header shows title + filled profile icon (taps → `/profile`);
     dashboard body shows "Welcome back, {firstName}" with no profile icon and no
     duplicate title; favorites / empty card render below.
   - Light and dark mode both look correct (toggle via profile screen).
   - Tap a CTA/Metra card → detail screen still shows the transparent full-bleed
     photo header (unchanged).
