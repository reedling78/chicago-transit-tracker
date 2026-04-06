/**
 * Metra GTFS schedule parser.
 *
 * Extracts per-station departure times from the Metra GTFS zip, grouped
 * by direction (headsign + line) and service type.
 *
 * Extracted from scripts/generate-metra-schedules.ts for reuse in Cloud Functions.
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

/**
 * Parse the Metra GTFS zip and return a map of station slug → StationSchedule.
 *
 * @param zip - The downloaded Metra GTFS zip
 * @param stopIdToSlug - Map of metraStopId → station slug from Firestore
 */
export function parseMetraSchedules(
  zip: AdmZip,
  stopIdToSlug: Map<string, string>,
): Map<string, StationSchedule> {
  // stops.txt → stop name map (for headsign fallback)
  const stopNameMap = new Map<string, string>()
  for (const s of parseGTFS(readZipFile(zip, 'stops.txt'))) {
    stopNameMap.set(s.stop_id, s.stop_name)
  }

  // routes.txt → routeId → line shortName
  const routeNameMap = new Map<string, string>()
  for (const r of parseGTFS(readZipFile(zip, 'routes.txt'))) {
    routeNameMap.set(r.route_id, r.route_short_name || r.route_id)
  }

  // calendar.txt → serviceId → serviceType
  const serviceTypeMap = buildServiceTypeMap(parseGTFS(readZipFile(zip, 'calendar.txt')))

  // stop_times.txt
  const stopTimes = parseGTFS(readZipFile(zip, 'stop_times.txt'))

  // Pass 1: find terminal stop per trip for headsign fallback
  const tripMaxSeq = new Map<string, { stopId: string; seq: number }>()
  for (const st of stopTimes) {
    const seq = parseInt(st.stop_sequence)
    const cur = tripMaxSeq.get(st.trip_id)
    if (!cur || seq > cur.seq) tripMaxSeq.set(st.trip_id, { stopId: st.stop_id, seq })
  }

  // trips.txt → tripId → { headsign, line, serviceType }
  const tripMeta = new Map<string, { headsign: string; line: string; serviceType: ServiceType }>()
  for (const t of parseGTFS(readZipFile(zip, 'trips.txt'))) {
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

  // Pass 2: bucket departures — Metra stop_id IS the station (no parent mapping)
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

  // Convert to slug-keyed StationSchedule map
  const result = new Map<string, StationSchedule>()

  for (const [stopId, byDir] of schedule) {
    const slug = stopIdToSlug.get(stopId)
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

    result.set(slug, { service: 'metra', directions })
  }

  return result
}
