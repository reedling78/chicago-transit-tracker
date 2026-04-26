# Plan: Move dashboard greeting + profile button into the app bar (mobile)

## Context

The mobile "My Trains" dashboard (`apps/mobile/app/index.tsx`) currently shows an in-page header (`DashboardHeader`) at the top of its scroll view: a greeting on the left ("Chicago Transit Tracker" when signed out / "Welcome back, [Name]" when signed in) and a "Sign in" / "Profile" pill button on the right.

The screen itself has an empty native header — `apps/mobile/app/_layout.tsx` sets `title: ''` globally on the root Stack — so the top of every dashboard view is a strip of unused transparent space, with the greeting redundantly stating the app name just below it.

We want to consolidate: put the app title **"Chicago Transit Tracker"** in the actual native app bar on the dashboard, put the profile/sign-in entry point on the right of that same bar, and delete `DashboardHeader` entirely. This both reclaims vertical space inside the scroll view and matches the platform-standard "title left, action right" header pattern that other detail screens in the app already use (`apps/mobile/app/cta/[line].tsx`, `apps/mobile/app/metra/[line]/index.tsx`).

## Scope

Mobile app only (`apps/mobile/`). The web dashboard already handles this differently (it has a real `<Navbar>` with `UserMenu`) — out of scope.

This change only touches the home/dashboard route. Other mobile routes (CTA / Metra index, line, station, train detail) keep their existing per-screen header configuration.

## Approach

### 1. New component — `apps/mobile/components/HeaderUserIcon.tsx`

A circular header button that mirrors `HeaderBackButton`'s visual style (44×44 hit area, 36×36 dark-backdrop circle, white Ionicon glyph) so it sits naturally in the same transparent header.

Behavior — driven by `useAuth()` from `apps/mobile/lib/AuthContext.tsx`:

- `loading` → render `null` (no icon, no layout jump because it lives in `headerRight` not in page flow)
- signed out (`user` is null) → Ionicon `person-circle-outline`, `accessibilityLabel="Sign in"`, `router.push('/auth')`
- signed in → Ionicon `person-circle`, `accessibilityLabel="Profile"`, `router.push('/profile')`

Routes match the existing behavior in `DashboardHeader.tsx:26`. We use the same Ionicon glyph (just outline vs filled) for both states for now — a future iteration can swap to the user's `photoUrl` when present, mirroring the web `UserMenu` pattern, but that is intentionally out of scope here to keep the change tight.

Style notes:

