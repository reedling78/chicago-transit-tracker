# Mobile: PageHeader on all detail screens, compact variant

## Context

The mobile app currently uses `PageHeader` on the CTA and Metra list-index screens and on the CTA + Metra station detail screens, but **not** on CTA line, Metra line, or Metra train detail screens — those still use Stack.Screen's opaque colored header with the line color as background and the favorite heart in `headerRight`. The result is two visually different "top-of-screen" patterns coexisting in the app.

The goal of this change is to unify the look:

- All seven PageHeader-eligible screens (2 list + 2 station + 2 line + 1 train) use `PageHeader` with the same shape and the same image-fallback rules.
- Stations keep their custom photo when one exists; everything else uses the appropriate default (`hero-header.jpg` for CTA, `hero-header-metra.jpg` for Metra).
- The header is shorter than today (~140px content vs. 200px) so the hero doesn't dominate the screen on detail pages.
- The native back button and the favorite heart remain visible at all times — back button stays as the navigator's `headerLeft`, favorite heart moves into the `PageHeader` title row.

## Scope (decided)

- ✅ Add PageHeader to: CTA line detail, Metra line detail, Metra train detail
- ✅ Apply the new shorter height to existing CTA + Metra **station** detail screens
- ✅ Apply the new shorter height to CTA Lines + Metra Lines **list** screens
- Train detail hero image: **default Metra image** (`hero-header-metra.jpg`)
- Compact content height: **~140px** (down from 200px)
- API: new **`compact?: boolean`** prop on `PageHeader`
- Out of scope: web app, alerts screens (`cta/alerts.tsx`, `metra/alerts.tsx`) — leave their existing PageHeader behavior alone unless trivially affected.

## Image fallback rules

- **Stations:** `station.photoUrl` → service default (CTA → `hero-header.jpg`, Metra → `hero-header-metra.jpg`)
- **Lines:** service default (CTA line → `hero-header.jpg`, Metra line → `hero-header-metra.jpg`)
- **Train detail:** `hero-header-metra.jpg` (Metra-only feature)
- **List pages (CTA Lines / Metra Lines):** unchanged — keep current images, only the height shrinks.

## Implementation

### 1. `apps/mobile/components/PageHeader.tsx` — add `compact` prop

- Add `compact?: boolean` to the props interface.
- When `compact` is `true`:
  - Content height drops from `200` → `140` (the `+ headerInset` safe-area math is unchanged).
  - Reduce the title font size by roughly one step (e.g. 28 → 24) and the description by one step, so the text sits comfortably in the shorter block.
  - Reduce vertical padding inside the gradient overlay so the title row remains anchored near the bottom.
- Default behavior (`compact` omitted or `false`) is unchanged so we don't have to touch screens we aren't migrating.
- No new image-fallback logic in `PageHeader` itself — fallbacks stay caller-owned (matches the existing pattern on the Metra station screen).

### 2. CTA line detail — `apps/mobile/app/cta/[line].tsx`

- Stack.Screen options:
  - `headerTransparent: true`, `headerStyle: { backgroundColor: 'transparent' }` (mirrors `apps/mobile/app/cta/index.tsx`).
  - `headerTitle: ''` so the line name appears only inside `PageHeader`.
  - **Drop** the `headerRight` FavoriteButton — it moves into `PageHeader`.
  - `headerLeft` continues to render `HeaderBackButton` (already wired at the root layout level).
- At the top of the scrolling content, render:
  ```tsx
  <PageHeader
    compact
    title={line.name}
    description={`${line.termini[0]} ↔ ${line.termini[1]}`}
    icon={<CTALineIcon color={line.color} />}
    favorite={{ type: 'line', id: line.slug }}
    // imageSrc omitted → default hero-header.jpg
  />
  ```
- Drop the `useNavHeaderInset()` content inset — `PageHeader` already handles it internally.

### 3. Metra line detail — `apps/mobile/app/metra/[line]/index.tsx`

- Same Stack.Screen + `PageHeader` shape as CTA line detail, with:
  - `imageSrc={require('../../../assets/hero-header-metra.jpg')}`
  - No `<CTALineIcon>` (Metra has no equivalent icon today).
  - Optional: render a small line-color chip via the `badges` prop so the line identity stays visible on top of the Metra default photo.

### 4. Metra train detail — `apps/mobile/app/metra/[line]/train/[trainNumber].tsx`

- Stack.Screen: same transparent-header pattern as the line screens; remove `headerRight` favorite.
- At the top of the scrolling content (rendered once trip data has loaded):
  ```tsx
  <PageHeader
    compact
    title={`Train ${trainNumber}`}
    description={`${line.name} • ${origin} → ${destination}`}
    imageSrc={require('../../../../assets/hero-header-metra.jpg')}
    favorite={{ type: 'train', id: `${line.slug}-${trainNumber}` }}
  />
  ```
