# Plan — Actually Fix the iOS 26 Liquid Glass Header Pill

## Context

We shipped a fix in PR [#129](https://github.com/reedling78/chicago-transit-tracker/pull/129) that routed every header button through `unstable_headerLeftItems` / `unstable_headerRightItems` with `{ type: 'custom', element, hidesSharedBackground: true }`. The user reports that on a real iOS 26 device the translucent glass pill is **still** behind the back chevron and favorite heart — the change had zero visible effect.

I diagnosed the root cause today by reading the source of every link in the chain:

1. ✅ `@react-navigation/native-stack@7.14.10` correctly reads `unstable_headerLeftItems` / `unstable_headerRightItems` and forwards `hidesSharedBackground` to `<ScreenStackHeaderLeftView>` / `<ScreenStackHeaderRightView>` ([`useHeaderConfigProps.js:273, 322`](node_modules/@react-navigation/native-stack/lib/module/views/useHeaderConfigProps.js)).
2. ✅ `expo-router@6.0.23` forwards screen options through to the real `@react-navigation/native-stack` (its fork at [`node_modules/expo-router/build/fork/native-stack/`](node_modules/expo-router/build/fork/native-stack/) only wraps the navigator, not the header views).
3. ❌ **`react-native-screens@4.16.0` silently drops the prop**. I grepped every file under [`node_modules/react-native-screens/ios/`](node_modules/react-native-screens/ios/) — `hidesSharedBackground` does **not appear once**. The TypeScript types accept it, JS spreads it into `...rest`, and then the iOS native layer never sees it. So nothing ever sets `UIBarButtonItem.hidesSharedBackground = true` on UIKit, and iOS 26 keeps drawing the Liquid Glass pill.

The native iOS implementation actually exists — it just shipped in `react-native-screens@4.17.0` (2025-10-15) via [PR #2987](https://github.com/software-mansion/react-native-screens/pull/2987). Latest stable is `4.25.1` (2026-05-18). We're one minor version behind the fix and nine minor versions behind latest. Expo SDK 54 pins `~4.16.0`, but the pin is a recommendation, not a hard constraint; staying on the 4.x major is fine.

**Intended outcome:** upgrade `react-native-screens` to a version that actually wires `hidesSharedBackground` through to UIKit. The code we already shipped in PR #129 becomes effective the moment the upgrade lands. On a real iOS 26 device, the glass pill disappears from every header button (back, hamburger, favorite heart).

## On the "should we switch UI frameworks?" question

**A UI framework switch (Tamagui, gluestack, NativeBase, NativeWind, etc.) would not fix this and would be a massive yak shave.** UI frameworks ship components (buttons, cards, modals, typography). The Liquid Glass pill is drawn by **`UINavigationBar`**, a native iOS class invoked by `react-native-screens` (the *navigation* library). UI frameworks don't touch navigation. Switching them would change every screen's look without going near the root cause.

The chain that matters is: `expo-router` → `@react-navigation/native-stack` → `react-native-screens` → UIKit `UINavigationBar`. The bug is one link in that chain (`react-native-screens@4.16.0` missing native plumbing) and the fix is a version bump in that same link. Keep everything else.

If after the upgrade the glass pill *still* shows up (truly unexpected — the iOS code in 4.17+ is exactly the call we need), the documented fallback is "Approach 2" below.

## Approach 1 — Upgrade `react-native-screens` (recommended)

### Step 1 — Bump the dependency

Edit [`apps/mobile/package.json`](apps/mobile/package.json):

```diff
- "react-native-screens": "~4.16.0",
+ "react-native-screens": "~4.25.1",
```

Then from the repo root:

```bash
pnpm install
```

This updates `pnpm-lock.yaml`. Expect a single root-level dep change; no transitive surprises (we already verified the JS API for `unstable_headerLeftItems` / `hidesSharedBackground` exists in our installed `@react-navigation/native-stack@7.14.10`, which expects 4.x screens).

### Step 2 — Rebuild iOS native

`react-native-screens` ships Swift / Obj-C++ that compiles into the iOS app. A JS-only Metro reload will NOT pick up the change. You must rebuild:

```bash
cd apps/mobile
npx expo prebuild --platform ios --clean
cd ios && pod install && cd ..
```

If `npx expo prebuild` complains about a managed-workflow / bare-workflow mismatch, the alternative is `cd ios && pod install` then `npx expo run:ios --device <id>` which builds via Xcode and links the new pod.

### Step 3 — Suppress / accept the Expo bundled-modules warning

`expo install --check` or `expo doctor` may warn that `react-native-screens@4.25.1` is outside the `~4.16.0` Expo SDK 54 pin. Two acceptable resolutions:

- **Accept and document** (simplest): add a comment to `apps/mobile/package.json` noting we are intentionally ahead of SDK 54's pin to pick up the iOS 26 `hidesSharedBackground` implementation. This is a common practice and SDK 54 + screens 4.25.1 is a known-working combination in many production apps.
- **Pin via `expo.install.exclude`** (optional): add `{ "expo": { "install": { "exclude": ["react-native-screens"] } } }` to `apps/mobile/package.json` to silence the doctor warning without changing the version.

Document the choice in [`CLAUDE.md`](CLAUDE.md) so future contributors don't "fix" the version mismatch back to the SDK pin.

### Step 4 — Verify

- `pnpm --filter mobile test` — should still pass (no JS code changes).
- `pnpm --filter mobile run lint` — should still pass.
- `pnpm --filter @ctt/web build` — unaffected, sanity check.
- Build to the booted iOS 26 simulator (iPhone 17 Pro, UDID `39F0DFE7-9F12-4363-BD83-3C32A938C24E` per the prior session) via `npx expo run:ios --device 39F0DFE7-…`. **Confirm visually**: the back chevron, the hamburger on the home screen, and the favorite heart on every detail screen render with no glass pill.
- Distribute via Firebase App Distribution: `pnpm --filter mobile run distribute:ios`. Install on the user's real iOS 26 device and confirm the pill is gone there too. The simulator alone is insufficient evidence — that's exactly the trap we fell into last time (different simulators booted on different iOS versions masked the issue).

### Critical files

- `apps/mobile/package.json` — version bump
- `pnpm-lock.yaml` — regenerated by pnpm install
- `apps/mobile/ios/Podfile.lock` — regenerated by pod install
- `CLAUDE.md` — short note that screens 4.17+ is required for the iOS 26 Liquid Glass opt-out, so don't downgrade

No source code changes. The `unstable_headerLeftItems` / `unstable_headerRightItems` calls in [`apps/mobile/lib/headerItems.ts`](apps/mobile/lib/headerItems.ts) and every screen's `<Stack.Screen options={{ ... }}>` block are already correct — they were correct in PR #129 — and they finally start working once the native layer honors `hidesSharedBackground`.

## Approach 2 — Custom in-app header (fallback if Approach 1 somehow doesn't work)

Only fall back to this if Approach 1's simulator + device verification still shows the pill, which would be very unexpected.

1. Set `headerShown: false` on the entire `(app)` Stack in [`apps/mobile/app/(app)/_layout.tsx`](apps/mobile/app/(app)/_layout.tsx).
2. Create `apps/mobile/components/AppHeader.tsx` — a real component using `useSafeAreaInsets()` for top inset, a 44pt header row, slots for left (back) / title / right, and a 1px hairline bottom border.
3. Update all 12 screens under `apps/mobile/app/(app)/` (`index.tsx`, `cta/{index,alerts}.tsx`, `cta/[line].tsx`, `cta/station/[station].tsx`, `metra/{index,alerts}.tsx`, `metra/[line]/index.tsx`, `metra/[line]/train/[trainNumber].tsx`, `metra/station/[station].tsx`, `terms.tsx`, `privacy.tsx`) to render `<AppHeader title={...} right={...} />` at the top of their body.
4. Delete [`apps/mobile/lib/headerItems.ts`](apps/mobile/lib/headerItems.ts) and [`apps/mobile/__tests__/lib/headerItems.test.tsx`](apps/mobile/__tests__/lib/headerItems.test.tsx); revert the `unstable_*` plumbing in the 7 screen tests and 7 screen files.
5. Tradeoff: lose iOS native back-swipe edge animation (have to opt back in with `gestureEnabled: true` + `headerShown: false` on each screen) and lose a tiny amount of native polish, but bypass `UINavigationBar` entirely so iOS 26 cannot render the glass pill no matter what.

This is the nuclear-option escape hatch and is documented here only so it's not improvised under pressure if Approach 1 surprises us.

## Verification

End-to-end test for Approach 1:

1. From a clean working tree: `git status` is clean (we are committing the bump + lockfile + pod lockfile).
2. `pnpm install` runs to completion.
3. `pnpm --filter mobile test` → 463 tests pass.
4. `pnpm --filter mobile run lint` → clean.
5. `cd apps/mobile && npx expo run:ios --device 39F0DFE7-9F12-4363-BD83-3C32A938C24E` builds and installs.
6. Visual: header buttons are flat on the iOS 26 simulator.
7. `pnpm --filter mobile run distribute:ios` produces a Firebase App Distribution build. The user installs it on their real iOS 26 device. Visual: header buttons are flat. Add a note to the PR description with a screenshot from the real device, captioned, to keep this from regressing.
