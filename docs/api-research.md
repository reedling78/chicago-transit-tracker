# Transit API Research

Research conducted March 2026. Documents available public APIs for CTA and Metra.

---

## CTA (Chicago Transit Authority)

Developer portal: https://www.transitchicago.com/developers/

All CTA APIs require a **free API key**. Apply at https://www.transitchicago.com/developers/traintrackerapply/. Default rate limit is 100,000 requests/day.

### Train Tracker API (Real-time)

Docs: https://www.transitchicago.com/developers/ttdocs/
PDF guide: https://www.transitchicago.com/assets/1/6/cta_Train_Tracker_API_Developer_Guide_and_Documentation.pdf

Three endpoints:

| Endpoint | Description |
|---|---|
| `arrivals` | Predicted arrival times by `mapid` (station) or `stpid` (stop/direction) |
| `locations` | Real-time train positions by route |
| `followThisTrain` | Track a single train run |

- Returns XML or JSON
- No polling frequency specified; data is live

### Bus Tracker API (Real-time)

Docs: https://www.transitchicago.com/developers/bustracker/
PDF guide: https://www.transitchicago.com/assets/1/6/cta_Bus_Tracker_API_Developer_Guide_and_Documentation_20160929.pdf

Base URL: `http://www.ctabustracker.com/bustime/api/v2/`

Key endpoints:

| Endpoint | Description |
|---|---|
| `getroutes` | List all routes |
| `getstops` | Stops for a given route/direction |
| `getvehicles` | Real-time bus positions |
| `getpredictions` | Predicted arrivals for a stop or vehicle |

- Parameters passed as HTTP GET query strings
- Returns XML or JSON

### Customer Alerts API (Real-time)

Docs: https://www.transitchicago.com/developers/alerts/

Provides service alerts, elevator outage notices, and route-level disruptions. No API key required.

### GTFS Static Feed

Standard GTFS zip with schedules, stop locations, and route shapes. No key required. Available through the CTA Developer Center.

---

## Metra (Chicago Commuter Rail)

Developer portal: https://metra.com/developers
API info: https://metra.com/metra-gtfs-api

All Metra feeds require a **free API key** obtained by completing a request form and agreeing to the license agreement: https://metra.com/gtfs-realtime-api-key-request-license-agreement

> **Note:** The old API at `https://gtfsapi.metrarail.com` was shut down November 1, 2025. Use the new endpoints below.

### GTFS Static Feed

URL: `https://schedules.metrarail.com/gtfs/schedule.zip`

Contains the full Metra schedule: routes, stops, stop times, shapes, calendars. Updated periodically — Metra publishes a timestamp file so developers can detect when a new zip is available. Check at most once every 24 hours.

This is currently used by this project in `scripts/seed-stations.ts` to seed Firestore.

### GTFS Realtime API

Base URL: `https://gtfspublic.metrarr.com/gtfs/public/`

Authentication: `?api_token=YOUR_TOKEN` query parameter on every request.

Data updated every **30 seconds**.

| Endpoint | Description |
|---|---|
| `/positions` | Real-time vehicle positions (lat/lng, train run, route) |
| `/tripupdates` | Live trip updates — delays, stop time predictions |
| `/alerts` | Service alerts and disruptions |

- Response format: [Protocol Buffers](https://protobuf.dev/) following the [GTFS-realtime spec](https://gtfs.org/documentation/realtime/reference/)
- A JS/TS library like `gtfs-realtime-bindings` can decode the protobuf payloads

---

## Integration Notes for This Project

This project is currently a **fully static export** (`output: 'export'`). Real-time API data cannot be fetched at runtime in a static site — it would require either:

1. **Client-side fetching** — move to a hybrid or server-rendered approach, or fetch from the browser directly (requires CORS support from the API)
2. **Scheduled rebuild** — use a cron job to rebuild and redeploy the static site on an interval (not truly real-time)
3. **Separate API proxy** — a lightweight server (e.g. Firebase Functions or a small Node server) that proxies CTA/Metra requests and the frontend fetches from it client-side

CTA Train Tracker and Metra GTFS-RT are the most valuable for a user-facing feature — live arrival times at a station page would be a significant upgrade over static schedule data.
