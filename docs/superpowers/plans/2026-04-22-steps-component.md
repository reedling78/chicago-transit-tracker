# Steps Component Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable `Steps` / `Steps.Item` primitive on web and migrate both `StationList` and `MetraTripStopTimeline` to use it — replacing the absolute-positioned rail (which keeps producing alignment bugs) with per-row line segments.

**Architecture:** Compound component (`<Steps><Steps.Item></Steps.Item></Steps>`) under `apps/web/app/components/Steps/`. `Steps` uses `React.cloneElement` to inject `_color`, `_isFirst`, `_isLast` into each `Steps.Item`. Each `Steps.Item` owns its rail via a `flex flex-col` bullet column with flex-1 segments above and below the bullet. The public prop shape is locked for a future React Native port.

**Tech Stack:** React 19, Next.js 16, Tailwind CSS v4 (class-based dark mode), Jest 30 + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-04-22-steps-component-design.md`

---

## Conventions for every task below

- **Path alias:** `@components/Steps` resolves to `apps/web/app/components/Steps/index.ts` (see `apps/web/tsconfig.json`).
- **Tests:** run from the repo root via `cd apps/web && pnpm test <Pattern>` or via `pnpm -w run test` for the full suite. Individual-file invocations use `pnpm test Steps` (matches file name fragment).
- **Lint:** `pnpm -w run lint`. Must be clean before final commit.
- **Dark mode:** every color pairing uses `dark:` companions. Default light fill on open bullets is `bg-white`; dark is `dark:bg-gray-950`.
- **CTA branding:** the component receives `color` as a prop — it never hardcodes a route color. Consumers pass the official hex from `LINE_COLORS`.
- **Never amend commits.** One commit per task (or more if natural).

---

## Task 1: Scaffold `Steps` component with a failing first test

**Files:**
- Create: `apps/web/app/components/Steps/Steps.tsx`
- Create: `apps/web/app/components/Steps/Step.tsx`
- Create: `apps/web/app/components/Steps/index.ts`
- Create: `apps/web/__tests__/components/Steps.test.tsx`

- [ ] **Step 1: Write the failing test for basic rendering**

`apps/web/__tests__/components/Steps.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { Steps } from '@components/Steps'

const RED = '#c60c30'

