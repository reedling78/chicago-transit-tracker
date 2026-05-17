# Transit Agency Compliance

These rules ensure the site remains compliant with the developer terms of use of every transit agency whose data we display. They are mandatory — any change that touches data display, branding, attribution, naming, or the public Terms / Privacy pages must follow them. Failures here are not just a polish issue: trademark or licensing violations can cause an agency to revoke our API keys, which is a site-wide outage.

If you are about to ship a feature that displays data from an agency not listed below, **stop**, read that agency's developer terms, and add a new section to this file before continuing.

---

## Source documents

Always cross-check against the live versions of these — they change without notice:

- **CTA Developer License Agreement & Terms of Use** — `https://www.transitchicago.com/developers/terms/`
- **CTA Trademark Guidelines for Developers (PDF)** — `https://www.transitchicago.com/assets/1/6/CTA_Trademark_Developer_Guidelines_(with_Branding_Guide)_v1_0.pdf`
- **CTA Branding overview** — `https://www.transitchicago.com/developers/branding/`
- **Metra GTFS Realtime API Key Request License Agreement** — `https://metra.com/gtfs-realtime-api-key-request-license-agreement`
- **Metra GTFS API page** — `https://metra.com/metra-gtfs-api`
- **Pace Route Timetable Data Services (license is in the GTFS zip plus this page)** — `https://www.pacebus.com/route-timetable-data-services`

---

## Universal rules (apply to every agency)

- **Never imply endorsement.** Do not use "official", "authorized", "in partnership with", or any phrasing that suggests the agency operates, sponsors, or has reviewed this site. The only "Powered by" string allowed is for CTA, with the exact wording listed below.
- **Never embed or reproduce agency maps, brochures, documents, or PDFs.** Link out to the agency website.
- **Never use an agency's first word as our first word.** Project name is "Chicago Transit Tracker" — keep it that way. New page titles, headings, and component names must follow the same rule (no `<h1>CTA Train Tracker</h1>`, no `<h1>Metra Schedules</h1>` styled to look like agency property).
- **Always provide a verification linkout.** Wherever schedules, alerts, or trip data are shown, the user must have a path to confirm against the agency's own site (footer link, Terms page, or in-context).
- **Self-host all data.** Clients must never call agency endpoints directly. Web → `apps/web/app/api/*` proxy. Mobile → Cloud Functions in `apps/functions/src/index.ts`. This is enforced by `.claude/rules/security.md` and is also a hard Metra license requirement (see below).
- **No agency API key in client code.** No `NEXT_PUBLIC_*` or `EXPO_PUBLIC_*` variable may hold an agency credential. Audit before shipping.

---

## CTA — Chicago Transit Authority

CTA is the most permissive of the three but has specific trademark rules.

### Attribution

Crediting CTA is **optional**. If we credit, the credit line must be one of:

- "Data provided by Chicago Transit Authority"
- "Data provided by CTA"
- "Powered by CTA data"
- Or "similar, descriptive language" — keep it descriptive, not promotional.

If we credit specifically with the CTA Bus Tracker or Train Tracker logo icon, the line must read: *"CTA Bus Tracker data provided by Chicago Transit Authority. The CTA Bus Tracker logo is a trademark of Chicago Transit Authority"* (substitute "Train Tracker" as appropriate).

**Do not include the trademark sentence if the corresponding icon is not actually rendered on the page.** Stating "the X logo is a trademark of CTA" when no logo is displayed is misleading and a credibility risk. Today this affects `apps/web/app/components/CtaServicePulse.tsx:148-150`.

### Brand assets

- **Prohibited:** Any CTA agency logo (the circle "CTA" logo, "CTA" wordmarks beyond plain text references). Do not approximate or recreate them.
- **Allowed (conditional):** CTA Bus Tracker icon — only alongside Bus Tracker data, in **black, white, or grey only**. Must include the Bus Tracker (SM) trademark notice.
- **Allowed (conditional):** CTA Train Tracker icon — only alongside Train Tracker data, in **black, white, or grey only**. Must include the Train Tracker (SM) trademark notice.
- **Allowed:** US DOT bus pictogram — keep black or white, never colorize.
- **Allowed:** A custom CTA "L" train icon (not the CTA agency logo) — may be colored to match official route colors. See `apps/mobile/components/CTALineIcon.tsx` for a compliant implementation.

### "L" route colors

Use the official Pantone-derived hex values, no substitutions, no near-misses. The single source of truth is `packages/shared/src/constants.ts`. If you need a CTA route color in a new component, import from `@ctt/shared` — never hardcode.

| Line   | Hex       | Pantone |
| ------ | --------- | ------- |
| Red    | `#c60c30` | 186C    |
| Blue   | `#00a1de` | 299C    |
| Brown  | `#62361b` | 161C    |
| Green  | `#009b3a` | 355C    |
| Orange | `#f9461c` | 172C    |
| Purple | `#522398` | 267C    |
| Pink   | `#e27ea6` | 204C    |
| Yellow | `#f9e300` | 012C    |

