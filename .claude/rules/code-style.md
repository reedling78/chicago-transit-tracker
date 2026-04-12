# Code Style

These conventions are enforced by the project's Prettier, ESLint, and TypeScript configs. Follow them in all generated code.

---

## Formatting (Prettier)

Config: `apps/web/.prettierrc`

- No semicolons
- Single quotes
- Trailing commas everywhere (`trailingComma: "all"`)
- 2-space indentation
- 100 character line width
- Tailwind CSS classes are auto-sorted via `prettier-plugin-tailwindcss`

Run `pnpm run lint:fix` (from `apps/web/`) to auto-fix formatting issues.

---

## Linting (ESLint)

Config: `apps/web/eslint.config.mjs` (flat config format)

- Extends `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Prettier conflicts disabled via `eslint-config-prettier`
- Ignored directories: `.next/`, `out/`, `build/`, `apps/functions/lib/`, `.claude/`, `docs/`

All lint warnings must be resolved before pushing — CI will fail otherwise.

---

## TypeScript

Config: `apps/web/tsconfig.json` (extends root `tsconfig.json`)

- **Strict mode** is enabled — do not use `any` without justification
- **Path aliases**: Use `@components/*` for component imports and `@lib/*` for lib imports. Use `@/*` for other root-level imports not covered by the above (e.g., page imports in tests). Use `@ctt/shared` for imports from the shared package.
- **Module resolution**: `bundler` — use standard ESM imports, no `.js` extensions needed
- **Isolated modules**: Each file must be independently transpilable

---

## Tailwind CSS v4

Config: `apps/web/app/globals.css`

- Dark mode is class-based via `@custom-variant dark (&:where(.dark, .dark *))` — use `dark:` prefix for dark mode styles
- Do not use `@apply` unless combining 3+ utilities that repeat across multiple elements
- Prefer utility classes directly in JSX

---

## Responsive Design

All pages and components must look good and work well on phones, tablets, and desktops. This is a hard requirement — not a nice-to-have.

- **Mobile-first:** Write base styles for the smallest screen, then layer on `sm:`, `md:`, and `lg:` breakpoints for larger viewports
- **Never use fixed-width layouts** (e.g., `w-2/3`) without a responsive breakpoint — always start with `w-full` and add width constraints at `md:` or `lg:`
- **Multi-column grids** must collapse to a single column on small screens (e.g., `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`)
- **Touch targets** should be at least 44×44px on mobile (links, buttons, interactive elements)
- **Test at 375px wide** (phone), **768px** (tablet), and **1280px+** (desktop) as representative breakpoints

---

## Component Conventions

- **Server components are the default.** Only add `'use client'` when the component needs browser APIs, event handlers, or React hooks (`useState`, `useEffect`, etc.)
- **Never import `firebase-admin`** or anything from `apps/web/app/lib/firebase-admin.ts` in a client component
- Keep client components small and focused — push data fetching up to server components and pass data down as props

---

## Imports

- Use `@components/*` for imports from `apps/web/app/components/` (e.g., `import PageHeader from '@components/PageHeader'`)
- Use `@lib/*` for imports from `apps/web/app/lib/` (e.g., `import { siteConfig } from '@lib/siteConfig'`)
- Use `@ctt/shared` for shared types, constants, and helpers (e.g., `import type { Line } from '@ctt/shared'`)
- Use `@/*` for other root-level imports not covered by the above aliases
- Sibling imports within the same directory stay relative (e.g., `./ThemeToggle`)
- Import site constants (`name`, `url`, `ogImage`) from `@lib/siteConfig` — never hardcode these values
- Group imports: React/Next.js first, then external packages, then internal modules
