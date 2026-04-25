# Plan: MetraTripRealtime — StationList-style timeline

> **Before commit:** rename this file to `2026-04-22-metra-trip-realtime-stationlist-timeline.md` per project plan-naming convention (`docs/superpowers/plans/YYYY-MM-DD-topic.md`).

---

## Context

On `/metra/[line]/train/[trainNumber]`, the `MetraTripRealtime` component currently renders the train's stop sequence as a bordered **table** with sequence-number column, status pills, and Arr/Dep time columns. It's functional but visually disconnected from the rest of the site — in particular from `StationList`, the vertical orange-rail timeline used on every CTA/Metra line detail page.

The user wants the stop sequence on the train detail page to adopt the `StationList` visual language (vertical line-colored rail, bullets at each stop, flat layout, station name links) and to **replace StationList's right-arrow with the train's scheduled time at that stop**. The hero status card above the list, the polling logic, and the status semantics (past / current / upcoming / skipped / delay chips) must all be preserved.

Outcome: a train detail page that feels like a first-class extension of the line page, where the list of stops on this specific trip reads as "these are the stations, in order, with the time the train hits each one" — in the same visual idiom as the "all stations on this line" list.

---

## Design decisions (confirmed with user)

- **Time per row:** single time, **departure** only (dwell at intermediate stops is rare; showing both would clutter the row).
- **Wrapper:** flat, no bordered card, no "Stop Schedule — N stops" header. Match `StationList` exactly.
- **Connecting-line badges + ADA icon:** **not** carried over. `TripStop` doesn't include `.lines` or `.accessibility.ada`; the user's request focused on the "connecting stations timeline" motif, not transfer chips. Adding these would require enriching every stop with a Firestore station lookup at render time — out of scope.
- **Hero status card above the list:** unchanged.
- **Footer (last-updated / Refresh button):** unchanged.
- **Status visual semantics preserved:** `past` / `skipped` → `opacity-60`; `current` → subtle row tint + "Next stop" pill under name; skipped → `line-through` + "Skipped" pill; delay → `+N min` / `-N min` chip inline next to the time.
- **Data attributes preserved:** each row keeps `data-stop-sequence={n}` and `data-stop-status={past|current|upcoming}` so existing tests continue to pass.

---

## Files to change

### 1. NEW — `apps/web/app/components/MetraTripStopTimeline.tsx`

Pure presentational component (no polling, no hooks aside from render). Mirrors the data-vs-presentation split between `MetraCurrentService` (data wrapper) and `CurrentServiceList` (presentational).

**Props:**
```ts
interface Props {
  derivedStops: DerivedStop[]   // from @lib/metra-status
  lineColor: string             // hex, e.g. '#c60c30'
  lineSlug: string              // for station link hrefs
}
```

**Render (close adaptation of `StationList.tsx:33-108`):**

- Root `<div class="relative">` with absolute-positioned vertical rail:
  ```tsx
  <div
    className="absolute top-3 bottom-3 left-[11px] w-[3px] rounded-full"
    style={{ backgroundColor: lineColor }}
  />
  ```
- Map `derivedStops` to rows. Each row: `<div class="relative flex items-start gap-4 border-b border-gray-100 py-4 last:border-0 dark:border-gray-800">`.
- Carry `data-stop-sequence={stop.sequence}` and `data-stop-status={status}` on the row wrapper (tests depend on them).
- **Bullet column** (copied from `StationList.tsx:51-61`): 6×6 flex box containing an inner `<div>` whose size + fill encodes terminal vs. mid:
  - Terminal (first or last stop): `h-5 w-5` with `backgroundColor: lineColor` and `borderColor: lineColor`.
  - Mid: `h-3 w-3 bg-white dark:bg-gray-950` with `borderColor: lineColor`.
  - "Terminal" here = `idx === 0 || idx === derivedStops.length - 1`.