### Naming

"Chicago Transit Tracker" is compliant. Never name a new page, route, feature flag, or component in a way that puts CTA first or sounds like CTA produced it (e.g. don't ship `/cta-tracker`, `<CtaOfficialStatus>`, "CTA Bus Tracker by us").

---

## Metra — strictest of the three

Metra's GTFS Realtime license has **two hard requirements** that must appear wherever Metra data is shown to the user. These are the most likely places we'll fall out of compliance.

### Required disclaimer wording

Every page, screen, or component that displays Metra Data must state that this app **"is not sponsored, affiliated, or operated by Metra"**. Use that exact phrasing — "Not affiliated with Metra" alone is not enough; the license requires all three terms (sponsored, affiliated, operated).

Where this is currently satisfied:
- `apps/web/app/components/Footer.tsx` — site-wide footer (verify wording matches; today's footer reads "Not affiliated with CTA or Metra" which is short of Metra's required phrasing and should be tightened)
- `apps/web/app/terms/page.tsx` — Terms page Overview section

When adding a new page or screen that surfaces Metra data without going through the standard footer (e.g. an embedded widget, a print view, a mobile-only screen with no footer), the wording must be added inline. The mobile app currently has no footer — Metra screens must surface this disclaimer somewhere reachable (settings screen, alert page footer, etc.).

### Required last-updated timestamp

Metra requires that any representation of the data **"include a statement including the date and time the Data was last updated"**. This is the most common gap in the codebase today.

Every component that renders Metra realtime or schedule data must show a visible "Last updated: HH:MM" (or equivalent) string sourced from the actual fetch time, not the page render time. The polling layer already tracks `fetchedAt`; the gap is in the UI.

Components that must surface a timestamp (web):
- `apps/web/app/components/MetraAlerts.tsx`
- `apps/web/app/components/MetraPositions.tsx`
- `apps/web/app/components/MetraTripUpdates.tsx`
- `apps/web/app/components/MetraTripRealtime.tsx`
- `apps/web/app/components/MetraCurrentService.tsx`
- `apps/web/app/components/MetraTripStopTimeline.tsx`
- `apps/web/app/components/Arrivals.tsx` — station arrivals card; merges Metra GTFS-RT trip updates into scheduled rows. Shows "Last updated: HH:MM" only while at least one row is live.
- `apps/web/app/components/dashboard/cards/StationCard.tsx` — dashboard favorite-station card; same Metra realtime merge, same timestamp rule.

Mobile equivalents in `apps/mobile/components/` (`MetraAlerts.tsx`, `MetraTripRealtime.tsx`, `ArrivalsCard.tsx`, `dashboard/cards/StationCard.tsx`) — same rule. The arrivals/station cards only surface the "Last updated" line when a Metra realtime match is present (scheduled-only and CTA rendering is unchanged and exempt).

Static-schedule components (timetables loaded from Firestore, not GTFS-RT) must show the schedule's published date, sourced from the `gtfs-meta/metra` doc.

### Self-hosting (mandatory, not optional)

Per the Metra license, clients must redistribute Metra Data **through our own host or web service** and must **not direct application users to access data directly from Metra's servers**.

- Web client → `apps/web/app/api/metra/[...path]/route.ts` (proxies to Metra)
- Mobile client → Cloud Functions `metraTripUpdates`, `metraPositions`, `metraAlerts` in `apps/functions/src/index.ts`

Never `fetch()` a Metra URL from a `'use client'` component or from any mobile screen. If you find yourself reaching for `https://gtfsapi.metrarail.com` or any `metra.com` host in client code, stop and add a proxy.

### API key

`METRA_API_TOKEN` lives in Firebase Secret Manager (`availability: RUNTIME`) per `apps/web/apphosting.yaml`. Never log it, never echo it in errors, never put it in any `NEXT_PUBLIC_*` or `EXPO_PUBLIC_*` variable.

### Trademarks

Metra trademarks "and any confusingly similar variants" may not be used in association with the data. **No Metra logo, no Metra wordmark beyond plain descriptive text references.** Plain text "Metra", line names ("BNSF", "UP-N"), and line colors are fine. A stylized "Metra" mark is not.

---

## Pace — Pace Suburban Bus

Pace is the strictest on branding and the most permissive on attribution. Pace data is currently shipped under `apps/web/app/pace/`.

### No logo, no name-as-mark

Pace's license states: *"Licensee may not use the Pace name or logo without the prior written consent of Pace."* Plain descriptive text references to Pace by name in body copy are standard usage and acceptable. **The Pace logo cannot appear anywhere** — not in icons, not in social previews, not in marketing assets.

If you find yourself adding a Pace logo file to `apps/web/public/` or `apps/mobile/assets/`, stop. We do not have written consent from Pace.

### Non-commercial use only

Pace data is licensed for non-commercial use. The site must remain free, ad-free, and free of paid sponsorships tied to Pace data. If a monetization feature ever ships (premium tiers, ads, sponsored placements), Pace pages and any Pace-derived data must be removed until written commercial-use consent is obtained.

### Attribution

Pace permits use **without** attribution. We don't have to credit Pace, but where Pace data is shown we should:

- Provide an "as is" / "verify with Pace" disclaimer (Pace data is provided to us "as is" with no warranty).
- Link to `pacebus.com` so users can verify routes/timetables. See `apps/web/app/pace/page.tsx:40-51` for a compliant example linking to `pacebus.com/service-alerts`.

### Realtime data

There is no public Pace realtime feed. Do not scrape `tmweb.pacebus.com`, do not present approximated realtime arrivals as if they were Pace-supplied. Pages displaying Pace data should be clear that they are timetable-based.

---

## Terms of Use page (`apps/web/app/terms/page.tsx`)

The Terms page is the central, formal disclosure surface. It must always:

1. **State unaffiliated status for every agency whose data is shown**, using Metra's required phrasing for Metra ("not sponsored, affiliated, or operated by Metra"). When adding a new agency, add it to the Overview section. Today the Overview names CTA and Metra but not Pace — this is a gap that should be closed since `/pace` is live.
2. **Name every agency whose data is sourced** in the "Accuracy of Information" section, with a verification linkout to that agency's site. Today the section names CTA and Metra but not Pace.
3. **Include the warranty disclaimer** ("as is" / "as available" / "no warranty").
4. **Acknowledge agency trademarks.** The current "Intellectual Property" section covers CTA and Metra; update it to also acknowledge Pace name/logo as Pace's marks now that Pace data is shipped.
5. **Document brand-asset usage scope.** State that no agency logos are reproduced and that route colors are used solely to identify routes per the CTA Trademark Guidelines.

When you add a new agency to the site, the Terms page MUST be updated in the same PR. This is non-negotiable.

---

## Footer (`apps/web/app/components/Footer.tsx`)

The site-wide footer must contain:

1. A non-affiliation line covering every agency whose data is shown. Today: `"© {year} Chicago Transit Tracker. Not affiliated with CTA or Metra."` — this should be tightened to satisfy Metra's exact requirement (sponsored / affiliated / operated) and should add Pace now that `/pace` is live.
2. An attribution line listing every agency whose data is shown. Today: `"Transit data provided by Chicago Transit Authority and Metra."` — add Pace here as well.
3. Visible links to `/terms` and `/privacy` on every page.

Footer changes require a snapshot test update — see `apps/web/__tests__/components/Footer.test.tsx`.

---

## Mobile app gaps

Mobile (`apps/mobile/`) currently has no `/terms` or `/privacy` route and no equivalent to the web footer. This is a compliance gap, not a future enhancement:

- A mobile user displaying Metra data must still see the "not sponsored, affiliated, or operated by Metra" wording somewhere reachable.
- A mobile user must still have a path to the Terms of Use.

Acceptable solutions: a Settings/About screen with the disclaimers and a WebView (or external browser link) to the web Terms page; or per-screen footers; or an in-app native Terms screen mirroring the web one.

---

## Adding a new transit agency or new agency feature

When introducing data from an agency not listed in this file, do all of the following in the same PR:

1. Read the agency's developer terms / GTFS license / branding guidelines end to end. Save key quotes and the document URL into `docs/research/YYYY-MM-DD-<agency>-developer-terms.md`.
2. Add a new section to this file documenting attribution requirements, branding rules, naming rules, and any hard "must include" wording.
3. Update `apps/web/app/terms/page.tsx` to add the agency to the Overview, Accuracy, and Intellectual Property sections.
4. Update `apps/web/app/components/Footer.tsx` to include the agency in the attribution and non-affiliation lines.
5. Update mobile screens that surface the new agency's data with the equivalent disclaimers.
6. Add a snapshot or assertion test that fails if the required disclaimer wording is removed or altered.

---

## Pre-merge compliance checklist

When the diff touches anything that displays third-party transit data, verify in the PR description:

- [ ] No agency logo or wordmark added to `public/`, `assets/`, or component code.
- [ ] No `'use client'` or mobile component fetches an agency URL directly.
- [ ] No agency credential in `NEXT_PUBLIC_*` / `EXPO_PUBLIC_*` / client bundle.
- [ ] If displaying Metra data on a new surface: required disclaimer present AND last-updated timestamp present.
- [ ] Footer attribution + non-affiliation strings still cover every agency displayed.
- [ ] Terms page still names every agency whose data appears on the site.
- [ ] Route colors come from `@ctt/shared` constants, not hardcoded hexes.
- [ ] No "official" / "authorized" / "in partnership" language anywhere in the diff.
