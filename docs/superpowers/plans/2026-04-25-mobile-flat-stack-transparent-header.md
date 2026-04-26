# Mobile navigation: drop tabs, move to a single transparent stack

## Context

The mobile app currently uses an expo-router setup with a bottom tab bar (`apps/mobile/app/(tabs)/_layout.tsx`) wrapping three tabs (My Trains, CTA, Metra), each of which has its own nested `Stack` navigator. Every screen renders a solid dark header (`#1a1a2e`) with a title and a `HeaderUserIcon` on the right.

This plan rethinks navigation as one flat Stack:

- **No tabs.** A single root Stack pushes/pops every screen. The Dashboard ("My Trains") becomes the home at `/`; CTA and Metra service browsing happens by tapping cards on the dashboard, which already exist via `DashboardHero`.
- **Transparent app bar with no title text.** Navigator headers float over content so full-bleed `PageHeader` photos extend edge-to-edge under them.
- **Back button only when the stack can go back.** Implemented as a custom `headerLeft` that checks `navigation.canGoBack()` and returns `null` at the root.
- **Circle back button.** Translucent dark circle (`rgba(0,0,0,0.45)`) with a white `chevron-back` glyph (Ionicons), no text label, 36×36 circle inside a 44×44 touch target.

Same treatment applies to `auth` (modal) and `profile`. `HeaderUserIcon` stays on the right of every screen.

## File changes

### Routes (file system moves)

The `(tabs)` group is deleted. Every file under `apps/mobile/app/(tabs)/` moves up one level into `apps/mobile/app/`, except `my-trains.tsx`, which becomes the new `index.tsx`.

| From | To |
| --- | --- |
| `apps/mobile/app/(tabs)/my-trains.tsx` | `apps/mobile/app/index.tsx` (overwrites the current Redirect) |
| `apps/mobile/app/(tabs)/cta/index.tsx` | `apps/mobile/app/cta/index.tsx` |
| `apps/mobile/app/(tabs)/cta/[line].tsx` | `apps/mobile/app/cta/[line].tsx` |
| `apps/mobile/app/(tabs)/cta/alerts.tsx` | `apps/mobile/app/cta/alerts.tsx` |
| `apps/mobile/app/(tabs)/cta/station/[station].tsx` | `apps/mobile/app/cta/station/[station].tsx` |
| `apps/mobile/app/(tabs)/metra/index.tsx` | `apps/mobile/app/metra/index.tsx` |
| `apps/mobile/app/(tabs)/metra/[line]/index.tsx` | `apps/mobile/app/metra/[line]/index.tsx` |
| `apps/mobile/app/(tabs)/metra/[line]/train/[trainNumber].tsx` | `apps/mobile/app/metra/[line]/train/[trainNumber].tsx` |
| `apps/mobile/app/(tabs)/metra/alerts.tsx` | `apps/mobile/app/metra/alerts.tsx` |
| `apps/mobile/app/(tabs)/metra/station/[station].tsx` | `apps/mobile/app/metra/station/[station].tsx` |

Files **deleted** outright:

- `apps/mobile/app/(tabs)/_layout.tsx`
- `apps/mobile/app/(tabs)/cta/_layout.tsx`
- `apps/mobile/app/(tabs)/metra/_layout.tsx`

After the moves, the `(tabs)` directory is empty and removed.

### New file: `apps/mobile/components/HeaderBackButton.tsx`

A small client component used as `headerLeft`:

- `useNavigation()` from `@react-navigation/native` (re-exported by expo-router).
- If `navigation.canGoBack()` is `false`, return `null` — that hides the back button on the home screen.
- Otherwise render a `TouchableOpacity` (44×44 hit area, `marginLeft: 8`) containing a 36×36 circular `View`:
  - `backgroundColor: 'rgba(0,0,0,0.45)'`
  - `borderRadius: 18`
  - `alignItems: 'center'`, `justifyContent: 'center'`
- Inside the circle, an `Ionicons` `chevron-back` glyph at size 22, color `#fff`.
- `accessibilityLabel="Back"`, `accessibilityRole="button"`.
- `onPress={() => navigation.goBack()}`.

`@expo/vector-icons/Ionicons` is already a dependency (used in the current tab bar at `apps/mobile/app/(tabs)/_layout.tsx:27-48`), so no new packages.

### Edit: `apps/mobile/app/_layout.tsx`

Replace the current Stack `screenOptions` and `Stack.Screen` declarations:

