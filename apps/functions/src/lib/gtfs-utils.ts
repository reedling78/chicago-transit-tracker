/**
 * Shared GTFS parsing utilities extracted from scripts/.
 *
 * Used by both the Cloud Functions (automated sync) and the local
 * npm scripts (manual seed/generate).
 */

import * as https from 'https'
import * as http from 'http'
import AdmZip from 'adm-zip'
import { parse as parseCSV } from 'csv-parse/sync'

// ---------------------------------------------------------------------------
// Types
//
// These types mirror the frontend-side definitions in
// app/lib/gtfs-types.ts (schedule shapes) and app/lib/metra-status.ts
// (TripStop). The Cloud Functions package has its own tsconfig so we keep
// a local copy rather than importing across package boundaries. Keep the
// two sides in sync when adding or removing fields.
// ---------------------------------------------------------------------------

export type ServiceType = 'weekday' | 'saturday' | 'sunday'

export interface DirectionSchedule {
  headsign: string
  line: string
  weekday: number[]
  saturday: number[]
  sunday: number[]
}

export interface StationSchedule {
  service: 'cta' | 'metra'
  directions: DirectionSchedule[]
}

export interface TripStop {
  sequence: number
  stationName: string
  slug: string | null
  arrival: string
  departure: string
}

export interface TripDetail {
  tripId: string
  trainNumber: string
  headsign: string
  line: string
  lineSlug: string
  lineName: string
  serviceType: ServiceType
  directionId: number
  stops: TripStop[]
  /**
   * `true` when this trip stops at fewer than {@link IS_EXPRESS_STOP_FRACTION}
   * of the maximum stop count seen for the same `(lineSlug, serviceType,
   * directionId)` group. Computed at parse time so dashboard cards can render
   * an "Express" pill without re-deriving it client-side.
   */
  isExpress: boolean
}

export interface TripIndexEntry {
  tripId: string
  trainNumber: string
  headsign: string
  firstDeparture: string
  directionId: number
}

export interface TripIndex {
  weekday: TripIndexEntry[]
  saturday: TripIndexEntry[]
  sunday: TripIndexEntry[]
}

export interface StationTripEntry {
  tripId: string
  trainNumber: string
  headsign: string
  departure: string
  line: string
  lineSlug: string
  directionId: number
}

export interface StationTrips {
  weekday: StationTripEntry[]
  saturday: StationTripEntry[]
  sunday: StationTripEntry[]
}

// ---------------------------------------------------------------------------
// Download helpers
// ---------------------------------------------------------------------------

/** Download a URL to a Buffer, following redirects. */
export function downloadBuffer(url: string): Promise<Buffer> {
  const get = url.startsWith('https') ? https.get : http.get
  return new Promise((resolve, reject) => {
    get(url, (res) => {
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
        downloadBuffer(res.headers.location).then(resolve).catch(reject)
        return
      }
      const chunks: Buffer[] = []
      res.on('data', (c: Buffer) => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    }).on('error', reject)
  })
}

/** Fetch a small text file (e.g. published.txt). */
export function fetchText(url: string): Promise<string> {
  return downloadBuffer(url).then((buf) => buf.toString('utf8').trim())
}

/** Send an HTTP HEAD request and return the headers. */
export function headRequest(url: string): Promise<Record<string, string | undefined>> {
  const lib = url.startsWith('https') ? https : http
  return new Promise((resolve, reject) => {
    const req = lib.request(url, { method: 'HEAD' }, (res) => {
      resolve({
        'last-modified': res.headers['last-modified'] as string | undefined,
        etag: res.headers['etag'] as string | undefined,
      })
    })
    req.on('error', reject)
    req.end()
  })
}

// ---------------------------------------------------------------------------
// GTFS CSV parsing
// ---------------------------------------------------------------------------

/** Parse a GTFS CSV string into an array of records. */
export function parseGTFS(text: string): Record<string, string>[] {
  return parseCSV(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
    bom: true,
  })
}

/** Read a file from an AdmZip instance. */
export function readZipFile(zip: AdmZip, name: string): string {
  const entry = zip.getEntry(name)
  if (!entry) throw new Error(`GTFS zip missing file: ${name}`)
  return entry.getData().toString('utf8')
}

// ---------------------------------------------------------------------------
// Time conversion
// ---------------------------------------------------------------------------

/** GTFS time "HH:MM:SS" (may exceed 23h) → minutes since midnight. */
export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

/** GTFS "HH:MM:SS" (may exceed 23h) → "H:MM AM/PM" display string. */
export function formatGTFSTime(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const hour24 = h % 24
  const period = hour24 < 12 ? 'AM' : 'PM'
  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`
}

/** Make a trip_id safe for use as a URL segment and filename. */
export function safeTripId(tripId: string): string {
  return tripId.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase()
}

/**
 * Extract the human-facing Metra train number from a GTFS trip_id.
 *
 * Metra trip IDs look like `{LINE}_{PREFIX}{NUMBER}_V{version}_{suffix}`, e.g.
 * `MD-W_MW2222_V2_A`, `BNSF_BN1200_V4_A`, `NCS_NC100_V1_A`. The train number
 * is the digits in the second underscore-delimited segment. Returns the
 * original trip_id if the pattern doesn't match.
 */
export function extractMetraTrainNumber(tripId: string): string {
  const segments = tripId.split('_')
  if (segments.length < 2) return tripId
  const match = segments[1].match(/(\d+)/)
  return match ? match[1] : tripId
}

/** Build a deduplicated Firestore doc key for a Metra train on a given line. */
export function metraTrainDocId(lineSlug: string, trainNumber: string): string {
  return `${lineSlug}_${trainNumber}`
}

// ---------------------------------------------------------------------------
// Calendar / service type helpers
// ---------------------------------------------------------------------------

/** Build a map from GTFS service_id → ServiceType using calendar.txt rows. */
export function buildServiceTypeMap(
  calendarRows: Record<string, string>[],
): Map<string, ServiceType> {
  const map = new Map<string, ServiceType>()
  for (const row of calendarRows) {
    let type: ServiceType = 'weekday'
    if (row.saturday === '1') type = 'saturday'
    else if (row.sunday === '1') type = 'sunday'
    map.set(row.service_id, type)
  }
  return map
}
