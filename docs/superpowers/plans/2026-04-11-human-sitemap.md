# Human-Facing Site Map Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a user-facing HTML sitemap page at `/sitemap` that lists every top-level page, CTA line and station, Metra line and station, and Pace route, and link it from the global footer.

**Architecture:** A single statically-rendered server component at `app/sitemap/page.tsx` fetches the same data the XML sitemap already uses (`getLinesForService`, `getStationsForLine`, `getAllPaceRoutes`) and renders grouped sections with `<h2>`/`<h3>` headings and `columns-2 md:columns-3` lists of real anchor tags. No client JavaScript, no collapsibles, no new data helpers.

**Tech Stack:** Next.js 16 App Router (server components + `generateStaticParams` / static rendering), Tailwind CSS v4, TypeScript, Jest + React Testing Library.

**Spec:** [docs/superpowers/specs/2026-04-11-human-sitemap-design.md](../specs/2026-04-11-human-sitemap-design.md)

---

## File Structure

- **New:** `app/sitemap/page.tsx` — server component, page, metadata
- **New:** `__tests__/pages/sitemap.test.tsx` — Jest tests for the page
- **Modified:** `app/components/Footer.tsx` — add "Site Map" nav link
- **Modified:** `__tests__/components/Footer.test.tsx` — assert new link
- **Modified:** `app/sitemap.ts` — add `/sitemap` entry per standing rule

---

## Task 1: Add the Site Map link to the footer (TDD)

**Files:**
- Modify: `app/components/Footer.tsx`
- Test: `__tests__/components/Footer.test.tsx`

- [ ] **Step 1: Write the failing test**

Add a new `it` block inside the existing `describe('Footer', ...)` in `__tests__/components/Footer.test.tsx`, placed right after the Privacy link test (around line 18):

```tsx
  it('renders a Site Map link to /sitemap', () => {
    render(<Footer />)
    expect(screen.getByRole('link', { name: 'Site Map' })).toHaveAttribute('href', '/sitemap')
  })
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest __tests__/components/Footer.test.tsx`
Expected: FAIL with "Unable to find an accessible element with the role 'link' and name 'Site Map'".

- [ ] **Step 3: Add the link to the footer**

In `app/components/Footer.tsx`, add a new `<li>` inside the `<ul>` at lines 22–39, placed **after** the Privacy `<li>` so the order reads Terms, Privacy, Site Map:

```tsx
              <li>
                <Link
                  href="/sitemap"
                  className="text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  Site Map
                </Link>
              </li>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest __tests__/components/Footer.test.tsx`
Expected: PASS for all five tests. Note the snapshot test will fail — that's expected.

- [ ] **Step 5: Update the snapshot**

Run: `npx jest __tests__/components/Footer.test.tsx -u`
Expected: PASS for all five tests, snapshot updated.

- [ ] **Step 6: Commit**

```bash
git add app/components/Footer.tsx __tests__/components/Footer.test.tsx __tests__/components/__snapshots__/Footer.test.tsx.snap
git commit -m "feat(footer): add Site Map link"
```

---

## Task 2: Write the failing test for the Site Map page

**Files:**
- Test: `__tests__/pages/sitemap.test.tsx` (new)

This test uses the same mocking pattern as other page tests in `__tests__/pages/`. It mocks `@lib/transit` and `@lib/pace` so the server component can be awaited and rendered synchronously by React Testing Library.

- [ ] **Step 1: Create the test file**

