# Next.js Site Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold a production-ready Next.js 15 (App Router) site with Tailwind CSS, a responsive SEO-friendly navbar, three placeholder pages, and full SEO plumbing (metadata, sitemap, robots).

**Architecture:** Flat `app/` directory with no route groups. `Navbar.tsx` is a Server Component for SEO; mobile hamburger interactivity is isolated to a `MobileMenuToggle.tsx` Client Component. Every page exports a `metadata` object; `sitemap.ts` and `robots.ts` auto-generate the respective files.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS, Jest, React Testing Library

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Create | `app/layout.tsx` | Root layout — metadataBase, title template, Navbar, main, footer |
| Create | `app/page.tsx` | Home page placeholder + metadata |
| Create | `app/about/page.tsx` | About Us placeholder + metadata |
| Create | `app/search/page.tsx` | Search placeholder + metadata |
| Create | `app/sitemap.ts` | Auto-generates /sitemap.xml |
| Create | `app/robots.ts` | Auto-generates /robots.txt |
| Create | `app/components/Navbar.tsx` | Server Component — nav structure + desktop links |
| Create | `app/components/MobileMenuToggle.tsx` | Client Component — hamburger toggle island |
| Create | `app/globals.css` | Tailwind directives only |
| Create | `jest.config.ts` | Jest config using next/jest transformer |
| Create | `jest.setup.ts` | jest-dom setup |
| Create | `__tests__/components/MobileMenuToggle.test.tsx` | Toggle behavior tests |
| Create | `__tests__/components/Navbar.test.tsx` | Navbar render tests |
| Modify | `CLAUDE.md` | Add dev commands |

---

## Task 1: Initialize Next.js Project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`

- [ ] **Step 1: Run create-next-app in the existing repo directory**

Run this from the repo root (the directory containing `CLAUDE.md`):

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --disable-git
```

When prompted about existing files (e.g. `.gitignore`), choose to overwrite or keep — either is fine for a new project.

- [ ] **Step 2: Verify the generated structure**

```bash
ls app/
```

Expected output includes: `layout.tsx  page.tsx  globals.css  favicon.ico`

- [ ] **Step 3: Verify tsconfig.json import alias**

Open `tsconfig.json` and confirm the `paths` entry is:

```json
"paths": {
  "@/*": ["./*"]
}
```

If it reads `"@/*": ["./src/*"]` (an alternate `create-next-app` default), change it to `"./*"`. This is required for `@/app/components/...` imports to resolve correctly in both the app and tests.

- [ ] **Step 4: Verify dev server starts**

```bash
npm run dev
```

Expected: server running at `http://localhost:3000` with no errors. Stop with `Ctrl+C`.

- [ ] **Step 5: Commit the scaffold**

```bash
git add package.json package-lock.json tsconfig.json next.config.ts tailwind.config.ts postcss.config.mjs eslint.config.mjs .gitignore app/ public/
git commit -m "$(cat <<'EOF'
feat: initialize Next.js 15 project with Tailwind and App Router

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Install and Configure Jest

**Files:**
- Create: `jest.config.ts`
- Create: `jest.setup.ts`
- Modify: `package.json` (add test script)

- [ ] **Step 1: Install testing dependencies**

```bash
npm install -D jest jest-environment-jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom @types/jest
```

- [ ] **Step 2: Create jest.config.ts**

```ts
// jest.config.ts
import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
}

export default createJestConfig(config)
```

- [ ] **Step 3: Create jest.setup.ts**

```ts
// jest.setup.ts
import '@testing-library/jest-dom'
```

- [ ] **Step 4: Add test script to package.json**

In `package.json`, add to the `"scripts"` block:

```json
"test": "jest",
"test:watch": "jest --watch"
```

- [ ] **Step 5: Verify Jest runs (no tests yet)**

```bash
npm test -- --passWithNoTests
```

Expected: `No tests found` or `Test Suites: 0 passed`. No errors.

- [ ] **Step 6: Commit**

```bash
git add jest.config.ts jest.setup.ts package.json package-lock.json
git commit -m "$(cat <<'EOF'
chore: add Jest and React Testing Library

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Build MobileMenuToggle (TDD)

**Files:**
- Create: `app/components/MobileMenuToggle.tsx`
- Create: `__tests__/components/MobileMenuToggle.test.tsx`

- [ ] **Step 1: Create the test file**

```bash
mkdir -p __tests__/components
```