describe('Steps', () => {
  it('renders one row per Steps.Item child with its children content', () => {
    render(
      <Steps color={RED}>
        <Steps.Item>Howard</Steps.Item>
        <Steps.Item>Jarvis</Steps.Item>
        <Steps.Item>95th</Steps.Item>
      </Steps>,
    )
    expect(screen.getByText('Howard')).toBeInTheDocument()
    expect(screen.getByText('Jarvis')).toBeInTheDocument()
    expect(screen.getByText('95th')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && pnpm test Steps`
Expected: FAIL — `@components/Steps` cannot be resolved.

- [ ] **Step 3: Create `Step.tsx` with the minimal Steps.Item component**

`apps/web/app/components/Steps/Step.tsx`:

```tsx
import type { ReactNode } from 'react'

export type StepStatus = 'default' | 'past' | 'current' | 'skipped'
export type StepBullet = 'open' | 'filled'

export interface StepsItemProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  status?: StepStatus
  bullet?: StepBullet
  href?: string
  trailing?: ReactNode
  below?: ReactNode
  children: ReactNode
}

// Internal props injected by <Steps>. Not part of the public API.
interface InternalStepsItemProps extends StepsItemProps {
  _color?: string
  _isFirst?: boolean
  _isLast?: boolean
}

export default function StepsItem({
  status = 'default',
  bullet = 'open',
  href,
  trailing,
  below,
  children,
  _color,
  _isFirst,
  _isLast,
  ...rest
}: InternalStepsItemProps) {
  return (
    <div {...rest}>
      {children}
    </div>
  )
}
```

- [ ] **Step 4: Create `Steps.tsx` with the container**

`apps/web/app/components/Steps/Steps.tsx`:

```tsx
import { Children, cloneElement, isValidElement, type ReactNode } from 'react'
import StepsItem, { type StepsItemProps } from './Step'

export interface StepsProps {
  color: string
  children: ReactNode
  className?: string
}

function Steps({ color, children, className }: StepsProps) {
  const items = Children.toArray(children).filter(isValidElement)
  const lastIdx = items.length - 1

  return (
    <div className={className}>
      {items.map((child, idx) =>
        cloneElement(child as React.ReactElement<StepsItemProps>, {
          // Internal props — cast through `as never` to bypass the public prop type.
          _color: color,
          _isFirst: idx === 0,
          _isLast: idx === lastIdx,
          key: child.key ?? idx,
        } as never),
      )}
    </div>
  )
}

Steps.Item = StepsItem

export { Steps }
export type { StepsItemProps } from './Step'
```

- [ ] **Step 5: Create the barrel export**

`apps/web/app/components/Steps/index.ts`:

```ts
export { Steps } from './Steps'
export type { StepsProps } from './Steps'
export type { StepsItemProps, StepStatus, StepBullet } from './Step'
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd apps/web && pnpm test Steps`
Expected: PASS (1/1).

- [ ] **Step 7: Commit**

```bash
git add apps/web/app/components/Steps apps/web/__tests__/components/Steps.test.tsx
git commit -m "feat(web): scaffold Steps component with compound API"
```

---

## Task 2: Bullet column with transparent rail segments on terminal rows

**Files:**
- Modify: `apps/web/app/components/Steps/Step.tsx`
- Modify: `apps/web/__tests__/components/Steps.test.tsx`

- [ ] **Step 1: Write failing tests for rail segments**

Add to `apps/web/__tests__/components/Steps.test.tsx`:

```tsx
it('makes the first item top-segment transparent and last item bottom-segment colored-transparent', () => {
  const { container } = render(
    <Steps color={RED}>
      <Steps.Item>A</Steps.Item>
      <Steps.Item>B</Steps.Item>
      <Steps.Item>C</Steps.Item>
    </Steps>,
  )
  const rows = container.querySelectorAll('[data-stop-sequence], [data-steps-item]')
  expect(rows.length).toBe(3)
  const firstTop = rows[0].querySelector('[data-rail-top]') as HTMLElement
  const firstBottom = rows[0].querySelector('[data-rail-bottom]') as HTMLElement
  const lastTop = rows[2].querySelector('[data-rail-top]') as HTMLElement
  const lastBottom = rows[2].querySelector('[data-rail-bottom]') as HTMLElement
  const middleTop = rows[1].querySelector('[data-rail-top]') as HTMLElement
  const middleBottom = rows[1].querySelector('[data-rail-bottom]') as HTMLElement

  expect(firstTop.style.backgroundColor).toBe('transparent')
  expect(firstBottom.style.backgroundColor).toBe('rgb(198, 12, 48)')
  expect(middleTop.style.backgroundColor).toBe('rgb(198, 12, 48)')
  expect(middleBottom.style.backgroundColor).toBe('rgb(198, 12, 48)')
  expect(lastTop.style.backgroundColor).toBe('rgb(198, 12, 48)')
  expect(lastBottom.style.backgroundColor).toBe('transparent')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && pnpm test Steps`
Expected: FAIL — no `[data-rail-top]` element found.

- [ ] **Step 3: Implement the bullet column with rail segments**

Replace the `return` in `apps/web/app/components/Steps/Step.tsx`:

```tsx
  const topSegmentColor = _isFirst ? 'transparent' : (_color ?? 'transparent')
  const bottomSegmentColor = _isLast ? 'transparent' : (_color ?? 'transparent')

  return (
    <div
      data-steps-item=""
      data-stop-status={status}
      {...rest}
      className="relative flex items-stretch gap-4"
    >
      <div className="flex w-6 shrink-0 flex-col items-center">
        <div
          data-rail-top
          aria-hidden
          className="w-[3px] flex-1"
          style={{ backgroundColor: topSegmentColor }}
        />
        <div
          data-stop-bullet={bullet}
          className="h-3 w-3 shrink-0 rounded-full border-2 bg-white dark:bg-gray-950"
          style={{ borderColor: _color }}
        />
        <div
          data-rail-bottom
          aria-hidden
          className="w-[3px] flex-1"
          style={{ backgroundColor: bottomSegmentColor }}
        />
      </div>

      <div className="min-w-0 flex-1 py-4">{children}</div>
    </div>
  )
```

- [ ] **Step 4: Run tests to verify**

Run: `cd apps/web && pnpm test Steps`
Expected: PASS (2/2).

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/components/Steps/Step.tsx apps/web/__tests__/components/Steps.test.tsx
git commit -m "feat(web): per-row rail segments for Steps.Item"
```

---

## Task 3: Bullet variants (open, filled)

**Files:**
- Modify: `apps/web/app/components/Steps/Step.tsx`
- Modify: `apps/web/__tests__/components/Steps.test.tsx`

- [ ] **Step 1: Write failing tests**

Add to `Steps.test.tsx`:

```tsx
it('renders an open bullet by default (12px, white/dark inner fill, colored border)', () => {
  const { container } = render(
    <Steps color={RED}>
      <Steps.Item>A</Steps.Item>
    </Steps>,
  )
  const bullet = container.querySelector('[data-stop-bullet]') as HTMLElement
  expect(bullet.getAttribute('data-stop-bullet')).toBe('open')
  expect(bullet.className).toContain('h-3')
  expect(bullet.className).toContain('w-3')
  expect(bullet.className).toContain('bg-white')
  expect(bullet.style.borderColor).toBe('rgb(198, 12, 48)')
  expect(bullet.style.backgroundColor).toBe('')
})

it('renders a filled bullet when bullet="filled"', () => {
  const { container } = render(
    <Steps color={RED}>
      <Steps.Item bullet="filled">A</Steps.Item>
    </Steps>,
  )
  const bullet = container.querySelector('[data-stop-bullet]') as HTMLElement
  expect(bullet.getAttribute('data-stop-bullet')).toBe('filled')
  expect(bullet.className).toContain('h-5')
  expect(bullet.className).toContain('w-5')
  expect(bullet.className).not.toContain('bg-white')
  expect(bullet.style.backgroundColor).toBe('rgb(198, 12, 48)')
  expect(bullet.style.borderColor).toBe('rgb(198, 12, 48)')
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `cd apps/web && pnpm test Steps`
Expected: FAIL — `bullet="filled"` renders open style.

- [ ] **Step 3: Implement bullet variant logic**

In `Step.tsx`, replace the bullet `<div>` with:

```tsx
        {(() => {
          const isFilled = bullet === 'filled'
          const bulletClass = isFilled
            ? 'h-5 w-5 shrink-0 rounded-full border-2'
            : 'h-3 w-3 shrink-0 rounded-full border-2 bg-white dark:bg-gray-950'
          const bulletStyle: React.CSSProperties = { borderColor: _color }
          if (isFilled) bulletStyle.backgroundColor = _color
          return (
            <div
              data-stop-bullet={bullet}
              className={bulletClass}
              style={bulletStyle}
            />
          )
        })()}
```

- [ ] **Step 4: Run tests**

Run: `cd apps/web && pnpm test Steps`
Expected: PASS (4/4).

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/components/Steps/Step.tsx apps/web/__tests__/components/Steps.test.tsx
git commit -m "feat(web): Steps.Item bullet variants (open|filled)"
```

---

## Task 4: Status variants (past, current, skipped) — row-level styles

**Files:**
- Modify: `apps/web/app/components/Steps/Step.tsx`
- Modify: `apps/web/__tests__/components/Steps.test.tsx`

- [ ] **Step 1: Write failing tests**

Add to `Steps.test.tsx`:

```tsx
it('applies opacity-60 on past rows', () => {
  const { container } = render(
    <Steps color={RED}>
      <Steps.Item status="past">A</Steps.Item>
    </Steps>,
  )
  const row = container.querySelector('[data-steps-item]') as HTMLElement
  expect(row.className).toContain('opacity-60')
})

it('applies opacity-60 and line-through wrapper on skipped rows', () => {
  const { container } = render(
    <Steps color={RED}>
      <Steps.Item status="skipped">A</Steps.Item>
    </Steps>,
  )
  const row = container.querySelector('[data-steps-item]') as HTMLElement
  expect(row.className).toContain('opacity-60')
  const leftWrap = row.querySelector('[data-steps-left]') as HTMLElement
  expect(leftWrap.className).toContain('line-through')
})

it('tints current rows with 8% alpha of the line color', () => {
  const { container } = render(
    <Steps color={RED}>
      <Steps.Item status="current">A</Steps.Item>
    </Steps>,
  )
  const row = container.querySelector('[data-steps-item]') as HTMLElement
  // `${RED}14` — 8% alpha suffix
  expect(row.style.backgroundColor).not.toBe('')
})
```

- [ ] **Step 2: Run test**

Expected: FAIL — no status styling yet.

- [ ] **Step 3: Implement status row styling**

In `Step.tsx` just before the `return`:

```tsx
  const rowStyle: React.CSSProperties = {}
  let rowClass = 'relative flex items-stretch gap-4'
  if (status === 'past' || status === 'skipped') rowClass += ' opacity-60'
  if (status === 'current' && _color) {
    rowStyle.backgroundColor = `${_color}14` // 8% alpha
  }

  const leftWrapClass =
    'flex-1 min-w-0' + (status === 'skipped' ? ' line-through' : '')
```

Then change the returned root div to use `className={rowClass}` and `style={rowStyle}`, and wrap `children` in:

```tsx
      <div data-steps-left className={leftWrapClass + ' py-4'}>
        {children}
      </div>
```

(Remove the previous unconditional `<div className="min-w-0 flex-1 py-4">`.)

- [ ] **Step 4: Run tests**

Expected: PASS (7/7).

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/components/Steps/Step.tsx apps/web/__tests__/components/Steps.test.tsx
git commit -m "feat(web): Steps.Item status variants (past|current|skipped)"
```

---

## Task 5: Halo bullet when status='current' (overrides `bullet` prop)

**Files:**
- Modify: `apps/web/app/components/Steps/Step.tsx`
- Modify: `apps/web/__tests__/components/Steps.test.tsx`

- [ ] **Step 1: Write failing tests**

Add to `Steps.test.tsx`:

```tsx
it('renders a halo bullet when status="current" (overrides explicit bullet prop)', () => {
  const { container } = render(
    <Steps color={RED}>
      <Steps.Item status="current" bullet="filled">A</Steps.Item>
    </Steps>,
  )
  const bullet = container.querySelector('[data-stop-bullet]') as HTMLElement
  expect(bullet.getAttribute('data-stop-bullet')).toBe('halo')
  // Inner disc is filled with the color.
  expect(bullet.style.backgroundColor).toBe('rgb(198, 12, 48)')
  // Halo ring is applied via box-shadow in the line color at ~30% alpha.
  expect(bullet.style.boxShadow).toContain('rgba(198, 12, 48')
})
```

- [ ] **Step 2: Run test**

Expected: FAIL — `data-stop-bullet` still equals `'filled'` or `'open'`.

- [ ] **Step 3: Implement halo logic**

In `Step.tsx`, change the bullet IIFE to:

```tsx
        {(() => {
          const isCurrent = status === 'current'
          const isFilled = bullet === 'filled'
          const variant = isCurrent ? 'halo' : bullet
          const bulletClass = (() => {
            if (isCurrent) return 'h-3 w-3 shrink-0 rounded-full'
            if (isFilled) return 'h-5 w-5 shrink-0 rounded-full border-2'
            return 'h-3 w-3 shrink-0 rounded-full border-2 bg-white dark:bg-gray-950'
          })()
          const bulletStyle: React.CSSProperties = { borderColor: _color }
          if (isCurrent) {
            bulletStyle.backgroundColor = _color
            bulletStyle.borderColor = undefined
            // Halo: 4px outer ring at ~30% alpha (hex suffix 4d).
            bulletStyle.boxShadow = _color ? `0 0 0 4px ${hexWithAlpha(_color, 0.3)}` : undefined
          } else if (isFilled) {
            bulletStyle.backgroundColor = _color
          }
          return <div data-stop-bullet={variant} className={bulletClass} style={bulletStyle} />
        })()}
```

Add a helper above the component:

```tsx
function hexWithAlpha(hex: string, alpha: number): string {
  // Expects '#rrggbb' — the public API documents `color` as a hex route color.
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
```

- [ ] **Step 4: Run tests**

Expected: PASS (8/8).

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/components/Steps/Step.tsx apps/web/__tests__/components/Steps.test.tsx
git commit -m "feat(web): halo bullet variant for current status"
```

---

## Task 6: `href` wraps the row content in a Next `<Link>`

**Files:**
- Modify: `apps/web/app/components/Steps/Step.tsx`
- Modify: `apps/web/__tests__/components/Steps.test.tsx`

- [ ] **Step 1: Write failing tests**

Add to `Steps.test.tsx`:

```tsx
it('wraps row content in a Link when href is provided', () => {
  render(
    <Steps color={RED}>
      <Steps.Item href="/metra/bnsf/aurora">Aurora</Steps.Item>
    </Steps>,
  )
  const link = screen.getByRole('link', { name: /aurora/i })
  expect(link).toHaveAttribute('href', '/metra/bnsf/aurora')
})

it('renders no link when href is absent', () => {
  render(
    <Steps color={RED}>
      <Steps.Item>Aurora</Steps.Item>
    </Steps>,
  )
  expect(screen.queryByRole('link', { name: /aurora/i })).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run test**

Expected: FAIL — no `role="link"` rendered.

- [ ] **Step 3: Implement Link wrapping**

At the top of `Step.tsx`:

```tsx
import Link from 'next/link'
```

Replace the content block (the flex-1 min-w-0 wrapper) with:

```tsx
      {href ? (
        <Link href={href} className="group flex min-w-0 flex-1 flex-col py-4">
          <div className="flex items-start justify-between gap-4">
            <div
              data-steps-left=""
              className={'min-w-0 flex-1' + (status === 'skipped' ? ' line-through' : '')}
            >
              {children}
            </div>
            {trailing && <div className="shrink-0">{trailing}</div>}
          </div>
          {below && <div className="mt-1.5">{below}</div>}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 flex-col py-4">
          <div className="flex items-start justify-between gap-4">
            <div
              data-steps-left=""
              className={'min-w-0 flex-1' + (status === 'skipped' ? ' line-through' : '')}
            >
              {children}
            </div>
            {trailing && <div className="shrink-0">{trailing}</div>}
          </div>
          {below && <div className="mt-1.5">{below}</div>}
        </div>
      )}
```

(You'll update `trailing` and `below` behavior fully in Task 7 — this step adds the Link wrapper and the slot scaffolding. The existing `leftWrapClass` is no longer used in this layout; remove it.)

- [ ] **Step 4: Run full Steps tests**

Expected: previous tests still pass; new link tests pass (10/10).

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/components/Steps/Step.tsx apps/web/__tests__/components/Steps.test.tsx
git commit -m "feat(web): Steps.Item wraps content in Link when href is set"
```

---

## Task 7: Lock in `trailing` + `below` slot behavior with tests

**Files:**
- Modify: `apps/web/__tests__/components/Steps.test.tsx`

(The slot plumbing landed in Task 6; this task adds explicit coverage so future refactors can't silently break it.)

- [ ] **Step 1: Write tests**

Add to `Steps.test.tsx`:

```tsx
it('renders trailing content to the right of children', () => {
  const { container } = render(
    <Steps color={RED}>
      <Steps.Item trailing={<span data-testid="t">6:30 AM</span>}>Aurora</Steps.Item>
    </Steps>,
  )
  const row = container.querySelector('[data-steps-item]') as HTMLElement
  const flexRow = row.querySelector('[data-steps-left]')!.parentElement as HTMLElement
  const children = Array.from(flexRow.children)
  // children[0] is the left cell (data-steps-left), children[1] is the trailing cell.
  expect((children[0] as HTMLElement).dataset.stepsLeft).toBe('')
  expect(children[1]?.textContent).toContain('6:30 AM')
})

it('renders below content under children (not under trailing)', () => {
  const { container } = render(
    <Steps color={RED}>
      <Steps.Item
        trailing={<span>6:30 AM</span>}
        below={<span data-testid="b">Transfer chips</span>}
      >
        Aurora
      </Steps.Item>
    </Steps>,
  )
  const below = container.querySelector('[data-testid="b"]') as HTMLElement
  // Below is rendered inside the same vertical column as children (not inside the trailing cell).
  const row = container.querySelector('[data-steps-item]') as HTMLElement
  const link = row.querySelector('a, div.flex.min-w-0.flex-1.flex-col') as HTMLElement
  expect(link.contains(below)).toBe(true)
})
```

- [ ] **Step 2: Run tests**

Expected: PASS (12/12).

- [ ] **Step 3: Commit**

```bash
git add apps/web/__tests__/components/Steps.test.tsx
git commit -m "test(web): cover Steps.Item trailing/below slot layout"
```

---

## Task 8: Migrate `StationList` to `Steps`

**Files:**
- Modify: `apps/web/app/components/StationList.tsx`
- Modify: `apps/web/__tests__/components/StationList.test.tsx`

- [ ] **Step 1: Read the current StationList tests**

Read `apps/web/__tests__/components/StationList.test.tsx` fully. Identify:
- Behavioral assertions (names render, links resolve, transfer chips render) — **keep these**
- Implementation-detail assertions (specific Tailwind classes like `top-3`, `h-5`, `border-l-transparent`, etc.) — **delete these**

- [ ] **Step 2: Update the StationList test file**

Replace the test file contents with an updated version that asserts only behavior plus Steps-level semantic attributes. Example skeleton (adapt to the actual existing cases in the file):

```tsx
import { render, screen } from '@testing-library/react'
import StationList from '@components/StationList'
import type { Station } from '@lib/types'

const stations: Station[] = [
  // ... copy or import the fixture shape the existing tests use
]

describe('StationList', () => {
  it('renders every station name', () => {
    render(<StationList stations={stations} lineColor="#c60c30" stationHrefPrefix="/cta/red" currentLine="Red" />)
    stations.forEach((s) => expect(screen.getByText(s.name)).toBeInTheDocument())
  })

  it('links each station to its detail page', () => {
    render(<StationList stations={stations} lineColor="#c60c30" stationHrefPrefix="/cta/red" currentLine="Red" />)
    const link = screen.getByRole('link', { name: new RegExp(stations[0].name, 'i') })
    expect(link).toHaveAttribute('href', `/cta/red/${stations[0].slug}`)
  })

  it('renders transfer chips for stations that serve other lines (excluding the current line)', () => {
    // use a fixture where station.lines includes currentLine + at least one other
  })

  it('uses bullet="filled" on terminal stations and "open" on non-terminals', () => {
    const { container } = render(
      <StationList stations={stations} lineColor="#c60c30" stationHrefPrefix="/cta/red" currentLine="Red" />,
    )
    const bullets = container.querySelectorAll('[data-stop-bullet]')
    const terminals = stations.filter((s) => s.terminal)
    const mids = stations.filter((s) => !s.terminal)
    const filled = Array.from(bullets).filter((b) => b.getAttribute('data-stop-bullet') === 'filled')
    const open = Array.from(bullets).filter((b) => b.getAttribute('data-stop-bullet') === 'open')
    expect(filled.length).toBe(terminals.length)
    expect(open.length).toBe(mids.length)
  })
})
```

(Use the fixtures and specific examples already present in the existing test file — don't fabricate new stations that aren't representative.)

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd apps/web && pnpm test StationList`
Expected: FAIL — component still renders the old structure / tests may pass on a subset but `data-stop-bullet` selectors won't find anything.

- [ ] **Step 4: Rewrite `StationList.tsx` to use `Steps`**

Replace the file contents with:

```tsx
import { Steps } from '@components/Steps'
import type { Station } from '@lib/types'
import { LINE_COLORS } from '@lib/constants'

interface StationListProps {
  stations: Station[]
  lineColor: string
  stationHrefPrefix: string
  /** Short name of the current line — excluded from transfer chips */
  currentLine: string
}

function WheelchairIcon() {
  return (
    <svg
      aria-label="ADA Accessible"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="inline-block h-3.5 w-3.5 shrink-0 text-blue-500"
    >
      <circle cx="12" cy="4" r="2" />
      <path d="M10 7.5a2 2 0 0 0-2 2V14l-2.5 4.5A1 1 0 0 0 6.4 20h.2a1 1 0 0 0 .88-.52L10 15h2v4a1 1 0 0 0 2 0v-4.5A1.5 1.5 0 0 0 12.5 13H11V9.5H14a1 1 0 0 0 0-2h-4z" />
    </svg>
  )
}

function TransferChips({ lines }: { lines: string[] }) {
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {lines.map((line) => {
        const colors = LINE_COLORS[line]
        return colors ? (
          <span
            key={line}
            className="rounded px-2 py-0.5 text-xs font-semibold"
            style={{ backgroundColor: colors.bg, color: colors.text }}
          >
            {line}
          </span>
        ) : (
          <span
            key={line}
            className="rounded bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-400"
          >
            {line}
          </span>
        )
      })}
    </div>
  )
}

function Arrow() {
  return (
    <span className="mt-0.5 text-gray-300 transition group-hover:text-gray-500 dark:text-gray-600 dark:group-hover:text-gray-400">
      →
    </span>
  )
}

export default function StationList({
  stations,
  lineColor,
  stationHrefPrefix,
  currentLine,
}: StationListProps) {
  return (
    <div>
      <Steps color={lineColor} className="border-t border-gray-100 dark:border-gray-800">
        {stations.map((station) => {
          const otherLines = station.lines.filter((l) => l !== currentLine)
          return (
            <Steps.Item
              key={station.slug}
              bullet={station.terminal ? 'filled' : 'open'}
              href={`${stationHrefPrefix}/${station.slug}`}
              trailing={<Arrow />}
              below={otherLines.length > 0 ? <TransferChips lines={otherLines} /> : undefined}
            >
              <p className="flex items-center gap-1.5 font-semibold text-gray-900 group-hover:underline dark:text-white">
                {station.name}
                {station.accessibility.ada && <WheelchairIcon />}
              </p>
            </Steps.Item>
          )
        })}
      </Steps>
    </div>
  )
}
```

Note: the row-border visual (horizontal line between stations) is added in Task 9 as a default on `Steps.Item`, so `StationList` doesn't need to supply it per-row here. Rows will look borderless after this task's commit and regain their dividers in Task 9.

- [ ] **Step 5: Run tests**

Run: `cd apps/web && pnpm test StationList && pnpm test Steps`
Expected: BOTH PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/components/StationList.tsx apps/web/__tests__/components/StationList.test.tsx
git commit -m "refactor(web): migrate StationList to Steps primitive"
```

---

## Task 9: Add row borders to `Steps.Item` (shared default for both consumers)

**Files:**
- Modify: `apps/web/app/components/Steps/Step.tsx`
- Modify: `apps/web/__tests__/components/Steps.test.tsx`

Both `StationList` and `MetraTripStopTimeline` previously rendered a `border-b` on each row (except the last). Put it in `Steps.Item` once.

- [ ] **Step 1: Write failing test**

Add to `Steps.test.tsx`:

```tsx
it('renders border-bottom on every row except the last', () => {
  const { container } = render(
    <Steps color={RED}>
      <Steps.Item>A</Steps.Item>
      <Steps.Item>B</Steps.Item>
      <Steps.Item>C</Steps.Item>
    </Steps>,
  )
  const rows = Array.from(container.querySelectorAll('[data-steps-item]'))
  expect(rows[0].className).toContain('border-b')
  expect(rows[1].className).toContain('border-b')
  expect(rows[2].className).toContain('last:border-b-0')
})
```

- [ ] **Step 2: Run test — verify failure**

Expected: FAIL.

- [ ] **Step 3: Implement**

In `Step.tsx`, change `rowClass` to start with:

```tsx
  let rowClass =
    'relative flex items-stretch gap-4 border-b border-gray-100 last:border-b-0 dark:border-gray-800'
```

- [ ] **Step 4: Run tests**

Run: `cd apps/web && pnpm test Steps`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/components/Steps/Step.tsx apps/web/__tests__/components/Steps.test.tsx
git commit -m "feat(web): default border-bottom on Steps.Item rows"
```

---

## Task 10: Migrate `MetraTripStopTimeline` to `Steps`

**Files:**
- Modify: `apps/web/app/components/MetraTripStopTimeline.tsx`
- Modify: `apps/web/__tests__/components/MetraTripStopTimeline.test.tsx`

- [ ] **Step 1: Update tests**

Open `apps/web/__tests__/components/MetraTripStopTimeline.test.tsx`. Keep:
- Row per stop, data-stop-sequence present, correct sequence values
- Every station name renders
- Links resolve to `/metra/{lineSlug}/{slug}`
- Station with `slug: null` is not a link
- Departure (not arrival) renders on each row
- `"Next stop"` pill on the current row; `"Skipped"` pill on skipped rows
- Red `+N min` and green `-N min` delay chips (and suppressed on skipped rows)
- Past rows have opacity-60
- Current row has line-color tint background
- Skipped row has opacity-60 AND line-through on the station name

Replace/remove:
- The regression test asserting `top-8`/`top-3`/`bottom-3` on the rail — **delete** (no absolute rail anymore)
- The `'renders a filled bullet on the first and last stops (terminals)'` test — replace with:

```tsx
it('renders all non-current rows with the open bullet variant and the current row with the halo bullet', () => {
  const stops = baseStops.map((d, i): DerivedStop => {
    if (i === 2) return { ...d, status: 'current' }
    if (i < 2) return { ...d, status: 'past' }
    return d
  })
  const { container } = render(
    <MetraTripStopTimeline derivedStops={stops} lineColor={LINE_COLOR} lineSlug="bnsf" />,
  )
  const bullets = Array.from(container.querySelectorAll('[data-stop-bullet]'))
  expect(bullets.length).toBe(4)
  expect(bullets[0].getAttribute('data-stop-bullet')).toBe('open')
  expect(bullets[1].getAttribute('data-stop-bullet')).toBe('open')
  expect(bullets[2].getAttribute('data-stop-bullet')).toBe('halo')
  expect(bullets[3].getAttribute('data-stop-bullet')).toBe('open')
})
```

- [ ] **Step 2: Run tests (expect failures against old implementation — acceptable to see red here)**

Run: `cd apps/web && pnpm test MetraTripStopTimeline`
Expected: some FAILs (rail tests removed, bullet expectations shifted).

- [ ] **Step 3: Rewrite `MetraTripStopTimeline.tsx`**

Replace the entire file with:

```tsx
import { Steps } from '@components/Steps'
import type { StepStatus } from '@components/Steps'
import type { DerivedStop } from '@lib/metra-status'

interface Props {
  derivedStops: DerivedStop[]
  lineColor: string
  lineSlug: string
}

function StopMeta({
  status,
  skipped,
  time,
  delayMinutes,
}: {
  status: DerivedStop['status']
  skipped: boolean
  time: string
  delayMinutes: number | null
}) {
  return (
    <span className="mt-0.5 flex items-center gap-1.5 text-sm font-medium whitespace-nowrap text-gray-900 tabular-nums dark:text-white">
      {skipped && (
        <span className="inline-block rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
          Skipped
        </span>
      )}
      {!skipped && status === 'current' && (
        <span className="inline-block rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          Next stop
        </span>
      )}
      <span>{time}</span>
      {!skipped && delayMinutes != null && delayMinutes > 0 && (
        <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">
          +{delayMinutes} min
        </span>
      )}
      {!skipped && delayMinutes != null && delayMinutes < 0 && (
        <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
          {delayMinutes} min
        </span>
      )}
    </span>
  )
}

function mapStatus(raw: DerivedStop['status'], skipped: boolean): StepStatus {
  if (skipped) return 'skipped'
  if (raw === 'past') return 'past'
  if (raw === 'current') return 'current'
  return 'default'
}

export default function MetraTripStopTimeline({ derivedStops, lineColor, lineSlug }: Props) {
  return (
    <Steps color={lineColor}>
      {derivedStops.map((derived) => {
        const { stop, status, delayMinutes, skipped } = derived
        const mappedStatus = mapStatus(status, skipped)
        return (
          <Steps.Item
            key={stop.sequence}
            data-stop-sequence={stop.sequence}
            status={mappedStatus}
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
            <p className="font-semibold text-gray-900 group-hover:underline dark:text-white">
              {stop.stationName}
            </p>
          </Steps.Item>
        )
      })}
    </Steps>
  )
}
```

- [ ] **Step 4: Run tests**

Run: `cd apps/web && pnpm test MetraTripStopTimeline && pnpm test Steps && pnpm test StationList`
Expected: ALL PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/components/MetraTripStopTimeline.tsx apps/web/__tests__/components/MetraTripStopTimeline.test.tsx
git commit -m "refactor(web): migrate MetraTripStopTimeline to Steps primitive"
```

---

## Task 11: Full test + lint sweep

- [ ] **Step 1: Run the full test suite**

Run: `pnpm -w run test`
Expected: ALL PASS, zero warnings.

- [ ] **Step 2: Run lint**

Run: `pnpm -w run lint`
Expected: clean — zero errors, zero warnings.

- [ ] **Step 3: If either failed, fix and re-run**

Fix anything flagged. Do not commit until both are clean. When clean, move to Task 12 (no commit in this task — the manual verification task produces the last commit if any tweaks are needed).

---

## Task 12: Manual browser verification

Start the dev server and walk through both migrated surfaces. Do NOT declare the task done without doing this — visual regressions are the whole reason we're here.

- [ ] **Step 1: Start the dev server**

Run: `cd apps/web && pnpm run dev`
Wait for `ready - started server on http://localhost:3000`.

- [ ] **Step 2: Test StationList (CTA line)**

Open `http://localhost:3000/cta/red`. Verify:
- Rail runs continuously through all station bullets
- No rail stub above the first terminal or below the last terminal
- Terminals render as 20px filled discs in Red (`#c60c30`)
- Non-terminals render as 12px open circles with red border
- Transfer chips appear under stations that serve other lines
- Each station row is clickable and links to the correct `/cta/red/{slug}` page
- Both light and dark mode render correctly

- [ ] **Step 3: Test StationList (Metra line)**

Open `http://localhost:3000/metra/bnsf`. Verify same items as Step 2 but in BNSF green with the Metra-specific set of transfer chips (BNSF stations sometimes share with other Metra lines).

- [ ] **Step 4: Test MetraTripStopTimeline**

Open a live Metra trip (pick any current-day train). Example route pattern: `http://localhost:3000/metra/bnsf/train/1200` (or find an active train number from `/metra/bnsf`). Verify:
- All bullets are small open circles in the line color
- The "current" stop (if the train is live) renders the halo bullet
- The row tint on the current stop is the line color at low alpha
- "Next stop" pill appears inline with the departure time on the right
- Past rows are dimmed
- A skipped stop (if any appear) shows "Skipped" pill, line-through, and dim
- Delay chips (+N min red, -N min green) render correctly when present
- Row links navigate to the correct station detail page

- [ ] **Step 5: Take a screenshot if visual regressions remain**

If anything looks off, stop, capture the evidence, and report back. If everything looks right, proceed.

- [ ] **Step 6: If visual tweaks were needed, commit them**

```bash
git add apps/web/app/components/
git commit -m "style(web): visual polish after Steps migration"
```

If no tweaks were needed, skip this step.

---

## Follow-up (not in this plan)

- Mobile `Steps` implementation (own spec, own plan).
- Optional `pulse?: boolean` prop for animated halo (web: CSS keyframes; mobile: `Animated.Value`).

