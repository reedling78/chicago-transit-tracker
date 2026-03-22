# Chicago Transit Tracker — CLAUDE.md

This file provides guidance for Claude Code when working in this repository.

## Repository State

This project is a Next.js 16 / Tailwind v4 / TypeScript scaffold for the Chicago Transit Tracker application. The scaffold includes a root layout, a responsive Navbar with mobile menu toggle, placeholder pages (Home, About Us, Search), a sitemap, and a robots.txt. Jest is configured with React Testing Library for unit/integration tests.

## Project Structure

- `app/` — Next.js App Router pages and layouts
- `app/sitemap.ts` — Dynamic sitemap (must be updated when pages are added)
- `app/robots.ts` — Robots.txt configuration
- `app/components/` — Shared UI components (Navbar, MobileMenuToggle)
- `__tests__/` — Jest test suites

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript 5
- Tailwind CSS v4
- Jest 30 + React Testing Library

## Commands

- `npm run dev` — start development server at http://localhost:3000
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm test` — run Jest tests
- `npm run test:watch` — Jest in watch mode

## Standing Rules

**Sitemap:** Any time a new page is added to the site, `app/sitemap.ts` must be updated to include the new route. This applies without exception.