```tsx
// __tests__/components/MobileMenuToggle.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import MobileMenuToggle from '@/app/components/MobileMenuToggle'

const links = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/search', label: 'Search' },
]

describe('MobileMenuToggle', () => {
  it('renders a hamburger button', () => {
    render(<MobileMenuToggle links={links} />)
    expect(screen.getByRole('button', { name: /open menu/i })).toBeInTheDocument()
  })

  it('shows nav links when hamburger is clicked', () => {
    render(<MobileMenuToggle links={links} />)
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }))
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'About' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Search' })).toBeInTheDocument()
  })

  it('hides nav links when toggled closed', () => {
    render(<MobileMenuToggle links={links} />)
    const button = screen.getByRole('button', { name: /open menu/i })
    fireEvent.click(button)
    fireEvent.click(screen.getByRole('button', { name: /close menu/i }))
    expect(screen.queryByRole('link', { name: 'Home' })).not.toBeInTheDocument()
  })

  it('closes menu when a link is clicked', () => {
    render(<MobileMenuToggle links={links} />)
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }))
    fireEvent.click(screen.getByRole('link', { name: 'Home' }))
    expect(screen.queryByRole('link', { name: 'About' })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test -- MobileMenuToggle
```

Expected: FAIL — `Cannot find module '@/app/components/MobileMenuToggle'`

- [ ] **Step 3: Create MobileMenuToggle.tsx**

```tsx
// app/components/MobileMenuToggle.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'

interface NavLink {
  href: string
  label: string
}

interface Props {
  links: NavLink[]
}

export default function MobileMenuToggle({ links }: Props) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="md:hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isOpen}
        className="p-2 text-gray-600 hover:text-gray-900"
      >
        <span className="block w-6 h-0.5 bg-current mb-1.5" />
        <span className="block w-6 h-0.5 bg-current mb-1.5" />
        <span className="block w-6 h-0.5 bg-current" />
      </button>

      {isOpen && (
        <div className="absolute top-16 left-0 right-0 bg-white border-b border-gray-200 px-4 py-2 z-10">
          <ul className="flex flex-col gap-2">
            {links.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => setIsOpen(false)}
                  className="block py-2 text-gray-600 hover:text-gray-900 text-sm font-medium"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm test -- MobileMenuToggle
```

Expected: `Tests: 4 passed`

- [ ] **Step 5: Commit**

```bash
git add app/components/MobileMenuToggle.tsx __tests__/components/MobileMenuToggle.test.tsx
git commit -m "$(cat <<'EOF'
feat: add MobileMenuToggle client component with tests

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Build Navbar (TDD)

**Files:**
- Create: `app/components/Navbar.tsx`
- Create: `__tests__/components/Navbar.test.tsx`

- [ ] **Step 1: Create the test file**

```tsx
// __tests__/components/Navbar.test.tsx
import { render, screen } from '@testing-library/react'
import Navbar from '@/app/components/Navbar'

