# PageHeader Hero — Design Spec

**Date:** 2026-04-09
**Status:** Approved — ready for plan

## Context

The current `PageHeader` component is a plain text block with a bottom border, used on all 14 content pages (CTA/Metra lists, line detail, station detail, alerts, legal). It works but is visually flat and gives the site no sense of place.

We have a Chicago-specific stock photo (`docs/assets/shutterstock_2614255565.jpg`) of a CTA train on elevated tracks with Chicago architecture in the background. We want to use it to turn `PageHeader` into a compact photo hero that establishes the transit/Chicago identity on every page while still supporting the existing badges + line-chip content patterns.

The home page `Hero` component stays as-is (grid + radial glow). `PageHeader` becomes the photo-backed variant used on inner pages.

## Goals

- Give every content page a visually distinct, on-brand hero header
- Keep the `PageHeader` props API unchanged so all 14 call sites continue to work without signature changes
- Support both light and dark modes with good contrast for title, description, badges, and line color chips
- Stay responsive and mobile-first (375 / 768 / 1280 breakpoints)
- Image-forward look — the photo should read clearly, not be washed out

## Non-Goals

- Replacing the home page `Hero` component
- Adding per-page custom images (one shared image for all pages in v1)
- Animations / parallax effects

## Approach

**Bottom-anchored gradient hero.** A full-bleed section with the photo as background, a two-layer overlay (flat tint + bottom gradient), and content pinned to the bottom where the overlay is darkest. The title, description, badges, and children all sit in the dark "safe zone" where text contrast is guaranteed.

This was chosen over a centered-blur layout and a split-image-right layout because it:
- Shows the most of the photo (top half is clear)
- Uses a conventional reading flow (eyes travel down to the content)
- Provides the strongest contrast for the saturated badge/line-chip backgrounds
- Needs no major layout rework for pages with badges + children

## Component Structure

```
<section>                                         // relative, full-bleed, overflow-hidden, responsive height, flex col justify-end, mb-8
  <Image />                                       // absolute fill, object-cover, object-[center_40%], priority, sizes="100vw", z-0
  <div />                                         // absolute inset-0, flat tint, z-10
  <div />                                         // absolute inset-0, bottom gradient, z-20
  <div>                                           // relative z-30, content wrapper
    {badges}
    <h1>{title}</h1>
    {description && <p>{description}</p>}
    {children}
  </div>
</section>
```

Stays a server component. Props interface (`title`, `description`, `badges`, `children`) is unchanged.

## Visual Details

### Image

- Move `docs/assets/shutterstock_2614255565.jpg` to `public/hero-header.jpg`
- Pre-optimize to ~200–400 KB at 2560px width before committing
- Use Next.js `<Image>` with `fill`, `priority`, `sizes="100vw"`, `alt=""` (decorative)
- `object-cover` + `object-[center_40%]` — focal point shifted up so the train stays visible in aggressive mobile crops

### Overlay (two layers)

**Layer 1 — flat tint (z-10):**
- Light: `bg-black/30`
- Dark: `dark:bg-black/40`

**Layer 2 — bottom gradient (z-20):**
- Light: `bg-gradient-to-t from-black/75 via-black/20 to-transparent`
- Dark: `dark:from-black/85 dark:via-black/40 dark:to-transparent`

Combined bottom-zone opacity is ~85–90% light / ~90–95% dark, giving seamless blend into the page background below.

### Height (responsive)

- Mobile (default): `h-56` (224px)
- `sm` (640+): `sm:h-64` (256px)
- `lg` (1024+): `lg:h-72` (288px)

### Full-bleed escape

Same pattern as `Hero.tsx`:
`-mx-4 sm:-mx-6 lg:-mx-8` on the `<section>`, matching padding on the inner content wrapper (`px-4 sm:px-6 lg:px-8`), content centered via `max-w-7xl mx-auto`.

### Content container

