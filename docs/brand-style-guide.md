# Chicago Transit Tracker - Brand & Visual Style Guide

This guide defines a reusable visual identity for Chicago Transit Tracker, including logo usage, color tokens, typography, iconography, and image dimensions for web and promotion.

## 1) Brand Positioning

- Brand name: Chicago Transit Tracker
- Domain: chicagotransittracker.com
- Tone: clear, practical, city-scale transit utility
- Personality: reliable, fast, map-oriented, modern

## 2) Logo System

All source logos are in `public/brand/`.

### Primary assets

- `logo-mark.svg`: square icon mark
- `logo-lockup-horizontal.svg`: full horizontal logo for light backgrounds
- `logo-lockup-horizontal-light.svg`: full horizontal logo for dark backgrounds

### Concept

The mark combines:
- Circular routing ring (network scale)
- Intersecting color rails (multi-service movement)
- Center locator pin motif (tracking and station focus)

This avoids prohibited CTA agency logo usage while still feeling transit-native.

### Logo usage rules

- Preferred on light UI backgrounds: `logo-lockup-horizontal.svg`
- Preferred on dark UI backgrounds: `logo-lockup-horizontal-light.svg`
- Small spaces and avatars: `logo-mark.svg`
- Do not stretch, skew, recolor, or add effects.
- Keep clear space around logo equal to at least 0.5x the mark height.
- Minimum displayed width:
  - Horizontal lockup: 180px
  - Mark only: 24px

## 3) Color Palette

### Core brand colors (primary UI)

- Midnight (primary): `#0F172A`
- Slate (secondary text): `#334155`
- Light surface: `#F8FAFC`
- Border neutral: `#E5E7EB`

### Accent rails (used in logo and data visuals)

- CTA Blue accent: `#00A1DE`
- CTA Red accent: `#C60C30`
- Transit Green accent: `#22C55E`

### Existing CTA route color requirement

When rendering CTA route data, continue using official CTA route hex values already documented in this repo (`README.md`, `CLAUDE.md`). Do not substitute route colors.

## 4) Typography

Current app font: Geist (already configured in `app/layout.tsx`).

Recommended usage:
- H1 page title: 36-48px, 700-800 weight
- H2 section title: 28-32px, 700 weight
- H3 card title: 20-24px, 600-700 weight
- Body default: 16-18px, 400-500 weight
- Label/meta: 12-14px, 500-600 weight

## 5) Imagery & Illustration Direction

- Use map, rail geometry, node-link, and station signage motifs.
- Favor simple vector shapes and high-contrast overlays.
- Avoid reproducing official CTA maps or proprietary branding materials.
- Keep marketing compositions uncluttered: one core headline + one CTA.

## 6) Favicon, App Icon, and Social Image Specs

Generated assets are in:
- `public/` (active runtime assets)
- `public/brand/generated/` (full export set)

### Required web icon set

- `public/favicon.ico` (multi-context favicon target)
- `public/favicon-16x16.png`
- `public/favicon-32x32.png`
- `public/apple-touch-icon.png` (180x180)
- `public/android-chrome-192x192.png`
- `public/android-chrome-512x512.png`
- `public/site.webmanifest`
- `public/browserconfig.xml`
- `public/mstile-150x150.png`

### Social/share previews

- `public/og-image.png` - 1200x630 (Open Graph recommended)
- `public/social-preview.png` - 1200x675 (Twitter/X and general preview-safe)
- Additional exports in `public/brand/generated/`:
  - `social-1600x900.png`
  - `linkedin-company-cover-1500x500.png`
  - `instagram-square-1200.png`
  - `story-1080x1920.png`

### Promotion dimension table

| Use case | Dimensions | File |
|---|---:|---|
| Browser favicon | 16x16, 32x32, ICO | `favicon-16x16.png`, `favicon-32x32.png`, `favicon.ico` |
| Apple touch icon | 180x180 | `apple-touch-icon.png` |
| Android/PWA icon | 192x192, 512x512 | `android-chrome-192x192.png`, `android-chrome-512x512.png` |
| Open Graph (Facebook, Slack, iMessage, Discord) | 1200x630 | `og-image.png` |
| Twitter/X large summary | 1200x675 | `social-preview.png` |
| LinkedIn page cover | 1500x500 | `brand/generated/linkedin-company-cover-1500x500.png` |
| Instagram post | 1200x1200 | `brand/generated/instagram-square-1200.png` |
| Story/Reel cover | 1080x1920 | `brand/generated/story-1080x1920.png` |
| High-res logo export | 1024x1024 | `brand/generated/logo-1024.png` |

## 7) Implementation Notes

- Metadata and social tags are configured in `app/layout.tsx`.
- Web app manifest is at `public/site.webmanifest`.
- Microsoft tile config is at `public/browserconfig.xml`.

## 8) CTA Compliance Notes

- Do not use CTA agency logos (circle or text marks).
- Continue attributing CTA data where displayed.
- Avoid copy that implies CTA endorsement ("official", "authorized", etc.).

This brand system is compatible with current project compliance rules while providing a strong, ownable identity for Chicago Transit Tracker.
