# Plan — Disable iOS 26 Liquid Glass on Mobile Header Buttons

## Context

On a real iOS 26 device, the mobile app's header buttons — the back chevron (`HeaderBackButton`), the hamburger (`HeaderMenuButton`), and the favorite heart (`FavoriteButton` used in `headerRight` on line / station / train detail screens) — render with a translucent rounded "glass" pill behind each icon. On the iOS simulator (running an older iOS) the same buttons render flat. The flat look is the intended design (per `apps/mobile/CLAUDE.md`: "flat icons in text.primary with no scrim circle and no text shadow").

The pill is **not** coming from our button components themselves — `HeaderBackButton`, `HeaderMenuButton`, and `FavoriteButton` are all bare 44–48 px `Pressable`s with no `backgroundColor`, `borderRadius`, or `shadow*` styling. It's added by iOS 26's native `UINavigationBar`, which automatically wraps anything passed through `headerLeft` / `headerRight` in a `UIBarButtonItem` with the new "Liquid Glass" shared background. `@react-navigation/native-stack` (which `expo-router`'s `Stack` uses on iOS) renders the legacy `headerLeft` / `headerRight` props as glass-backed bar button items on iOS 26, with no opt-out from those props.

The new `unstable_headerLeftItems` / `unstable_headerRightItems` API in `@react-navigation/native-stack` v7 (installed: `7.14.10`) exposes a per-item `hidesSharedBackground: boolean` flag — explicitly documented (`node_modules/@react-navigation/native-stack/lib/typescript/src/types.d.ts:851-857`) as: "Whether the background this item may share with other items in the bar should be hidden. Only available from iOS 26.0 and later." This is the official, supported way to suppress the glass pill.

Intended outcome: on iOS 26 devices, header buttons render flat (matching the simulator and matching `apps/mobile/CLAUDE.md`'s design intent). Android and older iOS behavior is unchanged.

## Approach

Switch every header button (back, menu, favorite) from `headerLeft` / `headerRight` to `unstable_headerLeftItems` / `unstable_headerRightItems` on iOS using a small platform-aware helper. Android continues to use `headerLeft` / `headerRight` (the `unstable_*` API is iOS-only). Each item is `type: 'custom'` (so it renders our existing React component and isn't collapsed into an iOS 26 overflow menu) with `hidesSharedBackground: true`.

This is a surgical, low-risk change: the existing button components (`HeaderBackButton`, `HeaderMenuButton`, `FavoriteButton`) keep their current implementations and are still rendered as-is — we're only changing the navigator-level prop that hosts them.

### Step 1 — Add a platform-aware header-item helper

New file: **`apps/mobile/lib/headerItems.ts`**

```ts
import { Platform } from 'react-native'
import type { ReactElement } from 'react'
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack'

/**
 * Render a single custom element on the left side of the native header.
 * On iOS uses `unstable_headerLeftItems` with `hidesSharedBackground: true`
 * to suppress the iOS 26 Liquid Glass pill. On Android falls back to `headerLeft`.
 */
export function headerLeftItem(
  element: ReactElement | null,
): Pick<NativeStackNavigationOptions, 'headerLeft' | 'unstable_headerLeftItems'> {
  if (element === null) return { headerLeft: () => null }
  return Platform.OS === 'ios'
    ? {
        unstable_headerLeftItems: () => [
          { type: 'custom', element, hidesSharedBackground: true },
        ],
      }
    : { headerLeft: () => element }
}

export function headerRightItem(
  element: ReactElement,
): Pick<NativeStackNavigationOptions, 'headerRight' | 'unstable_headerRightItems'> {
  return Platform.OS === 'ios'
    ? {
        unstable_headerRightItems: () => [
          { type: 'custom', element, hidesSharedBackground: true },
        ],
      }
    : { headerRight: () => element }
}
```

Notes:
- `hidesSharedBackground` is ignored by iOS < 26 (no glass exists there), so older iOS devices and simulators are unaffected.
- `type: 'custom'` items are explicitly excluded from iOS 26's automatic right-side menu collapsing (per the type docs at `types.d.ts:1110-1113`), which is the behavior we want for a single favorite-heart button.

### Step 2 — Update the Stack layout to use the helper for the back button

File: **`apps/mobile/app/(app)/_layout.tsx`**

Replace the static `headerLeft: () => <HeaderBackButton />` in `screenOptions` with the helper. `HeaderBackButton` already returns `null` when `!navigation.canGoBack()`, so the iOS items array will contain a `custom` item whose `element` is `<HeaderBackButton />` — `HeaderBackButton` handling the root-screen no-back case internally is fine.

```tsx
screenOptions={{
  headerTransparent: true,
  headerStyle: { backgroundColor: 'transparent' },
  headerBackground: () => <AppHeaderBackground />,
  headerShadowVisible: false,
  headerTitleAlign: 'left',
  headerTitleStyle: { color: theme.colors.text.primary, fontWeight: '700' },
  title: '',
  headerBackVisible: false,
  ...headerLeftItem(<HeaderBackButton />),
}}
```

Keep `headerBackVisible: false` — it suppresses the native back chevron that would otherwise also render on iOS.

### Step 3 — Update each `headerRight` call site

Six call sites currently set `headerRight` (found via `grep -rn "headerRight" apps/mobile/`):

| File | Current code | Replace with |
|---|---|---|
| `apps/mobile/app/(app)/index.tsx:12` | `headerRight: () => <HeaderMenuButton />` | `...headerRightItem(<HeaderMenuButton />)` |
| `apps/mobile/app/(app)/cta/[line].tsx:29` | `headerRight: () => <FavoriteButton type="line" id={line.slug} />` | `...headerRightItem(<FavoriteButton type="line" id={line.slug} />)` |
| `apps/mobile/app/(app)/metra/[line]/index.tsx:30` | `headerRight: () => <FavoriteButton type="line" id={line.slug} />` | `...headerRightItem(<FavoriteButton type="line" id={line.slug} />)` |
| `apps/mobile/app/(app)/cta/station/[station].tsx:36` | `headerRight: () => <FavoriteButton type="station" id={station.slug} />` | `...headerRightItem(<FavoriteButton type="station" id={station.slug} />)` |
| `apps/mobile/app/(app)/metra/station/[station].tsx:37` | `headerRight: () => <FavoriteButton type="station" id={station.slug} />` | `...headerRightItem(<FavoriteButton type="station" id={station.slug} />)` |
| `apps/mobile/app/(app)/metra/[line]/train/[trainNumber].tsx:30` | `headerRight: () => <FavoriteButton type="train" id={\`${lineSlug}_${train}\`} />` | `...headerRightItem(<FavoriteButton type="train" id={\`${lineSlug}_${train}\`} />)` |

Each file gets a single import (`import { headerRightItem } from '../../lib/headerItems'`, with the relative path adjusted per file depth) and a one-line swap inside the screen's `<Stack.Screen options={{ ... }}>` block.

## Critical Files

- **New:** `apps/mobile/lib/headerItems.ts` — the helper
- `apps/mobile/app/(app)/_layout.tsx` — swap `headerLeft` for `headerLeftItem(...)` in `screenOptions`
- `apps/mobile/app/(app)/index.tsx` — hamburger
- `apps/mobile/app/(app)/cta/[line].tsx` — favorite heart
- `apps/mobile/app/(app)/metra/[line]/index.tsx` — favorite heart
- `apps/mobile/app/(app)/cta/station/[station].tsx` — favorite heart
- `apps/mobile/app/(app)/metra/station/[station].tsx` — favorite heart
- `apps/mobile/app/(app)/metra/[line]/train/[trainNumber].tsx` — favorite heart

No changes to the button components themselves (`HeaderBackButton.tsx`, `HeaderMenuButton.tsx`, `FavoriteButton.tsx`, `PressableButton.tsx`, `AppHeaderBackground.tsx`) — they are already flat and correct. No changes to the web app.

## Verification

1. **Build to a real iOS 26 device** (`pnpm --filter mobile run distribute:ios` or `npx expo run:ios --device`) and confirm:
   - Home screen: hamburger renders flat (no pill).
   - Any line, station, or train detail screen: back chevron and favorite heart render flat.
   - Tapping the back chevron still goes back; tapping the heart still toggles favorite + shows fill animation; tapping the hamburger still opens the Menu drawer.
2. **Build to the iOS simulator** (`pnpm run:ios`) and confirm appearance is unchanged from today (still flat).
3. **Build to Android** (`pnpm run:ios` → swap simulator, or `pnpm run:android`) and confirm the back chevron, hamburger, and favorite heart still render and function — Android uses the `headerLeft` / `headerRight` fallback branch in `headerItems.ts`.
4. **Run** `pnpm --filter mobile run lint` and `pnpm --filter mobile test` — both must pass with zero warnings.

## Rollback

If the `unstable_*` API misbehaves on an older iOS version we still support (e.g., button doesn't render at all, or haptics on `FavoriteButton` stop firing because the touch is intercepted by the native bar item wrapper), the fallback is to set `headerShown: false` on the Stack and render a fully custom in-app header per screen using `AppHeaderBackground` + the existing button components. That's a larger change and is not the first move.
