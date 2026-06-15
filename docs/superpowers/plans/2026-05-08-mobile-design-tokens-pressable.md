# Mobile UI: snappy interaction primitive + design tokens (round 1)

> Per project convention this content covers both the design (`docs/superpowers/specs/...-design.md`) and the implementation plan (`docs/superpowers/plans/...`). On merge, the team may split it into two files; for now it lives here as a single document so it can be reviewed end-to-end.

## Context

The mobile app's current UI has two related pain points:

1. **Header buttons feel sluggish.** [HeaderBackButton.tsx](apps/mobile/components/HeaderBackButton.tsx) uses `Pressable` with a manual `pressed && { opacity: 0.6 }`, while [HeaderUserIcon.tsx:18](apps/mobile/components/HeaderUserIcon.tsx) uses `TouchableOpacity` with the default `activeOpacity={0.2}` (slow fade) and no Android ripple. Neither has animated press feedback.
2. **Color values are scattered.** Hex literals appear in 10+ files (`PageHeader.tsx`, `cardStyles.ts`, `LineListItem.tsx`, status colors, scrim overlays). Only line identity colors are centralized (in `@ctt/shared`). There is no light mode on mobile today.

The user explicitly does **not** want a UI component library — that was considered and ruled out. They want:
- A snappy, native-feeling interaction primitive used across the app
- A centralized design token system with light + dark themes from day one
- Line components included in the migration (token chrome only; line identity colors continue to come from `@ctt/shared` for CTA branding compliance)

This plan delivers round 1 of that work: the infrastructure plus migration of the most-touched surfaces (headers, dashboard, line list). Detail screens, alerts, timetables, and auth migrate in a later round.

## Goals (in scope, round 1)

- New `PressableButton` primitive — style-agnostic wrapper around `Pressable` with consistent press feedback
- New `apps/mobile/lib/theme/` package — semantic color tokens + numeric `space`/`radius` scales, light + dark palettes, `ThemeProvider`, `useTheme()` hook
- Migrate headers, dashboard, and line list to use both
- Production behavior locked to dark mode; dev-only toggle for engineers to exercise both palettes

## Non-goals (round 1)

- No UI component library (Tamagui, Gluestack, Paper, NativeWind, restyle) — explicitly ruled out
- No user-facing theme toggle in production — gated behind `__DEV__`; ships in round 2
- No web-side changes — web keeps Tailwind; tokens live in mobile only
- No typography or shadow tokens this round (colors + radii + spacing only)
- No migration of detail screens, `MetraTrip*` components, alerts screens, timetables, auth screen, or `FavoritesManager` — those stay on hardcoded values (which match dark tokens) and migrate later

## Architecture

### `apps/mobile/lib/theme/`

```
apps/mobile/lib/theme/
├── tokens.ts            # lightTokens, darkTokens, Theme type
├── ThemeProvider.tsx    # provider + AsyncStorage persistence
├── useTheme.ts          # hook → { theme, mode, resolvedMode, setMode }
└── index.ts             # barrel export
```

**`tokens.ts`** — exports two token objects sharing one `Theme` type. Token values for **dark** match today's hardcoded mobile hex values exactly (round 1 is a refactor, not a redesign). Token values for **light** mirror the web app's existing light theme so the brand stays consistent cross-platform.

Token shape (semantic for colors, numeric for scales):

```ts
type Theme = {
  mode: 'light' | 'dark'
  colors: {
    bg:      { canvas, surface, elevated, scrim }
    text:    { primary, secondary, muted, inverse }
    border:  { subtle, strong }
    accent:  { primary, primaryFg }
    status:  { onTime, delayed, scheduled, neutral }
  }
  radius: { sm, md, lg, xl, full }              // 6, 12, 16, 24, 9999
  space:  { 1, 2, 3, 4, 5, 6, 8, 10 }            // 4, 8, 12, 16, 20, 24, 32, 40
}
```

**`ThemeProvider`** — reads stored mode (`'system' | 'light' | 'dark'`) from AsyncStorage on mount, defaults to `'system'`. Subscribes to `Appearance.addChangeListener` so system swaps update live. Resolves: stored `'system'` → system value; otherwise stored value wins.

