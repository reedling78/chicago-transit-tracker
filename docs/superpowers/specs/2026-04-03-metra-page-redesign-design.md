# Metra Page Redesign — Split Panels with Color Accents

## Context

The Metra page (`app/metra/page.tsx`) currently displays as a flat two-column grid with line cards on the left and alerts on the right. Both columns look identical in weight and style — there's no visual hierarchy, minimal use of Metra line colors, and the page doesn't match the polish level of the Hero component or other detail pages. The user wants a bold, colorful redesign that makes the Metra page the most visually striking page on the site while keeping both sections equally prominent but visually distinct.

## Design: Split Panels with Color Accents

Two-column layout (lines left, alerts right) with rich color treatments, section labels, and upgraded card styling applied site-wide.

### 1. Page Layout (`app/metra/page.tsx`)

**Current:** `<div className="grid grid-cols-1 md:grid-cols-2 gap-6">`  
**New:** Same grid structure, but each column gets:

- **Section label**: An uppercase, tracked-out label above each column
  - Left: "11 Metra Lines" — `text-xs font-semibold uppercase tracking-widest text-gray-400`
  - Right: "Service Alerts" with a red pill badge showing active count — reuse the existing MetraAlerts header but match the label style
- **Consistent gap**: `gap-8` between columns (up from `gap-6`)

No new components needed — these are lightweight additions to the page JSX.

### 2. LinkCard Upgrade (`app/components/LinkCard.tsx`) — Site-Wide

Add a new optional `accentColor` prop that enables the color accent treatment:

```typescript
interface LinkCardProps {
  // ... existing props
  accentColor?: string // NEW: hex color for left border accent
}
```

**Visual changes when `accentColor` is provided:**

- **4px colored left border**: `borderLeftWidth: 4px; borderLeftColor: accentColor`
- **Darker card background in dark mode**: `dark:bg-white/[0.03]` (slightly more transparent than current `dark:bg-gray-900`)
- **Subtle hover glow**: On hover, a faint `box-shadow` using the accent color at low opacity: `0 0 0 1px rgba(accentColor, 0.15)`

**When `accentColor` is NOT provided:** Card renders exactly as today. Zero visual regression.

**Callers to update:**

- `app/metra/page.tsx` — pass `accentColor={line.color}`
- `app/cta/page.tsx` — pass `accentColor={line.color}` (CTA lines already have official hex colors in their data)

### 3. MetraAlerts Filter Chips — Line-Color Tinting

**Current unselected state:** Plain gray border/background  
**New unselected state:** Subtle line-color tint

For unselected chips, apply inline styles:

- `backgroundColor: rgba(lineColor, 0.10)`
- `border: 1px solid rgba(lineColor, 0.25)`
- `color: lineColor` (or a lighter variant for dark mode)

This makes chips visually scannable by color even before selection. Selected state stays as-is (solid line-color background with ring).

**File:** `app/components/MetraAlerts.tsx` — modify the chip rendering in the filter section (~lines 209-234).

### 4. MetraAlerts Section Header — Style Alignment

Update the MetraAlerts header to match the "section label" pattern:

- Change "Metra Service Alerts" `<h2>` to match the section label style used on the lines column: `text-xs font-semibold uppercase tracking-widest text-gray-400`
- Keep the active-count badge but style it as a red pill: `bg-red-500 text-white text-xs font-bold rounded-full px-2.5 py-0.5`

**File:** `app/components/MetraAlerts.tsx` — modify the header section (~lines 187-194).

### 5. Dark Mode Enhancement

Upgrade card backgrounds across the board for more depth:

- LinkCard: `dark:bg-white/[0.03]` when accent color is present (current: `dark:bg-gray-900`)
- AlertCard: Already uses `dark:bg-white/5` — keep as-is for visual distinction from line cards

## Files to Modify

| File                                        | Change                                                                |
| ------------------------------------------- | --------------------------------------------------------------------- |
| `app/components/LinkCard.tsx`               | Add `accentColor` prop, colored left border, dark mode bg, hover glow |
| `app/components/MetraAlerts.tsx`            | Section label header style, tinted filter chips                       |
| `app/metra/page.tsx`                        | Section labels, pass `accentColor` to LinkCard, bump gap              |
| `app/cta/page.tsx`                          | Pass `accentColor` to LinkCard                                        |
| `__tests__/pages/metra-list.test.tsx`       | Update snapshot                                                       |
| `__tests__/components/LinkCard.test.tsx`    | Test accentColor rendering (if test exists)                           |
| `__tests__/components/MetraAlerts.test.tsx` | Update snapshot for header/chip changes                               |

## What This Does NOT Change

- No new components created
- No changes to data fetching, routing, or page structure
- No changes to MetraAlerts polling logic or alert card content
- No changes to mobile layout (already stacks single-column)
- LinkCard without `accentColor` renders identically to today

## Verification

1. `npm run dev` — visually verify Metra page shows colored left borders on line cards, tinted filter chips, section labels
2. Verify CTA page also shows colored left borders with official L colors
3. Verify dark mode looks correct on both pages
4. Verify mobile (narrow viewport) stacks correctly
5. `npm test` — all tests pass (update snapshots as needed)
6. `npm run lint` — no lint errors
