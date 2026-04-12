/**
 * Pace GTFS schedule parser.
 *
 * Reads a downloaded Pace GTFS zip and emits maps of Firestore documents
 * for pace-routes, pace-stops, pace-route-stops, and pace-schedules.
 */

import AdmZip from 'adm-zip'
import { buildServiceTypeMap, parseGTFS, readZipFile, type ServiceType } from '../gtfs-utils'

export type PaceRouteServiceType = 'pulse' | 'local' | 'express' | 'feeder'

export type PaceRegion = 'north' | 'northwest' | 'west' | 'southwest' | 'south' | 'heritage'

/**
 * Region override map. Populate this with route short names whose digit-based
 * region assignment is incorrect. Empty by default in v1; we'll add entries
 * as we identify miscategorizations after the first real sync.
 */
const REGION_OVERRIDES: Record<string, PaceRegion> = {
  // Example: '890': 'north',
}

/** Known Pulse routes with hardcoded regions (overrides digit heuristic). */
const PULSE_REGIONS: Record<string, PaceRegion> = {
  'pulse-milwaukee-line': 'northwest',
  'pulse-dempster-line': 'north',
}

const PACE_CORPORATE_BLUE = '#005DAA'
const DEFAULT_TEXT_COLOR = '#FFFFFF'

/** Classify a Pace route's service type from its GTFS row. */
export function deriveServiceType(row: Record<string, string>): PaceRouteServiceType {
  const short = row.route_short_name?.trim() ?? ''
  const long = row.route_long_name?.trim() ?? ''

  if (/\bpulse\b/i.test(short) || /\bpulse\b/i.test(long)) return 'pulse'
  if (/express/i.test(long)) return 'express'
  if (/^8\d{2}$/.test(short)) return 'feeder'
  return 'local'
}

/** Classify a Pace route's region from its short name. */
export function deriveRegion(shortName: string): PaceRegion {
  const trimmed = shortName.trim()
  if (REGION_OVERRIDES[trimmed]) return REGION_OVERRIDES[trimmed]

  const firstDigit = trimmed.match(/^\d/)?.[0]
  switch (firstDigit) {
    case '2':
      return 'north'
    case '3':
      return 'northwest'
    case '4':
      return 'west'
    case '5':
    case '7':
      return 'southwest'
    case '6':
      return 'south'
    case '8':
      // Feeder routes: default to north (parent division) unless overridden above.
      return 'north'
    case '9':
      return 'heritage'
    default:
      return 'north'
  }
}

interface DeriveColorInput {
  shortName: string
  gtfsColor: string
  gtfsTextColor: string
}

/** Compute the route's display color and text color. */
export function deriveColor(input: DeriveColorInput): { color: string; textColor: string } {
  const raw = input.gtfsColor?.trim() ?? ''
  if (raw && raw.toUpperCase() !== '005DAA') {
    return {
      color: `#${raw.toUpperCase()}`,
      textColor: input.gtfsTextColor ? `#${input.gtfsTextColor.toUpperCase()}` : DEFAULT_TEXT_COLOR,
    }
  }

  return { color: PACE_CORPORATE_BLUE, textColor: DEFAULT_TEXT_COLOR }
}