- The favorite key shape (`${line.slug}-${trainNumber}`) must match what `useToggleFavorite` already writes for train favorites — verify against `apps/mobile/lib/store/favorites.ts` and `packages/shared/src/favorites.ts` before committing.
- During the loading state (no trip yet), render a spinner inside the normal screen body — do not show a half-populated `PageHeader`.

### 5. CTA station detail — `apps/mobile/app/cta/station/[station].tsx`

- Already uses `PageHeader`. Two small changes:
  - Add `compact`.
  - Change the `imageSrc` line so the **CTA default** is the explicit fallback (today it relies on `PageHeader`'s built-in default, which happens to be the CTA image — make the fallback explicit for symmetry with the Metra station screen and to survive any future change to `PageHeader`'s default):
    ```tsx
    imageSrc={station.photoUrl ? { uri: station.photoUrl } : require('../../../assets/hero-header.jpg')}
    ```

### 6. Metra station detail — `apps/mobile/app/metra/station/[station].tsx`

- Already uses `PageHeader` with explicit `metraHeroImage` fallback — leave the image logic alone.
- Add `compact`.

### 7. CTA Lines list — `apps/mobile/app/cta/index.tsx`

- Add `compact` to the existing `<PageHeader>` (no image change).

### 8. Metra Lines list — `apps/mobile/app/metra/index.tsx`

- Add `compact` to the existing `<PageHeader>` (no image change; keeps the Metra default image already wired).

## Critical files

- `apps/mobile/components/PageHeader.tsx` — new `compact` prop + sizing
- `apps/mobile/app/cta/[line].tsx` — migrate to PageHeader
- `apps/mobile/app/metra/[line]/index.tsx` — migrate to PageHeader
- `apps/mobile/app/metra/[line]/train/[trainNumber].tsx` — migrate to PageHeader
- `apps/mobile/app/cta/station/[station].tsx` — add `compact`, explicit CTA fallback
- `apps/mobile/app/metra/station/[station].tsx` — add `compact`
- `apps/mobile/app/cta/index.tsx` — add `compact`
- `apps/mobile/app/metra/index.tsx` — add `compact`

## Reuse

- `PageHeader` ([apps/mobile/components/PageHeader.tsx](apps/mobile/components/PageHeader.tsx)) — extend, don't fork.
- `FavoriteButton` ([apps/mobile/components/FavoriteButton.tsx](apps/mobile/components/FavoriteButton.tsx)) — already integrated into `PageHeader` via the `favorite` prop; no change needed.
- `HeaderBackButton` ([apps/mobile/components/HeaderBackButton.tsx](apps/mobile/components/HeaderBackButton.tsx)) — already wired as `headerLeft` at the root layout (`apps/mobile/app/_layout.tsx`); just stop overriding it on the detail screens that previously rendered colored headers.
- `useNavHeaderInset` ([apps/mobile/lib/useNavHeaderInset.ts](apps/mobile/lib/useNavHeaderInset.ts)) — already used inside `PageHeader`, so screens migrating to `PageHeader` can drop their own usage of it.
- Default hero assets: `apps/mobile/assets/hero-header.jpg` (CTA), `apps/mobile/assets/hero-header-metra.jpg` (Metra) — already shipped.

## Verification

Run on at least one iOS simulator and one Android emulator:

1. **Build & lint:**
   - `pnpm lint:mobile` — no warnings.
   - `pnpm test:mobile` — Jest passes. Update or add snapshots for `PageHeader` + each migrated screen. Existing snapshot tests for the station screens will need refreshing because the heading sizing changes.
2. **CTA line detail:** open `/cta/red`, `/cta/blue`, `/cta/yellow`. Verify:
   - Default CTA hero image renders behind a shorter header block.
   - Line name + termini are legible over the gradient.
   - The favorite heart (top-right of the title row) toggles persistently.
   - The translucent back-button circle works.
3. **Metra line detail:** open `/metra/bnsf`, `/metra/up-n`. Verify default Metra hero, favorite heart, back button.
4. **Metra train detail:** open a known active train (e.g. `/metra/bnsf/train/1234`). Verify Metra default hero, train favorite toggle persists, polling and the rest of the screen still work below the new header.
5. **Stations:** open one CTA and one Metra station that has `photoUrl` set, plus one CTA + one Metra station with `photoUrl: null`. Confirm:
   - With photo → photo renders.
   - Without photo → service default renders (CTA default for CTA stations, Metra default for Metra stations).
   - Header is visibly shorter than before.
6. **List pages:** open `/cta` and `/metra`. Confirm the index headers shrink to the new compact size; nothing else regresses on the list itself.
7. **Persistence sanity check:** add favorites from each surface (line, station, train), kill the app, relaunch, confirm they reappear on the dashboard via the existing favorites store.