- Positioned at the bottom of the section via `flex flex-col justify-end` on the outer `<section>` and `pb-8` on the content wrapper
- Max width `max-w-7xl mx-auto`

### Typography

- Title (`h1`): `text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white` with inline `textShadow: '0 1px 3px rgba(0,0,0,0.3)'`
- Description (`p`): `mt-3 max-w-2xl text-sm sm:text-base text-white/70`
- Bottom border (`border-b ... pb-8`) from current component is **removed** — gradient provides the separator. `mb-8` preserved on the `<section>` for spacing from content below.

### Badges and children

Badge and chip content is rendered as-is from call sites. All badges in use fall into two categories and both work against the dark gradient:

- **Line color chips** (inline `style={{ backgroundColor, color }}`) — saturated opaque CTA/Metra brand colors, excellent contrast
- **Tailwind-classed pill badges** (Terminal, 24 Hours, CTA, Metra, Rapid Transit, etc.) — opaque pastel backgrounds in light mode, translucent dark variants in dark mode; both remain legible against the overlay

No forced text-color overrides on badges. If any specific badge fails QA, fix it at the call site.

## Call Site Changes

Two line detail pages currently nest `PageHeader` inside a CSS grid cell. Those need a small restructure so the hero spans full width:

- [app/cta/[line]/page.tsx](app/cta/[line]/page.tsx) — move `<PageHeader>` above the grid, after `<Breadcrumb />`
- [app/metra/[line]/page.tsx](app/metra/[line]/page.tsx) — same change

All 12 other call sites work without modification.

## Files to Modify

- [app/components/PageHeader.tsx](app/components/PageHeader.tsx) — rewrite component body
- [app/cta/[line]/page.tsx](app/cta/[line]/page.tsx) — move PageHeader above grid
- [app/metra/[line]/page.tsx](app/metra/[line]/page.tsx) — move PageHeader above grid
- [__tests__/components/PageHeader.test.tsx](__tests__/components/PageHeader.test.tsx) — mock `next/image`, refresh snapshot
- [public/hero-header.jpg](public/hero-header.jpg) — new file (optimized from `docs/assets/shutterstock_2614255565.jpg`)

## Testing

### Unit tests

Update [__tests__/components/PageHeader.test.tsx](__tests__/components/PageHeader.test.tsx):
- Add Jest mock for `next/image` so `<Image>` renders as a plain `<img>` in jsdom
- All six existing assertions stay valid (title `h1`, description `p`, no-description case, badges, children, snapshot)
- Regenerate snapshot with `npm test -- -u`

### Visual QA

Manual verification at **375px / 768px / 1280px** in both light and dark mode on:
- A simple page (`/cta` — title + description only)
- A station detail page (`/cta/red/clark-lake` — badges, description, line chips)
- A line detail page (`/cta/red` — confirms grid restructure is clean)
- An alerts page (`/cta/alerts`)

Checklist:
- [ ] Train visible in image at all three breakpoints
- [ ] Title and description readable in both themes
- [ ] Line color chips clearly visible against gradient
- [ ] Pastel Tailwind badges (Terminal, 24 Hours, etc.) readable in both themes
- [ ] Gradient blends seamlessly into page background below the hero — no visible seam
- [ ] Full-bleed edges align with navbar width
- [ ] Line detail pages render correctly with `PageHeader` above the grid
- [ ] No layout shift on page load (image has fixed container height + `priority`)

### CI

- `npm run lint` — clean
- `npm test` — all pass with zero warnings

## Open Risks / Watch Items

1. **Image file size** — raw Shutterstock JPEG is likely multi-megabyte. Pre-optimize before committing; Next.js `<Image>` will further optimize at build time.
2. **CTA line detail badge** includes a `CTALineIcon` SVG at 40px — should render fine against dark gradient but verify during QA.
3. **Schedule PDF link badge** has hover states that darken against the gradient — verify the hover remains perceptible.
