# DashboardHeader — right-aligned auth button when logged in

## Context

When a user is signed in on the mobile dashboard, `apps/mobile/components/dashboard/DashboardHeader.tsx` renders a `Welcome back, <First>` greeting and (optionally) a "No favorites yet" card. There's no inline path to the profile or sign-out from this surface — today the only way to reach Profile is via the pre-existing native nav-header, which is *hidden* on the home screen (`app/index.tsx` sets `headerShown: false`). Users on the dashboard have no visible affordance to manage their account.

The fix: surface a small profile/auth icon button on the right side of the dashboard greeting row. Tapping it navigates to `/profile` (which already hosts sign-out + favorites manager). The unauthenticated hero already has Sign-up / Log-in CTAs, so the new button is purely the logged-in affordance.

A complete, properly-styled component already exists for this exact slot — `apps/mobile/components/HeaderUserIcon.tsx` — and it is currently **built but unused** anywhere in the app. Reusing it is the right move.

## Approach

1. Restructure the authed branch of `DashboardHeader` so the heading and a trailing `HeaderUserIcon` sit in a single horizontal row.
2. Reuse `HeaderUserIcon` as-is (no API changes); it already pulls `useAuth()` internally, returns `null` while loading, and routes to `/profile` for signed-in users.
3. Update the existing test for `DashboardHeader` (or add one if missing) to assert the icon button renders in the authed branch and is absent in the unauthed branch.

The unauthed branch is untouched — it already shows Sign-up / Log-in CTAs.

## Critical files

- `apps/mobile/components/dashboard/DashboardHeader.tsx` — wrap the heading in a row container, append `<HeaderUserIcon />`.
- `apps/mobile/components/HeaderUserIcon.tsx` — reused as-is (no edits expected). Already handles `useAuth()`, accessibility, and routing.
- `apps/mobile/__tests__/components/dashboard/DashboardHeader.test.tsx` (or wherever the existing test lives — see Step 3) — extend test coverage.

## Steps

### 1. Restructure the authed return in `DashboardHeader.tsx`

Today (lines 48-50):

```tsx
<View style={styles.authedHeader}>
  <Text style={styles.heading}>{heading}</Text>
  {favorites.length === 0 && ( /* empty card */ )}
</View>
```

After:

```tsx
<View style={styles.authedHeader}>
  <View style={styles.headingRow}>
    <Text style={styles.heading}>{heading}</Text>
    <HeaderUserIcon />
  </View>
  {favorites.length === 0 && ( /* empty card unchanged */ )}
</View>
```

Add to the StyleSheet:

```ts
headingRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 12,
},
```

And drop `marginBottom: 12` from the existing `heading` style — the row container now owns the bottom spacing so the icon vertically centers against the text without inheriting bottom padding from the heading. The visual gap to the optional empty-card stays the same (12 px).

Add the import: `import HeaderUserIcon from '../HeaderUserIcon'`.

### 2. Confirm `HeaderUserIcon` looks right inline

`HeaderUserIcon`'s outer `touchable` has `marginRight: 8` baked in, originally intended for use as a nav-header `headerRight`. Inline on the dashboard this nudges the icon 8 px in from the row's right edge — acceptable padding, leave as-is. The 44×44 hit area is preserved (touch targets must be ≥ 44 px per `code-style.md`).

The icon already returns `null` while `loading`, so there's no flash on app boot. It routes to `/profile` for signed-in users — which is the only branch this row ever renders in — so the `'/auth'` fallback never triggers from here. No conditional gating needed in `DashboardHeader`.

### 3. Test

Find the existing test file for `DashboardHeader`:

```
apps/mobile/__tests__/components/dashboard/DashboardHeader.test.tsx   (most likely)
```

If it exists, extend it. If not, create one mirroring the patterns in `apps/mobile/__tests__/components/dashboard/Dashboard.test.tsx` (or whichever sibling exists) — including the `useAuth` and `useFavoritesStore` mocks already set up there.

Cover three behaviors:

- **Authed + favorites empty:** heading text renders, the `HeaderUserIcon` is present (`getByA11yLabel('Profile')`), the empty-favorites card renders.
- **Authed + favorites non-empty:** heading + `HeaderUserIcon` render, no empty card.
- **Unauthed:** the unauthed hero renders, no `HeaderUserIcon` (nav target is the auth CTAs, not the icon — assert with `queryByA11yLabel('Profile')` is null).

Mock `expo-router`'s `useRouter` and `useAuth` the same way they are already mocked in sibling tests.

## Verification

1. `pnpm -w run test` — passes with zero warnings/errors.
2. `pnpm -w run lint` — clean.
3. Mobile manual smoke (Simulator):
   - Already-installed dev build at `apps/mobile/ios/build/.../ChicagoTransitTracker.app` from this session is fine; restart Metro if needed (`cd apps/mobile && npx expo start --port 8081`).
   - Sign in, land on the home dashboard. Confirm:
     - The "Welcome back, <First>" heading sits on the left of the row.
     - A circular person icon sits on the right of the row, vertically centered.
     - Tapping the icon navigates to `/profile`.
     - Sign out, return to dashboard. The unauthed hero shows the existing Sign-up / Log-in buttons; **no** profile icon appears in that branch.
4. (Optional) Verify on Android via `npx expo run:android` if Android dev environment is set up — same layout, same a11y label.

## Out of scope

- Web `DashboardHeader` (untouched — `Navbar` already has `UserMenu` on every page).
- Renaming/refactoring `HeaderUserIcon` for richer states (showing initials, photo). Today's icon is a clean placeholder; a proper avatar chip can be a follow-up.
- Adding a sign-out shortcut directly inline on the dashboard (still routed through `/profile`).
