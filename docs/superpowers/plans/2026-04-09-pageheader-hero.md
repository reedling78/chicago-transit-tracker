# PageHeader Hero Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the `PageHeader` component into a full-bleed, bottom-anchored gradient photo hero using a Chicago CTA train image, applied to all 14 pages that currently use `PageHeader`.

**Architecture:** Single component rewrite — `app/components/PageHeader.tsx` becomes a full-bleed `<section>` containing a `next/image` background, two overlay layers (flat tint + bottom gradient), and the existing content slots (badges, h1, description, children) pinned to the bottom. The props API is unchanged. Two line-detail pages get a minor layout restructure so the hero can span full width.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4 (class-based dark mode), `next/image`, Jest 30, React Testing Library.

**Spec:** [docs/superpowers/specs/2026-04-09-pageheader-hero-design.md](docs/superpowers/specs/2026-04-09-pageheader-hero-design.md)

---

## File Structure

- **Create:** `public/hero-header.jpg` — the hero background image (copied from `docs/assets/shutterstock_2614255565.jpg`, already 213KB so no pre-optimization needed)
- **Modify:** [app/components/PageHeader.tsx](app/components/PageHeader.tsx) — full rewrite of the render body; props interface unchanged
- **Modify:** [app/cta/[line]/page.tsx](app/cta/[line]/page.tsx) — move `<PageHeader>` out of the grid cell, above the grid
- **Modify:** [app/metra/[line]/page.tsx](app/metra/[line]/page.tsx) — same restructure
- **Modify:** [__tests__/components/PageHeader.test.tsx](__tests__/components/PageHeader.test.tsx) — mock `next/image`, refresh snapshot, add an image-rendering assertion
- **Delete then regenerate:** `__tests__/components/__snapshots__/PageHeader.test.tsx.snap`

---

## Task 1: Add the hero image to public/

**Files:**
- Create: `public/hero-header.jpg`
- Source: `docs/assets/shutterstock_2614255565.jpg`

