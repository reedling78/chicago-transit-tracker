# Plan: Add PageHeader to Mobile Station Pages

## Context

The mobile station pages (`cta/station/[station].tsx` and `metra/station/[station].tsx`) currently render a plain inline header with station name, address, and line chips. The web station pages use the `PageHeader` component with hero background images, badges, and line chips — giving a much richer visual presentation. The mobile app already has a fully-built `PageHeader` component (`apps/mobile/components/PageHeader.tsx`) with the same image/overlay system, but station pages don't use it yet. The goal is to wire it up, matching the web's image fallback behavior.

## Changes

### Step 1: Update CTA station page

**File:** `apps/mobile/app/cta/station/[station].tsx`

- Import `PageHeader` from `../../../components/PageHeader`
- Replace the `<View style={styles.header}>` block (name, address, chips) with:
  ```tsx
  <PageHeader
    title={station.name}
    description={station.address}
    imageSrc={station.photoUrl ? { uri: station.photoUrl } : undefined}
    badges={
      <>
        {station.terminal && <Text style={badgeStyles.terminal}>Terminal</Text>}
        {station.open24Hours && <Text style={badgeStyles.open24}>24 Hours</Text>}
      </>
    }
  >
    {/* Line color chips */}
    <View style={styles.chips}>
      {station.lines.map((line) => { ... })}
    </View>
  </PageHeader>
  ```
- When `photoUrl` is null, `undefined` lets PageHeader fall back to its default CTA hero (`hero-header.jpg`) — matches web behavior
- Add `contentContainerStyle={{ padding: 16, gap: 16 }}` to ScrollView so PageHeader's `marginHorizontal: -16` bleeds correctly
- Add badge styles (amber for Terminal, green for 24 Hours — matching web's dark-mode palette)
- Remove unused styles: `header`, `name`, `address`
- Update section `paddingHorizontal` from 24 to 0 (container now provides 16px)

### Step 2: Update Metra station page

**File:** `apps/mobile/app/metra/station/[station].tsx`

- Same structure as CTA, with two differences:
  1. Fallback image is Metra-specific: `station.photoUrl ? { uri: station.photoUrl } : metraHeroImage` where `metraHeroImage = require('../../../assets/hero-header-metra.jpg')`
  2. Add a service type badge ("Metra" or "CTA + Metra") before the Terminal/24 Hours badges — matches web
- Remove unused styles: `header`, `name`, `address`

### Step 3: Update tests

**Files:**
- `apps/mobile/__tests__/screens/cta-station.test.tsx`
- `apps/mobile/__tests__/screens/metra-station.test.tsx`

Both need:
- Add `expo-linear-gradient` mock (same pattern as `PageHeader.test.tsx`)
- Existing assertions for station name, address, amenities, and schedule should still pass since PageHeader renders title/description as `<Text>` elements
- Add assertions for new badges:
  - CTA: `mockStation` has `open24Hours: true` → verify "24 Hours" renders
  - Metra: `mockMetraStation` has `terminal: true` → verify "Terminal" badge renders; also verify "Metra" service badge renders

### No changes needed to PageHeader.tsx

React Native's `Image` already accepts `{ uri: string }` as a valid `ImageSourcePropType`, so remote station photos work without any component changes.

## Key files

| File | Action |
|------|--------|
| `apps/mobile/app/cta/station/[station].tsx` | Replace header with PageHeader |
| `apps/mobile/app/metra/station/[station].tsx` | Replace header with PageHeader |
| `apps/mobile/__tests__/screens/cta-station.test.tsx` | Add gradient mock + badge assertions |
| `apps/mobile/__tests__/screens/metra-station.test.tsx` | Add gradient mock + badge assertions |
| `apps/mobile/components/PageHeader.tsx` | No changes |
| `apps/mobile/__tests__/fixtures.ts` | No changes |

## Verification

1. `pnpm test:mobile` — all tests pass with zero warnings
2. `pnpm lint:mobile` — lint clean
3. Visual: run `pnpm run:ios`, navigate to a CTA station → see hero image with badges and line chips; navigate to a Metra station → see Metra hero fallback with service badge
