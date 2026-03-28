/**
 * generate-metra-trips.ts
 *
 * Downloads the Metra GTFS feed and generates:
 *   public/data/metra-trip-index/{line-slug}.json       — trip list per line (by service type)
 *   public/data/metra-trip-detail/{trip-id}.json        — full stop sequence per trip
 *   public/data/metra-station-trips/{station-slug}.json — trips stopping at each station
 *
 * Auth:
 *   1. Place service-account.json at the project root, OR
 *   2. Set GOOGLE_APPLICATION_CREDENTIALS env var
 *
 * Usage:
 *   npm run generate:metra-trips
 */

import * as admin from 'firebase-admin'
import * as https from 'https'
import * as path from 'path'
import * as fs from 'fs'
import AdmZip from 'adm-zip'
import { parse as parseCSV } from 'csv-parse/sync'

const METRA_GTFS_URL = 'https://schedules.metrarail.com/gtfs/schedule.zip'
const INDEX_DIR = path.join(__dirname, '..', 'public', 'data', 'metra-trip-index')
const DETAIL_DIR = path.join(__dirname, '..', 'public', 'data', 'metra-trip-detail')
const STATION_TRIPS_DIR = path.join(__dirname, '..', 'public', 'data', 'metra-station-trips')

// ---------------------------------------------------------------------------
// Firebase init (same pattern as other scripts)
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
// Utilities (same as other scripts)
// ---------------------------------------------------------------------------

function downloadBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
        return downloadBuffer(res.headers.location).then(resolve).catch(reject)
      }
      const chunks: Buffer[] = []
      res.on('data', (c: Buffer) => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    }).on('error', reject)
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

/** GTFS "HH:MM:SS" (may exceed 23h) → minutes since midnight, for sorting */
function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

