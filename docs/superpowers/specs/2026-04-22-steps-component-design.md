# Steps component — design spec

**Date:** 2026-04-22
**Status:** Draft
**Scope:** Web implementation + locked public API for future mobile port.

## Problem

Two web components render a vertical rail with station/stop bullets:

- `apps/web/app/components/StationList.tsx` — stations on a line (no per-row status)
- `apps/web/app/components/MetraTripStopTimeline.tsx` — stops on a live trip, with `past` / `current` / `upcoming` / `skipped` status and delay chips

Both use an absolute-positioned rail across the whole list. That approach has repeatedly produced alignment bugs: the rail either extends past the terminal bullets as visible stubs, or introduces a `border-l-4` accent stripe that doesn't line up with the rail. Meanwhile, the mobile app's `apps/mobile/components/StationTimeline.tsx` uses a per-row segment approach that naturally handles terminals and avoids these bugs.

The components also duplicate ~50 lines of bullet + rail layout each, and a Metra trip timeline on mobile doesn't exist yet — when it's built, it will be the fourth copy.

## Goal

Introduce a single `Steps` primitive on web that:

- Renders a vertical rail with opinionated row slots (primary content, trailing, optional below-content)
- Supports four visual states (`default`, `past`, `current`, `skipped`) orthogonal to two bullet shapes (`open`, `filled`)
- Owns its rail via per-row segments (no absolute rail)
- Optionally wraps each row in a Next `<Link>` when given an `href`
- Replaces the bullet/rail code in both existing web call-sites

The spec also locks a public prop shape that the mobile implementation will honor 1:1 when it's built in a follow-up spec.

## Non-goals

- Mobile implementation. The mobile `Steps` will ship in its own spec. This spec only commits to the public API.
- Horizontal orientation.
- Animated bullets. A `pulse?: boolean` prop can be added later without an API break.
- Unifying `packages/shared/` with UI code. `packages/shared/` stays platform-agnostic; `Steps` lives under `apps/web/app/components/` (and later `apps/mobile/components/`).

## Public API (locked for web and mobile)

```tsx
interface StepsProps {
  color: string                 // CTA/Metra route hex; drives rail + bullet borders
  children: React.ReactNode
  className?: string
}

interface StepsItemProps {
  status?: 'default' | 'past' | 'current' | 'skipped'   // default: 'default'
  bullet?: 'open' | 'filled'                            // default: 'open'
  href?: string                                         // when set, row content is a <Link>
  trailing?: React.ReactNode                            // right-side content (time, arrow, etc.)
  below?: React.ReactNode                               // second row under children
  children: React.ReactNode                             // primary (left-side) content
  'data-sequence'?: string | number                     // optional test/debug passthrough
}
```

Export: `export { Steps, StepsItem as Step }` with `Steps.Item = StepsItem` for compound-component usage (`<Steps><Steps.Item>...</Steps.Item></Steps>`).

### Semantics

| prop | value | effect |
|---|---|---|
| `status` | `'default'` | normal row |
| `status` | `'past'` | row at `opacity-60` |
| `status` | `'current'` | row tinted `${color}14` (8% alpha); bullet overridden to halo variant |
| `status` | `'skipped'` | row at `opacity-60`; left-content wrapper gets `line-through` (inherited by all text in `children`) |
| `bullet` | `'open'` (default) | 12px circle, 2px border in `color`, white/dark inner fill |
| `bullet` | `'filled'` | 20px solid disc in `color` |
| `bullet` (when `status='current'`) | — | **halo variant**: 12px solid disc in `color` + 4px outer ring in `color` at ~30% alpha; total visual footprint ~20px, matching the `filled` terminal size for visual weight consistency. Bullet alignment across rows is unaffected — every bullet is centered in its w-6 bullet column regardless of size. |

### Slot layout inside a row

```
[bullet column: w-6, self-stretch, flex-col, items-center]
  - top segment     (w-[3px], flex-1, transparent if first row)
  - bullet          (centered)
  - bottom segment  (w-[3px], flex-1, transparent if last row)

[gap-4]

[content: flex-1, min-w-0]
  row-1: flex items-start justify-between gap-4
    left-wrapper:           (adds 'line-through' when status='skipped')
      children
    right: trailing
  row-2 (only if below):
    below                   (rendered directly under children; unaffected by line-through)
```

When `href` is set, the content cell wraps in a Next `<Link>` with a `group` class so primary text can use `group-hover:underline`. When `href` is absent, the content cell is a plain `<div>` with no hover behavior.

## Rail construction — per-row segments

Each `Steps.Item` renders its own vertical line segments above and below the bullet. `Steps` uses `React.Children.map` (or `React.Children.toArray` + index) to inject `isFirst` / `isLast` flags into each child via `React.cloneElement`, which the child reads to decide whether to make its top/bottom segment transparent.

Consequences:
- Terminal rows never have rail stubs because their outer segment is `transparent`.
- Bullet centers stay aligned regardless of row height variation (multi-line `children`, `below`-row content, etc.).
- The rail visually breaks by 1px at each row's `border-b`. That's acceptable — and arguably preferable as a subtle row-separator — but if it proves too visible, the border moves from the row itself to a pseudo-element that excludes the bullet column.

## Web implementation notes

- File layout: `apps/web/app/components/Steps/Steps.tsx`, `apps/web/app/components/Steps/Step.tsx`, `apps/web/app/components/Steps/index.ts` (barrel). Path alias `@components/Steps` works via existing `apps/web/tsconfig.json` config.
- Tailwind v4 classes only; dark mode via `dark:` prefix.
- Halo ring uses a CSS `box-shadow` (`box-shadow: 0 0 0 4px ${color}4d`) rather than a pseudo-element so the bullet stays a single node.
- Row `border-b` uses `border-gray-100 dark:border-gray-800` and is suppressed on the last item via `last:border-b-0`.
- `data-*` passthroughs: each item renders `data-stop-status={status}`, `data-stop-bullet={bullet}` (`'current'` overrides to `'halo'` for test targeting), and `data-sequence` if provided.
- `Link`: uses `next/link` directly. `href` is passed through unvalidated — consumer's responsibility to supply a real route.