**Round 1 production behavior:** the provider hard-locks `resolvedMode` to `'dark'` regardless of system or stored values. Round 2 removes that lock when the user-facing toggle ships.

**Dev-only toggle:** in `__DEV__` builds, the profile screen renders a three-state segmented control (System / Light / Dark) so engineers can verify both palettes. In production builds the control is not rendered.

**`useTheme()`** returns `{ theme, mode, resolvedMode, setMode }`. Components read `theme` for tokens; the toggle calls `setMode`.

### `apps/mobile/components/PressableButton.tsx`

Style-agnostic wrapper. No baked-in styling, no variant prop, no border/background. Cards, header icons, list items, chips all use it.

```tsx
<PressableButton
  onPress={…}
  feedback="default"          // "default" | "subtle" | "none"
  haptic={false}              // false | "light" | "medium" | "heavy"
  androidRipple={true}        // boolean — toggles native ripple
  hitSlop={8}
  accessibilityRole="button"
  accessibilityLabel="…"
  style={…}                   // ViewStyle | ((state) => ViewStyle)
>
  {children}
</PressableButton>
```

**Press-feedback recipe:**
- **iOS** — `react-native-reanimated` (already installed) drives a scale (`0.96` default, `0.98` for `subtle`) + opacity (`0.92`) on press in, spring back on release. Reuses the proven pattern from [FavoriteButton](apps/mobile/components/FavoriteButton.tsx).
- **Android** — native `android_ripple` on the underlying `Pressable` **plus** the same scale animation (ripple alone feels flat on solid card backgrounds).
- **Haptics** — opt-in via prop. Uses `expo-haptics` (new dep). Default off so list-heavy screens don't buzz on every tap. High-emphasis surfaces (`FavoriteButton`, primary CTAs) opt in with `haptic="light"`.

## Files to create

- `apps/mobile/lib/theme/tokens.ts`
- `apps/mobile/lib/theme/ThemeProvider.tsx`
- `apps/mobile/lib/theme/useTheme.ts`
- `apps/mobile/lib/theme/index.ts`
- `apps/mobile/components/PressableButton.tsx`
- `apps/mobile/__tests__/lib/theme.test.tsx` — provider resolution (system/light/dark, AsyncStorage round-trip, `__DEV__` lock-to-dark)
- `apps/mobile/__tests__/components/PressableButton.test.tsx` — press state, haptic invocation, ripple props, accessibility

## Files to modify

**Wire-up**
- [apps/mobile/app/_layout.tsx](apps/mobile/app/_layout.tsx) — wrap root with `ThemeProvider` (alongside existing `AuthProvider` / `QueryProvider`)
- [apps/mobile/package.json](apps/mobile/package.json) — add `expo-haptics`

**Headers**
- [apps/mobile/components/HeaderBackButton.tsx](apps/mobile/components/HeaderBackButton.tsx) — replace `Pressable` with `PressableButton`; tokenize the circle background (`scrim` overlay) and chevron color
- [apps/mobile/components/HeaderUserIcon.tsx](apps/mobile/components/HeaderUserIcon.tsx) — replace `TouchableOpacity` with `PressableButton`; tokenize circle bg + icon color
- [apps/mobile/components/PageHeader.tsx](apps/mobile/components/PageHeader.tsx) — tokenize scrim overlay, text shadow color, badge background; line-color accents stay sourced from `@ctt/shared`

**Dashboard**
- [apps/mobile/components/dashboard/cards/cardStyles.ts](apps/mobile/components/dashboard/cards/cardStyles.ts) — replace every hex with token reads (will become a hook-based factory `useCardStyles()` since tokens come from context)
- [apps/mobile/components/dashboard/cards/CardMenuButton.tsx](apps/mobile/components/dashboard/cards/CardMenuButton.tsx) — `PressableButton`
- [apps/mobile/components/dashboard/cards/LineCard.tsx](apps/mobile/components/dashboard/cards/LineCard.tsx) — `PressableButton` outer wrap + tokenize chrome (line color chip continues to use `line.color` / `line.textColor` from `@ctt/shared`)
- [apps/mobile/components/dashboard/cards/StationCard.tsx](apps/mobile/components/dashboard/cards/StationCard.tsx) — same pattern
- [apps/mobile/components/dashboard/cards/TrainCard.tsx](apps/mobile/components/dashboard/cards/TrainCard.tsx) — same pattern; status pill colors come from `theme.colors.status.*`
- [apps/mobile/components/dashboard/Dashboard.tsx](apps/mobile/components/dashboard/Dashboard.tsx) — `DashboardHeader` greeting + Profile/Sign-in CTA → `PressableButton` + tokenize
- [apps/mobile/components/dashboard/DashboardHero.tsx](apps/mobile/components/dashboard/DashboardHero.tsx) — CTA + Metra service nav cards → `PressableButton` + tokenize chrome (service identity colors from `@ctt/shared` constants)

