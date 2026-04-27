/**
 * Metra GTFS trip detail parser.
 *
 * Produces three output data sets from a single Metra GTFS zip:
 *   1. Trip details (per-trip stop sequences)
 *   2. Trip indexes (per-line trip lists by service type)
 *   3. Station trips (per-station trip lists by service type)
 *
 * Used by the syncMetraGtfs Cloud Function to populate the metra-trips,
 * metra-trip-indexes, and metra-station-trips Firestore collections.
 */

import AdmZip from 'adm-zip'
import {
  parseGTFS,
  readZipFile,
  timeToMinutes,
  formatGTFSTime,
  extractMetraTrainNumber,
  metraTrainDocId,
  buildServiceTypeMap,
  type TripDetail,
  type TripIndex,
  type TripIndexEntry,
  type StationTrips,
  type StationTripEntry,
} from '../gtfs-utils'

export interface MetraTripParseResult {
  /** `${lineSlug}_${trainNumber}` → TripDetail */
  tripDetails: Map<string, TripDetail>
  /** lineSlug → TripIndex */
  tripIndexes: Map<string, TripIndex>
  /** stationSlug → StationTrips */
  stationTrips: Map<string, StationTrips>
}

/**
 * A trip is flagged `isExpress` when its stop count is less than this fraction
 * of the largest stop count seen for the same line/serviceType/direction. The
 * threshold is intentionally tolerant — Metra's "express" runs typically skip
 * 30%+ of the line's stops, so 0.85 gives plenty of headroom for trips that
 * skip just a handful of low-volume stops without flagging them as express.
 */
export const IS_EXPRESS_STOP_FRACTION = 0.85

/**
 * Parse the Metra GTFS zip into trip details, indexes, and station trips.
 *
 * @param zip - The downloaded Metra GTFS zip
 * @param stopIdToSlug - Map of metraStopId → station slug
 * @param stopIdToName - Map of metraStopId → station name
 * @param lineCodeToSlug - Map of metraLineCode → line slug
 * @param lineCodeToName - Map of metraLineCode → line name
 */
