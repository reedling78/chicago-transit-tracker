# Mobile App Header — consistent translucent bar on every screen

## Context

The mobile app header is inconsistent. Only Home / Terms / Privacy render an opaque
"Chicago Transit Tracker" bar; every CTA/Metra line, station, train, list, and alerts
screen uses a fully **transparent** navigator header floating over a `PageHeader` photo,
with no background and no divider. On live devices the leftover circular "scrim" button
treatments look out of place — the favorite heart still draws a solid
`rgba(0,0,0,0.45)` circle (`apps/mobile/components/FavoriteButton.tsx:62,86-92`), and
older distribution builds show similar pills behind the back/menu buttons.

This change makes the app header **consistent on every page**: a single semi-transparent
header background (content faintly visible behind it), a theme-aware hairline divider at
its bottom edge, page-specific titles, and flat icon buttons with no scrim circles.

Design decisions (confirmed with the user):

1. **Keep photo heroes; bar floats on top.** Detail screens keep their `PageHeader`
   photo. The header stays `headerTransparent: true` so the photo extends under it and is
   faintly visible through the ~88%-opaque bar. The bar shows its own (small,
   left-aligned) title; `PageHeader` keeps rendering its large hero title — minor,
   accepted redundancy.
2. **Page-specific titles.** Entity screens show the entity name; brand stays only where
   there is no entity (see Title Map below — a compliance constraint refines this).
3. **Semi-transparent color** (no `expo-blur` dependency): canvas color at 88% alpha.
4. **Theme-aware hairline** divider (faint dark line in light mode, faint light line in
   dark mode) — always visible, never an invisible pure-black line on the dark canvas.

## Approach

Centralize the header in the Stack's `screenOptions` so it applies to every screen by
default; each screen only supplies its own `headerTitle` (and `headerRight` where it
already does). Remove the per-screen solid-background overrides. Strip the scrim circle
from the favorite button. Add two theme tokens.

### 1. New theme tokens — `apps/mobile/lib/theme/tokens.ts`

- Extend `ThemeColors`:
  - `bg.headerTranslucent: string`
  - `border.hairline: string`
- `darkTheme`: `bg.headerTranslucent: 'rgba(15,15,30,0.88)'` (canvas `#0f0f1e` @ .88),
  `border.hairline: 'rgba(255,255,255,0.12)'`
- `lightTheme`: `bg.headerTranslucent: 'rgba(249,250,251,0.88)'` (canvas `#f9fafb` @ .88),
  `border.hairline: 'rgba(0,0,0,0.12)'`

### 2. New shared component — `apps/mobile/components/AppHeaderBackground.tsx`

Small client component used as the navigator's `headerBackground`. Renders an
absolute-fill `View`:

```tsx
backgroundColor: theme.colors.bg.headerTranslucent,
borderBottomWidth: StyleSheet.hairlineWidth,
borderBottomColor: theme.colors.border.hairline,
```

Uses `useTheme()`. Because the Stack keeps `headerTransparent: true`, this view sits over
the content/photo and the 12% transparency lets the content show through (the requested
"see content behind the app bar"). The bottom border is the requested separator line.

### 3. Centralize header in the Stack — `apps/mobile/app/(app)/_layout.tsx`

Replace the current `screenOptions` with shared defaults that every screen inherits:

```tsx
screenOptions={{
  headerTransparent: true,
  headerStyle: { backgroundColor: 'transparent' }, // real bg comes from headerBackground
  headerBackground: () => <AppHeaderBackground />,
  headerShadowVisible: false,                       // divider is our hairline instead
  headerTitleAlign: 'left',
  headerTitleStyle: { color: theme.colors.text.primary, fontWeight: '700' },
  title: '',
  headerBackVisible: false,
  headerLeft: () => <HeaderBackButton />,
}}
```

(`_layout.tsx` needs `useTheme()` for `headerTitleStyle`; it already imports the Stack and
HeaderBackButton.) The `auth` screen keeps `presentation: 'modal'`; **exclude** `auth` and
`apple-callback` from the app header — they are a modal sheet and an invisible deep-link
handler, not browsable pages. If either currently shows a header, set
`headerShown: false` on its `Stack.Screen`.

### 4. Per-screen titles (the only thing screens still set)

Remove the now-redundant `headerTransparent` / `headerStyle.backgroundColor` /
`headerShadowVisible` / `headerTitleAlign` / `headerTitleStyle` overrides from every
screen — they are inherited. Each screen keeps only `headerTitle` (+ existing
`headerRight` for favorites where present).

**Title Map** (compliance-aware — see Compliance note):