```tsx
<Stack
  screenOptions={{
    headerTransparent: true,
    headerStyle: { backgroundColor: 'transparent' },
    headerShadowVisible: false,
    headerTitle: () => null,
    headerBackVisible: false,
    headerLeft: () => <HeaderBackButton />,
    headerRight: () => <HeaderUserIcon />,
  }}
>
  <Stack.Screen name="auth" options={{ presentation: 'modal' }} />
</Stack>
```

The `(tabs)` `Stack.Screen` registration goes away. `auth` keeps `presentation: 'modal'` but loses its title. `profile`, `cta/*`, and `metra/*` need no explicit registration — file-based routing picks them up and they inherit the transparent screen options.

### Edit: `apps/mobile/app/index.tsx`

Replace the existing one-line `Redirect` with the contents of the old `my-trains.tsx`:

```tsx
import Dashboard from '../components/dashboard/Dashboard'

export default function HomeScreen() {
  return <Dashboard />
}
```

### Edit: per-screen header overrides — drop titles

Eight screens currently render `<Stack.Screen options={{ title: ... }} />` to set a title. Per the spec (no title text), remove the `title` from each. If the screen has nothing else in `Stack.Screen`, drop the JSX entirely; otherwise keep just the remaining options.

Files to edit:

- `apps/mobile/app/cta/[line].tsx` (was `(tabs)/cta/[line].tsx:22`)
- `apps/mobile/app/cta/alerts.tsx` (was `(tabs)/cta/alerts.tsx:8`)
- `apps/mobile/app/cta/station/[station].tsx` (was `(tabs)/cta/station/[station].tsx:24`)
- `apps/mobile/app/metra/[line]/index.tsx` (was `(tabs)/metra/[line]/index.tsx:22`)
- `apps/mobile/app/metra/alerts.tsx` (was `(tabs)/metra/alerts.tsx:8`)
- `apps/mobile/app/metra/station/[station].tsx` (was `(tabs)/metra/station/[station].tsx:27`)
- `apps/mobile/app/metra/[line]/train/[trainNumber].tsx` (was `(tabs)/metra/[line]/train/[trainNumber].tsx:15`)
- `apps/mobile/app/auth.tsx` — already has no title in the file (root layout sets it); root layout no longer sets one, so nothing to change here beyond what's done in `_layout.tsx`.
- `apps/mobile/app/profile.tsx` — same.

The user-visible title for browse pages (line list, station, train) already comes from `PageHeader` in the page body (`apps/mobile/components/PageHeader.tsx:44`), so no information is lost there.

### Edit: route string updates (~10 spots)

All `/(tabs)/...` literals in client code become `/...`:

| File | From | To |
| --- | --- | --- |
| `apps/mobile/components/dashboard/FavoriteTrains.tsx:23` | `` `/(tabs)/metra/${lineSlug}/train/${trainNumber}` `` | `` `/metra/${lineSlug}/train/${trainNumber}` `` |
| `apps/mobile/components/dashboard/FavoriteStations.tsx:40` | `/(tabs)/${line.service}/station/${station.slug}` and `/(tabs)/${...}` fallback | drop `/(tabs)` prefix |
| `apps/mobile/components/dashboard/FavoriteLines.tsx:34` | `` `/(tabs)/${line.service}/${line.slug}` `` | `` `/${line.service}/${line.slug}` `` |
| `apps/mobile/components/dashboard/DashboardHero.tsx:34, 56, 62` | `/(tabs)/cta`, `/(tabs)/metra` | `/cta`, `/metra` |
| `apps/mobile/app/profile.tsx:73` | `/(tabs)/my-trains` | `/` |
| `apps/mobile/app/cta/index.tsx:32` (post-move) | `/(tabs)/cta/alerts` | `/cta/alerts` |
| `apps/mobile/app/cta/index.tsx:39` (post-move) | `` `/(tabs)/cta/${item.slug}` `` | `` `/cta/${item.slug}` `` |
| `apps/mobile/app/metra/index.tsx:32` (post-move) | `/(tabs)/metra/alerts` | `/metra/alerts` |
| `apps/mobile/app/metra/index.tsx:39` (post-move) | `` `/(tabs)/metra/${item.slug}` `` | `` `/metra/${item.slug}` `` |
| Any `stationHrefPrefix` props passed into `apps/mobile/components/StationTimeline.tsx:44` | values that include `/(tabs)/` | drop the prefix |

Do a final `grep -rn "/(tabs)/" apps/mobile/` to catch any stragglers.

