# Mobile Line List Redesign — Design Spec

**Date:** 2026-04-15
**Scope:** `apps/mobile/app/cta/index.tsx`, `apps/mobile/app/metra/index.tsx`

## Context

The mobile app's CTA Lines and Metra Lines screens currently render each line as a fully color-filled card. Two problems:

1. **Background bug:** the dark `#0f0f23` background only paints inside `FlatList.contentContainerStyle`. When the list is shorter than the screen, the FlatList's own (white) background shows through below the last item — visible as a white block at the bottom of the screen.
2. **Visual inconsistency with web:** the web app uses a more refined `LinkCard` look (dark card, colored left accent border, white title, gray subtitle, `→` chevron). The user wants the mobile list to match.

This change is for the line-list screens only. Station lists, home, and detail screens are out of scope.

## Design

### New shared component: `apps/mobile/components/LineListItem.tsx`

A small presentational component mirroring the web `LinkCard` (apps/web/app/components/LinkCard.tsx). Two call sites justify a shared component because both screens need identical behavior, and it doubles as a teaching example of the reusable-card pattern from the web side.

**Props:**

```ts
type LineListItemProps = {
  href: string
  title: string
  subtitle: string
  accentColor: string
}
```

**Visual spec** (matches the web `LinkCard` dark-mode appearance):

| Element        | Style                                                       |
| -------------- | ----------------------------------------------------------- |
| Card           | `bg #111827`, `borderRadius 8`, `borderWidth 1`, `borderColor #374151` |
| Left accent    | `borderLeftWidth 4`, `borderLeftColor: accentColor`         |
| Padding        | `paddingHorizontal 20`, `paddingVertical 16`                |
| Layout         | row, `alignItems: center`, `justifyContent: space-between`, `gap 12` |
| Title          | `#ffffff`, 16px, weight 500, `numberOfLines={1}`            |
| Subtitle       | `#9ca3af` (gray-400), 13px, `numberOfLines={1}`, `marginTop 2` |
| Chevron (`→`)  | `#4b5563` (gray-600), 18px, shrink-0                        |

The title/subtitle column wraps in a `View` with `flex: 1` so truncation works inside the row.

### Background fix

In both `cta/index.tsx` and `metra/index.tsx`, wrap the `FlatList` in:

```tsx
<View style={{ flex: 1, backgroundColor: '#0f0f23' }}>
  <FlatList ... />
</View>
```

Remove `backgroundColor` from `contentContainerStyle` (no longer needed). Keep `padding: 16` and `gap: 12` on `contentContainerStyle`.

### Accent color source

- **CTA lines:** `CTA_LINE_COLORS[item.shortName]?.bg ?? item.color`
- **Metra lines:** `LINE_COLORS[item.shortName]?.bg ?? item.color`

Both already imported from `@ctt/shared`. Falls back to `item.color` from Firestore so an unknown line still renders.

### Subtitle text

Same string used today, single-line, truncated:

```
`${item.stationCount} stations · ${item.termini.join(' — ')}`
```

## Files Touched

| File                                       | Change                                  |
| ------------------------------------------ | --------------------------------------- |
| `apps/mobile/components/LineListItem.tsx`  | New file (shared row component)         |
| `apps/mobile/app/cta/index.tsx`            | Wrap FlatList, render `<LineListItem>`  |
| `apps/mobile/app/metra/index.tsx`          | Wrap FlatList, render `<LineListItem>`  |

No changes to `packages/shared/`, web app, or Firestore.

## Testing & Verification

- The mobile app currently has no Jest test setup (`apps/mobile/` has no `__tests__/` directory and no Jest config). The repo's PostSourceFileEdit test-update hook targets `apps/web/__tests__/`. **No new automated tests will be added** as part of this change.
- **Manual verification:**
  1. `pnpm --filter mobile exec expo start --ios`
  2. Navigate to **CTA Lines** — confirm:
     - Background is dark `#0f0f23` from header to bottom of screen, no white block
     - Each row shows the new card style with the correct colored left border
     - Title and subtitle truncate cleanly on a narrow device (test on iPhone SE / 375pt)
     - Tapping a row navigates to the line detail (existing `expo-router` `Link`)
  3. Repeat for **Metra Lines**
  4. Test in both light and dark device appearance — colors are hardcoded, so result should be identical.

## Out of Scope

- Station lists inside `cta/[line].tsx` and `metra/[line].tsx`
- Home screen line cards
- Light-mode theming for the mobile app
- Any web changes
