/**
 * seed-stations.ts
 *
 * Populates the Firestore `stations` collection with CTA and Metra station data.
 * Includes `lineOrder` — the position of each station on each line it serves,
 * derived from GTFS stop_sequence via the longest representative trip per route.
 *
 * Data sources:
 *   CTA    — Chicago Open Data Portal (station metadata, no auth)
 *   CTA    — CTA GTFS static feed (stop ordering, no auth)
 *   Metra  — Metra GTFS static feed (station metadata + stop ordering, no auth)
 *
 * Auth:
 *   1. Place a Firebase service account JSON at the project root as `service-account.json`, OR
 *   2. Set GOOGLE_APPLICATION_CREDENTIALS to the path of your service account JSON.
 *
 * Usage:
 *   npm run seed:stations
 */

import * as admin from 'firebase-admin'
import * as https from 'https'
import * as path from 'path'
import * as fs from 'fs'
import AdmZip from 'adm-zip'
import { parse as parseCSV } from 'csv-parse/sync'

// ---------------------------------------------------------------------------
// Firebase init
// ---------------------------------------------------------------------------

function initFirebase(): admin.firestore.Firestore {
  const saPath = path.join(__dirname, '..', 'service-account.json')
  if (fs.existsSync(saPath)) {
    const serviceAccount = require(saPath)
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
  } else {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: 'chicago-transit-tracker',
    })
  }
  return admin.firestore()
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function downloadBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
          return downloadBuffer(res.headers.location).then(resolve).catch(reject)
        }
        const chunks: Buffer[] = []
        res.on('data', (chunk: Buffer) => chunks.push(chunk))
        res.on('end', () => resolve(Buffer.concat(chunks)))
        res.on('error', reject)
      })
      .on('error', reject)
  })
}

function parseGTFS(text: string): Record<string, string>[] {
  return parseCSV(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
    bom: true,
  })
}

/**
 * For a set of GTFS files, returns a map of stationKey → { [lineShortName]: sortPosition }.
 * Uses the longest trip per route as the canonical ordering.
 *
 * @param stopTimes   Parsed stop_times.txt rows
 * @param trips       Parsed trips.txt rows
 * @param routeToShortName  Map of route_id → line shortName (e.g. "Red", "BNSF")
 * @param stopToStation     Function mapping a GTFS stop_id to a stable station key
 */
function buildLineOrder(
  stopTimes: Record<string, string>[],
  trips: Record<string, string>[],
  routeToShortName: Map<string, string>,
  stopToStation: (stopId: string) => string | null,
): Map<string, Record<string, number>> {
  // trip_id → route_id
  const tripRoute = new Map<string, string>()
  for (const t of trips) tripRoute.set(t.trip_id, t.route_id)

  // Group stop_times by trip_id
  const stopTimesByTrip = new Map<string, Array<{ stopId: string; seq: number }>>()
  for (const st of stopTimes) {
    if (!stopTimesByTrip.has(st.trip_id)) stopTimesByTrip.set(st.trip_id, [])
    stopTimesByTrip.get(st.trip_id)!.push({ stopId: st.stop_id, seq: parseInt(st.stop_sequence) })
  }

  // For each route, find the trip that serves the most unique stations (most complete)
  const routeBestTrip = new Map<string, string>()
  for (const [tripId, stops] of stopTimesByTrip) {
    const routeId = tripRoute.get(tripId)
    if (!routeId || !routeToShortName.has(routeId)) continue
    const existing = routeBestTrip.get(routeId)
    const existingCount = existing ? (stopTimesByTrip.get(existing)?.length ?? 0) : 0
    if (stops.length > existingCount) routeBestTrip.set(routeId, tripId)
  }

  // Build stationKey → { [shortName]: position }
  const result = new Map<string, Record<string, number>>()

  for (const [routeId, tripId] of routeBestTrip) {
    const shortName = routeToShortName.get(routeId)!
    const stops = (stopTimesByTrip.get(tripId) ?? []).sort((a, b) => a.seq - b.seq)

    const seen = new Set<string>()
    let position = 1
    for (const { stopId } of stops) {
      const stationKey = stopToStation(stopId)
      if (!stationKey || seen.has(stationKey)) continue
      seen.add(stationKey)
      if (!result.has(stationKey)) result.set(stationKey, {})
      result.get(stationKey)![shortName] = position++
    }
  }

  return result
}