### Edit: content padding for non-`PageHeader` screens

With `headerTransparent: true`, content renders under the header. Screens that already use `PageHeader` (cta/index, metra/index, station/[station]) want this — the photo flows under the back button and user icon, which is the entire point of the redesign.

Screens that **don't** use `PageHeader` need to inset their first child by the header height. Use `useHeaderHeight()` from `@react-navigation/elements` (already pulled in transitively by expo-router) and apply it as `paddingTop` to the outermost content view:

- `apps/mobile/components/dashboard/Dashboard.tsx` — the new home; add header-height inset to its root `ScrollView`.
- `apps/mobile/app/cta/alerts.tsx` — alerts list.
- `apps/mobile/app/metra/alerts.tsx` — alerts list.
- `apps/mobile/app/auth.tsx` — sign-in form.
- `apps/mobile/app/profile.tsx` — profile content.
- `apps/mobile/app/cta/[line].tsx` — line detail (verify whether it uses PageHeader; if it does, skip; otherwise inset).
- `apps/mobile/app/metra/[line]/train/[trainNumber].tsx` — train detail (same check).

Concretely:

```tsx
import { useHeaderHeight } from '@react-navigation/elements'
// inside the component
const headerHeight = useHeaderHeight()
// pass paddingTop: headerHeight to the outer container's contentContainerStyle / style
```

For `Dashboard.tsx`, this replaces any existing top padding with `headerHeight + (existing top padding)`.

### Tests

Tests live under `apps/mobile/__tests__/`. The bulk of them mock `expo-router` so route-string updates ripple in cleanly, but the following need attention:

- **Update existing**: any test that imports from `app/(tabs)/...` paths or asserts on the literal `/(tabs)/...` route strings. Specifically the dashboard tests at `apps/mobile/__tests__/components/dashboard/FavoriteTrains.test.tsx`, `FavoriteStations.test.tsx`, `FavoriteLines.test.tsx`, `DashboardHero.test.tsx` and the screen test at `apps/mobile/__tests__/screens/home.test.tsx` (which currently imports `(tabs)/my-trains.tsx` — repoint to `app/index.tsx`).
- **Add new**: `apps/mobile/__tests__/components/HeaderBackButton.test.tsx` — render with `canGoBack()` returning `true` (asserts a button is rendered with `accessibilityLabel="Back"`) and with `canGoBack()` returning `false` (asserts nothing rendered). Mock `useNavigation` from `@react-navigation/native`.

No new test for the layout file itself — expo-router's static layout is exercised implicitly by every screen test.

## Files that already do the right thing (no change needed)

- `apps/mobile/components/HeaderUserIcon.tsx` — already a self-contained `headerRight`; works against any background.
- `apps/mobile/components/PageHeader.tsx` — already full-bleed and independent of the navigator; transparent header layered on top is exactly what its design wants.
- `apps/mobile/components/dashboard/DashboardHero.tsx` — only its href strings change; the component continues to drive navigation from the home screen now that there's no tab bar to do it.

## Verification

1. **Lint + types**: `pnpm --filter mobile run lint`. Must be clean.
2. **Tests**: `pnpm --filter mobile test`. All updated tests pass; new `HeaderBackButton` test passes.
3. **iOS simulator** (`pnpm run:ios`):
   - Cold start lands on Dashboard. **No back button visible** at root, user icon visible top-right.
   - Tap the CTA hero card → CTA line list. Back button (translucent dark circle, white chevron) visible top-left over the hero photo.
   - Tap a line → station list. Back works. Tap a station → station detail. Back works.
   - From station detail, tap "Back" twice — lands back on Dashboard.
   - Repeat for Metra (line → train detail and line → station detail).
   - Visit alerts: `/cta/alerts` and `/metra/alerts` from the in-page banners. Header floats over content; content is visible (not hidden under header).
   - Tap user icon while signed out → auth modal slides up with the same circle back/close button. Sign in → modal dismisses.
   - Tap user icon while signed in → profile screen with circle back. "Sign out" returns to Dashboard.
   - Favorite a line, train, and station; navigate to each from the Dashboard's favorites sections — links resolve to non-`(tabs)` paths.
4. **Android emulator** (`pnpm run:android`): same smoke pass; specifically verify the translucent circle back button reads against both the photo hero and the dark dashboard background.
5. **Grep guard**: `grep -rn "/(tabs)/" apps/mobile/` returns no matches once the migration is done.