## Migration

Both existing call-sites convert in the same PR.

### `StationList.tsx`

```tsx
<Steps color={lineColor}>
  {stations.map((station) => {
    const otherLines = station.lines.filter((l) => l !== currentLine)
    return (
      <Steps.Item
        key={station.slug}
        bullet={station.terminal ? 'filled' : 'open'}
        href={`${stationHrefPrefix}/${station.slug}`}
        trailing={<ArrowIcon />}
        below={otherLines.length > 0 ? <TransferChips lines={otherLines} /> : undefined}
      >
        <p className="flex items-center gap-1.5 font-semibold ...">
          {station.name}
          {station.accessibility.ada && <WheelchairIcon />}
        </p>
      </Steps.Item>
    )
  })}
</Steps>
```

The `TransferChips` and `ArrowIcon` subcomponents are extracted from the current file but stay local to `StationList.tsx` — they're not reusable enough to promote.

### `MetraTripStopTimeline.tsx`

```tsx
<Steps color={lineColor}>
  {derivedStops.map((derived) => {
    const { stop, status, delayMinutes, skipped } = derived
    const mappedStatus =
      skipped ? 'skipped' : status === 'upcoming' ? 'default' : status
    return (
      <Steps.Item
        key={stop.sequence}
        data-sequence={stop.sequence}
        status={mappedStatus}
        bullet="open"
        href={stop.slug ? `/metra/${lineSlug}/${stop.slug}` : undefined}
        trailing={
          <StopMeta
            status={status}
            skipped={skipped}
            time={stop.departure}
            delayMinutes={delayMinutes}
          />
        }
      >
        {stop.stationName}
      </Steps.Item>
    )
  })}
</Steps>
```

`StopMeta` is extracted as a local subcomponent rendering the "Next stop"/"Skipped" pill, the departure time, and the delay chip — same DOM as today, just pulled into its own component.

Net change: each file drops its bullet-column markup, the absolute-rail `<div>`, and the row's flex/border layout. The remaining code is data mapping.

## Testing

### New: `apps/web/__tests__/components/Steps.test.tsx`

Covers the primitive in isolation:

- Renders one row per child; primary `children` appear.
- `color` prop is applied as `background-color` on every rail segment and `border-color` on every bullet.
- `bullet='open'` (default) renders 12px bullet with white/dark fill.
- `bullet='filled'` renders 20px solid disc (no white fill).
- `status='current'` overrides bullet to halo variant (`data-stop-bullet='halo'`), applies row tint, and ignores an explicit `bullet='filled'` (halo still wins).
- `status='past'` applies `opacity-60`.
- `status='skipped'` applies `opacity-60` and `line-through` on primary text.
- `href` wraps the row in a `<Link>` (asserted via `role="link"` + `href` attribute).
- Absent `href` renders no link.
- First item's top segment has `background-color: transparent`; last item's bottom segment is transparent; middle items' segments use `color`.
- `trailing` renders on the right; `below` renders under children inside the left column.
- `data-sequence` passthrough appears as `data-sequence` on the row.

### Updated: `apps/web/__tests__/components/StationList.test.tsx`

- Keep behavioral assertions: every station name renders, links resolve to `/{prefix}/{slug}`, transfer chips render for stations with other lines and are suppressed for single-line stations, terminal stations use `bullet='filled'`.
- Drop implementation-detail assertions against specific Tailwind spacing classes (`top-3`, `h-5`, etc.).
- Add targeting via `Steps.Item`'s `data-stop-bullet` where needed.

### Updated: `apps/web/__tests__/components/MetraTripStopTimeline.test.tsx`

- Keep: all stations render, correct departure times, `"Next stop"` / `"Skipped"` pills appear in the trailing cluster, delay chips render only for non-skipped rows, past rows dim, skipped rows dim + strikethrough, current row tinted.
- Update: the bullet assertion becomes "current row uses halo bullet" (`data-stop-bullet='halo'`), all other rows use `'open'`.
- Drop: the `top-3 bottom-3` regression test (no longer meaningful — rail is per-row segments now).

## Files touched

- **Added:** `apps/web/app/components/Steps/Steps.tsx`, `apps/web/app/components/Steps/Step.tsx`, `apps/web/app/components/Steps/index.ts`, `apps/web/__tests__/components/Steps.test.tsx`
- **Modified:** `apps/web/app/components/StationList.tsx`, `apps/web/app/components/MetraTripStopTimeline.tsx`, `apps/web/__tests__/components/StationList.test.tsx`, `apps/web/__tests__/components/MetraTripStopTimeline.test.tsx`
- **No changes:** `apps/web/app/metra/[line]/page.tsx`, `apps/web/app/cta/[line]/page.tsx`, `apps/web/app/metra/[line]/train/[trainNumber]/*.tsx` (or wherever `MetraTripRealtime` renders). Consumers of `StationList` and `MetraTripStopTimeline` see no API change.

## Follow-up specs (not in this plan)

1. **Mobile `Steps` implementation.** Mirror the locked API in React Native using the per-row segment approach already present in `apps/mobile/components/StationTimeline.tsx`. Migrates the existing mobile station timeline and covers the eventual mobile Metra trip detail screen.
2. **Optional `pulse` animation.** Adds `pulse?: boolean` to `Steps.Item`. Web uses CSS keyframes; mobile uses `Animated.Value`.
