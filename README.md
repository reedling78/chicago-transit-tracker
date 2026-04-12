# Chicago Transit Tracker

A web and mobile app for exploring CTA and Metra transit lines, stations, and schedules across the Chicago metro area.

Live site: [chicagotransittracker.com](https://chicagotransittracker.com)

---

## Monorepo Structure

| Package | Description |
|---------|-------------|
| [`apps/web`](apps/web/) | Next.js 16 web app — SSR via Firebase App Hosting |
| [`apps/mobile`](apps/mobile/) | React Native Expo app (iOS/Android) |
| [`apps/functions`](apps/functions/) | Firebase Cloud Functions — automated GTFS schedule sync |
| [`packages/shared`](packages/shared/) | Shared TypeScript types, constants, and pure helpers |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Monorepo | pnpm workspaces + Turborepo |
| Web | Next.js 16 (App Router, SSR) |
| Mobile | React Native Expo (SDK 54, expo-router) |
| Language | TypeScript 5 |
| Web Styling | Tailwind CSS v4 |
| Database | Firebase Firestore |
| Web Hosting | Firebase App Hosting (SSR) |
| Mobile Builds | EAS Build |
| Analytics | Google Analytics 4 |
| Testing | Jest 30 + React Testing Library |

---

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- Firebase CLI (`npm install -g firebase-tools`)

### Setup

```bash
git clone https://github.com/reedrizzo/chicago-transit-tracker.git
cd chicago-transit-tracker
pnpm install
```

### Firebase credentials

Place a `service-account.json` in the project root (gitignored). The web app checks for it first, then falls back to Application Default Credentials.

### Commands

```bash
# Development
pnpm -w run dev          # Web dev server at http://localhost:3000
cd apps/mobile && npx expo start  # Mobile dev server

# Quality
pnpm -w run lint         # Lint all packages
pnpm -w run test         # Run all test suites
pnpm -w run build        # Production build

# Firebase
firebase deploy --only firestore   # Deploy Firestore rules
firebase deploy --only functions   # Deploy Cloud Functions
```

---

## CTA Branding Compliance

This project follows the [CTA Trademark Guidelines for Developers](https://www.transitchicago.com/developers/branding/). See `CLAUDE.md` for full details on required colors, attribution, and logo rules.

---

## License

Private project.
