'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMetraFeed, type FeedData } from '@lib/hooks/useMetraFeed'
import { extractMetraTrainNumber, routeIdToLineSlug } from '@lib/metra-trip-matching'
import {
  computeHeroStatus,
  deriveStopState,
  longToNumber,
  minutesSinceMidnight,
  parseDisplayTimeToMinutes,
  type RealtimeState,
  type TripUpdate,
  type VehiclePosition,
} from '@lib/metra-status'
import type { MetraLineTrip } from '@lib/transit'
import CurrentServiceList, { type CurrentServiceTrain } from './CurrentServiceList'

const POLL_INTERVAL_MS = 30_000
const MAX_TRAINS_SHOWN = 8
const UPCOMING_WINDOW_MINUTES = 60

export interface MetraCurrentServiceProps {
  lineSlug: string
  lineColor: string
  trips: MetraLineTrip[]
}

function currentServiceType(date: Date): 'weekday' | 'saturday' | 'sunday' {
  const day = date.getDay()
  if (day === 0) return 'sunday'
  if (day === 6) return 'saturday'
  return 'weekday'
}

function formatEta(
  nowMs: number,
  etaEpoch: number | null,
  fallbackDisplay: string | null,
): {
  etaText: string | null
} {
  if (etaEpoch != null) {
    const diffMin = Math.round((etaEpoch * 1000 - nowMs) / 60_000)
    if (diffMin <= 0) return { etaText: 'arriving' }
    return { etaText: `${diffMin} min` }
  }
  if (fallbackDisplay) return { etaText: fallbackDisplay }
  return { etaText: null }
}

function extractMatchedRealtime(
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

function buildTrainRow(
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

interface TripWithDepartureMinutes extends MetraLineTrip {
  firstDepartureMinutes: number
  lastArrivalMinutes: number
}

function annotate(trips: MetraLineTrip[]): TripWithDepartureMinutes[] {
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
  serviceType: 'weekday' | 'saturday' | 'sunday',
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

  // Fallback: the next scheduled train today, or if none left for today,
  // fall through to "nothing to show" and let the caller render an empty state.
  const nextToday = trips
    .filter((t) => t.serviceType === serviceType && t.firstDepartureMinutes >= nowMinutes)
    .sort((a, b) => a.firstDepartureMinutes - b.firstDepartureMinutes)[0]

  if (nextToday) return { shown: [nextToday], fallbackOnly: true }
  return { shown: [], fallbackOnly: true }
}

export default function MetraCurrentService({
  lineSlug,
  lineColor,
  trips,
}: MetraCurrentServiceProps) {
  const tripUpdatesFeed = useMetraFeed('tripupdates', { intervalMs: POLL_INTERVAL_MS })
  const positionsFeed = useMetraFeed('positions', { intervalMs: POLL_INTERVAL_MS })
  const [nowMs, setNowMs] = useState<number>(() => Date.now())

  useEffect(() => {
    const nowInterval = setInterval(() => setNowMs(Date.now()), POLL_INTERVAL_MS)
    return () => clearInterval(nowInterval)
  }, [])

  const tripUpdates: FeedData | null = tripUpdatesFeed.data
  const positions: FeedData | null = positionsFeed.data
  const error = tripUpdatesFeed.error ?? positionsFeed.error
  const hasFetched = tripUpdatesFeed.fetchedAt != null || positionsFeed.fetchedAt != null

  const annotated = useMemo(() => annotate(trips), [trips])

  const { rows, emptyMessage } = useMemo(() => {
    const now = new Date(nowMs)
    const nowMinutes = minutesSinceMidnight(now)
    const serviceType = currentServiceType(now)

    const tuByTrain = extractMatchedRealtime(tripUpdates, lineSlug)
    const vpByTrain = extractMatchedRealtime(positions, lineSlug)

    const realtimeByTrain = new Map<string, RealtimeState>()
    const activeTrainNumbers = new Set<string>()
    for (const [trainNumber, tu] of tuByTrain.entries()) {
      const vp = vpByTrain.get(trainNumber)
      const state: RealtimeState = {
        tripUpdate: tu.tripUpdate,
        vehiclePosition: vp?.vehiclePosition ?? null,
        fetchedAt: nowMs,
        stopped: false,
      }
      realtimeByTrain.set(trainNumber, state)
      // "Active" = has a tripUpdate with non-skipped future stops
      const stu = tu.tripUpdate?.stopTimeUpdate ?? []
      const hasUpcoming = stu.some(
        (s) => s.scheduleRelationship !== 1 && longToNumber(s.arrival?.time ?? s.departure?.time),
      )
      if (hasUpcoming) activeTrainNumbers.add(trainNumber)
    }

    const { shown, fallbackOnly } = selectTrainsForDisplay(
      annotated,
      activeTrainNumbers,
      nowMinutes,
      serviceType,
    )

    const builtRows: CurrentServiceTrain[] = []
    for (const trip of shown) {
      const row = buildTrainRow(
        trip,
        realtimeByTrain.get(trip.trainNumber) ?? null,
        lineSlug,
        nowMs,
        nowMinutes,
      )
      if (row) builtRows.push(row)
    }

    let msg = 'No trains currently running.'
    if (fallbackOnly && shown[0]) {
      msg = `Next service at ${shown[0].stops[0]?.departure ?? shown[0].stops[0]?.arrival ?? ''}`
    } else if (shown.length === 0) {
      msg = 'No more trains scheduled today.'
    }

    return { rows: builtRows, emptyMessage: msg }
  }, [annotated, tripUpdates, positions, lineSlug, nowMs])

  return (
    <CurrentServiceList
      trains={rows}
      lineColor={lineColor}
      loading={!hasFetched}
      error={error}
      emptyMessage={emptyMessage}
    />
  )
}