export function parseMetraTrips(
  zip: AdmZip,
  stopIdToSlug: Map<string, string>,
  stopIdToName: Map<string, string>,
  lineCodeToSlug: Map<string, string>,
  lineCodeToName: Map<string, string>,
): MetraTripParseResult {
  // stops.txt → GTFS fallback names for stops not in Firestore
  const gtfsStopName = new Map<string, string>()
  for (const s of parseGTFS(readZipFile(zip, 'stops.txt'))) {
    gtfsStopName.set(s.stop_id, s.stop_name)
  }

  // routes.txt → routeId → line code
  const routeToLineCode = new Map<string, string>()
  for (const r of parseGTFS(readZipFile(zip, 'routes.txt'))) {
    routeToLineCode.set(r.route_id, r.route_short_name || r.route_id)
  }

  // calendar.txt → serviceId → ServiceType
  const serviceTypeMap = buildServiceTypeMap(parseGTFS(readZipFile(zip, 'calendar.txt')))

  // stop_times.txt — parse and group by trip_id, sorted by stop_sequence
  const rawStopTimes = parseGTFS(readZipFile(zip, 'stop_times.txt'))
  const tripStopRows = new Map<string, Record<string, string>[]>()
  for (const st of rawStopTimes) {
    if (!tripStopRows.has(st.trip_id)) tripStopRows.set(st.trip_id, [])
    tripStopRows.get(st.trip_id)!.push(st)
  }
  for (const rows of tripStopRows.values()) {
    rows.sort((a, b) => parseInt(a.stop_sequence) - parseInt(b.stop_sequence))
  }

  // trips.txt — process each trip
  const trips = parseGTFS(readZipFile(zip, 'trips.txt'))

  const tripDetails = new Map<string, TripDetail>()
  const seenTrainDocIds = new Set<string>()

  const lineIndexData = new Map<
    string,
    {
      weekday: Array<TripIndexEntry & { _sortMin: number }>
      saturday: Array<TripIndexEntry & { _sortMin: number }>
      sunday: Array<TripIndexEntry & { _sortMin: number }>
    }
  >()

  const stationTripsData = new Map<
    string,
    {
      weekday: Array<StationTripEntry & { _sortMin: number }>
      saturday: Array<StationTripEntry & { _sortMin: number }>
      sunday: Array<StationTripEntry & { _sortMin: number }>
    }
  >()

  for (const t of trips) {
    const lineCode = routeToLineCode.get(t.route_id)
    if (!lineCode) continue

    const lineSlug = lineCodeToSlug.get(lineCode)
    if (!lineSlug) continue

    const lineName = lineCodeToName.get(lineCode) ?? lineCode
    const serviceType = serviceTypeMap.get(t.service_id) ?? 'weekday'
    const directionId = parseInt(t.direction_id ?? '0')

    const stopRows = tripStopRows.get(t.trip_id)
    if (!stopRows || stopRows.length === 0) continue

    // Headsign: trip_headsign, fall back to last stop name
    let headsign = t.trip_headsign?.trim() ?? ''
    if (!headsign) {
      const lastStop = stopRows[stopRows.length - 1]
      headsign = stopIdToName.get(lastStop.stop_id) ?? gtfsStopName.get(lastStop.stop_id) ?? ''
    }
    if (!headsign) continue

    const trainNumber = t.trip_short_name?.trim() || extractMetraTrainNumber(t.trip_id)
    const docId = metraTrainDocId(lineSlug, trainNumber)

    // Deduplicate: Metra emits multiple trip_id variants (_A, _AA, _B) per
    // train number representing different calendar periods. They share the
    // same stops, times, and headsigns, so we only keep the first one.
    if (seenTrainDocIds.has(docId)) continue
    seenTrainDocIds.add(docId)

    // Build stop sequence
    const stops = stopRows.map((st) => ({
      sequence: parseInt(st.stop_sequence),
      stationName: stopIdToName.get(st.stop_id) ?? gtfsStopName.get(st.stop_id) ?? st.stop_id,
      slug: stopIdToSlug.get(st.stop_id) ?? null,
      arrival: formatGTFSTime(st.arrival_time || st.departure_time),
      departure: formatGTFSTime(st.departure_time || st.arrival_time),
    }))

    tripDetails.set(docId, {
      tripId: docId,
      trainNumber,
      headsign,
      line: lineCode,
      lineSlug,
      lineName,
      serviceType,
      directionId,
      stops,
      // Provisional; resolved in a second pass once we know the max stop count
      // per (lineSlug, serviceType, directionId) group.
      isExpress: false,
    })

    // Add each stop to that station's trip list
    for (const st of stopRows) {
      const stationSlug = stopIdToSlug.get(st.stop_id)
      if (!stationSlug) continue

      if (!stationTripsData.has(stationSlug)) {
        stationTripsData.set(stationSlug, { weekday: [], saturday: [], sunday: [] })
      }
      const depRaw = st.departure_time || st.arrival_time
      stationTripsData.get(stationSlug)![serviceType].push({
        tripId: trainNumber,
        trainNumber,
        headsign,
        departure: formatGTFSTime(depRaw),
        line: lineCode,
        lineSlug,
        directionId,
        _sortMin: timeToMinutes(depRaw),
      })
    }

    // Add to line index
    if (!lineIndexData.has(lineSlug)) {
      lineIndexData.set(lineSlug, { weekday: [], saturday: [], sunday: [] })
    }
    const firstDepRaw = stopRows[0].departure_time || stopRows[0].arrival_time
    lineIndexData.get(lineSlug)![serviceType].push({
      tripId: trainNumber,
      trainNumber,
      headsign,
      firstDeparture: formatGTFSTime(firstDepRaw),
      directionId,
      _sortMin: timeToMinutes(firstDepRaw),
    })
  }

  // Second pass: flag express trips. A trip is express when its stop count is
  // below IS_EXPRESS_STOP_FRACTION of the max stop count seen for the same
  // (lineSlug, serviceType, directionId) group. Local trips with the most stops
  // anchor the comparison.
  const maxStopsByGroup = new Map<string, number>()
  for (const t of tripDetails.values()) {
    const key = `${t.lineSlug}|${t.serviceType}|${t.directionId}`
    const prev = maxStopsByGroup.get(key) ?? 0
    if (t.stops.length > prev) maxStopsByGroup.set(key, t.stops.length)
  }
  for (const t of tripDetails.values()) {
    const key = `${t.lineSlug}|${t.serviceType}|${t.directionId}`
    const max = maxStopsByGroup.get(key) ?? t.stops.length
    t.isExpress = t.stops.length < max * IS_EXPRESS_STOP_FRACTION
  }

  // Sort and strip _sortMin from indexes
  /* eslint-disable @typescript-eslint/no-unused-vars */
  const tripIndexes = new Map<string, TripIndex>()
  for (const [lineSlug, buckets] of lineIndexData) {
    tripIndexes.set(lineSlug, {
      weekday: buckets.weekday
        .sort((a, b) => a._sortMin - b._sortMin)
        .map(({ _sortMin, ...e }) => e),
      saturday: buckets.saturday
        .sort((a, b) => a._sortMin - b._sortMin)
        .map(({ _sortMin, ...e }) => e),
      sunday: buckets.sunday.sort((a, b) => a._sortMin - b._sortMin).map(({ _sortMin, ...e }) => e),
    })
  }

  // Sort and strip _sortMin from station trips
  const stationTrips = new Map<string, StationTrips>()
  for (const [slug, buckets] of stationTripsData) {
    stationTrips.set(slug, {
      weekday: buckets.weekday
        .sort((a, b) => a._sortMin - b._sortMin)
        .map(({ _sortMin, ...e }) => e),
      saturday: buckets.saturday
        .sort((a, b) => a._sortMin - b._sortMin)
        .map(({ _sortMin, ...e }) => e),
      sunday: buckets.sunday.sort((a, b) => a._sortMin - b._sortMin).map(({ _sortMin, ...e }) => e),
    })
  }
  /* eslint-enable @typescript-eslint/no-unused-vars */

  return { tripDetails, tripIndexes, stationTrips }
}
