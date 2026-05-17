/**
 * Pure helpers for the MetraTripRealtime component.
 *
 * These functions have no React or DOM dependencies and are unit-tested
 * directly — the component is now a thin shell around `useMetraFeed` and
 * these helpers.
 */

import { extractMetraTrainNumber, routeIdToLineSlug } from './metra-trip-matching'
import { formatClockTime, parseDisplayTimeToMinutes } from './metra-status'
import type { DerivedStop, FeedData, TripStop, TripUpdate, VehiclePosition } from './metra-status'
import { formatClockLabel, formatMinutesAway, minutesUntil } from './station-arrivals'

export type FeedEntity = NonNullable<FeedData['entity']>[number]

export interface FilteredEntity {
  tripUpdate: TripUpdate | null
  vehiclePosition: VehiclePosition | null
}

/** True when a realtime entity belongs to the given (lineSlug, trainNumber) pair. */
export function matchEntityToTrip(
  entity: FeedEntity,
  targetLineSlug: string,
  targetTrainNumber: string,
): boolean {
  const trip = entity.tripUpdate?.trip ?? entity.vehicle?.trip
  if (!trip) return false
  if (routeIdToLineSlug(trip.routeId ?? null) !== targetLineSlug) return false
  const tripId = trip.tripId
  if (!tripId) return false
  return extractMetraTrainNumber(tripId) === targetTrainNumber
}

/** Scan a realtime feed and return the first tripUpdate / vehiclePosition for the target trip. */
export function filterFeedForTrip(
  feed: FeedData | null,
  lineSlug: string,
  trainNumber: string,
): FilteredEntity {
  if (!feed?.entity) return { tripUpdate: null, vehiclePosition: null }
  let tripUpdate: TripUpdate | null = null
  let vehiclePosition: VehiclePosition | null = null
  for (const entity of feed.entity) {
    if (!matchEntityToTrip(entity, lineSlug, trainNumber)) continue
    if (entity.tripUpdate && !tripUpdate) tripUpdate = entity.tripUpdate
    if (entity.vehicle && !vehiclePosition) vehiclePosition = entity.vehicle
  }
  return { tripUpdate, vehiclePosition }
}

export interface CompletionInput {
  tripUpdate: TripUpdate | null
  vehiclePosition: VehiclePosition | null
  emptyCount: number
  emptyThreshold: number
  scheduledEndPast: boolean
}

/**
 * Determine whether a trip's realtime polling should stop because the
 * train has finished its run. Two signals count as "done":
 *   1. Metra sent a tripUpdate with zero non-skipped future stops.
 *   2. We've seen `emptyThreshold` consecutive empty fetches AND the
 *      scheduled end time is already in the past.
 */
export function isTripCompleted({
  tripUpdate,
  emptyCount,
  emptyThreshold,
  scheduledEndPast,
}: CompletionInput): boolean {
  const nonSkipped = tripUpdate?.stopTimeUpdate?.filter((u) => u.scheduleRelationship !== 1) ?? []
  const completedByStu = Boolean(tripUpdate) && nonSkipped.length === 0
  const completedByEmpty = emptyCount >= emptyThreshold && scheduledEndPast
  return completedByStu || completedByEmpty
}

export interface RightPanelCopy {
  title: string
  station: string
  time: string | null
  subtext: string | null
}

/**
 * Compute the copy shown on the right side of the hero status card
 * (next stop / departs / arrived), based on the trip phase.
 */
export function computeRightPanel(
  phase: 'active' | 'scheduled' | 'completed' | 'nodata',
  currentDerived:
    | {
        stop: TripStop
        etaEpoch: number | null
      }
    | undefined,
  firstStop: TripStop | undefined,
  lastStop: TripStop | undefined,
  nowMs: number,
): RightPanelCopy | null {
  if (phase === 'active' && currentDerived) {
    const panel: RightPanelCopy = {
      title: 'Next stop',
      station: currentDerived.stop.stationName,
      time: null,
      subtext: null,
    }
    if (currentDerived.etaEpoch != null) {
      const eta = new Date(currentDerived.etaEpoch * 1000)
      panel.time = formatEtaClockTime(eta)
      const diffMin = Math.round((eta.getTime() - nowMs) / 60_000)
      if (diffMin > 0) panel.subtext = `in ${diffMin} min`
      else if (diffMin === 0) panel.subtext = 'arriving now'
      else panel.subtext = 'arriving'
    } else if (currentDerived.stop.arrival) {
      panel.time = currentDerived.stop.arrival
    }
    return panel
  }
  if (phase === 'scheduled' && firstStop) {
    return {
      title: 'Departs',
      station: firstStop.stationName,
      time: firstStop.departure || firstStop.arrival,
      subtext: null,
    }
  }
  if (phase === 'completed' && lastStop) {
    return {
      title: 'Arrived',
      station: lastStop.stationName,
      time: lastStop.arrival,
      subtext: null,
    }
  }
  return null
}

function formatEtaClockTime(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export interface DestinationEta {
  station: string
  /** "42 min" | "Due" | "1h 5m" */
  etaLabel: string
  /** Clock time of the (estimated) arrival, e.g. "11:24 PM". */
  etaClock: string
  /** True when backed by a realtime ETA; false for a scheduled+delay estimate. */
  realtime: boolean
}

/**
 * ETA to the user's chosen destination stop on an active trip. Prefers the
 * realtime `etaEpoch` for that stop; falls back to the scheduled arrival
 * shifted by the stop's (or trip's) known delay. Returns null when the
 * destination can't be resolved or has no scheduled time.
 */
export function computeDestinationEta(
  destStop: TripStop | undefined,
  derivedStops: DerivedStop[],
  nowMs: number,
): DestinationEta | null {
  if (!destStop) return null
  const derived = derivedStops.find(
    (d) =>
      (destStop.slug != null && d.stop.slug === destStop.slug) ||
      d.stop.sequence === destStop.sequence,
  )
  if (derived?.etaEpoch != null) {
    const etaMs = derived.etaEpoch * 1000
    const mins = Math.round((etaMs - nowMs) / 60_000)
    return {
      station: destStop.stationName,
      etaLabel: formatMinutesAway(Math.max(mins, 0)),
      etaClock: formatClockTime(new Date(etaMs)),
      realtime: true,
    }
  }
  const schedMin = parseDisplayTimeToMinutes(destStop.arrival)
  if (schedMin == null) return null
  const adj = schedMin + (derived?.delayMinutes ?? 0)
  return {
    station: destStop.stationName,
    etaLabel: formatMinutesAway(Math.max(minutesUntil(new Date(nowMs), adj), 0)),
    etaClock: formatClockLabel(((adj % 1440) + 1440) % 1440),
    realtime: false,
  }
}
