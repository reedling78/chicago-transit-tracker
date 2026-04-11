/**
 * Pure helpers for the MetraCurrentService component.
 *
 * None of these functions depend on React or the DOM — the component
 * is a thin shell that calls the shared `useMetraFeed` hook and then
 * hands its data to the functions here.
 */

import type { FeedData } from '@lib/hooks/useMetraFeed'
import { extractMetraTrainNumber, routeIdToLineSlug } from '@lib/metra-trip-matching'
import {
  computeHeroStatus,
  deriveStopState,
  parseDisplayTimeToMinutes,
  type RealtimeState,
  type TripUpdate,
  type VehiclePosition,
} from '@lib/metra-status'
import type { MetraLineTrip } from '@lib/transit'
import type { CurrentServiceTrain } from '@components/CurrentServiceList'

export type ServiceType = 'weekday' | 'saturday' | 'sunday'

export const MAX_TRAINS_SHOWN = 8
export const UPCOMING_WINDOW_MINUTES = 60

export function currentServiceType(date: Date): ServiceType {
  const day = date.getDay()
  if (day === 0) return 'sunday'
  if (day === 6) return 'saturday'
  return 'weekday'
}

/** Format the "next stop ETA" text shown on an active train row. */
export function formatEta(
  nowMs: number,
  etaEpoch: number | null,
  fallbackDisplay: string | null,
): { etaText: string | null } {
  if (etaEpoch != null) {
    const diffMin = Math.round((etaEpoch * 1000 - nowMs) / 60_000)
    if (diffMin <= 0) return { etaText: 'arriving' }
    return { etaText: `${diffMin} min` }
  }
  if (fallbackDisplay) return { etaText: fallbackDisplay }
  return { etaText: null }
}

/**
 * Walk a realtime feed and index all entities on the given line by train
 * number, merging tripUpdate and vehicle entities for the same train.
 */
export function extractMatchedRealtime(
  feed: FeedData | null,
  lineSlug: string,
): Map<string, { tripUpdate: TripUpdate | null; vehiclePosition: VehiclePosition | null }> {
  const byTrainNumber = new Map<
    string,
    { tripUpdate: TripUpdate | null; vehiclePosition: VehiclePosition | null }
  >()
  if (!feed?.entity) return byTrainNumber
  for (const entity of feed.entity) {
    const trip = entity.tripUpdate?.trip ?? entity.vehicle?.trip
    if (!trip) continue
    if (routeIdToLineSlug(trip.routeId ?? null) !== lineSlug) continue
    const tripId = trip.tripId
    if (!tripId) continue
    const trainNumber = extractMetraTrainNumber(tripId)
    const prev = byTrainNumber.get(trainNumber) ?? { tripUpdate: null, vehiclePosition: null }
    if (entity.tripUpdate && !prev.tripUpdate) prev.tripUpdate = entity.tripUpdate
    if (entity.vehicle && !prev.vehiclePosition) prev.vehiclePosition = entity.vehicle
    byTrainNumber.set(trainNumber, prev)
  }
  return byTrainNumber
}

/**
 * Build one presentational row for CurrentServiceList. Returns null only
 * for scheduled trips that have no stops (data issue).
 */
export function buildTrainRow(
  trip: MetraLineTrip,
  realtime: RealtimeState | null,
  lineSlug: string,
  nowMs: number,
  nowMinutes: number,
): CurrentServiceTrain | null {
  const derivation = deriveStopState(trip.stops, realtime)
  const { stops, phase, tripDelayMinutes } = derivation
  const hero = computeHeroStatus(phase, tripDelayMinutes, trip.stops[0], nowMinutes)

  const href = `/metra/${lineSlug}/train/${trip.trainNumber}`
  const destination = trip.headsign || trip.stops[trip.stops.length - 1]?.stationName || ''

  if (phase === 'active') {
    const current = stops.find((s) => s.status === 'current')
    const { etaText } = formatEta(nowMs, current?.etaEpoch ?? null, current?.stop.arrival ?? null)
    return {
      trainNumber: trip.trainNumber,
      href,
      destination,
      nextStop: current?.stop.stationName ?? null,
      nextStopEta: etaText,
      statusLabel: hero?.label ?? 'On time',
      statusTone: hero?.tone ?? 'ontime',
    }
  }

  // Upcoming scheduled train — no realtime data yet.
  const firstStop = trip.stops[0]
  if (!firstStop) return null
  const departureMin = parseDisplayTimeToMinutes(firstStop.departure || firstStop.arrival)
  const departureText = firstStop.departure || firstStop.arrival
  return {
    trainNumber: trip.trainNumber,
    href,
    destination,
    nextStop: firstStop.stationName,
    nextStopEta: departureText,
    statusLabel: departureMin != null ? `Scheduled ${departureText}` : 'Scheduled',
    statusTone: 'scheduled',
  }
}

export interface TripWithDepartureMinutes extends MetraLineTrip {
  firstDepartureMinutes: number
  lastArrivalMinutes: number
}

/**
 * Annotate trips with their first departure / last arrival times as
 * minutes-since-midnight, dropping any trips whose stop times are
 * unparseable. Consumers use this as the working set for selection.
 */
export function annotate(trips: MetraLineTrip[]): TripWithDepartureMinutes[] {
  const out: TripWithDepartureMinutes[] = []
  for (const trip of trips) {
    const first = trip.stops[0]
    const last = trip.stops[trip.stops.length - 1]
    if (!first || !last) continue
    const firstMin = parseDisplayTimeToMinutes(first.departure || first.arrival)
    const lastMin = parseDisplayTimeToMinutes(last.arrival || last.departure)
    if (firstMin == null || lastMin == null) continue
    out.push({ ...trip, firstDepartureMinutes: firstMin, lastArrivalMinutes: lastMin })
  }
  return out
}

/**
 * Pick the trains that should be shown right now:
 *   1) all trains flagged as "active" by realtime (up to the cap)
 *   2) fill remaining slots with trains scheduled to depart in the next
 *      UPCOMING_WINDOW_MINUTES, sorted by scheduled departure
 *   3) if nothing qualifies, fall back to the next scheduled departure
 *      (service-type-aware), so the component never renders empty
 */
export function selectTrainsForDisplay(
  trips: TripWithDepartureMinutes[],
  activeTrainNumbers: Set<string>,
  nowMinutes: number,
  serviceType: ServiceType,
): { shown: TripWithDepartureMinutes[]; fallbackOnly: boolean } {
  const active = trips.filter((t) => activeTrainNumbers.has(t.trainNumber))
  const activeIds = new Set(active.map((t) => t.trainNumber))

  const upcoming = trips
    .filter(
      (t) =>
        !activeIds.has(t.trainNumber) &&
        t.serviceType === serviceType &&
        t.firstDepartureMinutes >= nowMinutes &&
        t.firstDepartureMinutes <= nowMinutes + UPCOMING_WINDOW_MINUTES,
    )
    .sort((a, b) => a.firstDepartureMinutes - b.firstDepartureMinutes)

  const shown = [...active, ...upcoming].slice(0, MAX_TRAINS_SHOWN)
  if (shown.length > 0) return { shown, fallbackOnly: false }

  const nextToday = trips
    .filter((t) => t.serviceType === serviceType && t.firstDepartureMinutes >= nowMinutes)
    .sort((a, b) => a.firstDepartureMinutes - b.firstDepartureMinutes)[0]

  if (nextToday) return { shown: [nextToday], fallbackOnly: true }
  return { shown: [], fallbackOnly: true }
}
