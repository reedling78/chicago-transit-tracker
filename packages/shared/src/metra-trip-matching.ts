/**
 * Helpers for matching a Metra GTFS Realtime entity to a specific
 * `(lineSlug, trainNumber)` pair on the train detail page.
 *
 * The realtime feed is not indexed by train number, so the client has to scan
 * entities and filter. These helpers own the two pieces of logic that filter
 * needs:
 *   1. extractMetraTrainNumber — pulls the human train number out of a GTFS
 *      trip_id like "MD-W_MW2222_V2_A"
 *   2. routeIdToLineSlug — maps the realtime feed's routeId (e.g. "MD-W") to
 *      the Firestore line slug used in URLs (e.g. "md-w")
 */

import { METRA_ROUTE_ID_TO_LINE_SLUG } from './constants'

export function extractMetraTrainNumber(tripId: string): string {
  const segments = tripId.split('_')
  if (segments.length < 2) return tripId
  const match = segments[1].match(/(\d+)/)
  return match ? match[1] : tripId
}

export function routeIdToLineSlug(routeId: string | null | undefined): string | null {
  if (!routeId) return null
  return METRA_ROUTE_ID_TO_LINE_SLUG[routeId] ?? null
}
