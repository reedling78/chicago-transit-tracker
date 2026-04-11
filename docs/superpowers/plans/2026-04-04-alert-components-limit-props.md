# Plan: Add limit and hideChips props to alert components

## Context

The CTA and Metra line detail pages (`/cta/[line]`, `/metra/[line]`) currently show **all** alerts inline. The user wants to cap the visible alerts to 3 on these pages with a "Show more" link that navigates to the new dedicated alert pages (`/cta/alerts`, `/metra/alerts`). The filter chips are already hidden when a `line` prop is passed, but the user wants this controlled by an explicit `hideChips` prop instead.

## Changes

### 1. Update CTAAlerts props and rendering

**File:** [app/components/CTAAlerts.tsx](app/components/CTAAlerts.tsx)

- Expand props from `{ line?: Line }` to `{ line?: Line; limit?: number; hideChips?: boolean }`
- When `limit` is provided, slice `filteredAlerts` to that count for rendering
- When `limit` is set and `filteredAlerts.length > limit`, render a "View all alerts" link pointing to `/cta/alerts`
- Change chip visibility condition from `!fixedRouteId` to `!hideChips` — when a `line` is passed without `hideChips`, chips still show but the initial selection is pre-set to that line's route

### 2. Update MetraAlerts props and rendering

**File:** [app/components/MetraAlerts.tsx](app/components/MetraAlerts.tsx)

- Same prop additions: `{ line?: Line; limit?: number; hideChips?: boolean }`
- Same slicing and "View all alerts" link logic, pointing to `/metra/alerts`
- Change chip visibility condition from `!fixedRoute` to `!hideChips` — same decoupling as CTAAlerts

### 3. Update line detail pages to pass new props

**File:** [app/cta/[line]/page.tsx](app/cta/[line]/page.tsx) — line 96

- Change `<CTAAlerts line={line} />` to `<CTAAlerts line={line} limit={3} hideChips />`

**File:** [app/metra/[line]/page.tsx](app/metra/[line]/page.tsx) — line 100

- Change `<MetraAlerts line={line} />` to `<MetraAlerts line={line} limit={3} hideChips />`

### 4. Update tests

**Files:**

- [**tests**/components/CTAAlerts.test.tsx](__tests__/components/CTAAlerts.test.tsx) — add tests for limit prop (shows only N cards, renders "View all" link) and hideChips prop
- [**tests**/components/MetraAlerts.test.tsx](__tests__/components/MetraAlerts.test.tsx) — same

## Verification

1. `npm test` — all existing + new tests pass
2. `npm run lint` — no lint errors
3. Manual: visit `/cta/red` — should show at most 3 alert cards with a "View all alerts" link to `/cta/alerts`; no filter chips
4. Manual: visit `/cta/alerts` — should show all alerts with filter chips (no limit, no hideChips passed)