describe('Navbar', () => {
  it('renders the site name as a link', () => {
    render(<Navbar />)
    expect(screen.getByRole('link', { name: /chicago transit tracker/i })).toBeInTheDocument()
  })

  it('renders desktop nav links for all three pages', () => {
    render(<Navbar />)
    // Desktop links are hidden on mobile via Tailwind (display:none), but still present in the DOM
    const homeLinks = screen.getAllByRole('link', { name: 'Home' })
    const aboutLinks = screen.getAllByRole('link', { name: 'About' })
    const searchLinks = screen.getAllByRole('link', { name: 'Search' })
    expect(homeLinks.length).toBeGreaterThanOrEqual(1)
    expect(aboutLinks.length).toBeGreaterThanOrEqual(1)
    expect(searchLinks.length).toBeGreaterThanOrEqual(1)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test -- Navbar.test
```

Expected: FAIL — `Cannot find module '@/app/components/Navbar'`

- [ ] **Step 3: Create Navbar.tsx**

```tsx
// app/components/Navbar.tsx
import Link from 'next/link'
import MobileMenuToggle from './MobileMenuToggle'

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/search', label: 'Search' },
]

export default function Navbar() {
  return (
    <header className="bg-white border-b border-gray-200">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg text-gray-900">
          Chicago Transit Tracker
        </Link>

        {/* Desktop links — hidden on mobile */}
        <ul className="hidden md:flex items-center gap-6">
          {navLinks.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className="text-gray-600 hover:text-gray-900 text-sm font-medium"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Mobile toggle island */}
        <MobileMenuToggle links={navLinks} />
      </nav>
    </header>
  )
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm test -- Navbar.test
```

Expected: `Tests: 2 passed`

- [ ] **Step 5: Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add app/components/Navbar.tsx __tests__/components/Navbar.test.tsx
git commit -m "$(cat <<'EOF'
feat: add Navbar server component with tests

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Wire Root Layout and Clean Globals

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Replace app/layout.tsx**

```tsx
// app/layout.tsx
import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import Navbar from './components/Navbar'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://chicago-transit-tracker.com'),
  title: {
    template: '%s | Chicago Transit Tracker',
    default: 'Chicago Transit Tracker',
  },
  description: 'Track Chicago-area transit in real time.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${geist.className} bg-gray-50 min-h-screen`}>
        <Navbar />
        <main>{children}</main>
        <footer />
      </body>
    </html>
  )
}
```

Note: use whatever font `create-next-app` defaulted to (typically `Geist` in recent versions). Check the generated `layout.tsx` import and keep that font.

- [ ] **Step 2: Replace app/globals.css with Tailwind directives only**

First check which version of Tailwind was installed:

```bash
npm list tailwindcss
```

**If Tailwind v3.x:**
```css
/* app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**If Tailwind v4.x** (default with Next.js 15 as of early 2026):
```css
/* app/globals.css */
@import "tailwindcss";
```

- [ ] **Step 3: Verify dev server still works**

```bash
npm run dev
```

Open `http://localhost:3000` — navbar should render with site name and nav links. Stop with `Ctrl+C`.

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx app/globals.css
git commit -m "$(cat <<'EOF'
feat: wire root layout with Navbar and SEO metadataBase

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Create Placeholder Pages with Metadata

**Files:**
- Modify: `app/page.tsx`
- Create: `app/about/page.tsx`
- Create: `app/search/page.tsx`

- [ ] **Step 1: Replace app/page.tsx (Home)**

```tsx
// app/page.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Home',
  description: 'Track Chicago-area transit routes and schedules in real time.',
  openGraph: {
    title: 'Home | Chicago Transit Tracker',
    description: 'Track Chicago-area transit routes and schedules in real time.',
    url: 'https://chicago-transit-tracker.com',
    type: 'website',
  },
}

export default function HomePage() {
  return <></>
}
```

- [ ] **Step 2: Create app/about/page.tsx**

```bash
mkdir -p app/about
```

```tsx
// app/about/page.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Learn about Chicago Transit Tracker and our mission.',
  openGraph: {
    title: 'About Us | Chicago Transit Tracker',
    description: 'Learn about Chicago Transit Tracker and our mission.',
    url: 'https://chicago-transit-tracker.com/about',
    type: 'website',
  },
}

export default function AboutPage() {
  return <></>
}
```

- [ ] **Step 3: Create app/search/page.tsx**

```bash
mkdir -p app/search
```

```tsx
// app/search/page.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Search',
  description: 'Search Chicago transit routes, lines, and schedules.',
  openGraph: {
    title: 'Search | Chicago Transit Tracker',
    description: 'Search Chicago transit routes, lines, and schedules.',
    url: 'https://chicago-transit-tracker.com/search',
    type: 'website',
  },
}

export default function SearchPage() {
  return <></>
}
```

- [ ] **Step 4: Verify all three routes load**

```bash
npm run dev
```

Visit `http://localhost:3000`, `http://localhost:3000/about`, `http://localhost:3000/search` — each should load with the navbar visible and no errors. Stop with `Ctrl+C`.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx app/about/page.tsx app/search/page.tsx
git commit -m "$(cat <<'EOF'
feat: add three placeholder pages with SEO metadata

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Add Sitemap and Robots

**Files:**
- Create: `app/sitemap.ts`
- Create: `app/robots.ts`

- [ ] **Step 1: Create app/sitemap.ts**

```ts
// app/sitemap.ts
import type { MetadataRoute } from 'next'

const baseUrl = 'https://chicago-transit-tracker.com'

// STANDING RULE: Add every new page to this array when it is created.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
  ]
}
```

- [ ] **Step 2: Create app/robots.ts**

```ts
// app/robots.ts
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: 'https://chicago-transit-tracker.com/sitemap.xml',
  }
}
```

- [ ] **Step 3: Verify sitemap and robots are served**

```bash
npm run dev
```

- Visit `http://localhost:3000/sitemap.xml` — should return XML with all three routes
- Visit `http://localhost:3000/robots.txt` — should return robots rules with sitemap URL

Stop with `Ctrl+C`.

- [ ] **Step 4: Commit**

```bash
git add app/sitemap.ts app/robots.ts
git commit -m "$(cat <<'EOF'
feat: add sitemap.ts and robots.ts for SEO

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Read the current CLAUDE.md**

Open `CLAUDE.md` (in the repo root) and read its current contents. Then append the following two sections at the end of the file:

```markdown
## Commands

- `npm run dev` — start development server at http://localhost:3000
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm test` — run Jest tests
- `npm run test:watch` — Jest in watch mode

## Standing Rules

**Sitemap:** Any time a new page is added to the site, `app/sitemap.ts` must be updated to include the new route. This applies without exception.
```

Also update the "Repository State" section to remove the "no source code" note now that the project is scaffolded.

- [ ] **Step 2: Run all tests one final time**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "$(cat <<'EOF'
docs: update CLAUDE.md with dev commands and sitemap standing rule

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Done

At this point the scaffold is complete:
- Next.js 15, App Router, TypeScript, Tailwind CSS
- Responsive navbar (server-rendered, mobile hamburger via client island)
- Three placeholder pages with full SEO metadata
- `/sitemap.xml` and `/robots.txt` auto-generated
- Jest + React Testing Library configured with passing tests