| Screen | `headerTitle` |
|---|---|
| `(app)/index.tsx` | `Chicago Transit Tracker` (also drop the solid `headerStyle` + keep `headerRight: <HeaderMenuButton/>`, `headerLeft: () => null`) |
| `(app)/terms.tsx`, `(app)/privacy.tsx` | `Chicago Transit Tracker` (drop solid `headerStyle`) |
| `(app)/cta/index.tsx` | `Chicago Transit Tracker` (no entity, agency word can't lead) |
| `(app)/metra/index.tsx` | `Chicago Transit Tracker` |
| `(app)/cta/alerts.tsx`, `(app)/metra/alerts.tsx` | `Service Alerts` |
| `(app)/cta/[line].tsx` | `line.name` (e.g. "Red Line") |
| `(app)/metra/[line]/index.tsx` | `line.name` (e.g. "BNSF") |
| `(app)/cta/station/[station].tsx`, `(app)/metra/station/[station].tsx` | `station.name` |
| `(app)/metra/[line]/train/[trainNumber].tsx` | e.g. `${line.name} #${trainNumber}` |

Detail screens set `headerTitle` inside their existing `<Stack.Screen options={{ ... }}/>`
(they already declare one for `headerRight: <FavoriteButton/>`). List/alerts screens add a
minimal `<Stack.Screen options={{ headerTitle: ... }} />`.

### 5. Flat header buttons (fix the "weird button" look)

- **`apps/mobile/components/FavoriteButton.tsx`**: delete the `<View style={styles.circle}>`
  wrapper (and `styles.circle` + the `bg.scrim` usage). Render the `Svg` heart directly
  inside `PressableButton`. Change the default stroke from `theme.colors.text.onScrim`
  (white — invisible on the light translucent bar) to `theme.colors.text.primary`; keep
  the optional `color` prop override for line-colored hearts. Keep the 48×48 touch target.
- **`apps/mobile/components/HeaderBackButton.tsx`** and **`HeaderMenuButton.tsx`**: remove
  the `icon` text-shadow style (it existed only to read over a bare photo; the header now
  has a near-opaque background). Icons stay `theme.colors.text.primary`. No scrim, no pill.

### 6. Docs

Update the mobile architecture paragraph in `CLAUDE.md` ("Mobile app (Expo)" /
"Dark mode" sections) that currently describes the transparent-vs-opaque split and the
"flat chevron with soft shadow over photo headers" — it becomes stale. Describe the new
single translucent app header (semi-transparent canvas, hairline divider, page-specific
title, flat buttons, photo heroes still rendered beneath).

## Compliance note (`.claude/rules/transit-compliance.md`)

"Never use an agency's first word as our first word" applies to page titles/headings. So
list screens must **not** be titled "CTA …" or "Metra …" — they keep the brand title.
Entity titles ("Red Line", "BNSF", "Western", "Union Station") do not lead with "CTA"/
"Metra" and are fine. No logo/wordmark is added. No data-display or attribution surface
changes (footer/Terms unaffected; Metra last-updated timestamps live in content
components, not the header). Route colors unchanged.

## Critical files

- `apps/mobile/lib/theme/tokens.ts` — add tokens (interface + both themes)
- `apps/mobile/components/AppHeaderBackground.tsx` — **new**
- `apps/mobile/app/(app)/_layout.tsx` — centralize header `screenOptions`
- `apps/mobile/app/(app)/index.tsx`, `terms.tsx`, `privacy.tsx` — drop solid bg override, keep brand title
- `apps/mobile/app/(app)/cta/index.tsx`, `metra/index.tsx`, `cta/alerts.tsx`, `metra/alerts.tsx` — add `headerTitle`
- `apps/mobile/app/(app)/cta/[line].tsx`, `metra/[line]/index.tsx`, `cta/station/[station].tsx`, `metra/station/[station].tsx`, `metra/[line]/train/[trainNumber].tsx` — add `headerTitle` to existing `Stack.Screen`
- `apps/mobile/components/FavoriteButton.tsx` — remove circle scrim, fix default stroke
- `apps/mobile/components/HeaderBackButton.tsx`, `HeaderMenuButton.tsx` — remove text-shadow
- `CLAUDE.md` — update mobile header description

## Tests (`apps/mobile/__tests__/`, required by the PostSourceFileEdit hook)

- New `__tests__/components/AppHeaderBackground.test.tsx` — renders; asserts translucent
  bg + hairline border styles from the active theme.
- Update `FavoriteButton` test — assert no scrim circle wrapper; heart stroke uses
  `text.primary` by default and respects the `color` override.
- Update `HeaderBackButton` / `HeaderMenuButton` tests — assert no `textShadow*` style.
- If a header/screen snapshot exists for index/terms/privacy, update snapshots
  (`pnpm --filter mobile test -u`).

## Verification

1. `pnpm test:mobile` and `pnpm lint:mobile` — zero errors/warnings.
2. `pnpm run:ios` (and Android emulator): walk Home → CTA list → a line → a station →
   back; Metra list → line → train; CTA/Metra alerts; Terms; Privacy. Confirm on **every**
   screen: same translucent bar, content faintly visible behind it, a 1px divider at its
   bottom edge, left-aligned page-specific title, flat back/menu/heart icons with **no**
   circular scrim.
3. Toggle System/Light/Dark (Profile): divider and title legible in both; verify the
   favorite heart is visible on the light translucent bar (was white-on-light before).
4. Detail screens: photo hero still shows beneath the bar and through its transparency.
5. Build a fresh distribution build (`pnpm --filter mobile run distribute`) so the live
   device no longer shows the stale pill treatment.
