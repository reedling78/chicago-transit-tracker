/**
 * generate-cta-schedules.ts
 *
 * Downloads the CTA GTFS feed and generates per-station schedule JSON files
 * at public/data/cta-schedules/{slug}.json.
 *
 * Each file contains scheduled departure times (as minutes since midnight)
 * grouped by direction and service type (weekday / saturday / sunday).
 *
 * These files are served as static assets and fetched by the Arrivals
 * client component to display estimated next arrivals.
 *
 * Auth:
 *   1. Place service-account.json at the project root, OR
 *   2. Set GOOGLE_APPLICATION_CREDENTIALS env var
 *
 * Usage:
 *   npm run generate:schedules
 */

import * as admin from 'firebase-admin'
import * as https from 'https'
import * as path from 'path'
import * as fs from 'fs'
import AdmZip from 'adm-zip'
import { parse as parseCSV } from 'csv-parse/sync'

const CTA_GTFS_URL = 'https://www.transitchicago.com/downloads/sch_data/google_transit.zip'
const OUT_DIR = path.join(__dirname, '..', 'public', 'data', 'cta-schedules')

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

function downloadBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
          return downloadBuffer(res.headers.location).then(resolve).catch(reject)
        }
        const chunks: Buffer[] = []
        res.on('data', (c: Buffer) => chunks.push(c))
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

/** GTFS time "HH:MM:SS" (may exceed 23h) → minutes since midnight */
function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ServiceType = 'weekday' | 'saturday' | 'sunday'

export interface DirectionSchedule {
  headsign: string
  line: string
  weekday: number[]
  saturday: number[]
  sunday: number[]
}

export interface StationSchedule {
  directions: DirectionSchedule[]
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const db = initFirebase()

  fs.mkdirSync(OUT_DIR, { recursive: true })

  // Load ctaMapId → slug mapping from Firestore
  console.log('Loading CTA stations from Firestore...')
  const snap = await db.collection('stations').where('service', '==', 'cta').get()
  const mapIdToSlug = new Map<number, string>()
  for (const doc of snap.docs) {
    const d = doc.data()
    if (d.ctaMapId) mapIdToSlug.set(d.ctaMapId as number, doc.id)
  }
  console.log(`Loaded ${mapIdToSlug.size} CTA stations\n`)

  // Download GTFS zip
  console.log('Downloading CTA GTFS...')
  const buf = await downloadBuffer(CTA_GTFS_URL)
  const zip = new AdmZip(buf)
  console.log('GTFS downloaded\n')

  function readZipFile(name: string): string {
    const entry = zip.getEntry(name)
    if (!entry) throw new Error(`GTFS zip missing file: ${name}`)
    return entry.getData().toString('utf8')
  }

  // stops.txt → platformToMapId: stop_id → ctaMapId
  //            → stationNameMap: ctaMapId → station name (from parent stops)
  const stops = parseGTFS(readZipFile('stops.txt'))
  const platformToMapId = new Map<string, number>()
  const stationNameMap = new Map<number, string>()
  for (const s of stops) {
    if (s.location_type === '1') {
      // Parent station entry — has the clean station name
      stationNameMap.set(parseInt(s.stop_id), s.stop_name)
    } else if ((s.location_type === '' || s.location_type === '0') && s.parent_station) {
      platformToMapId.set(s.stop_id, parseInt(s.parent_station))
    }
  }

  // calendar.txt → serviceId → serviceType
  const serviceTypeMap = new Map<string, ServiceType>()
  for (const row of parseGTFS(readZipFile('calendar.txt'))) {
    let type: ServiceType = 'weekday'
    if (row.saturday === '1') type = 'saturday'
    else if (row.sunday === '1') type = 'sunday'
    serviceTypeMap.set(row.service_id, type)
  }

  // stop_times.txt — parse once, build two things:
  //   1. tripMaxSeq: tripId → terminal stop_id (for headsign fallback)
  //   2. schedule buckets (main data)
  console.log('Parsing stop_times.txt...')
  const stopTimes = parseGTFS(readZipFile('stop_times.txt'))
  console.log(`  ${stopTimes.length.toLocaleString()} rows\n`)

