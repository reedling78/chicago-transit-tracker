# Next.js Site Scaffold — Design Spec

**Date:** 2026-03-22
**Status:** Approved

---

## Overview

Scaffold a Next.js 15 (App Router) website for Chicago Transit Tracker with Tailwind CSS, a responsive navbar, three placeholder pages, and SEO foundations. The site will eventually be monetized via an ad network, so SEO best practices are baked in from the start.

---

## Architecture

Flat structure under `app/` — no route groups, no extra abstraction. Minimal for now; easy to extend later.

```
chicago-transit-tracker/
  app/
    layout.tsx            ← root layout: metadataBase, Navbar, <main>, <footer>
    page.tsx              ← Home page (placeholder)
    about/
      page.tsx            ← About Us page (placeholder)
    search/
      page.tsx            ← Search page (placeholder)
    sitemap.ts            ← auto-generates /sitemap.xml
    robots.ts             ← auto-generates /robots.txt
    components/
      Navbar.tsx              ← Server Component, renders nav structure + desktop links
      MobileMenuToggle.tsx    ← Client Component ("use client"), hamburger toggle island
  public/
  tailwind.config.ts
  next.config.ts
  tsconfig.json
```

---

## Navbar Components

### Navbar.tsx
**Type:** Server Component (no `"use client"`)

- Renders the full nav structure as HTML on the server — SEO-friendly
- Site name/logo on the left as a `<Link href="/">`
- **Desktop (md+):** nav links inline on the right — Home, About, Search (rendered server-side, hidden on mobile via Tailwind)
- Renders `<MobileMenuToggle>` as a child for the mobile interactive island
- Uses Next.js `<Link>` for all navigation
- Styled with Tailwind only

### MobileMenuToggle.tsx
**Type:** Client Component (`"use client"`)

- Minimal interactive island — handles only the hamburger open/close state
- Single `useState<boolean>` for menu open/closed
- Renders hamburger icon button (three `<span>` divs, no icon library) visible on mobile only
- Toggles a dropdown with the three nav links stacked vertically
- Closes menu on link click
- Receives nav link definitions as props from `Navbar.tsx`

---

## Pages

Each page is a minimal React Server Component. They export a `metadata` object and render an empty `<main>` as a placeholder. No visible content.

| Route    | File                  | Page Title         |
|----------|-----------------------|--------------------|
| `/`      | `app/page.tsx`        | Home               |
| `/about` | `app/about/page.tsx`  | About Us           |
| `/search`| `app/search/page.tsx` | Search             |

---

## SEO

### Metadata API
- `layout.tsx` sets `metadataBase` to the production URL and a default `title.template` of `"%s | Chicago Transit Tracker"`
- Each page exports a `metadata` object with:
  - `title` — page-specific title (composes into template)
  - `description` — page-specific description
  - `openGraph` — `title`, `description`, `url`, `type: "website"`

### sitemap.ts
Uses `MetadataRoute.Sitemap`. Exports an array of all site routes with `lastModified`, `changeFrequency`, and `priority`.

### robots.ts
Uses `MetadataRoute.Robots`. Allows all crawlers (`User-Agent: *`, `Allow: /`) and references the sitemap URL.

### Standing Rule
**Any time a new page is added to the site, `app/sitemap.ts` must be updated to include the new route.** This applies without exception.

---

## Styling

- Tailwind CSS via `create-next-app` setup (PostCSS, `tailwind.config.ts`)
- No component libraries, no custom CSS files beyond Tailwind's `globals.css`
- Navbar uses a clean, minimal style: white background, border-bottom, standard padding

---

## Out of Scope

- Ad network integration (deferred — structure accommodates future `<Script>` injection in layout)
- Authentication
- Any real page content
- Footer content (footer element present in layout but empty)
