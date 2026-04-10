# Chicago Transit Tracker

A static web app for exploring CTA and Metra transit lines, stations, and schedules across the Chicago metro area. Built with Next.js (App Router), Tailwind CSS v4, and Firebase.

Live site: [chicagotransittracker.com](https://chicagotransittracker.com)

---

## Tech Stack

| Layer     | Technology                             |
| --------- | -------------------------------------- |
| Framework | Next.js 16 (App Router, static export) |
| Language  | TypeScript 5                           |
| Styling   | Tailwind CSS v4                        |
| Database  | Firebase Firestore                     |
| Hosting   | Firebase Hosting                       |
| Analytics | Google Analytics 4 (G-KQ1MNGBQP2)      |
| Testing   | Jest 30 + React Testing Library        |

---

## Site Structure

```
/                          Home — hero with CTA and Metra service cards
/cta                       CTA service page — list of all 8 rail lines
/cta/[line]                Line detail — schedule, stats, station list
/cta/[line]/[station]      Station detail — location, service, accessibility info
/metra                     Metra service page — list of all 11 commuter lines
/metra/[line]              Line detail — operations, counties served, station list
/metra/[line]/[station]    Station detail — location, service, accessibility info
```

All routes are statically exported at build time. `generateStaticParams` fetches slugs from Firestore during `npm run build` — there is no runtime server.

---

## Components

| Component          | Description                                                         |
| ------------------ | ------------------------------------------------------------------- |
| `Navbar`           | Top navigation with CTA / Metra links, theme toggle, mobile menu    |
| `MobileMenuToggle` | Hamburger menu for mobile viewports                                 |
| `ThemeToggle`      | Light/dark mode button — persisted to `localStorage`                |
| `Hero`             | Home page banner with service cards linking to CTA and Metra        |
| `PageHeader`       | Full-bleed photo hero with breadcrumb, badges, title, description   |
| `Breadcrumb`       | Semantic breadcrumb trail — rendered inside `PageHeader`            |
| `LineChipList`     | Clickable line color chips linking to each line's detail page       |
| `LinkCard`         | Clickable card used in service and line listing pages               |
| `LineDetail`       | Full line detail layout — stats, schedule, operations, station list |
| `StationDetail`    | Full station detail layout — location, service, accessibility, IDs  |

---

## Data Model

Data lives in two Firestore collections. All reads happen at build time via Firebase Admin SDK.

### `lines` collection

One document per transit line. Doc ID = slug (e.g. `red`, `bnsf`, `up-n`).

| Field                  | Type                               | Notes                       |
| ---------------------- | ---------------------------------- | --------------------------- |
| `name`                 | string                             | Full name, e.g. "Red Line"  |
| `shortName`            | string                             | Display name, e.g. "Red"    |
| `slug`                 | string                             | URL-safe ID                 |
| `service`              | `cta` \| `metra`                   |                             |
| `color`                | string                             | Hex brand color             |
| `textColor`            | string                             | Hex text color for contrast |
| `termini`              | string[]                           | [start, end] station names  |
| `stationCount`         | number                             |                             |
| `routeMiles`           | number                             |                             |
| `operatesOvernight`    | boolean                            |                             |
| `peakFrequencyMins`    | number \| null                     | CTA only                    |
| `offPeakFrequencyMins` | number \| null                     | CTA only                    |
| `firstTrainApprox`     | string \| null                     |                             |
| `lastTrainApprox`      | string \| null                     |                             |
| `type`                 | `rapid_transit` \| `commuter_rail` |                             |
| `description`          | string                             |                             |
| `ctaRouteId`           | string \| null                     |                             |
| `metraLineCode`        | string \| null                     |                             |
| `downtownTerminal`     | string \| null                     | Metra only                  |
| `operator`             | string \| null                     | Metra only                  |
| `countiesServed`       | string[]                           | Metra only                  |

### `stations` collection

One document per station. Doc ID = slug (e.g. `clark-lake`, `ogilvie-metra`).

| Field           | Type                                  | Notes                                                         |
| --------------- | ------------------------------------- | ------------------------------------------------------------- |
| `name`          | string                                |                                                               |
| `slug`          | string                                | URL-safe ID                                                   |
| `address`       | string                                |                                                               |
| `location`      | `{latitude, longitude}`               |                                                               |
| `municipality`  | string                                |                                                               |
| `service`       | `cta` \| `metra` \| `both`            |                                                               |
| `lines`         | string[]                              | Line short names, e.g. `["Red", "Blue"]`                      |
| `hours`         | `{weekday, saturday, sunday}` \| null |                                                               |
| `open24Hours`   | boolean                               |                                                               |
| `accessibility` | `{ada, elevator, escalator}`          |                                                               |
| `amenities`     | string[]                              |                                                               |
| `parking`       | boolean                               |                                                               |
| `stationType`   | string                                | `elevated`, `subway`, `at_grade`, `terminal`, `commuter_rail` |
| `terminal`      | boolean                               |                                                               |
| `ctaStopId`     | number \| null                        |                                                               |
| `ctaMapId`      | number \| null                        |                                                               |
| `metraStopId`   | string \| null                        |                                                               |

Duplicate slugs across services (e.g. a Metra and CTA station both named "Rosemont") get a `-cta` / `-metra` suffix.

---

## Local Development

### Prerequisites

- Node.js 20+
- Firebase CLI (`npm install -g firebase-tools`)
- A Firebase service account (for seeding and build-time Firestore reads)

### Setup

```bash
git clone https://github.com/reedrizzo/chicago-transit-tracker.git
cd chicago-transit-tracker
npm install
```

### Firebase credentials

Build-time Firestore access requires credentials. The app checks for a `service-account.json` file first, then falls back to Application Default Credentials.

**Option A — Service account file (recommended for local builds):**

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click **Generate new private key**
3. Save the file as `service-account.json` in the project root
4. `service-account.json` is gitignored — never commit it

**Option B — Application Default Credentials:**

```bash
gcloud auth application-default login
```

### Commands

```bash
npm run dev          # Start dev server at http://localhost:3000
npm run build        # Production build — exports static files to out/
npm run lint         # ESLint
npm test             # Run Jest test suite
npm run test:watch   # Jest in watch mode
```

---

## Seeding Firestore

These scripts populate the Firestore database. Run them once (or after schema changes).

### Lines

Seeds all 19 lines (8 CTA + 11 Metra) with hardcoded metadata:

```bash
npm run seed:lines
```

### Stations

Fetches live data from two public sources and writes one doc per station:

- **CTA** — Chicago Open Data Portal Socrata API
- **Metra** — GTFS static zip from Metra's public schedule feed

```bash
npm run seed:stations
```

Both scripts require Firebase credentials (see above).

---

## Build & Deploy

### 1. Build

```bash
npm run build
```

This runs the Next.js static export. During the build, `generateStaticParams` queries Firestore to enumerate all line and station slugs. The output lands in `out/`.

### 2. Deploy to Firebase Hosting

```bash
firebase deploy --only hosting
```

That's it. Firebase serves the contents of `out/` as a static site.

To deploy Firestore rules at the same time:

```bash
firebase deploy
```

---

## CTA Branding Compliance

This project follows the CTA Trademark Guidelines for Developers. Any contributor working on CTA-related UI must read the guidelines before making changes.

- **Local copy:** `docs/design guidelines/CTA_Trademark_Developer_Guidelines_(with_Branding_Guide)_v1_0.pdf`
- **Online:** https://www.transitchicago.com/developers/branding/

Key points:

### Official 'L' Route Colors

These exact hex values must be used for all CTA line color representations — no substitutions.

| Line      | Hex       |
| --------- | --------- |
| Red       | `#c60c30` |
| Blue      | `#00a1de` |
| Brown     | `#62361b` |
| Green     | `#009b3a` |
| Orange    | `#f9461c` |
| Purple    | `#522398` |
| Pink      | `#e27ea6` |
| Yellow    | `#f9e300` |
| Sign Grey | `#565a5c` |

### Attribution

All pages or views that display CTA data must credit the source. Acceptable phrases:

- "Data provided by Chicago Transit Authority"
- "Data provided by CTA"
- "Powered by CTA data"

Do not use words like "official", "authorized", or "in partnership with CTA".

### Logo and Icon Rules

| Asset                           | Permitted use                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------ |
| CTA agency logos (circle, text) | **Prohibited**                                                                             |
| CTA Bus Tracker icon            | Only alongside Bus Tracker API data. Black/white/grey only. Must carry trademark notice.   |
| CTA Train Tracker icon          | Only alongside Train Tracker API data. Black/white/grey only. Must carry trademark notice. |
| US DOT bus icon                 | Allowed. Keep black or white — do not colorize.                                            |
| CTA 'L' train icon              | Allowed for L service info. May be colored to match official route colors.                 |

When using the Bus Tracker or Train Tracker icons, include the notice: _"CTA Bus/Train Tracker (SM) logo icon is a trademark of the Chicago Transit Authority."_

### Project Naming

**Chicago Transit Tracker** is compliant — "CTA" is not the first word. Do not rename or brand any page/feature in a way that implies CTA made or endorses it.

---

## Dark Mode

The site supports light and dark mode. The preference is saved to `localStorage` and applied before the first paint via a blocking inline script in `<head>` — so there is no flash on page load. The toggle is in the top-right corner of the navbar.

---

## Standing Rules

- **Sitemap:** `app/sitemap.ts` must be updated whenever a new page route is added. No exceptions.
- **Static export:** All pages must be compatible with `output: 'export'`. No server-side runtime. All data fetching happens at build time.
- **Firestore at build time:** Use Firebase Admin SDK in server components and `generateStaticParams`. Never import `firebase-admin` in client components.