- `marginRight: 8` to balance `HeaderBackButton`'s `marginLeft: 8`
- Icon size `28` (slightly larger than back chevron's `22` because `person-circle` reads smaller at the same point size)
- Pull the StyleSheet structure straight from `HeaderBackButton.tsx` so the two header buttons feel like a pair

### 2. Wire the dashboard screen header — `apps/mobile/app/index.tsx`

Add a `<Stack.Screen>` element above the `<Dashboard />` render to override the root Stack's empty title for this route only:

```tsx
import { Stack } from 'expo-router'
import Dashboard from '../components/dashboard/Dashboard'
import HeaderUserIcon from '../components/HeaderUserIcon'

export default function HomeScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Chicago Transit Tracker',
          headerTitleAlign: 'left',
          headerTitleStyle: { color: '#fff', fontSize: 17, fontWeight: '700' },
          headerRight: () => <HeaderUserIcon />,
        }}
      />
      <Dashboard />
    </>
  )
}
```

Why these specific options:

- `headerTitleAlign: 'left'` — "Chicago Transit Tracker" is 24 characters; centered on a 375pt screen with a right-side icon it would wrap or truncate. Left-aligned matches the aesthetic of CTA/Metra detail headers and gives more room.
- White title — root Stack uses a transparent header over the dashboard's `#0f0f1e` background, so white is the only readable color. We don't override `headerTransparent`/`headerStyle` — they're inherited from the global Stack and stay transparent, which is what we want.
- We do **not** set `headerLeft` here. The global `headerLeft: () => <HeaderBackButton />` stays in effect, but `HeaderBackButton` returns `null` when `!navigation.canGoBack()` (`HeaderBackButton.tsx:8`), so on the root home screen nothing renders on the left. Good.

### 3. Remove `DashboardHeader`

- Delete the `<DashboardHeader />` line in `apps/mobile/components/dashboard/Dashboard.tsx:16` and the matching import on line 3.
- Delete the file `apps/mobile/components/dashboard/DashboardHeader.tsx`.
- Delete the file `apps/mobile/__tests__/components/dashboard/DashboardHeader.test.tsx`.

The dashboard's `ScrollView` already gets `paddingTop: headerInset + 8` from `useNavHeaderInset()` (`Dashboard.tsx:14`), so the first remaining child (`<FavoriteTrains />`) will sit just below the new app bar without any further spacing changes.

### 4. Tests

**Update** `apps/mobile/__tests__/components/dashboard/Dashboard.test.tsx`:

- Remove the `jest.mock('../../../components/dashboard/DashboardHeader', ...)` block (lines 10–17).
- Remove the `expect(getByTestId('dash-header')).toBeTruthy()` assertion (line 54).

**Add** `apps/mobile/__tests__/components/HeaderUserIcon.test.tsx`. Mirror the patterns in `DashboardHeader.test.tsx`:

- Mocks `../../lib/AuthContext` with a controllable `useAuth`
- Mocks `expo-router`'s `useRouter` with a `push` spy
- Cases:
  1. `loading: true` → renders nothing (use `queryByLabelText` to assert absence of both `Sign in` and `Profile`)
  2. signed out → renders icon labeled `Sign in`, press routes to `/auth`
  3. signed in → renders icon labeled `Profile`, press routes to `/profile`

## Critical files

| File | Action |
|---|---|
| `apps/mobile/components/HeaderUserIcon.tsx` | Create |
| `apps/mobile/app/index.tsx` | Add `<Stack.Screen>` + `HeaderUserIcon` |
| `apps/mobile/components/dashboard/Dashboard.tsx` | Drop `DashboardHeader` import + render |
| `apps/mobile/components/dashboard/DashboardHeader.tsx` | Delete |
| `apps/mobile/__tests__/components/dashboard/DashboardHeader.test.tsx` | Delete |
| `apps/mobile/__tests__/components/dashboard/Dashboard.test.tsx` | Drop DashboardHeader mock + assertion |
| `apps/mobile/__tests__/components/HeaderUserIcon.test.tsx` | Create |
| `CLAUDE.md` | Update mobile project structure: remove `DashboardHeader.tsx`, add `HeaderUserIcon.tsx`. (Note: the existing CLAUDE.md mobile section is already stale — references a non-existent `(tabs)` group, `HeaderUserIcon` line for root layout, etc. Fixing the full staleness is out of scope; just update the two lines this PR touches.) |

## Reuse notes

- `HeaderBackButton.tsx` is the visual template for `HeaderUserIcon` — same circle, same backdrop, same hit slop. Don't introduce a different button style.
- `useAuth()` and `useRouter()` are the same hooks `DashboardHeader` uses today — behavior parity is automatic.
- Routes `/auth` and `/profile` already exist (`apps/mobile/app/auth.tsx`, `apps/mobile/app/profile.tsx`).

## Verification

1. **Unit tests** — from repo root: `pnpm test:mobile`. Expect the new `HeaderUserIcon` test, updated `Dashboard` test, and removed `DashboardHeader` test all green; full suite zero failures.
2. **Lint** — `pnpm lint:mobile` clean.
3. **iOS simulator** — `pnpm run:ios`. On the My Trains tab:
   - Header bar reads "Chicago Transit Tracker" on the left
   - A circular person icon appears on the right
   - Tapping the icon while signed out opens the auth modal
   - Sign in (any provider), tap the icon again, lands on the profile screen
   - The old in-page greeting and pill button are gone; the favorites sections sit directly below the header with no extra gap
4. **Android emulator** — `pnpm run:android`, same checks. Confirm `headerTitleAlign: 'left'` renders correctly (Android default is already left, iOS default is centered — this option enforces left on both).
5. **Sign-out flow** — sign out from the profile screen, return to dashboard, confirm the right-side icon switches back to the outline glyph and routes to `/auth`.

## Out of scope

- Showing the user's `photoUrl` as an avatar in the header when signed in. Future enhancement; keep parity with current text-pill behavior for now.
- Touching the empty header on CTA / Metra index tabs. Same staleness exists there but the user only asked about the dashboard.
- Reconciling the broader CLAUDE.md mobile-section staleness (no `(tabs)` group, etc.).
