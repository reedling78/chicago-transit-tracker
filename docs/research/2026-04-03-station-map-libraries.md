# Research: Station Map Libraries and Tile Providers

**Date:** 2026-04-03
**Question:** What are the best and cheapest options for rendering station maps in a Next.js static export — considering JS library choice, tile provider, bundle size, and long-term cost?
**Feeds into:** Refactoring `app/components/StationMap.tsx`

---

## Key Findings

1. **The current setup (MapLibre GL JS + CARTO free GL styles) is already solid.** CARTO's Positron and Dark Matter vector tile styles are served free with no API key, making the current zero-dependency, zero-cost architecture hard to beat on price.

2. **All major map libraries require client-side rendering.** Leaflet, MapLibre, and Mapbox GL JS all touch `window`/`document` directly. In Next.js (including static export), every map component must be wrapped in a `dynamic(() => import(...), { ssr: false })`. The current `StationMap.tsx` already handles this correctly via `'use client'` + `useEffect`.

3. **Leaflet is the simplest and lightest option.** At ~42KB (vs MapLibre's ~290KB), `react-leaflet` is well-suited for a use case like this — a single non-interactive marker at a fixed zoom. The trade-off: raster tiles only, no smooth vector zoom, and requires a `dynamic` import due to the same SSR constraint.

4. **MapLibre is the right default for vector tile maps.** It is the open-source fork of Mapbox GL JS (BSD-2-Clause license, governed by Linux Foundation). It supports the same style spec, has a large plugin ecosystem, and is the industry-standard free replacement for Mapbox. The current implementation already uses it correctly.

5. **Mapbox GL JS has no compelling advantage here.** It adds proprietary licensing, requires an API key, and meters usage above 50,000 map loads/month. Given that the current MapLibre setup uses CARTO tiles (not Mapbox's CDN), switching to Mapbox would only add cost and lock-in.

6. **Google Maps Embed API is free and unlimited**, but it does not support dark mode, cannot be styled to match the site's design system, and is vendor-locked. Not a good fit for a dark-mode-aware transit UI.

7. **CARTO's free GL tile styles have no stated SLA** — they're a goodwill offering. If reliability or uptime guarantees matter in the future, Stadia Maps ($0 non-commercial, $20/mo commercial) or self-hosted OpenMapTiles are the fallback options.

---

## Options / Trade-offs

| Option | Bundle | Cost | Tile Source | Dark Mode | Notes |
|---|---|---|---|---|---|
| **MapLibre GL JS** (current) | ~290KB | Free | CARTO (no key) | Yes (style swap) | Current implementation; WebGL required |
| **Leaflet + react-leaflet** | ~42KB | Free | OSM raster (no key) | Partial (via CSS tint) | Simpler API, no WebGL, raster only |
| **Mapbox GL JS** | ~300KB | Free to 50k/mo, then metered | Mapbox CDN (key required) | Yes | Adds cost + vendor lock-in; no benefit over MapLibre here |
| **Google Maps Embed** | 0 (iframe) | Free/unlimited | Google | No | Can't style; looks out of place in dark mode |
| **Stadia Maps tiles** (with MapLibre) | ~290KB | Free (non-commercial, 200k/mo) | Stadia CDN (key required) | Yes | Better-looking styles than CARTO; worth considering if CARTO reliability becomes a concern |

**Recommendation:** Stay on MapLibre GL JS. The current library choice is correct. The refactor effort is better spent on:
- Reducing the bundle impact (lazy load the component)
- Making dark mode detection more robust (currently reads `classList` at mount, may miss changes in some cases — the `MutationObserver` handles live changes correctly)
- Auditing whether `interactive: false` and `attributionControl: false` should be revisited for accessibility

If the CARTO free tiles ever go away or become unreliable, switch the style URLs to Stadia Maps (requires a free account and API key). No library change needed.

---

## Open Questions

- **CARTO tile longevity:** CARTO's free GL basemap styles (Positron, Dark Matter) are widely used but have no formal SLA. Worth bookmarking their status page and having a Stadia Maps fallback URL ready.
- **Bundle size:** At 290KB, MapLibre is a meaningful chunk. The map is below the fold on station pages — confirm it is lazy-loaded (behind a dynamic import) in the final component tree, not blocking the critical path.
- **Accessibility:** The current map uses `interactive: false`, which prevents keyboard navigation. This is fine for a decorative embedded map, but should be documented so future contributors don't accidentally enable interactivity without also adding ARIA/keyboard support.

---

## Sources

- [Mapbox GL JS vs Leaflet vs MapLibre — PkgPulse Blog](https://www.pkgpulse.com/blog/mapbox-vs-leaflet-vs-maplibre-interactive-maps-2026)
- [Map libraries popularity: Leaflet vs MapLibre GL vs OpenLayers — Geoapify](https://www.geoapify.com/map-libraries-comparison-leaflet-vs-maplibre-gl-vs-openlayers-trends-and-statistics/)
- [Scalable Pricing & Plans — Stadia Maps](https://stadiamaps.com/pricing/)
- [Raster tile providers — OpenStreetMap Wiki](https://wiki.openstreetmap.org/wiki/Raster_tile_providers)
- [React, Leaflet, and SSR — Jan Müller](https://janmueller.dev/blog/react-leaflet/)
- [Making React-Leaflet work with NextJS — PlaceKit](https://placekit.io/blog/articles/making-react-leaflet-work-with-nextjs-493i)
- [Google Maps API Pricing 2026 — The Final Code](https://www.thefinalcode.com/blog/view/1267/is-google-maps-api-still-free-in-2026-real-costs-limits-and-smarter-alternatives)
- [The best React map libraries in 2024 — Retool](https://retool.com/blog/react-map-library)
