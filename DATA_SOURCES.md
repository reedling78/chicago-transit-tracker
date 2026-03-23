# Data Sources

This file documents every external data source used in this project, what we currently use from each one, and what additional data is available for future features.

---

## 1. Chicago Open Data Portal — CTA L Stops

**URL:** `https://data.cityofchicago.org/resource/8pix-ypme.json`
**Auth:** None required
**Format:** Socrata JSON API
**Used for:** CTA station metadata (seeding `stations` collection)

### What we use
| Field | Description |
|---|---|
| `stop_id` | Platform-level stop ID |
| `map_id` | Parent station ID (one per physical station) |
| `station_name` | Station display name |
| `location` | `{ latitude, longitude }` |
| `ada` | ADA accessibility flag (boolean) |
| `red`, `blue`, `g`, `brn`, `p`, `y`, `pnk`, `o` | Which lines serve this stop (boolean per line) |

### Also available (not yet used)
| Field | Description | Potential use |
|---|---|---|
| `stop_name` | Platform-specific name (e.g. "Howard - Northbound 95th") | Direction-aware UI |
| `direction_id` | N/S/E/W bound | Show inbound/outbound direction |
| `station_descriptive_name` | Full descriptive name | Richer station detail |
| `location_type` | Platform vs. station | UI differentiation |

**Docs & explorer:** `https://dev.socrata.com/foundry/data.cityofchicago.org/8pix-ypme`

**Other CTA datasets on the portal worth exploring:**
- `https://data.cityofchicago.org/resource/5neh-572f.json` — CTA Bus Stops (location, routes, ADA)
- `https://data.cityofchicago.org/resource/t2rn-p8d7.json` — CTA Daily Ridership by Station (historical ridership counts per station per day — great for popularity sorting)
- `https://data.cityofchicago.org/resource/jyb9-n7fm.json` — CTA Monthly Ridership by Route
- `https://data.cityofchicago.org/resource/e5qx-5e3u.json` — CTA System Information

---

## 2. CTA GTFS Static Feed

**URL:** `https://www.transitchicago.com/downloads/sch_data/google_transit.zip`
**Auth:** None required
**Format:** GTFS (zip of CSV files)
**Used for:** CTA station stop ordering (`lineOrder` field in `stations` collection)

### What we use
| File | Fields used | Purpose |
|---|---|---|
| `stops.txt` | `stop_id`, `parent_station`, `location_type` | Map platform stops → parent station (map_id) |
| `trips.txt` | `trip_id`, `route_id` | Map trips → routes |
| `stop_times.txt` | `trip_id`, `stop_id`, `stop_sequence` | Derive station order per line |

### Also available (not yet used)
| File | Key fields | Potential use |
|---|---|---|
| `routes.txt` | `route_id`, `route_long_name`, `route_color` | Authoritative line colors and names |
| `calendar.txt` / `calendar_dates.txt` | Service dates, exceptions | Show which days a line runs |
| `stop_times.txt` | `arrival_time`, `departure_time` | Static schedule times per stop |
| `shapes.txt` | `shape_pt_lat`, `shape_pt_lon`, `shape_pt_sequence` | Draw the actual route path on a map |
| `transfers.txt` | `from_stop_id`, `to_stop_id`, `transfer_type` | Show transfer connections between lines |
| `frequencies.txt` | `headway_secs` (if present) | Frequency-based service headways |

---

## 3. Metra GTFS Static Feed

**URL:** `https://schedules.metrarail.com/gtfs/schedule.zip`
**Auth:** None required
**Format:** GTFS (zip of CSV files)
**Used for:** Metra station metadata, line associations, and stop ordering

### What we use
| File | Fields used | Purpose |
|---|---|---|
| `stops.txt` | `stop_id`, `stop_name`, `stop_lat`, `stop_lon`, `wheelchair_boarding` | Station metadata |
| `routes.txt` | `route_id`, `route_short_name` | Line short names (BNSF, UP-N, etc.) |
| `trips.txt` | `trip_id`, `route_id` | Map trips → routes |
| `stop_times.txt` | `trip_id`, `stop_id`, `stop_sequence` | Line associations + station order |

### Also available (not yet used)
| File | Key fields | Potential use |
|---|---|---|
| `routes.txt` | `route_long_name`, `route_color`, `route_text_color` | Authoritative Metra line colors |
| `stop_times.txt` | `arrival_time`, `departure_time` | Scheduled train times per station |
| `calendar.txt` | `monday`…`sunday`, `start_date`, `end_date` | Weekday vs. weekend service calendar |
| `calendar_dates.txt` | `date`, `exception_type` | Holiday/exception schedules |
| `shapes.txt` | `shape_pt_lat`, `shape_pt_lon` | Route path polylines for map display |
| `fare_attributes.txt` + `fare_rules.txt` | `price`, `origin_id`, `destination_id` | Zone-based fare calculation |
| `frequencies.txt` | `headway_secs` | Peak/off-peak frequency (if present) |
| `agency.txt` | `agency_name`, `agency_url`, `agency_phone` | Agency contact info |

---

## 4. Firebase Firestore

**Project:** `chicago-transit-tracker`
**Auth:** Firebase Admin SDK (service account or ADC)
**Used for:** All persistent data storage, read at build time

### Collections

| Collection | Purpose | Docs |
|---|---|---|
| `lines` | One doc per transit line — seeded manually via `seed-lines.ts` | 19 (8 CTA + 11 Metra) |
| `stations` | One doc per station — seeded via `seed-stations.ts` | ~388 |

---

## 5. CARTO Basemap Tiles (MapLibre)

**Light style:** `https://basemaps.cartocdn.com/gl/positron-gl-style/style.json`
**Dark style:** `https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json`
**Auth:** None required for reasonable usage
**Format:** MapLibre GL style JSON (vector tiles)
**Used for:** `StationMap` component — interactive map on station detail pages

### What's available
CARTO's free basemaps also include:
- `voyager-gl-style` — colourful road map (good general-purpose style)
- `positron-nolabels` / `dark-matter-nolabels` — label-free variants for overlaying custom labels

For more advanced mapping, consider:
- **MapTiler** (`https://cloud.maptiler.com`) — free tier, satellite imagery, terrain, indoor maps
- **Protomaps** — self-hosted tiles, one-time download, zero ongoing cost

---

## 6. Google Analytics 4

**Measurement ID:** `G-KQ1MNGBQP2`
**Auth:** None (client-side tag)
**Used for:** Page view tracking across all routes

---

## Potential Future Sources

| Source | What it offers | Notes |
|---|---|---|
| **CTA Train Tracker API** | Real-time train arrival predictions per stop | Requires a free API key from CTA |
| **CTA Bus Tracker API** | Real-time bus arrival predictions | Requires a free API key from CTA |
| **Metra Real-Time API** | Live train positions and arrival estimates | Requires Metra developer account |
| **511 SF Bay / similar** | Multi-agency GTFS-RT (real-time) | For real-time vehicle positions |
| **CTA Ridership dataset** | Daily boardings per station (historical) | Already on Chicago Open Data Portal — great for "busiest stations" features |
| **OpenStreetMap Overpass API** | Nearby amenities (parking, bikes, restaurants) | Free, no auth, powerful query language |
| **Google Places API** | Nearby businesses, photos, hours | Paid after free tier |
| **Illinois GTFS (Pace Bus)** | Suburban bus routes serving Metra stations | Free GTFS from Pace website |
