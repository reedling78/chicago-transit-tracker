/**
 * Pace GTFS schedule parser.
 *
 * Reads a downloaded Pace GTFS zip and emits maps of Firestore documents
 * for pace-routes, pace-stops, pace-route-stops, and pace-schedules.
 */

export type PaceRouteServiceType = 'pulse' | 'local' | 'express' | 'feeder'

export type PaceRegion = 'north' | 'northwest' | 'west' | 'southwest' | 'south' | 'heritage'

interface GtfsRouteRow {
  route_short_name: string
  route_long_name: string
}

/** Classify a Pace route's service type from its GTFS row. */
export function deriveServiceType(row: GtfsRouteRow): PaceRouteServiceType {
  const short = row.route_short_name?.trim() ?? ''
  const long = row.route_long_name?.trim() ?? ''

  if (/\bpulse\b/i.test(short)) return 'pulse'
  if (/express/i.test(long)) return 'express'
  if (/^8\d{2}$/.test(short)) return 'feeder'
  return 'local'
}