  // Pass 1: find terminal stop (highest stop_sequence) per trip
  const tripMaxSeq = new Map<string, { stopId: string; seq: number }>()
  for (const st of stopTimes) {
    const seq = parseInt(st.stop_sequence)
    const cur = tripMaxSeq.get(st.trip_id)
    if (!cur || seq > cur.seq) tripMaxSeq.set(st.trip_id, { stopId: st.stop_id, seq })
  }

  // trips.txt → tripId → { headsign, line, serviceType }
  // Falls back to terminal stop name if trip_headsign is absent/empty
  const tripMeta = new Map<string, { headsign: string; line: string; serviceType: ServiceType }>()
  for (const t of parseGTFS(readZipFile('trips.txt'))) {
    const line = CTA_GTFS_ROUTE_MAP[t.route_id]
    if (!line) continue

    let headsign = t.trip_headsign?.trim() ?? ''
    if (!headsign) {
      const terminal = tripMaxSeq.get(t.trip_id)
      if (terminal) {
        const mapId = platformToMapId.get(terminal.stopId)
        headsign = (mapId ? stationNameMap.get(mapId) : undefined) ?? ''
      }
    }
    if (!headsign) continue

    tripMeta.set(t.trip_id, {
      headsign,
      line,
      serviceType: serviceTypeMap.get(t.service_id) ?? 'weekday',
    })
  }

  // ctaMapId → dirKey("headsign|||line") → serviceType → Set<minutes>
  const schedule = new Map<number, Map<string, Map<ServiceType, Set<number>>>>()
  const seenTripStation = new Set<string>()

  for (const st of stopTimes) {
    const meta = tripMeta.get(st.trip_id)
    if (!meta) continue
    const ctaMapId = platformToMapId.get(st.stop_id)
    if (!ctaMapId) continue

    // One departure per trip per station (first platform encountered)
    const dedupKey = `${st.trip_id}|${ctaMapId}`
    if (seenTripStation.has(dedupKey)) continue
    seenTripStation.add(dedupKey)

    const dirKey = `${meta.headsign}|||${meta.line}`

    if (!schedule.has(ctaMapId)) schedule.set(ctaMapId, new Map())
    const byDir = schedule.get(ctaMapId)!

    if (!byDir.has(dirKey)) byDir.set(dirKey, new Map())
    const bySvc = byDir.get(dirKey)!

    if (!bySvc.has(meta.serviceType)) bySvc.set(meta.serviceType, new Set())
    bySvc.get(meta.serviceType)!.add(timeToMinutes(st.departure_time))
  }

  // Write one JSON file per station
  let written = 0
  let missing = 0

  for (const [ctaMapId, byDir] of schedule) {
    const slug = mapIdToSlug.get(ctaMapId)
    if (!slug) {
      missing++
      continue
    }

    const directions: DirectionSchedule[] = []
    for (const [dirKey, bySvc] of byDir) {
      const sepIdx = dirKey.indexOf('|||')
      const headsign = dirKey.slice(0, sepIdx)
      const line = dirKey.slice(sepIdx + 3)
      directions.push({
        headsign,
        line,
        weekday: [...(bySvc.get('weekday') ?? [])].sort((a, b) => a - b),
        saturday: [...(bySvc.get('saturday') ?? [])].sort((a, b) => a - b),
        sunday: [...(bySvc.get('sunday') ?? [])].sort((a, b) => a - b),
      })
    }

    const data: StationSchedule = { directions }
    fs.writeFileSync(path.join(OUT_DIR, `${slug}.json`), JSON.stringify(data))
    written++
  }

  console.log(`Written:  ${written} schedule files → ${OUT_DIR}`)
  if (missing > 0) console.log(`Skipped:  ${missing} ctaMapId(s) not found in Firestore`)
  console.log('Done.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