Create `__tests__/pages/sitemap.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { mockLine, mockMetraLine, mockStation, mockMetraStation, mockPaceRoute, mockPacePulseRoute } from '../fixtures'
import type { Line, Station } from '@lib/types'

jest.mock('@lib/transit', () => ({
  getLinesForService: jest.fn(),
  getStationsForLine: jest.fn(),
}))

jest.mock('@lib/pace', () => ({
  getAllPaceRoutes: jest.fn(),
}))

import { getLinesForService, getStationsForLine } from '@lib/transit'
import { getAllPaceRoutes } from '@lib/pace'
import SitemapPage from '@/app/sitemap/page'

const mockedGetLinesForService = getLinesForService as jest.MockedFunction<typeof getLinesForService>
const mockedGetStationsForLine = getStationsForLine as jest.MockedFunction<typeof getStationsForLine>
const mockedGetAllPaceRoutes = getAllPaceRoutes as jest.MockedFunction<typeof getAllPaceRoutes>

describe('SitemapPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    mockedGetLinesForService.mockImplementation(async (service: 'cta' | 'metra'): Promise<Line[]> => {
      if (service === 'cta') return [mockLine]
      return [mockMetraLine]
    })

    mockedGetStationsForLine.mockImplementation(async (shortName: string): Promise<Station[]> => {
      if (shortName === 'Red') return [mockStation]
      if (shortName === 'BNSF') return [mockMetraStation]
      return []
    })

    mockedGetAllPaceRoutes.mockResolvedValue([mockPaceRoute, mockPacePulseRoute])
  })

  it('renders the main section headings', async () => {
    const ui = await SitemapPage()
    render(ui)
    expect(screen.getByRole('heading', { name: 'Pages', level: 2 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'CTA Rail', level: 2 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Metra', level: 2 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Pace Bus', level: 2 })).toBeInTheDocument()
  })

  it('renders top-level page links', async () => {
    const ui = await SitemapPage()
    render(ui)
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'CTA Rail' })).toHaveAttribute('href', '/cta')
    expect(screen.getByRole('link', { name: 'CTA Alerts' })).toHaveAttribute('href', '/cta/alerts')
    expect(screen.getByRole('link', { name: 'Metra' })).toHaveAttribute('href', '/metra')
    expect(screen.getByRole('link', { name: 'Metra Alerts' })).toHaveAttribute('href', '/metra/alerts')
    expect(screen.getByRole('link', { name: 'Pace Bus' })).toHaveAttribute('href', '/pace')
    expect(screen.getByRole('link', { name: 'Pace Pulse' })).toHaveAttribute('href', '/pace/pulse')
    expect(screen.getByRole('link', { name: 'Terms of Use' })).toHaveAttribute('href', '/terms')
    expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy')
  })

  it('renders each CTA line heading and at least one station link', async () => {
    const ui = await SitemapPage()
    render(ui)
    expect(screen.getByRole('heading', { name: 'Red Line', level: 3 })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Clark/Lake' })).toHaveAttribute(
      'href',
      '/cta/red/clark-lake',
    )
  })

  it('renders each Metra line heading and at least one station link', async () => {
    const ui = await SitemapPage()
    render(ui)
    expect(screen.getByRole('heading', { name: 'BNSF Railway', level: 3 })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Aurora' })).toHaveAttribute('href', '/metra/bnsf/aurora')
  })

  it('renders every Pace route link and no individual Pace stops', async () => {
    const ui = await SitemapPage()
    render(ui)
    expect(screen.getByRole('link', { name: /208.*Golf Road/ })).toHaveAttribute('href', '/pace/208')
    expect(screen.getByRole('link', { name: /Milwaukee Pulse.*Milwaukee Avenue/ })).toHaveAttribute(
      'href',
      '/pace/milwaukee-pulse',
    )
    // No individual Pace stop links should be rendered
    expect(screen.queryByRole('link', { name: /Golf Rd & Waukegan Rd/ })).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest __tests__/pages/sitemap.test.tsx`
Expected: FAIL — module not found `@/app/sitemap/page`. This is the TDD red state.

---

## Task 3: Create the Site Map page

**Files:**
- Create: `app/sitemap/page.tsx`

- [ ] **Step 1: Create the page file**

Create `app/sitemap/page.tsx` with the full implementation:

