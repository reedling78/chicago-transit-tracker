# Mobile Bottom Tab Navigation

## Context

The mobile app currently uses a flat Stack navigator — users navigate to CTA and Metra via cards on the home screen. The user wants a bottom tab bar (dark background, matching the reference screenshot) with three tabs: **My Trains** (new blank screen), **CTA**, and **Metra**. This replaces the home screen cards as the primary navigation pattern.

---

## Architecture

Use expo-router's built-in `<Tabs>` component inside a `(tabs)` route group. The root layout remains a Stack (for auth modal and profile). Each tab with sub-routes (CTA, Metra) gets its own nested Stack layout so the tab bar stays visible when pushing into line detail, station, and alerts screens.

```
app/
  _layout.tsx              # Root Stack — wraps (tabs), auth, profile
  index.tsx                # Redirect → /(tabs)/my-trains
  auth.tsx                 # (unchanged)
  profile.tsx              # Update router.replace('/') → '/(tabs)/my-trains'
  (tabs)/
    _layout.tsx            # Tabs layout — 3 tabs
    my-trains.tsx          # New blank placeholder screen
    cta/
      _layout.tsx          # Stack layout for CTA tab
      index.tsx            # (moved from app/cta/)
      [line].tsx           # (moved from app/cta/)
      alerts.tsx           # (moved from app/cta/)
      station/
        [station].tsx      # (moved from app/cta/station/)
    metra/
      _layout.tsx          # Stack layout for Metra tab
      index.tsx            # (moved from app/metra/)
      [line].tsx           # (moved from app/metra/)
      alerts.tsx           # (moved from app/metra/)
      station/
        [station].tsx      # (moved from app/metra/station/)
```

---

## Steps

### 1. Create `app/(tabs)/_layout.tsx`

Tab bar with dark background (`#0a0a0a`), three tabs using `@expo/vector-icons/Ionicons`:
- **My Trains** — `train-outline` icon, `headerShown: true` with shared header styling
- **CTA** — `subway-outline` icon, `headerShown: false` (nested Stack provides header)
- **Metra** — `train-sharp` icon, `headerShown: false` (nested Stack provides header)

Active tint: `#60a5fa`, inactive: `#6b7280`.

### 2. Create `app/(tabs)/my-trains.tsx`

Blank placeholder screen with "Coming Soon" text. Dark background matching app theme (`#0f0f23`).

### 3. Create `app/(tabs)/cta/_layout.tsx` and `app/(tabs)/metra/_layout.tsx`

Each is a Stack layout with the shared header options (`backgroundColor: '#1a1a2e'`, white text, bold title, `HeaderUserIcon` on right). Only the index screen needs an explicit `<Stack.Screen>` entry — dynamic routes set their own titles inline.

### 4. Move screen files into `(tabs)/`

| From | To |
|------|----|
| `app/cta/index.tsx` | `app/(tabs)/cta/index.tsx` |
| `app/cta/[line].tsx` | `app/(tabs)/cta/[line].tsx` |
| `app/cta/alerts.tsx` | `app/(tabs)/cta/alerts.tsx` |
| `app/cta/station/[station].tsx` | `app/(tabs)/cta/station/[station].tsx` |
| `app/metra/index.tsx` | `app/(tabs)/metra/index.tsx` |
| `app/metra/[line].tsx` | `app/(tabs)/metra/[line].tsx` |
| `app/metra/alerts.tsx` | `app/(tabs)/metra/alerts.tsx` |
| `app/metra/station/[station].tsx` | `app/(tabs)/metra/station/[station].tsx` |

**For each moved file:** Update relative imports (add one extra `../` since `(tabs)` adds a directory level).

### 5. Update navigation hrefs in moved files

All hrefs change from `/cta/...` to `/(tabs)/cta/...` and `/metra/...` to `/(tabs)/metra/...`:

- `cta/index.tsx`: `href="/cta/alerts"` → `"/(tabs)/cta/alerts"`, `` `/cta/${slug}` `` → `` `/(tabs)/cta/${slug}` ``
- `cta/[line].tsx`: `stationHrefPrefix="/cta/station"` → `"/(tabs)/cta/station"`
- `metra/index.tsx`: same pattern
- `metra/[line].tsx`: same pattern

### 6. Update `app/_layout.tsx`

Remove individual screen entries for `index`, `cta/index`, `metra/index`. Add `(tabs)` screen with `headerShown: false`. Keep `auth` and `profile`.

### 7. Convert `app/index.tsx` to a redirect

Replace the home screen content with `<Redirect href="/(tabs)/my-trains" />` to handle the root route gracefully.

### 8. Update `app/profile.tsx`

Change `router.replace('/')` (line 72) to `router.replace('/(tabs)/my-trains')`.

### 9. Update tests

- **`__tests__/screens/home.test.tsx`** — Update to test the redirect behavior
- **`__tests__/screens/cta-index.test.tsx`** — Update href assertions to `/(tabs)/cta/...`
- **`__tests__/screens/cta-line.test.tsx`** — Update `stationHrefPrefix` assertions
- **`__tests__/screens/metra-index.test.tsx`** — Same as CTA
- **`__tests__/screens/metra-line.test.tsx`** — Same as CTA
- **New: `__tests__/screens/my-trains.test.tsx`** — Simple render test

### 10. Delete old empty directories

Remove `app/cta/` and `app/metra/` after files are moved.

---

## Key files to modify

- `apps/mobile/app/_layout.tsx`
- `apps/mobile/app/index.tsx`
- `apps/mobile/app/profile.tsx`
- `apps/mobile/app/cta/*` (move to `(tabs)/cta/`)
- `apps/mobile/app/metra/*` (move to `(tabs)/metra/`)
- `apps/mobile/__tests__/screens/*.test.tsx`

## New files to create

- `apps/mobile/app/(tabs)/_layout.tsx`
- `apps/mobile/app/(tabs)/my-trains.tsx`
- `apps/mobile/app/(tabs)/cta/_layout.tsx`
- `apps/mobile/app/(tabs)/metra/_layout.tsx`
- `apps/mobile/__tests__/screens/my-trains.test.tsx`

---

## Verification

1. Run `pnpm test:mobile` — all tests pass
2. Run `pnpm lint:mobile` — no lint errors
3. Launch iOS simulator (`pnpm run:ios`) and verify:
   - Tab bar renders with 3 tabs, correct icons, dark background
   - My Trains tab shows "Coming Soon" placeholder
   - CTA tab shows line list → tap line → detail with stations → tap station → station detail (tab bar visible throughout)
   - Metra tab same flow
   - Back button on sub-routes stays within the tab
   - HeaderUserIcon works on all tabs (auth modal + profile)
   - Sign out from profile returns to My Trains tab
