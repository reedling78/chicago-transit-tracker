# Mobile Line List Redesign — Implementation Plan

**Spec:** `docs/superpowers/specs/2026-04-15-mobile-line-list-redesign-design.md`

## Context

The CTA and Metra line-list screens in the mobile app need two fixes: (1) a background color bug where white shows below the list, and (2) a visual update to match the web `LinkCard` dark-mode style (dark card, colored left border, `→` chevron).

## Steps

### Step 1: Create `LineListItem` component

**File:** `apps/mobile/components/LineListItem.tsx` (new)

Create a presentational row component with props `{ href, title, subtitle, accentColor }`. Uses `Link` from `expo-router` wrapping a `Pressable`. Styles match the spec: `#111827` background, `#374151` border, 4px colored left accent, white title (16px, 500), gray subtitle (`#9ca3af`, 13px), `→` chevron (`#4b5563`). Both text fields use `numberOfLines={1}` for truncation.

### Step 2: Update `apps/mobile/app/cta/index.tsx`

- Wrap `FlatList` in `<View style={{ flex: 1, backgroundColor: '#0f0f23' }}>`
- Replace the inline `Pressable` card in `renderItem` with `<LineListItem>`
- Pass `accentColor` from `CTA_LINE_COLORS[item.shortName]?.bg ?? item.color`
- Remove unused styles (`card`, `cardTitle`, `cardSub`) from `StyleSheet`
- Keep `contentContainerStyle` with `padding: 16, gap: 12` but remove `backgroundColor`

### Step 3: Update `apps/mobile/app/metra/index.tsx`

Same changes as Step 2:
- Wrap `FlatList` in `<View style={{ flex: 1, backgroundColor: '#0f0f23' }}>`
- Replace inline card with `<LineListItem>`
- Pass `accentColor` from `LINE_COLORS[item.shortName]?.bg ?? item.color`
- Clean up unused styles, remove `backgroundColor` from `contentContainerStyle`

### Step 4: Manual verification

1. Run `pnpm --filter mobile exec expo start --ios`
2. Check CTA Lines: dark bg fills screen, cards show colored left border, text truncates, tap navigates
3. Check Metra Lines: same checks
4. Verify no white background bleed at bottom on either screen

## Files

| File | Action |
|------|--------|
| `apps/mobile/components/LineListItem.tsx` | Create |
| `apps/mobile/app/cta/index.tsx` | Modify |
| `apps/mobile/app/metra/index.tsx` | Modify |