```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import PageHeader from '@components/PageHeader'
import { siteConfig } from '@lib/siteConfig'
import { getLinesForService, getStationsForLine } from '@lib/transit'
import { getAllPaceRoutes } from '@lib/pace'

const description =
  'Full directory of every page on Chicago Transit Tracker — CTA rail lines and stations, Metra lines and stations, and Pace bus routes.'

export const metadata: Metadata = {
  title: 'Site Map',
  description,
  openGraph: {
    title: `Site Map | ${siteConfig.name}`,
    description,
    url: `${siteConfig.url}/sitemap`,
    images: [siteConfig.ogImage],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `Site Map | ${siteConfig.name}`,
    description,
    images: [siteConfig.ogImage],
  },
  alternates: {
    canonical: `${siteConfig.url}/sitemap`,
  },
}

const TOP_LEVEL_LINKS: Array<{ href: string; label: string }> = [
  { href: '/', label: 'Home' },
  { href: '/cta', label: 'CTA Rail' },
  { href: '/cta/alerts', label: 'CTA Alerts' },
  { href: '/metra', label: 'Metra' },
  { href: '/metra/alerts', label: 'Metra Alerts' },
  { href: '/pace', label: 'Pace Bus' },
  { href: '/pace/pulse', label: 'Pace Pulse' },
  { href: '/terms', label: 'Terms of Use' },
  { href: '/privacy', label: 'Privacy' },
]

export default async function SitemapPage() {
  const [ctaLines, metraLines, paceRoutes] = await Promise.all([
    getLinesForService('cta'),
    getLinesForService('metra'),
    getAllPaceRoutes(),
  ])

  const ctaLinesWithStations = await Promise.all(
    ctaLines.map(async (line) => ({
      line,
      stations: await getStationsForLine(line.shortName),
    })),
  )

  const metraLinesWithStations = await Promise.all(
    metraLines.map(async (line) => ({
      line,
      stations: await getStationsForLine(line.shortName),
    })),
  )

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title="Site Map"
        description="Every page on Chicago Transit Tracker, organized by service."
        breadcrumbItems={[
          { label: 'Home', href: '/' },
          { label: 'Site Map' },
        ]}
      />

      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">Pages</h2>
        <ul className="columns-2 gap-6 md:columns-3">
          {TOP_LEVEL_LINKS.map((link) => (
            <li key={link.href} className="mb-2 break-inside-avoid">
              <Link
                href={link.href}
                className="text-sm text-blue-700 hover:underline dark:text-blue-400"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">CTA Rail</h2>
        {ctaLinesWithStations.map(({ line, stations }) => (
          <div key={line.slug} className="mb-8">
            <h3
              className="mb-3 border-l-4 pl-3 text-lg font-semibold text-gray-900 dark:text-white"
              style={{ borderLeftColor: line.color }}
            >
              <Link href={`/cta/${line.slug}`} className="hover:underline">
                {line.name}
              </Link>
            </h3>
            <ul className="columns-2 gap-6 md:columns-3">
              {stations.map((station) => (
                <li key={station.slug} className="mb-2 break-inside-avoid">
                  <Link
                    href={`/cta/${line.slug}/${station.slug}`}
                    className="text-sm text-blue-700 hover:underline dark:text-blue-400"
                  >
                    {station.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">Metra</h2>
        {metraLinesWithStations.map(({ line, stations }) => (
          <div key={line.slug} className="mb-8">
            <h3
              className="mb-3 border-l-4 pl-3 text-lg font-semibold text-gray-900 dark:text-white"
              style={{ borderLeftColor: line.color }}
            >
              <Link href={`/metra/${line.slug}`} className="hover:underline">
                {line.name}
              </Link>
            </h3>
            <ul className="columns-2 gap-6 md:columns-3">
              {stations.map((station) => (
                <li key={station.slug} className="mb-2 break-inside-avoid">
                  <Link
                    href={`/metra/${line.slug}/${station.slug}`}
                    className="text-sm text-blue-700 hover:underline dark:text-blue-400"
                  >
                    {station.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">Pace Bus</h2>
        <ul className="columns-2 gap-6 md:columns-3">
          {paceRoutes.map((route) => (
            <li key={route.slug} className="mb-2 break-inside-avoid">
              <Link
                href={`/pace/${route.slug}`}
                className="text-sm text-blue-700 hover:underline dark:text-blue-400"
              >
                {route.shortName} — {route.longName}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
```