/** GTFS "HH:MM:SS" (may exceed 23h) → "H:MM AM/PM" display string */
function formatGTFSTime(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const hour24 = h % 24
  const period = hour24 < 12 ? 'AM' : 'PM'
  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`
}

/** Make a trip_id safe for use as a URL segment and filename */
function safeTripId(tripId: string): string {
  return tripId.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase()
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ServiceType = 'weekday' | 'saturday' | 'sunday'

interface TripStop {
  sequence: number
  stationName: string
  slug: string | null
  arrival: string
  departure: string
}

interface TripDetail {
  tripId: string
  trainNumber: string
  headsign: string
  line: string
  lineSlug: string
  lineName: string
  serviceType: ServiceType
  directionId: number
  stops: TripStop[]
}

interface TripIndexEntry {
  tripId: string
  trainNumber: string
  headsign: string
  firstDeparture: string
  directionId: number
}

interface TripIndex {
  weekday: TripIndexEntry[]
  saturday: TripIndexEntry[]
  sunday: TripIndexEntry[]
}

interface StationTripEntry {
  tripId: string
  trainNumber: string
  headsign: string
  departure: string
  line: string
  lineSlug: string
  directionId: number
}

interface StationTrips {
  weekday: StationTripEntry[]
  saturday: StationTripEntry[]
  sunday: StationTripEntry[]
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const db = initFirebase()

  fs.mkdirSync(INDEX_DIR, { recursive: true })
  fs.mkdirSync(DETAIL_DIR, { recursive: true })
  fs.mkdirSync(STATION_TRIPS_DIR, { recursive: true })

  // Load Metra stations from Firestore: metraStopId → { slug, name }
  console.log('Loading Metra stations from Firestore...')
  const stationSnap = await db.collection('stations').where('service', '==', 'metra').get()
  const stopIdToSlug = new Map<string, string>()
  const stopIdToName = new Map<string, string>()
  for (const doc of stationSnap.docs) {
    const d = doc.data()
    if (d.metraStopId) {
      stopIdToSlug.set(d.metraStopId as string, doc.id)
      stopIdToName.set(d.metraStopId as string, d.name as string)
    }
  }
  console.log(`  ${stopIdToSlug.size} stations loaded\n`)

  // Load Metra lines from Firestore: metraLineCode → { slug, name }
  console.log('Loading Metra lines from Firestore...')
  const lineSnap = await db.collection('lines').where('service', '==', 'metra').get()
  const lineCodeToSlug = new Map<string, string>()
  const lineCodeToName = new Map<string, string>()
  for (const doc of lineSnap.docs) {
    const d = doc.data()
    if (d.metraLineCode) {
      lineCodeToSlug.set(d.metraLineCode as string, doc.id)
      lineCodeToName.set(d.metraLineCode as string, d.name as string)
    }
  }
  console.log(`  ${lineCodeToSlug.size} lines loaded\n`)

  // Download GTFS zip
  console.log('Downloading Metra GTFS...')
  const buf = await downloadBuffer(METRA_GTFS_URL)
  const zip = new AdmZip(buf)
  console.log('  Downloaded\n')

  function readZipFile(name: string): string {
    const entry = zip.getEntry(name)
    if (!entry) throw new Error(`GTFS zip missing file: ${name}`)
    return entry.getData().toString('utf8')
  }

  // stops.txt → stopId → name (GTFS fallback for stops not in Firestore)
  const gtfsStopName = new Map<string, string>()
  for (const s of parseGTFS(readZipFile('stops.txt'))) {
    gtfsStopName.set(s.stop_id, s.stop_name)
  }

  // routes.txt → routeId → line code (route_short_name)
  const routeToLineCode = new Map<string, string>()
  for (const r of parseGTFS(readZipFile('routes.txt'))) {
    routeToLineCode.set(r.route_id, r.route_short_name || r.route_id)
  }

  // calendar.txt → serviceId → ServiceType
  const serviceTypeMap = new Map<string, ServiceType>()
  for (const row of parseGTFS(readZipFile('calendar.txt'))) {
    let type: ServiceType = 'weekday'
    if (row.saturday === '1') type = 'saturday'
    else if (row.sunday === '1') type = 'sunday'
    serviceTypeMap.set(row.service_id, type)
  }

  // stop_times.txt — parse and group by trip_id, sorted by stop_sequence
  console.log('Parsing stop_times.txt...')
  const rawStopTimes = parseGTFS(readZipFile('stop_times.txt'))
  console.log(`  ${rawStopTimes.length.toLocaleString()} rows\n`)

  const tripStopRows = new Map<string, typeof rawStopTimes>()
  for (const st of rawStopTimes) {
    if (!tripStopRows.has(st.trip_id)) tripStopRows.set(st.trip_id, [])
    tripStopRows.get(st.trip_id)!.push(st)
  }
  for (const rows of tripStopRows.values()) {
    rows.sort((a, b) => parseInt(a.stop_sequence) - parseInt(b.stop_sequence))
  }

  // trips.txt → build trip metadata and output files
  console.log('Processing trips...')
  const trips = parseGTFS(readZipFile('trips.txt'))

  // lineSlug → { entries per service type (with sort key) }
  const lineIndexData = new Map<string, { weekday: Array<TripIndexEntry & { _sortMin: number }>, saturday: Array<TripIndexEntry & { _sortMin: number }>, sunday: Array<TripIndexEntry & { _sortMin: number }> }>()

  // stationSlug → { entries per service type (with sort key) }
  const stationTripsData = new Map<string, { weekday: Array<StationTripEntry & { _sortMin: number }>, saturday: Array<StationTripEntry & { _sortMin: number }>, sunday: Array<StationTripEntry & { _sortMin: number }> }>()

  let detailsWritten = 0
  let skipped = 0

  for (const t of trips) {
    const lineCode = routeToLineCode.get(t.route_id)
    if (!lineCode) { skipped++; continue }

    const lineSlug = lineCodeToSlug.get(lineCode)
    if (!lineSlug) { skipped++; continue }

    const lineName = lineCodeToName.get(lineCode) ?? lineCode
    const serviceType = serviceTypeMap.get(t.service_id) ?? 'weekday'
    const directionId = parseInt(t.direction_id ?? '0')

    const stopRows = tripStopRows.get(t.trip_id)
    if (!stopRows || stopRows.length === 0) { skipped++; continue }

    // Headsign: use trip_headsign, fall back to last stop name
    let headsign = t.trip_headsign?.trim() ?? ''
    if (!headsign) {
      const lastStop = stopRows[stopRows.length - 1]
      headsign = stopIdToName.get(lastStop.stop_id) ?? gtfsStopName.get(lastStop.stop_id) ?? ''
    }
    if (!headsign) { skipped++; continue }

    // Train number: trip_short_name if present, otherwise trip_id
    const trainNumber = t.trip_short_name?.trim() || t.trip_id

    // Build stop sequence
    const stops: TripStop[] = stopRows.map((st) => ({
      sequence: parseInt(st.stop_sequence),
      stationName: stopIdToName.get(st.stop_id) ?? gtfsStopName.get(st.stop_id) ?? st.stop_id,
      slug: stopIdToSlug.get(st.stop_id) ?? null,
      arrival: formatGTFSTime(st.arrival_time || st.departure_time),
      departure: formatGTFSTime(st.departure_time || st.arrival_time),
    }))

    const tripId = safeTripId(t.trip_id)

    const detail: TripDetail = {
      tripId,
      trainNumber,
      headsign,
      line: lineCode,
      lineSlug,
      lineName,
      serviceType,
      directionId,
      stops,
    }

    fs.writeFileSync(path.join(DETAIL_DIR, `${tripId}.json`), JSON.stringify(detail))
    detailsWritten++

    // Add each stop to that station's trip list
    for (let i = 0; i < stopRows.length; i++) {
      const st = stopRows[i]
      const stationSlug = stopIdToSlug.get(st.stop_id)
      if (!stationSlug) continue

      if (!stationTripsData.has(stationSlug)) {
        stationTripsData.set(stationSlug, { weekday: [], saturday: [], sunday: [] })
      }
      const depRaw = st.departure_time || st.arrival_time
      stationTripsData.get(stationSlug)![serviceType].push({
        tripId,
        trainNumber,
        headsign,
        departure: formatGTFSTime(depRaw),
        line: lineCode,
        lineSlug,
        directionId,
        _sortMin: timeToMinutes(depRaw),
      })
    }

    // Add to line index with sort key
    if (!lineIndexData.has(lineSlug)) {
      lineIndexData.set(lineSlug, { weekday: [], saturday: [], sunday: [] })
    }
    const indexBucket = lineIndexData.get(lineSlug)!

    const firstDepartureRaw = stopRows[0].departure_time || stopRows[0].arrival_time
    const sortMin = timeToMinutes(firstDepartureRaw)

    indexBucket[serviceType].push({
      tripId,
      trainNumber,
      headsign,
      firstDeparture: formatGTFSTime(firstDepartureRaw),
      directionId,
      _sortMin: sortMin,
    })
  }

  // Write index files (sorted by departure time, sort key stripped)
  let indexWritten = 0
  for (const [lineSlug, buckets] of lineIndexData) {
    const index: TripIndex = {
      weekday:  buckets.weekday.sort((a, b) => a._sortMin - b._sortMin).map(({ _sortMin: _, ...e }) => e),
      saturday: buckets.saturday.sort((a, b) => a._sortMin - b._sortMin).map(({ _sortMin: _, ...e }) => e),
      sunday:   buckets.sunday.sort((a, b) => a._sortMin - b._sortMin).map(({ _sortMin: _, ...e }) => e),
    }
    fs.writeFileSync(path.join(INDEX_DIR, `${lineSlug}.json`), JSON.stringify(index))
    indexWritten++
  }

  // Write station trip files (sorted by departure time, sort key stripped)
  let stationTripsWritten = 0
  for (const [stationSlug, buckets] of stationTripsData) {
    const stationTrips: StationTrips = {
      weekday:  buckets.weekday.sort((a, b) => a._sortMin - b._sortMin).map(({ _sortMin: _, ...e }) => e),
      saturday: buckets.saturday.sort((a, b) => a._sortMin - b._sortMin).map(({ _sortMin: _, ...e }) => e),
      sunday:   buckets.sunday.sort((a, b) => a._sortMin - b._sortMin).map(({ _sortMin: _, ...e }) => e),
    }
    fs.writeFileSync(path.join(STATION_TRIPS_DIR, `${stationSlug}.json`), JSON.stringify(stationTrips))
    stationTripsWritten++
  }

  console.log(`\nWritten: ${detailsWritten} trip detail files   → ${DETAIL_DIR}`)
  console.log(`Written: ${indexWritten} trip index files    → ${INDEX_DIR}`)
  console.log(`Written: ${stationTripsWritten} station trip files → ${STATION_TRIPS_DIR}`)
  if (skipped > 0) console.log(`Skipped: ${skipped} trips (no line/stop match or missing headsign)`)
  console.log('Done.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