- **Content column** — `<Link>` wrapper when `stop.slug != null`, plain `<div>` when `null` (Metra occasionally has non-linkable stops — treat the same as StationList's link pattern but guard for null):
  - Station name row: `<p class="flex items-center gap-1.5 font-semibold text-gray-900 group-hover:underline dark:text-white">`. Apply `line-through` when `skipped`.
  - Optional pill row below the name (only when there's a pill):
    - `skipped` → gray "Skipped" pill (re-use exact classes from `MetraTripRealtime.tsx:189-191`).
    - `status === 'current'` (and not skipped) → blue "Next stop" pill (re-use classes from `MetraTripRealtime.tsx:193-196`).
    - Otherwise no pill.
  - Right slot (replaces StationList's arrow):
    - Render `stop.departure` in `font-medium tabular-nums` (matches `tabular-nums` already used for times in the current table at `MetraTripRealtime.tsx:241,257`).
    - Append delay chip inline when `delayMinutes != null && !skipped`:
      - `delayMinutes > 0` → red `+{n} min` chip.
      - `delayMinutes < 0` → green `{n} min` chip.
      - Same classes as `MetraTripRealtime.tsx:244-252` — do not redesign delay chips.
- **Current-stop row tint**: apply `backgroundColor: ${lineColor}14` (8% alpha in hex) + `borderLeftColor: lineColor` via inline style on the row wrapper, mirroring `MetraTripRealtime.tsx:181-184`. The `border-l-4 border-transparent` default stays so the non-current rows have consistent width.

**Testing attributes:** preserve `data-stop-sequence` and `data-stop-status` on the row element — existing tests query by these and must not break.

### 2. EDIT — `apps/web/app/components/MetraTripRealtime.tsx`

Remove the entire bordered-card-with-table block (lines **168–280**). Replace with a single render of the new component:

```tsx
<MetraTripStopTimeline
  derivedStops={derivedStops}
  lineColor={lineColor}
  lineSlug={lineSlug}
/>
```

Keep everything else untouched:
- Imports, props, state
- Polling effects (`useMetraFeed`, `tripUpdatesFeed`, `positionsFeed`)
- `computeHeroStatus`, `deriveStopState`, `filterFeedForTrip`, `isTripCompleted` logic
- Hero card render (lines 154–166)
- Footer render (lines 283–299)
- The `eslint-disable` comments around max-polling-duration effect

Add `import MetraTripStopTimeline from './MetraTripStopTimeline'` near the existing component imports.

### 3. EDIT — `apps/web/__tests__/components/MetraTripRealtime.test.tsx`

Existing tests rely on:
- `screen.getByText('Aurora')` etc. — **still works** (station names render in the new timeline).
- `container.querySelectorAll('[data-stop-sequence]')` + `getAttribute('data-stop-status')` — **still works** (attributes preserved on the row wrapper).
- `screen.getByText('Next stop')` — **still works** (pill moved under the station name but text unchanged).
- `screen.getByText('Skipped')` — **still works**.
- `screen.getByText('+4 min')` / `'Delayed 7 min'` / `'On time'` — **still works** (delay chip + hero card unchanged).
- `screen.getByRole('button', { name: 'Refresh' })` — **still works** (footer unchanged).

No test deletions required. One small adjustment: the current initial-render test at lines 113–134 does not assert anything about time-column text, so it remains valid. If any snapshot is present (there isn't one in this file), regenerate it.

### 4. NEW — `apps/web/__tests__/components/MetraTripStopTimeline.test.tsx`

Unit tests for the new presentational component with hand-rolled `DerivedStop[]` inputs (no polling, no feed mocking needed). Cover:

- Renders one row per stop with `data-stop-sequence` + `data-stop-status` attributes.
- First and last stops render a **filled** bullet (terminal styling); middle stops render a **hollow** bullet. Query via the bullet's inline `backgroundColor` or by a role/test-id — simplest is to render with a known `lineColor` and assert the inline style on the bullet element.
- The vertical rail uses the passed `lineColor` (inline `backgroundColor` style).
- Station name links to `/metra/{lineSlug}/{stop.slug}` when `slug` is present; renders as plain text when `slug` is `null`.
- `status === 'current'` renders "Next stop" pill and applies the tinted row background.
- `skipped === true` renders `line-through` on the name and the "Skipped" pill.
- `delayMinutes === 4` renders `+4 min`; `delayMinutes === -2` renders `-2 min`; `null` renders no chip.
- Time column shows `stop.departure` (confirm that when `arrival !== departure`, `departure` is the text rendered — arrival is hidden).

Reuse the styling conventions from `StationList.test.tsx` (`apps/web/__tests__/components/StationList.test.tsx:23-112`) as the template for these assertions.

---

## Shared utilities and patterns to reuse (no new helpers needed)

- `DerivedStop`, `TripStop`, `StopStatus` from `apps/web/app/lib/metra-status.ts:3-31` — don't duplicate.
- Bullet + rail markup copied from `apps/web/app/components/StationList.tsx:35-61`.
- Delay chip classes copied from `apps/web/app/components/MetraTripRealtime.tsx:244-252` (red / green variants).
- "Next stop" and "Skipped" pill classes copied from `apps/web/app/components/MetraTripRealtime.tsx:188-196`.
- Current-stop row tint formula `${lineColor}14` from `apps/web/app/components/MetraTripRealtime.tsx:183`.

---

## Out of scope

- No changes to mobile (`apps/mobile/app/metra/[line]/train/[trainNumber].tsx` is a blank placeholder per CLAUDE.md).
- No changes to `StationList.tsx` itself — keep it stable; CTA and Metra line pages still depend on it unchanged.
- No changes to the hero status card or polling.
- No new Firestore fetches; we do not enrich `TripStop` with connecting-line badges or ADA icons at this time. That's a potential follow-up if the user later wants those chips on the trip timeline.

---

## Verification

1. **Lint + tests (must be clean before push):**
   ```bash
   pnpm -w run lint
   pnpm -w run test
   ```
   Both must pass with zero warnings and zero errors (per `.claude/rules/testing.md` and memory `feedback_clean_ci_before_push.md`).

2. **Local visual check:**
   ```bash
   pnpm run:web
   ```
   - Navigate to `/metra/bnsf` → click any active train in "Current Service" → lands on `/metra/bnsf/train/<trainNumber>`.
   - Confirm the timeline renders with the BNSF color rail, terminal-filled bullets at the first and last stop, mid-hollow bullets everywhere else, station names linked (except where slug is null), and a time right-aligned on every row.
   - Confirm the "Next stop" tint + pill appear on the current stop during live-service hours.
   - Toggle dark mode (navbar toggle). Check contrast of rail, bullets, row dividers.
   - Resize the window to 375px width. Station name + time must stay on the same row; pills wrap below the name cleanly. No horizontal scroll.
   - Verify an in-service delayed train renders the `+N min` chip next to the time.

3. **Check a trip with skipped stops** (Metra occasionally publishes these) — look for `line-through` on the name and the "Skipped" pill under it.

4. **Manually force `tripUpdateFeed([])`-style completion** by loading a train whose scheduled window has passed. Confirm the Refresh button appears in the footer and clicking it re-starts polling.

---

## Rollout

- Single PR off main per memory `feedback_no_worktrees.md`.
- Rename this plan file to the dated convention before commit: `2026-04-22-metra-trip-realtime-stationlist-timeline.md`.
- Standard lint + test CI, then merge via `gh pr create` / `gh pr merge --squash` per CLAUDE.md workflow.