- [ ] **Step 2: Run the page tests to verify they pass**

Run: `npx jest __tests__/pages/sitemap.test.tsx`
Expected: PASS for all five tests.

If the Pace route link test fails on the accessible name matcher, it's because the em dash creates whitespace separators. The regex `/208.*Golf Road/` should still match because `getByRole` flattens the accessible name to "208 — Golf Road".

- [ ] **Step 3: Commit**

```bash
git add app/sitemap/page.tsx __tests__/pages/sitemap.test.tsx
git commit -m "feat(sitemap): add human-facing site map page at /sitemap"
```

---

## Task 4: Add /sitemap to the XML sitemap

**Files:**
- Modify: `app/sitemap.ts`

Per the project's standing rule, every new route must be added to `app/sitemap.ts`.

- [ ] **Step 1: Add the entry**

In `app/sitemap.ts`, inside the returned array, add this entry immediately after the `/privacy` entry (around line 70):

```typescript
    {
      url: `${baseUrl}/sitemap`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.4,
    },
```

- [ ] **Step 2: Commit**

```bash
git add app/sitemap.ts
git commit -m "chore(sitemap): include /sitemap in XML sitemap"
```

---

## Task 5: Full verification

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: All tests pass with zero warnings and zero errors.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: Fully clean, zero warnings.

- [ ] **Step 3: Build the production site**

Run: `npm run build`
Expected: Build succeeds and `/sitemap` appears in the route list as a statically pre-rendered page (look for a `○` or similar marker next to `/sitemap` in the Next.js build output).

- [ ] **Step 4: Smoke test in dev**

Run: `npm run dev`
Then visit the following URLs in a browser and confirm:

- http://localhost:3000/sitemap — renders the page with four `<h2>` section headings (Pages, CTA Rail, Metra, Pace Bus). Every CTA line and Metra line shows its name and a columned list of station links beneath it. The Pace section shows every Pace route as a link. Line name headings have a colored left border matching the line's brand color.
- http://localhost:3000/ — footer shows "Site Map" as a link alongside Terms of Use and Privacy; clicking it navigates to `/sitemap`.
- http://localhost:3000/sitemap.xml — confirm `/sitemap` appears in the XML output.

- [ ] **Step 5: View source check**

In the browser, view source on `/sitemap` and confirm every link is present as a real `<a>` tag in the initial HTML (no client-side rendering required). Ctrl+F for a station name like "Clark/Lake" should find it in the raw source.

---

## Self-Review

- **Spec coverage:** Page route (Task 3), server component + static render (Task 3), all four sections with correct structure (Task 3), footer link (Task 1), XML sitemap entry (Task 4), metadata per SEO rules (Task 3), test coverage per spec (Tasks 1, 2, 3). All spec requirements covered.
- **No placeholders:** Every code step contains the actual code. Every command is exact. No "TBD" or "similar to above."
- **Type consistency:** Fixtures (`mockLine.shortName === 'Red'`, `mockMetraLine.shortName === 'BNSF'`) match the mock implementation in Task 2, which matches the real call signature in Task 3. `siteConfig.ogImage` is used as an object per the existing pattern in `app/page.tsx` and `app/pace/page.tsx`. `PageHeader` default `imageSrc` is relied on (no prop passed), matching its signature in `app/components/PageHeader.tsx:22`.