- [ ] **Step 1: Copy image to public/**

Run:
```bash
cp docs/assets/shutterstock_2614255565.jpg public/hero-header.jpg
```

- [ ] **Step 2: Verify the file is in place and is a sensible size**

Run:
```bash
ls -lh public/hero-header.jpg
```
Expected: file exists, size around 200–250KB.

- [ ] **Step 3: Commit**

```bash
git add public/hero-header.jpg
git commit -m "chore: add hero-header.jpg to public assets"
```

---

## Task 2: Update test — mock next/image and add image assertion

We do this before rewriting the component so the new tests drive the rewrite.

**Files:**
- Modify: `__tests__/components/PageHeader.test.tsx`
- Delete: `__tests__/components/__snapshots__/PageHeader.test.tsx.snap`

- [ ] **Step 1: Delete the old snapshot file**

Run:
```bash
rm -f __tests__/components/__snapshots__/PageHeader.test.tsx.snap
```

- [ ] **Step 2: Replace the test file with this content**

Write the following to `__tests__/components/PageHeader.test.tsx` (complete file, replacing the existing contents):

```tsx
import { render, screen } from '@testing-library/react'
import PageHeader from '@components/PageHeader'

// next/image uses features not available in jsdom. Render it as a plain <img>
// so we can assert on the src without pulling in Next's runtime.
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...rest }: { src: string; alt: string }) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img src={src} alt={alt} {...rest} />
  },
}))

describe('PageHeader', () => {
  it('renders the title as an h1', () => {
    render(<PageHeader title="CTA Lines" />)
    expect(screen.getByRole('heading', { level: 1, name: 'CTA Lines' })).toBeInTheDocument()
  })

  it('renders description when provided', () => {
    render(<PageHeader title="CTA Lines" description="8 rapid transit lines." />)
    expect(screen.getByText('8 rapid transit lines.')).toBeInTheDocument()
  })

  it('does not render description element when omitted', () => {
    render(<PageHeader title="CTA Lines" />)
    expect(screen.queryByText(/rapid transit/)).not.toBeInTheDocument()
  })

  it('renders badges slot when provided', () => {
    render(<PageHeader title="CTA Lines" badges={<span>Red Line</span>} />)
    expect(screen.getByText('Red Line')).toBeInTheDocument()
  })

  it('renders children when provided', () => {
    render(
      <PageHeader title="CTA Lines">
        <span>Extra content</span>
      </PageHeader>,
    )
    expect(screen.getByText('Extra content')).toBeInTheDocument()
  })

  it('renders the hero-header background image (decorative, empty alt)', () => {
    const { container } = render(<PageHeader title="CTA Lines" />)
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img?.getAttribute('src')).toContain('/hero-header.jpg')
    expect(img?.getAttribute('alt')).toBe('')
  })

  it('matches snapshot', () => {
    const { container } = render(
      <PageHeader
        title="CTA Lines"
        description="8 rapid transit lines."
        badges={<span>Badge</span>}
      >
        <span>Child</span>
      </PageHeader>,
    )
    expect(container).toMatchSnapshot()
  })
})
```

- [ ] **Step 3: Run the tests — they should fail on the new image assertion**

Run:
```bash
npm test -- --testPathPattern=PageHeader.test.tsx
```

Expected: Six existing tests pass; the new "renders the hero-header background image" test **FAILS** because the current component has no `<img>`. The snapshot test will also fail (old snapshot was deleted → creates a new one; we'll regenerate after the rewrite).

- [ ] **Step 4: Do not commit yet** — we'll commit after the component rewrite in Task 3 so HEAD is always green.

---

## Task 3: Rewrite the PageHeader component

**Files:**
- Modify: `app/components/PageHeader.tsx`

- [ ] **Step 1: Replace `app/components/PageHeader.tsx` with the new implementation**

Write the following complete file:

```tsx
import Image from 'next/image'

interface PageHeaderProps {
  title: string
  description?: string
  /** Pill badges rendered above the title */
  badges?: React.ReactNode
  /** Extra content rendered below the description — e.g. line colour chips */
  children?: React.ReactNode
}