// ---------------------------------------------------------------------------
// CTA — Chicago Open Data Portal (station metadata)
//       + CTA GTFS static feed (stop ordering)
// ---------------------------------------------------------------------------

const CTA_GTFS_URL = 'https://www.transitchicago.com/downloads/sch_data/google_transit.zip'

const CTA_LINE_MAP: Record<string, string> = {
  red: 'Red',
  blue: 'Blue',
  g: 'Green',
  brn: 'Brown',
  p: 'Purple',
  y: 'Yellow',
  pnk: 'Pink',
  o: 'Orange',
}

// CTA GTFS route_id → our line shortName
const CTA_GTFS_ROUTE_MAP: Record<string, string> = {
  Red: 'Red',
  Blue: 'Blue',
  G: 'Green',
  Brn: 'Brown',
  P: 'Purple',
  Pexp: 'Purple',
  Y: 'Yellow',
  Pnk: 'Pink',
  Org: 'Orange',
}

async function fetchCTAStations(): Promise<Record<string, unknown>[]> {
  // --- Metadata from Socrata ---
  const url = 'https://data.cityofchicago.org/resource/8pix-ypme.json?$limit=500'
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`CTA API error: ${resp.status}`)
  const stops: Record<string, unknown>[] = await resp.json()

  // Group by map_id for one doc per station
  const stations = new Map<number, Record<string, unknown>>()
  for (const stop of stops) {
    const mapId = parseInt(stop.map_id as string)
    const lines = Object.entries(CTA_LINE_MAP)
      .filter(([key]) => stop[key] === true)
      .map(([, label]) => label)
    const loc = stop.location as { latitude: string; longitude: string }

    if (!stations.has(mapId)) {
      stations.set(mapId, {
        name: stop.station_name,
        slug: slugify(stop.station_name as string),
        address: '',
        location: new admin.firestore.GeoPoint(parseFloat(loc.latitude), parseFloat(loc.longitude)),
        municipality: 'Chicago',
        service: 'cta',
        lines,
        hours: null,
        open24Hours: false,
        accessibility: {
          ada: stop.ada === true,
          elevator: false,
          escalator: false,
        },
        amenities: [],
        parking: false,
        stationType: 'elevated',
        terminal: false,
        ctaStopId: parseInt(stop.stop_id as string),
        ctaMapId: mapId,
        metraStopId: null,
        photoUrl: null,
        lineOrder: {},
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    } else {
      const existing = stations.get(mapId)!
      existing.lines = [...new Set([...(existing.lines as string[]), ...lines])]
    }
  }

  // --- Stop ordering from CTA GTFS ---
  console.log('  Downloading CTA GTFS zip...')
  const buf = await downloadBuffer(CTA_GTFS_URL)
  const zip = new AdmZip(buf)

  const gtfsStops = parseGTFS(zip.readAsText('stops.txt'))
  const gtfsTrips = parseGTFS(zip.readAsText('trips.txt'))
  const gtfsTimes = parseGTFS(zip.readAsText('stop_times.txt'))

  // Platform stop_id → parent_station (map_id) — location_type 0 are platforms
  const platformToMapId = new Map<string, number>()
  for (const s of gtfsStops) {
    if (s.location_type === '' || s.location_type === '0') {
      if (s.parent_station) platformToMapId.set(s.stop_id, parseInt(s.parent_station))
    }
  }

  const routeToShortName = new Map(Object.entries(CTA_GTFS_ROUTE_MAP))

  const lineOrder = buildLineOrder(gtfsTimes, gtfsTrips, routeToShortName, (stopId) => {
    const mapId = platformToMapId.get(stopId)
    return mapId != null ? String(mapId) : null
  })

  // Apply lineOrder to station docs
  for (const [mapId, station] of stations) {
    station.lineOrder = lineOrder.get(String(mapId)) ?? {}
  }

  return [...stations.values()]
}

// ---------------------------------------------------------------------------
// Metra — GTFS static schedule (metadata + stop ordering)
// ---------------------------------------------------------------------------

const METRA_GTFS_URL = 'https://schedules.metrarail.com/gtfs/schedule.zip'

async function fetchMetraStations(): Promise<Record<string, unknown>[]> {
  console.log('  Downloading Metra GTFS zip...')
  const buf = await downloadBuffer(METRA_GTFS_URL)
  const zip = new AdmZip(buf)

  console.log('  Parsing GTFS files...')
  const stops = parseGTFS(zip.readAsText('stops.txt'))
  const routes = parseGTFS(zip.readAsText('routes.txt'))
  const trips = parseGTFS(zip.readAsText('trips.txt'))
  const stopTimes = parseGTFS(zip.readAsText('stop_times.txt'))

  // trip_id → route_id
  const tripRoute = new Map<string, string>()
  for (const t of trips) tripRoute.set(t.trip_id, t.route_id)

  // stop_id → Set<route_id>
  const stopRoutes = new Map<string, Set<string>>()
  for (const st of stopTimes) {
    const routeId = tripRoute.get(st.trip_id)
    if (!routeId) continue
    if (!stopRoutes.has(st.stop_id)) stopRoutes.set(st.stop_id, new Set())
    stopRoutes.get(st.stop_id)!.add(routeId)
  }

  // route_id → human-readable short name (e.g. "UP-N", "BNSF")
  const routeName = new Map<string, string>()
  for (const r of routes) routeName.set(r.route_id, r.route_short_name || r.route_id)

  // Build lineOrder using GTFS stop_sequence
  const lineOrder = buildLineOrder(
    stopTimes,
    trips,
    routeName,
    (stopId) => stopId, // Metra stop_id is the station key directly
  )

  return stops.map((stop) => ({
    name: stop.stop_name,
    slug: slugify(stop.stop_name),
    address: '',
    location: new admin.firestore.GeoPoint(parseFloat(stop.stop_lat), parseFloat(stop.stop_lon)),
    municipality: '',
    service: 'metra',
    lines: [...(stopRoutes.get(stop.stop_id) ?? [])].map((id) => routeName.get(id) ?? id),
    hours: null,
    open24Hours: false,
    accessibility: {
      ada: stop.wheelchair_boarding === '1',
      elevator: false,
      escalator: false,
    },
    amenities: [],
    parking: false,
    stationType: 'commuter_rail',
    terminal: false,
    ctaStopId: null,
    ctaMapId: null,
    metraStopId: stop.stop_id,
    photoUrl: null,
    lineOrder: lineOrder.get(stop.stop_id) ?? {},
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }))
}

// ---------------------------------------------------------------------------
// Firestore write  (batches of 500 — Firestore hard limit)
// ---------------------------------------------------------------------------

async function writeStations(
  db: admin.firestore.Firestore,
  stations: Record<string, unknown>[],
): Promise<void> {
  const slugCount = new Map<string, number>()
  for (const s of stations) {
    const slug = s.slug as string
    slugCount.set(slug, (slugCount.get(slug) ?? 0) + 1)
  }

  const resolved = stations.map((station) => {
    const base = station.slug as string
    const docId = slugCount.get(base)! > 1 ? `${base}-${station.service as string}` : base
    return { docId, data: { ...station, slug: docId } }
  })

  const BATCH_SIZE = 500
  for (let i = 0; i < resolved.length; i += BATCH_SIZE) {
    const batch = db.batch()
    for (const { docId, data } of resolved.slice(i, i + BATCH_SIZE)) {
      batch.set(db.collection('stations').doc(docId), data)
    }
    await batch.commit()
    console.log(`  Wrote ${Math.min(i + BATCH_SIZE, resolved.length)} / ${resolved.length}`)
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const db = initFirebase()

  console.log('Fetching CTA stations + GTFS ordering...')
  const cta = await fetchCTAStations()
  console.log(`  ${cta.length} CTA stations`)

  console.log('Fetching Metra stations + GTFS ordering...')
  const metra = await fetchMetraStations()
  console.log(`  ${metra.length} Metra stations`)

  const all = [...cta, ...metra]
  console.log(`\nWriting ${all.length} total stations to Firestore...`)
  await writeStations(db, all)
  console.log('\nDone.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