/** Normalize a Pace route short name into a URL-safe slug. */
export function routeSlug(shortName: string): string {
  return shortName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Build a map of GTFS stop_id → unique slug. When the same name appears
 * multiple times, append a -2, -3, ... suffix in stop_id order.
 */
export function buildStopSlugMap(stops: Record<string, string>[]): Map<string, string> {
  const slugCounts = new Map<string, number>()
  const result = new Map<string, string>()

  const baseSlug = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

  for (const stop of stops) {
    const base = baseSlug(stop.stop_name)
    const count = (slugCounts.get(base) ?? 0) + 1
    slugCounts.set(base, count)
    result.set(stop.stop_id, count === 1 ? base : `${base}-${count}`)
  }
  return result
}

export interface PaceDirection {
  id: string
  name: string
}

/**
 * Derive one canonical PaceDirection per distinct direction_id for a route.
 * For each direction_id, pick the headsign with the highest trip count.
 *
 * Pace's non-standard `direction_text` field is used as a fallback when the
 * standard `trip_headsign` is absent.
 */
export function extractDirections(
  routeId: string,
  trips: Record<string, string>[],
): PaceDirection[] {
  const counts = new Map<string, { id: string; name: string; count: number }>()
  for (const t of trips) {
    if (t.route_id !== routeId) continue
    const headsign = t.trip_headsign?.trim() || t.direction_text?.trim() || ''
    if (!headsign) continue
    const key = `${t.direction_id}|${headsign}`
    const cur = counts.get(key)
    if (cur) cur.count++
    else counts.set(key, { id: t.direction_id, name: headsign, count: 1 })
  }

  const sorted = [...counts.values()].sort((a, b) => b.count - a.count)

  // Pick the highest-count entry per direction id.
  const byDir = new Map<string, { id: string; name: string }>()
  for (const entry of sorted) {
    if (!byDir.has(entry.id)) {
      byDir.set(entry.id, { id: entry.id, name: entry.name })
    }
  }

  return [...byDir.values()]
}

export interface ParsedPaceRoute {
  slug: string
  shortName: string
  longName: string
  serviceType: PaceRouteServiceType
  region: PaceRegion
  color: string
  textColor: string
  description: string | null
  directions: PaceDirection[]
}

export interface ParsedPaceStop {
  slug: string
  name: string
  lat: number
  lon: number
  routes: string[]
  wheelchairBoarding: boolean
}

export interface PaceRouteStopsDoc {
  directions: Record<
    string,
    { slug: string; name: string; lat: number; lon: number; sequence: number }[]
  >
}

export interface PaceStopScheduleDoc {
  routes: Record<
    string,
    {
      directions: Record<string, { weekday: number[]; saturday: number[]; sunday: number[] }>
    }
  >
}

export interface ParsePaceResult {
  routes: Map<string, ParsedPaceRoute>
  stops: Map<string, ParsedPaceStop>
  routeStops: Map<string, PaceRouteStopsDoc>
  schedules: Map<string, PaceStopScheduleDoc>
}

export function parsePaceGtfs(zip: AdmZip): ParsePaceResult {
  const rawRoutes = parseGTFS(readZipFile(zip, 'routes.txt'))
  const rawStops = parseGTFS(readZipFile(zip, 'stops.txt'))
  const rawTrips = parseGTFS(readZipFile(zip, 'trips.txt'))
  const rawStopTimes = parseGTFS(readZipFile(zip, 'stop_times.txt'))
  const rawCalendar = parseGTFS(readZipFile(zip, 'calendar.txt'))

  const serviceTypeMap = buildServiceTypeMap(rawCalendar)
  const stopSlugMap = buildStopSlugMap(rawStops)

  // Pass 1: routes
  const routes = new Map<string, ParsedPaceRoute>()
  const routeIdToSlug = new Map<string, string>()
  for (const r of rawRoutes) {
    const slug = routeSlug(r.route_short_name) || routeSlug(r.route_long_name)
    if (!slug) continue
    routeIdToSlug.set(r.route_id, slug)

    const shortName = r.route_short_name?.trim() || r.route_long_name?.trim() || slug

    const { color, textColor } = deriveColor({
      shortName,
      gtfsColor: r.route_color ?? '',
      gtfsTextColor: r.route_text_color ?? '',
    })

    const baseRegion = deriveRegion(r.route_short_name)
    const region = PULSE_REGIONS[slug] ?? baseRegion

    const longName = r.route_long_name ?? ''
    routes.set(slug, {
      slug,
      shortName,
      longName,
      serviceType: deriveServiceType({
        route_short_name: r.route_short_name,
        route_long_name: longName,
      }),
      region,
      color,
      textColor,
      description: r.route_desc?.trim() || null,
      directions: extractDirections(r.route_id, rawTrips),
    })
  }

  // Pass 2: stops (routes field filled in Pass 3)
  const stops = new Map<string, ParsedPaceStop>()
  for (const s of rawStops) {
    const slug = stopSlugMap.get(s.stop_id)
    if (!slug) continue
    stops.set(slug, {
      slug,
      name: s.stop_name,
      lat: parseFloat(s.stop_lat ?? '0'),
      lon: parseFloat(s.stop_lon ?? '0'),
      routes: [],
      wheelchairBoarding: s.wheelchair_boarding === '1',
    })
  }

  // Trip lookup tables
  const tripRouteSlug = new Map<string, string>()
  const tripDirection = new Map<string, string>()
  const tripServiceType = new Map<string, ServiceType>()
  for (const t of rawTrips) {
    const slug = routeIdToSlug.get(t.route_id)
    if (!slug) continue
    tripRouteSlug.set(t.trip_id, slug)
    tripDirection.set(t.trip_id, t.direction_id ?? '0')
    tripServiceType.set(t.trip_id, serviceTypeMap.get(t.service_id) ?? 'weekday')
  }

  // Pass 3: route-stops (canonical sequence = longest pattern per direction)
  // and stop → routes mapping
  const routeStops = new Map<string, PaceRouteStopsDoc>()
  const stopRoutesSet = new Map<string, Set<string>>()

  // Group stop_times by trip
  const stopsByTrip = new Map<string, { stopId: string; sequence: number; departure: string }[]>()
  for (const st of rawStopTimes) {
    const arr = stopsByTrip.get(st.trip_id) ?? []
    arr.push({
      stopId: st.stop_id,
      sequence: parseInt(st.stop_sequence, 10),
      departure: st.departure_time,
    })
    stopsByTrip.set(st.trip_id, arr)
  }

  // For each (routeSlug, directionId), find the trip with the most stops
  const longestPatterns = new Map<string, { tripId: string; count: number }>()
  for (const [tripId, list] of stopsByTrip) {
    const slug = tripRouteSlug.get(tripId)
    if (!slug) continue
    const dir = tripDirection.get(tripId) ?? '0'
    const key = `${slug}|${dir}`
    const cur = longestPatterns.get(key)
    if (!cur || list.length > cur.count || (list.length === cur.count && tripId < cur.tripId)) {
      longestPatterns.set(key, { tripId, count: list.length })
    }

    // Stop → routes
    for (const entry of list) {
      const stopSlug = stopSlugMap.get(entry.stopId)
      if (!stopSlug) continue
      const set = stopRoutesSet.get(stopSlug) ?? new Set()
      set.add(slug)
      stopRoutesSet.set(stopSlug, set)
    }
  }

  for (const [key, { tripId }] of longestPatterns) {
    const [slug, dir] = key.split('|')
    const list = (stopsByTrip.get(tripId) ?? []).sort((a, b) => a.sequence - b.sequence)
    const doc: PaceRouteStopsDoc = routeStops.get(slug) ?? { directions: {} }
    doc.directions[dir] = list
      .map((e) => {
        const stopSlug = stopSlugMap.get(e.stopId)
        if (!stopSlug) return null
        const stop = stops.get(stopSlug)
        if (!stop) return null
        return {
          slug: stopSlug,
          name: stop.name,
          lat: stop.lat,
          lon: stop.lon,
          sequence: e.sequence,
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
    routeStops.set(slug, doc)
  }

  // Fill stops[].routes — sorted for stable output
  for (const [stopSlug, routeSet] of stopRoutesSet) {
    const stop = stops.get(stopSlug)
    if (!stop) continue
    stop.routes = [...routeSet].sort()
  }

  // Pass 4: per-stop schedules
  const schedules = new Map<string, PaceStopScheduleDoc>()
  for (const [tripId, list] of stopsByTrip) {
    const routeSlugForTrip = tripRouteSlug.get(tripId)
    if (!routeSlugForTrip) continue
    const direction = tripDirection.get(tripId) ?? '0'
    const serviceType = tripServiceType.get(tripId) ?? 'weekday'

    for (const entry of list) {
      const stopSlug = stopSlugMap.get(entry.stopId)
      if (!stopSlug) continue

      let doc = schedules.get(stopSlug)
      if (!doc) {
        doc = { routes: {} }
        schedules.set(stopSlug, doc)
      }
      let routeDoc = doc.routes[routeSlugForTrip]
      if (!routeDoc) {
        routeDoc = { directions: {} }
        doc.routes[routeSlugForTrip] = routeDoc
      }
      let dirDoc = routeDoc.directions[direction]
      if (!dirDoc) {
        dirDoc = { weekday: [], saturday: [], sunday: [] }
        routeDoc.directions[direction] = dirDoc
      }
      const [h, m] = (entry.departure ?? '').split(':').map(Number)
      const minutes = h * 60 + m
      if (!Number.isFinite(minutes)) continue
      dirDoc[serviceType].push(minutes)
    }
  }

  // Sort schedule times and dedupe duplicate departures (loop-route safety)
  for (const doc of schedules.values()) {
    for (const r of Object.values(doc.routes)) {
      for (const d of Object.values(r.directions)) {
        d.weekday = [...new Set(d.weekday)].sort((a, b) => a - b)
        d.saturday = [...new Set(d.saturday)].sort((a, b) => a - b)
        d.sunday = [...new Set(d.sunday)].sort((a, b) => a - b)
      }
    }
  }

  return { routes, stops, routeStops, schedules }
}
