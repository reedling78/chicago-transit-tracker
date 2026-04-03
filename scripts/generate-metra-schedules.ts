/**
 * generate-metra-schedules.ts
 *
 * Downloads the Metra GTFS feed and generates per-station schedule JSON files
 * at public/data/metra-schedules/{slug}.json.
 *
 * Metra GTFS uses stop_id directly as the station key (no parent_station
 * hierarchy unlike CTA). Each stop_id corresponds to one station platform.
 *
 * Auth:
 *   1. Place service-account.json at the project root, OR
 *   2. Set GOOGLE_APPLICATION_CREDENTIALS env var
 *
 * Usage:
 *   npm run generate:metra-schedules
 */

import * as admin from 'firebase-admin'
import * as https from 'https'
import * as path from 'path'
import * as fs from 'fs'
import AdmZip from 'adm-zip'
import { parse as parseCSV } from 'csv-parse/sync'

const METRA_GTFS_URL = 'https://schedules.metrarail.com/gtfs/schedule.zip'
const OUT_DIR = path.join(__dirname, '..', 'public', 'data', 'metra-schedules')

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

interface DirectionSchedule {
  headsign: string
  line: string
  weekday: number[]
  saturday: number[]
  sunday: number[]
}

interface StationSchedule {
  directions: DirectionSchedule[]
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const db = initFirebase()

  fs.mkdirSync(OUT_DIR, { recursive: true })

  // Load metraStopId → slug mapping from Firestore
  console.log('Loading Metra stations from Firestore...')
  const snap = await db.collection('stations').where('service', '==', 'metra').get()
  const stopIdToSlug = new Map<string, string>()
  for (const doc of snap.docs) {
    const d = doc.data()
    if (d.metraStopId) stopIdToSlug.set(d.metraStopId as string, doc.id)
  }
  console.log(`Loaded ${stopIdToSlug.size} Metra stations\n`)

  // Download GTFS zip
  console.log('Downloading Metra GTFS...')
  const buf = await downloadBuffer(METRA_GTFS_URL)
  const zip = new AdmZip(buf)
  console.log('GTFS downloaded\n')

  function readZipFile(name: string): string {
    const entry = zip.getEntry(name)
    if (!entry) throw new Error(`GTFS zip missing file: ${name}`)
    return entry.getData().toString('utf8')
  }

  // stops.txt → stop name map (for headsign fallback)
  const stopNameMap = new Map<string, string>()
  for (const s of parseGTFS(readZipFile('stops.txt'))) {
    stopNameMap.set(s.stop_id, s.stop_name)
  }

  // routes.txt → routeId → line shortName (Metra route_id IS the line code)
  const routeNameMap = new Map<string, string>()
  for (const r of parseGTFS(readZipFile('routes.txt'))) {
    routeNameMap.set(r.route_id, r.route_short_name || r.route_id)
  }

  // calendar.txt → serviceId → serviceType
  const serviceTypeMap = new Map<string, ServiceType>()
  for (const row of parseGTFS(readZipFile('calendar.txt'))) {
    let type: ServiceType = 'weekday'
    if (row.saturday === '1') type = 'saturday'
    else if (row.sunday === '1') type = 'sunday'
    serviceTypeMap.set(row.service_id, type)
  }

  // stop_times.txt — parse once
  console.log('Parsing stop_times.txt...')
  const stopTimes = parseGTFS(readZipFile('stop_times.txt'))
  console.log(`  ${stopTimes.length.toLocaleString()} rows\n`)

  // Pass 1: find terminal stop (highest stop_sequence) per trip for headsign fallback
  const tripMaxSeq = new Map<string, { stopId: string; seq: number }>()
  for (const st of stopTimes) {
    const seq = parseInt(st.stop_sequence)
    const cur = tripMaxSeq.get(st.trip_id)
    if (!cur || seq > cur.seq) tripMaxSeq.set(st.trip_id, { stopId: st.stop_id, seq })
  }

  // trips.txt → tripId → { headsign, line, serviceType }
  const tripMeta = new Map<string, { headsign: string; line: string; serviceType: ServiceType }>()
  for (const t of parseGTFS(readZipFile('trips.txt'))) {
    const line = routeNameMap.get(t.route_id)
    if (!line) continue

    let headsign = t.trip_headsign?.trim() ?? ''
    if (!headsign) {
      const terminal = tripMaxSeq.get(t.trip_id)
      if (terminal) headsign = stopNameMap.get(terminal.stopId) ?? ''
    }
    if (!headsign) continue

    tripMeta.set(t.trip_id, {
      headsign,
      line,
      serviceType: serviceTypeMap.get(t.service_id) ?? 'weekday',
    })
  }

  // Pass 2: bucket minutes by (metraStopId, "headsign|||line", serviceType)
  // Metra: stop_id IS the station — no parent mapping needed
  const schedule = new Map<string, Map<string, Map<ServiceType, Set<number>>>>()
  const seenTripStation = new Set<string>()

  for (const st of stopTimes) {
    const meta = tripMeta.get(st.trip_id)
    if (!meta) continue
    if (!stopIdToSlug.has(st.stop_id)) continue

    const dedupKey = `${st.trip_id}|${st.stop_id}`
    if (seenTripStation.has(dedupKey)) continue
    seenTripStation.add(dedupKey)

    const dirKey = `${meta.headsign}|||${meta.line}`

    if (!schedule.has(st.stop_id)) schedule.set(st.stop_id, new Map())
    const byDir = schedule.get(st.stop_id)!

    if (!byDir.has(dirKey)) byDir.set(dirKey, new Map())
    const bySvc = byDir.get(dirKey)!

    if (!bySvc.has(meta.serviceType)) bySvc.set(meta.serviceType, new Set())
    bySvc.get(meta.serviceType)!.add(timeToMinutes(st.departure_time))
  }

  // Write one JSON file per station
  let written = 0
  let missing = 0

  for (const [stopId, byDir] of schedule) {
    const slug = stopIdToSlug.get(stopId)
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
  if (missing > 0) console.log(`Skipped:  ${missing} stop_id(s) not found in Firestore`)
  console.log('Done.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