**Line list**
- [apps/mobile/components/LineListItem.tsx](apps/mobile/components/LineListItem.tsx) — `PressableButton` + tokenize card chrome; `accentColor` prop continues to be supplied by callers from `@ctt/shared`

**Profile**
- [apps/mobile/app/profile.tsx](apps/mobile/app/profile.tsx) — when `__DEV__`, render three-state segmented control (System / Light / Dark) backed by `useTheme().setMode`. Production: no toggle UI.

**Standardization**
- [apps/mobile/components/FavoriteButton.tsx](apps/mobile/components/FavoriteButton.tsx) — port its existing scale animation onto `PressableButton` so the primitive is the single source of truth; opt in with `haptic="light"`

**Test updates** — every file with a snapshot or styling assertion gets refreshed for token-based values; React Native Testing Library tests for press behavior switch to expect the new feedback path.

## Implementation order

The plan is executable in this order to keep PR-sized chunks reviewable:

1. **Tokens + provider + hook** — ship `apps/mobile/lib/theme/`, wrap `_layout.tsx`, write provider tests. Production locks to dark; nothing visible changes yet.
2. **`PressableButton` primitive** — ship the component, add `expo-haptics`, write component tests. Not yet used anywhere.
3. **Headers migration** — `HeaderBackButton`, `HeaderUserIcon`, `PageHeader`. The user-visible "snappiness" win lands here.
4. **Dashboard migration** — `cardStyles` → hook factory, all three cards, `CardMenuButton`, `DashboardHeader`, `DashboardHero`. The biggest interaction surface tokenized.
5. **Line list + FavoriteButton standardization** — `LineListItem` migrated; `FavoriteButton` rebased on `PressableButton`.
6. **Dev toggle** — three-state segmented control on profile screen behind `__DEV__`.

Each step lands its own commit (or PR) and updates affected tests in the same change.

## Verification

**Automated**
- `pnpm --filter mobile test` — passes with the new `theme.test.tsx` and `PressableButton.test.tsx` plus updated component tests
- `pnpm --filter mobile lint` — clean

**Manual smoke (per-step)**
- After step 1: app boots, dashboard renders unchanged
- After step 2: write a throwaway screen using `PressableButton` and verify iOS scale, Android ripple, opt-in haptic
- After step 3: real-device feel test on iOS + Android — back button and profile icon should feel native (immediate feedback, no perceived delay). User-validated.
- After step 4: tap every card type on the dashboard, open the `⋯` menu, scroll the favorites list under load — feedback should be consistent
- After step 6: in a `__DEV__` build, flip toggle through System → Light → Dark on the profile screen; verify migrated surfaces (headers + dashboard + line list) re-render correctly in light. Detail screens stay dark — expected, documented as out-of-scope.

**Coverage check before merge**
- No `'use client'` web file imports `apps/mobile/lib/theme/*` — mobile-only confirmed
- No new hex literals in migrated files (`grep '#[0-9a-fA-F]\{6\}'` against the touched files returns only references to `@ctt/shared` line colors)
- `expo-haptics` added to `apps/mobile/package.json` only (not root, not web)

## Round 2 (out of scope here, captured for context)

After this round merges, round 2 picks up:
- Migrate detail screens, alerts screens, timetables, auth screen, `MetraTrip*`, `FavoritesManager`
- Remove the `__DEV__` lock on `resolvedMode`
- Ship the user-facing theme toggle on the profile screen
- Optional: typography + shadow tokens once the colors/spacing/radii migration has bedded in
