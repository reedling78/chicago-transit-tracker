# Implementation Plan: Metra Page Redesign — Split Panels with Color Accents

**Spec:** `docs/superpowers/specs/2026-04-03-metra-page-redesign-design.md`

## Context

The Metra page looks flat and boring — both columns are visually identical, line colors are underused, and the page doesn't match the polish of the Hero or detail pages. We're upgrading to a bold, colorful split-panel design with colored left borders on cards, tinted filter chips, section labels, and better dark mode treatment. The LinkCard changes apply site-wide (CTA + Metra).

## Steps

### Step 1: Upgrade LinkCard with `accentColor` prop

**File:** `app/components/LinkCard.tsx`

- Add optional `accentColor?: string` prop to `LinkCardProps`
- When `accentColor` is provided:
  - Apply `style={{ borderLeftWidth: '4px', borderLeftColor: accentColor }}`
  - Add darker dark-mode background: swap `dark:bg-gray-900` for `dark:bg-white/[0.03]`
  - Add hover glow via inline style: `box-shadow: 0 0 0 1px rgba(accentColor, 0.15)` on hover (use group-hover or a conditional class)
- When `accentColor` is NOT provided: no visual change

### Step 2: Pass `accentColor` on Metra and CTA pages

**Files:** `app/metra/page.tsx`, `app/cta/page.tsx`

- Metra page: Add `accentColor={line.color}` to the LinkCard in the map
- CTA page: Add `accentColor={line.color}` to the LinkCard in the map

### Step 3: Add section labels to Metra page layout

**File:** `app/metra/page.tsx`

- Above the lines column: add `<h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">11 Metra Lines</h2>`
- Bump grid gap from `gap-6` to `gap-8`

### Step 4: Update MetraAlerts header and filter chips

**File:** `app/components/MetraAlerts.tsx`

- **Header:** Change the `<h2>` from `text-2xl font-bold` to `text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500` to match section label style. Change the active-count badge to `bg-red-500 text-white`.
- **Unselected filter chips:** For chips that are NOT selected, apply inline styles using the line's color:
  - `backgroundColor: rgba(lineColor, 0.10)`
  - `border: 1px solid rgba(lineColor, 0.25)`
  - `color: lineColor`
  - Remove the current plain gray styling for unselected chips
- Use a helper to convert hex to rgba (inline in the component, no new utility file)

### Step 5: Update tests and snapshots

**Files:** `__tests__/pages/metra-list.test.tsx`, `__tests__/components/MetraAlerts.test.tsx`, `__tests__/components/LinkCard.test.tsx` (if exists), `__tests__/pages/cta-list.test.tsx` (if exists)

- Update snapshots: `npx jest --updateSnapshot`
- Add a test for LinkCard with `accentColor` prop if a LinkCard test file exists
- Verify all tests pass

### Step 6: Lint and visual verification

- `npm run lint` — fix any issues
- `npm run dev` — visually verify:
  - Metra page: colored left borders, section labels, tinted chips, dark mode
  - CTA page: colored left borders with official L colors
  - Mobile: single-column stacking still works

## Verification

1. `npm test` — all tests pass
2. `npm run lint` — clean
3. Visual check on Metra page (light + dark mode)
4. Visual check on CTA page (light + dark mode)
5. Mobile viewport check
