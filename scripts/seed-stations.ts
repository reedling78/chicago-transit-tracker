/**
 * seed-stations.ts
 *
 * Populates the Firestore `stations` collection with CTA and Metra station data.
 *
 * Data sources:
 *   CTA  — Chicago Open Data Portal (no auth required)
 *   Metra — GTFS static schedule zip (no auth required)
 *
 * Auth:
 *   1. Place a Firebase service account JSON at the project root as `service-account.json`, OR
 *   2. Set the GOOGLE_APPLICATION_CREDENTIALS env var to the path of your service account JSON.
 *
 *   To download a service account key:
 *   Firebase Console → Project Settings → Service Accounts → Generate new private key
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
        // follow one redirect
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

// ---------------------------------------------------------------------------
// CTA — Chicago Open Data Portal (Socrata JSON)
// ---------------------------------------------------------------------------

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

async function fetchCTAStations(): Promise<Record<string, unknown>[]> {
  const url =
    'https://data.cityofchicago.org/resource/8pix-ypme.json?$limit=500'
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`CTA API error: ${resp.status}`)
  const stops: Record<string, unknown>[] = await resp.json()

  // CTA has separate stop records per direction; group by map_id for one doc per station.
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
        location: new admin.firestore.GeoPoint(
          parseFloat(loc.latitude),
          parseFloat(loc.longitude),
        ),
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
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    } else {
      // Merge line flags — a station can serve multiple lines
      const existing = stations.get(mapId)!
      existing.lines = [
        ...new Set([...(existing.lines as string[]), ...lines]),
      ]
    }
  }

  return [...stations.values()]
}

// ---------------------------------------------------------------------------
// Metra — GTFS static schedule
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

  // stop_id → Set<route_id>  (deduplicate; stop_times has many rows per stop)
  const stopRoutes = new Map<string, Set<string>>()
  for (const st of stopTimes) {
    const routeId = tripRoute.get(st.trip_id)
    if (!routeId) continue
    if (!stopRoutes.has(st.stop_id)) stopRoutes.set(st.stop_id, new Set())
    stopRoutes.get(st.stop_id)!.add(routeId)
  }

  // route_id → human-readable short name  (e.g. "UP-N", "BNSF")
  const routeName = new Map<string, string>()
  for (const r of routes) routeName.set(r.route_id, r.route_short_name || r.route_id)

  return stops.map((stop) => ({
    name: stop.stop_name,
    slug: slugify(stop.stop_name),
    address: '',
    location: new admin.firestore.GeoPoint(
      parseFloat(stop.stop_lat),
      parseFloat(stop.stop_lon),
    ),
    municipality: '',
    service: 'metra',
    lines: [...(stopRoutes.get(stop.stop_id) ?? [])].map(
      (id) => routeName.get(id) ?? id,
    ),
    hours: null,
    open24Hours: false,
    accessibility: {
      ada: stop.wheelchair_boarding === '1',
      elevator: false,
      escalator: false,
    },
    amenities: [],
    parking: false,
    stationType: 'at_grade',
    terminal: false,
    ctaStopId: null,
    ctaMapId: null,
    metraStopId: stop.stop_id,
    photoUrl: null,
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
  // Find which base slugs appear more than once across services.
  const slugCount = new Map<string, number>()
  for (const s of stations) {
    const slug = s.slug as string
    slugCount.set(slug, (slugCount.get(slug) ?? 0) + 1)
  }

  // For duplicates, append the service name (e.g. "rosemont-cta", "rosemont-metra").
  const resolved = stations.map((station) => {
    const base = station.slug as string
    const docId = slugCount.get(base)! > 1
      ? `${base}-${station.service as string}`
      : base
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

  console.log('Fetching CTA stations...')
  const cta = await fetchCTAStations()
  console.log(`  ${cta.length} CTA stations`)

  console.log('Fetching Metra stations...')
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