export default function PageHeader({ title, description, badges, children }: PageHeaderProps) {
  return (
    <section className="relative mb-8 -mx-4 flex h-56 flex-col justify-end overflow-hidden sm:-mx-6 sm:h-64 lg:-mx-8 lg:h-72">
      {/* Background photo */}
      <Image
        src="/hero-header.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-[center_40%]"
      />

      {/* Layer 1 — flat tint */}
      <div className="absolute inset-0 bg-black/30 dark:bg-black/40" aria-hidden="true" />

      {/* Layer 2 — bottom gradient */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent dark:from-black/85 dark:via-black/40"
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        {badges && <div className="mb-3 flex flex-wrap items-center gap-2">{badges}</div>}
        <h1
          className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl"
          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}
        >
          {title}
        </h1>
        {description && (
          <p className="mt-3 max-w-2xl text-sm text-white/70 sm:text-base">{description}</p>
        )}
        {children && <div className="mt-4">{children}</div>}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Run the tests — all should pass except the snapshot**

Run:
```bash
npm test -- --testPathPattern=PageHeader.test.tsx
```

Expected: Seven of eight assertions pass (including the new image assertion). The snapshot test fails with "snapshot file was not written" or similar — this is expected because we deleted the old snapshot in Task 2.

- [ ] **Step 3: Regenerate the snapshot**

Run:
```bash
npm test -- --testPathPattern=PageHeader.test.tsx -u
```

Expected: All eight assertions pass. A new snapshot file is written at `__tests__/components/__snapshots__/PageHeader.test.tsx.snap`.

- [ ] **Step 4: Run the full test suite**

Run:
```bash
npm test
```

Expected: Zero failures, zero warnings. If any other tests rely on the old PageHeader markup (e.g., page-level tests that snapshot a page containing PageHeader), they will fail. If that happens:
- Inspect the failing test
- If it's a snapshot test that includes PageHeader output, re-run with `-u` to regenerate only that snapshot after eyeballing the diff
- If it's an assertion-based test, it likely relied on the old `border-b` / `pb-8` DOM — update the assertion to match the new structure

- [ ] **Step 5: Run the linter**

Run:
```bash
npm run lint
```

Expected: zero errors, zero warnings.

- [ ] **Step 6: Commit**

```bash
git add app/components/PageHeader.tsx __tests__/components/PageHeader.test.tsx __tests__/components/__snapshots__/PageHeader.test.tsx.snap
git commit -m "feat(pageheader): convert to gradient photo hero"
```

---

## Task 4: Restructure CTA line detail page — move PageHeader above the grid

**Files:**
- Modify: `app/cta/[line]/page.tsx`

The current structure has `<PageHeader>` nested inside `<div className="lg:col-span-2">`. That confines the full-bleed hero to 2/3 of the grid width, which looks broken. Move it above the grid.

- [ ] **Step 1: Edit the return JSX**

Replace the `return (...)` block (lines 54–108 in the current file) with this structure. The edit pulls `<PageHeader>` out of the grid and places it between `<Breadcrumb />` and `<div className="grid ...">`:

```tsx
  return (
    <main>
      <Breadcrumb items={[{ label: 'CTA Lines', href: '/cta' }, { label: line.name }]} />

      <PageHeader
        title={line.name}
        description={line.description}
        badges={
          <>
            <CTALineIcon line={line.shortName} size={40} />
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              Rapid Transit
            </span>
            {line.operatesOvernight && (
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                24 Hours
              </span>
            )}
            {line.scheduleUrl && (
              <Link
                href={line.scheduleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
              >
                <svg
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="h-3 w-3"
                  aria-hidden="true"
                >
                  <path d="M8 1a.75.75 0 0 1 .75.75v6.19l1.97-1.97a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.03a.75.75 0 0 1 1.06-1.06L7.25 7.94V1.75A.75.75 0 0 1 8 1ZM2.5 13.25a.75.75 0 0 1 .75-.75h9.5a.75.75 0 0 1 0 1.5h-9.5a.75.75 0 0 1-.75-.75Z" />
                </svg>
                Schedule PDF
              </Link>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <LineDetail line={line} />
          <CTAAlerts line={line} hideChips />
        </div>
        <div className="lg:col-span-1">
          <StationList
            stations={stationList}
            lineColor={line.color}
            stationHrefPrefix={`/cta/${slug}`}
            currentLine={line.shortName}
          />
        </div>
      </div>
    </main>
  )
```

- [ ] **Step 2: Run lint + tests**

Run:
```bash
npm run lint && npm test
```

Expected: zero errors, zero warnings, all tests pass.

- [ ] **Step 3: Commit**

```bash
git add app/cta/[line]/page.tsx
git commit -m "refactor(cta): move PageHeader above grid on line detail"
```

---

## Task 5: Restructure Metra line detail page — same fix

**Files:**
- Modify: `app/metra/[line]/page.tsx`

- [ ] **Step 1: Edit the return JSX**

Replace the `return (...)` block (lines 53–112 in the current file) with this structure:

```tsx
  return (
    <main>
      <Breadcrumb items={[{ label: 'Metra Lines', href: '/metra' }, { label: line.name }]} />

      <PageHeader
        title={line.name}
        description={line.description}
        badges={
          <>
            <span
              className="rounded-full px-3 py-1 text-xs font-semibold"
              style={{ backgroundColor: line.color, color: line.textColor }}
            >
              {line.shortName}
            </span>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              Commuter Rail
            </span>
            {line.operatesOvernight && (
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                24 Hours
              </span>
            )}
            {line.scheduleUrl && (
              <Link
                href={line.scheduleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
              >
                <svg
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="h-3 w-3"
                  aria-hidden="true"
                >
                  <path d="M8 1a.75.75 0 0 1 .75.75v6.19l1.97-1.97a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.03a.75.75 0 0 1 1.06-1.06L7.25 7.94V1.75A.75.75 0 0 1 8 1ZM2.5 13.25a.75.75 0 0 1 .75-.75h9.5a.75.75 0 0 1 0 1.5h-9.5a.75.75 0 0 1-.75-.75Z" />
                </svg>
                Schedule PDF
              </Link>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <LineDetail line={line} />
          <MetraAlerts line={line} limit={3} hideChips />
        </div>
        <div className="lg:col-span-1">
          <StationList
            stations={stationList}
            lineColor={line.color}
            stationHrefPrefix={`/metra/${slug}`}
            currentLine={line.shortName}
          />
        </div>
      </div>
    </main>
  )
```

- [ ] **Step 2: Run lint + tests**

Run:
```bash
npm run lint && npm test
```

Expected: zero errors, zero warnings, all tests pass.

- [ ] **Step 3: Commit**

```bash
git add app/metra/[line]/page.tsx
git commit -m "refactor(metra): move PageHeader above grid on line detail"
```

---

## Task 6: Verify build and run visual QA

**Files:** none — verification only.

- [ ] **Step 1: Run a production build**

Run:
```bash
npm run build
```

Expected: build completes without errors. If the build warns about `<Image>` without a width/height or missing `alt`, confirm `fill` is set and `alt=""` is intentionally empty (decorative image).

- [ ] **Step 2: Start the dev server**

Run in a separate terminal:
```bash
npm run dev
```

- [ ] **Step 3: Visual QA checklist**

Open each of these pages in a browser at **375px, 768px, and 1280px** widths, in both light and dark mode (toggle with the ThemeToggle in the navbar):

| URL | What to check |
|---|---|
| `http://localhost:3000/cta` | Simple page — title + description only |
| `http://localhost:3000/cta/red` | Line detail — hero spans full width above the grid |
| `http://localhost:3000/cta/red/clark-lake` | Station detail — badges + description + line color chips |
| `http://localhost:3000/cta/alerts` | Alerts page — unchanged call site |
| `http://localhost:3000/metra/up-n` | Metra line detail — grid restructure works |
| `http://localhost:3000/metra/up-n/ogilvie-transportation-center-metra` | Metra station detail |
| `http://localhost:3000/terms` | Legal page — minimal call site |

For each, verify:
- [ ] CTA train is visible in the image at all three breakpoints
- [ ] Title and description are readable in both themes
- [ ] Line color chips clearly visible against the gradient
- [ ] Pastel Tailwind badges (Terminal, 24 Hours, Rapid Transit, Commuter Rail, Schedule PDF) readable in both themes
- [ ] Gradient blends seamlessly into the page background below — no visible seam
- [ ] Full-bleed edges align with the navbar width (no horizontal scrollbar, no gap)
- [ ] Line detail pages render correctly with the hero above the grid
- [ ] No layout shift on page load

- [ ] **Step 4: If any issue found, fix and re-run lint/tests/build before committing the fix**

- [ ] **Step 5: Final CI check**

Run:
```bash
npm run lint && npm test && npm run build
```

Expected: everything green, zero warnings.

---

## Verification Summary

After all tasks complete:
- `npm run lint` → clean
- `npm test` → all pass, zero warnings
- `npm run build` → succeeds
- Manual QA checklist in Task 6 → all boxes checked
- Five commits on the feature branch: image add, component rewrite (incl. tests), CTA page restructure, Metra page restructure, (optional) any QA fixes

---

## Notes for the Implementer

- **Do not touch the home page Hero component** — `app/components/Hero.tsx` is intentionally different and stays as-is.
- **Do not add new PageHeader props** — the point is to keep the API stable so none of the 14 call sites change signatures.
- **The image is decorative** — `alt=""` is correct and intentional. Do not add descriptive alt text.
- **No `'use client'` directive** — the component stays a server component.
- **If the snapshot diff looks huge in Task 3** — that's expected (the DOM is completely different). Skim it to make sure it matches the design, then accept it.
