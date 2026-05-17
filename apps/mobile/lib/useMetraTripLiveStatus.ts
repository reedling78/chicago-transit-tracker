import { useEffect, useMemo, useRef, useState } from 'react'
import {
  computeHeroStatus,
  deriveStopState,
  filterFeedForTrip,
  isTripCompleted,
  isTripScheduledEndPast,
  minutesSinceMidnight,
  type DerivedStop,
  type HeroStatus,
  type MetraTripDetail,
  type RealtimeState,
  type TripPhase,
  type TripStop,
  type VehiclePosition,
} from '@ctt/shared'
import { useMetraFeed } from './useMetraFeed'

const POLL_INTERVAL_MS = 30_000
const COMPLETION_EMPTY_THRESHOLD = 2

export interface MetraTripLiveStatus {
  phase: TripPhase
  status: HeroStatus | null
  currentDerived: DerivedStop | undefined
  derivedStops: DerivedStop[]
  firstStop: TripStop | undefined
  lastStop: TripStop | undefined
  vehiclePosition: VehiclePosition | null
  error: string | null
  nowMs: number
  fetchedAt: number
  isNoData: boolean
}

/**
 * Mobile mirror of `apps/web/app/lib/hooks/useMetraTripLiveStatus.ts`. See
 * the web file for behavior; mobile inherits AppState-aware pausing from
 * `useMetraFeed`.
 */
export function useMetraTripLiveStatus(
  trip: MetraTripDetail | null | undefined,
  enabled: boolean = true,
): MetraTripLiveStatus | null {
  const [realtime, setRealtime] = useState<RealtimeState | null>(null)
  const [stopped, setStopped] = useState(false)
  const [nowMs, setNowMs] = useState<number>(() => Date.now())

  const emptyCountRef = useRef<number>(0)
  const lastProcessedFetchRef = useRef<number | null>(null)

  const tripUpdatesFeed = useMetraFeed('tripupdates', {
    intervalMs: POLL_INTERVAL_MS,
    enabled: enabled && !!trip && !stopped,
  })
  const positionsFeed = useMetraFeed('positions', {
    intervalMs: POLL_INTERVAL_MS,
    enabled: enabled && !!trip && !stopped,
  })

  const error = tripUpdatesFeed.error ?? positionsFeed.error

  useEffect(() => {
    if (!enabled || !trip) return
    const id = setInterval(() => setNowMs(Date.now()), POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [enabled, trip])

  useEffect(() => {
    if (!trip || !trip.stops?.length) return
    const latestFetchedAt = Math.max(tripUpdatesFeed.fetchedAt ?? 0, positionsFeed.fetchedAt ?? 0)
    if (latestFetchedAt === 0) return
    if (lastProcessedFetchRef.current === latestFetchedAt) return
    lastProcessedFetchRef.current = latestFetchedAt

    const tu = filterFeedForTrip(tripUpdatesFeed.data, trip.lineSlug, trip.trainNumber)
    const vp = filterFeedForTrip(positionsFeed.data, trip.lineSlug, trip.trainNumber)
    const tripUpdate = tu.tripUpdate
    const vehiclePosition = vp.vehiclePosition

    if (tripUpdate || vehiclePosition) {
      emptyCountRef.current = 0
    } else {
      emptyCountRef.current += 1
    }

    const nowMinutes = minutesSinceMidnight(new Date())
    const scheduledEndPast = isTripScheduledEndPast(trip.stops, nowMinutes)
    const isStopped = isTripCompleted({
      tripUpdate,
      vehiclePosition,
      emptyCount: emptyCountRef.current,
      emptyThreshold: COMPLETION_EMPTY_THRESHOLD,
      scheduledEndPast,
    })

    setRealtime({
      tripUpdate,
      vehiclePosition,
      fetchedAt: latestFetchedAt,
      stopped: isStopped,
    })
    if (isStopped) setStopped(true)
  }, [
    trip,
    tripUpdatesFeed.fetchedAt,
    positionsFeed.fetchedAt,
    tripUpdatesFeed.data,
    positionsFeed.data,
  ])

  const derivation = useMemo(
    () => (trip?.stops?.length ? deriveStopState(trip.stops, realtime) : null),
    [trip, realtime],
  )

  if (!trip) return null

  const {
    stops: derivedStops,
    tripDelayMinutes,
    phase,
  } = derivation ?? {
    stops: [],
    tripDelayMinutes: null,
    phase: 'nodata' as TripPhase,
  }
  const stops = trip.stops ?? []
  const firstStop = stops[0]
  const lastStop = stops[stops.length - 1]
  const status =
    realtime != null && firstStop
      ? computeHeroStatus(phase, tripDelayMinutes, firstStop, minutesSinceMidnight(new Date()))
      : null
  const currentDerived = derivedStops.find((d) => d.status === 'current')

  return {
    phase,
    status,
    currentDerived,
    derivedStops,
    firstStop,
    lastStop,
    vehiclePosition: realtime?.vehiclePosition ?? null,
    error,
    nowMs,
    fetchedAt: realtime?.fetchedAt ?? 0,
    isNoData: realtime == null || phase === 'nodata',
  }
}
