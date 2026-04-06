/**
 * CTA GTFS schedule parser.
 *
 * Extracts per-station departure times from the CTA GTFS zip, grouped
 * by direction (headsign + line) and service type (weekday/saturday/sunday).
 *
 * Extracted from scripts/generate-cta-schedules.ts for reuse in Cloud Functions.
 */

import AdmZip from 'adm-zip'
import {
  parseGTFS,
  readZipFile,
  timeToMinutes,
  buildServiceTypeMap,
  type ServiceType,
  type StationSchedule,
  type DirectionSchedule,
} from '../gtfs-utils'

/** CTA GTFS route_id → our line shortName */
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

/**
 * Parse the CTA GTFS zip and return a map of station slug → StationSchedule.
 *
 * @param zip - The downloaded CTA GTFS zip
 * @param mapIdToSlug - Map of ctaMapId (number) → station slug from Firestore
 */
export function parseCtaSchedules(
  zip: AdmZip,
  mapIdToSlug: Map<number, string>,
): Map<string, StationSchedule> {
  // stops.txt → platform stop_id → parent ctaMapId, plus station name map
  const stops = parseGTFS(readZipFile(zip, 'stops.txt'))
  const platformToMapId = new Map<string, number>()
  const stationNameMap = new Map<number, string>()
  for (const s of stops) {
    if (s.location_type === '1') {
      stationNameMap.set(parseInt(s.stop_id), s.stop_name)
    } else if ((s.location_type === '' || s.location_type === '0') && s.parent_station) {
      platformToMapId.set(s.stop_id, parseInt(s.parent_station))
    }
  }

  // calendar.txt → serviceId → serviceType
  const serviceTypeMap = buildServiceTypeMap(parseGTFS(readZipFile(zip, 'calendar.txt')))

  // stop_times.txt — parse once
  const stopTimes = parseGTFS(readZipFile(zip, 'stop_times.txt'))

  // Pass 1: find terminal stop (highest stop_sequence) per trip for headsign fallback
  const tripMaxSeq = new Map<string, { stopId: string; seq: number }>()
  for (const st of stopTimes) {
    const seq = parseInt(st.stop_sequence)
    const cur = tripMaxSeq.get(st.trip_id)
    if (!cur || seq > cur.seq) tripMaxSeq.set(st.trip_id, { stopId: st.stop_id, seq })
  }

  // trips.txt → tripId → { headsign, line, serviceType }
  const tripMeta = new Map<string, { headsign: string; line: string; serviceType: ServiceType }>()
  for (const t of parseGTFS(readZipFile(zip, 'trips.txt'))) {
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

  // Pass 2: bucket departures by (ctaMapId, direction, serviceType)
  const schedule = new Map<number, Map<string, Map<ServiceType, Set<number>>>>()
  const seenTripStation = new Set<string>()

  for (const st of stopTimes) {
    const meta = tripMeta.get(st.trip_id)
    if (!meta) continue
    const ctaMapId = platformToMapId.get(st.stop_id)
    if (!ctaMapId) continue

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

  // Convert to slug-keyed StationSchedule map
  const result = new Map<string, StationSchedule>()

  for (const [ctaMapId, byDir] of schedule) {
    const slug = mapIdToSlug.get(ctaMapId)
    if (!slug) continue

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

    result.set(slug, { service: 'cta', directions })
  }

  return result
}
