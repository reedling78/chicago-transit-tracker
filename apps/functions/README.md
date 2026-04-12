# Cloud Functions — GTFS Auto-Sync

Firebase Cloud Functions (2nd gen) that automatically sync CTA and Metra GTFS static schedule data to Firestore.

## Functions

| Function | Schedule | Source |
|----------|----------|--------|
| `syncCtaGtfs` | Hourly at `:00` | CTA GTFS zip (~99MB) |
| `syncMetraGtfs` | Hourly at `:05` | Metra `published.txt` + GTFS zip |

Both functions check for feed changes before downloading. When a feed updates, the function parses it and writes to Firestore collections (`schedules`, `metra-trips`, `metra-trip-indexes`, `metra-station-trips`, `gtfs-meta`).

## Development

```bash
npm install        # Separate deps from root monorepo
npm run build      # Compile TypeScript to lib/
```

## Deployment

```bash
firebase deploy --only functions
firebase functions:log   # View logs
```

## Key directories

- `src/index.ts` — Function entry points
- `src/lib/parsers/` — GTFS parsing logic (CTA schedules, Metra schedules, Metra trips)
- `src/lib/change-detection.ts` — HEAD request / published.txt change detection
- `src/lib/firestore-writer.ts` — Batched Firestore writer (500-op chunks)
