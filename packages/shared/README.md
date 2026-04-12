# @ctt/shared

Shared TypeScript types, constants, and pure helpers used by both `@ctt/web` and `@ctt/mobile`.

## Usage

```typescript
import type { Line, Station } from '@ctt/shared'
import { CTA_LINE_COLORS, LINE_COLORS, METRA_LINE_NAMES } from '@ctt/shared'
import { siteConfig } from '@ctt/shared'
```

## What belongs here

- Pure TypeScript types and interfaces
- Constants (CTA/Metra line colors, route mappings, site config)
- Pure functions with no platform dependencies

## What does NOT belong here

- Anything importing `firebase-admin`, `next`, `next/*`, or `react-dom`
- Code that uses browser APIs or Node.js-specific modules
- React components (these go in each app's own components directory)

## No build step

This package is consumed as TypeScript source — no compilation needed. Next.js uses `transpilePackages` and Expo's Metro bundler resolves it directly via `watchFolders`.
