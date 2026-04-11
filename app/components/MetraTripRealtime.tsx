'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { fetchMetraFeed } from '@lib/metra-realtime'
import { extractMetraTrainNumber, routeIdToLineSlug } from '@lib/metra-trip-matching'
import { LINE_COLORS } from './StationDetail'

export interface TripStop {
  sequence: number
  stationName: string
  slug: string | null
  arrival: string
  departure: string
}

export interface TripDetail {
  tripId: string
  trainNumber: string
  headsign: string
  line: string
  lineSlug: string
  lineName: string
  serviceType: 'weekday' | 'saturday' | 'sunday'
  directionId: number
  stops: TripStop[]
}

type FeedData = Awaited<ReturnType<typeof fetchMetraFeed>>
type FeedEntity = FeedData['entity'][number]

interface RealtimeState {
  tripUpdate: NonNullable<FeedEntity['tripUpdate']> | null
  vehiclePosition: NonNullable<FeedEntity['vehicle']> | null
  fetchedAt: number
  stopped: boolean
}

type StopStatus = 'past' | 'current' | 'upcoming'

interface DerivedStop {
  stop: TripStop
  status: StopStatus
  delayMinutes: number | null
  skipped: boolean
  etaEpoch: number | null
}

type TripPhase = 'scheduled' | 'active' | 'completed' | 'nodata'

type StatusTone = 'ontime' | 'delayed' | 'early' | 'completed' | 'scheduled' | 'nodata'

interface HeroStatus {
  label: string
  tone: StatusTone
}

const POLL_INTERVAL_MS = 30_000
const MAX_POLLING_DURATION_MS = 4 * 60 * 60 * 1000
const COMPLETION_EMPTY_THRESHOLD = 2

function longToNumber(v: number | { toNumber(): number } | null | undefined): number | null {
  if (v == null) return null
  if (typeof v === 'number') return v
  if (typeof v.toNumber === 'function') return v.toNumber()
  return null
}

function parseDisplayTimeToMinutes(display: string): number | null {
  const match = display.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!match) return null
  let hour = parseInt(match[1], 10)
  const minute = parseInt(match[2], 10)
  const period = match[3].toUpperCase()
  if (period === 'PM' && hour !== 12) hour += 12
  if (period === 'AM' && hour === 12) hour = 0
  return hour * 60 + minute
}

function minutesSinceMidnight(d: Date): number {
  return d.getHours() * 60 + d.getMinutes()
}

// Metra TripDescriptor.startDate is "YYYYMMDD" and our stop.arrival strings are
// "H:MM AM/PM" (time-of-day only). Combine them into an epoch-seconds timestamp
// for the scheduled arrival, so we can compare against STU.arrival.time.
function computeScheduledEpoch(startDate: string | null, displayTime: string): number | null {
  if (!startDate || startDate.length !== 8) return null
  const year = parseInt(startDate.slice(0, 4), 10)
  const month = parseInt(startDate.slice(4, 6), 10) - 1
  const day = parseInt(startDate.slice(6, 8), 10)
  const tod = parseDisplayTimeToMinutes(displayTime)
  if (tod == null || Number.isNaN(year)) return null
  const d = new Date(year, month, day, Math.floor(tod / 60), tod % 60, 0, 0)
  return Math.floor(d.getTime() / 1000)
}

function formatClockTime(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function matchEntityToTrip(
  entity: FeedEntity,
  targetLineSlug: string,
  targetTrainNumber: string,
): boolean {
  const trip = entity.tripUpdate?.trip ?? entity.vehicle?.trip
  if (!trip) return false
  const entityLineSlug = routeIdToLineSlug(trip.routeId ?? null)
  if (entityLineSlug !== targetLineSlug) return false
  const tripId = trip.tripId
  if (!tripId) return false
  return extractMetraTrainNumber(tripId) === targetTrainNumber
}

function filterFeedForTrip(
  feed: FeedData | null,
  lineSlug: string,
  trainNumber: string,
): {
  tripUpdate: NonNullable<FeedEntity['tripUpdate']> | null
  vehiclePosition: NonNullable<FeedEntity['vehicle']> | null
} {
  if (!feed?.entity) return { tripUpdate: null, vehiclePosition: null }
  let tripUpdate: NonNullable<FeedEntity['tripUpdate']> | null = null
  let vehiclePosition: NonNullable<FeedEntity['vehicle']> | null = null
  for (const entity of feed.entity) {
    if (!matchEntityToTrip(entity, lineSlug, trainNumber)) continue
    if (entity.tripUpdate && !tripUpdate) tripUpdate = entity.tripUpdate
    if (entity.vehicle && !vehiclePosition) vehiclePosition = entity.vehicle
  }
  return { tripUpdate, vehiclePosition }
}

function deriveStopState(
  stops: TripStop[],
  realtime: RealtimeState | null,
): { stops: DerivedStop[]; tripDelayMinutes: number | null; phase: TripPhase } {
  const defaultStops = (): DerivedStop[] =>
    stops.map((stop) => ({
      stop,
      status: 'upcoming',
      delayMinutes: null,
      skipped: false,
      etaEpoch: null,
    }))

  if (!realtime || !realtime.tripUpdate) {
    return { stops: defaultStops(), tripDelayMinutes: null, phase: 'nodata' }
  }

  const stopTimeUpdates = realtime.tripUpdate.stopTimeUpdate ?? []
  const nonSkipped = stopTimeUpdates.filter((u) => u.scheduleRelationship !== 1)
  const sequences = nonSkipped
    .map((u) => (u.stopSequence != null ? Number(u.stopSequence) : null))
    .filter((s): s is number => s != null)
  const minUpcomingSeq = sequences.length > 0 ? Math.min(...sequences) : null

  // Metra only includes future stops in stopTimeUpdate. Empty STU list means
  // the train has completed its run.
  if (minUpcomingSeq == null) {
    return {
      stops: stops.map((stop) => ({
        stop,
        status: 'past',
        delayMinutes: null,
        skipped: false,
        etaEpoch: null,
      })),
      tripDelayMinutes: null,
      phase: 'completed',
    }
  }

  const startDate = realtime.tripUpdate.trip?.startDate ?? null

  const derived: DerivedStop[] = stops.map((stop) => {
    const stu = stopTimeUpdates.find((u) => Number(u.stopSequence) === stop.sequence)
    const skipped = stu?.scheduleRelationship === 1

    let status: StopStatus = 'upcoming'
    if (stop.sequence < minUpcomingSeq) {
      status = 'past'
    } else if (stop.sequence === minUpcomingSeq) {
      status = 'current'
    }

    let delayMinutes: number | null = null
    const stuTime = longToNumber(stu?.arrival?.time ?? stu?.departure?.time)
    if (stuTime != null) {
      const scheduled = computeScheduledEpoch(startDate, stop.arrival)
      if (scheduled != null) {
        const diffSec = stuTime - scheduled
        if (Math.abs(diffSec) <= 12 * 60 * 60) {
          delayMinutes = Math.round(diffSec / 60)
        }
      }
    }

    return { stop, status, delayMinutes, skipped, etaEpoch: stuTime }
  })

  // Trip-level delay: prefer the current stop's delay, fall back to the next
  // non-null upcoming delay.
  let tripDelayMinutes: number | null = null
  for (const d of derived) {
    if (d.status === 'past' || d.skipped) continue
    if (d.delayMinutes != null) {
      tripDelayMinutes = d.delayMinutes
      break
    }
  }

  return { stops: derived, tripDelayMinutes, phase: 'active' }
}

function isTripScheduledEndPast(stops: TripStop[], nowMinutes: number): boolean {
  const last = stops[stops.length - 1]
  if (!last) return false
  const lastMinutes = parseDisplayTimeToMinutes(last.arrival)
  if (lastMinutes == null) return false
  return lastMinutes + 15 < nowMinutes
}

const TONE_CLASSES: Record<StatusTone, { text: string; dot: string }> = {
  ontime: {
    text: 'text-green-600 dark:text-green-400',
    dot: 'bg-green-500',
  },
  delayed: {
    text: 'text-red-600 dark:text-red-400',
    dot: 'bg-red-500',
  },
  early: {
    text: 'text-green-600 dark:text-green-400',
    dot: 'bg-green-500',
  },
  completed: {
    text: 'text-gray-700 dark:text-gray-300',
    dot: 'bg-gray-400',
  },
  scheduled: {
    text: 'text-blue-600 dark:text-blue-400',
    dot: 'bg-blue-500',
  },
  nodata: {
    text: 'text-gray-500 dark:text-gray-400',
    dot: 'bg-gray-400',
  },
}

function computeHeroStatus(
  phase: TripPhase,
  tripDelayMinutes: number | null,
  firstStop: TripStop | undefined,
  nowMinutes: number,
): HeroStatus | null {
  if (phase === 'completed') return { label: 'Completed', tone: 'completed' }
  if (phase === 'nodata') {
    const firstStopMin = parseDisplayTimeToMinutes(firstStop?.arrival ?? '')
    if (firstStopMin != null && firstStopMin > nowMinutes) {
      return { label: 'Scheduled', tone: 'scheduled' }
    }
    // No live data and not a future-scheduled trip — hide the hero card entirely.
    return null
  }
  if (phase === 'active') {
    if (tripDelayMinutes == null || tripDelayMinutes === 0) {
      return { label: 'On time', tone: 'ontime' }
    }
    if (tripDelayMinutes > 0) {
      return { label: `Delayed ${tripDelayMinutes} min`, tone: 'delayed' }
    }
    return { label: `${Math.abs(tripDelayMinutes)} min early`, tone: 'early' }
  }
  return null
}

function HeroStatusCard({
  status,
  phase,
  currentDerived,
  firstStop,
  lastStop,
  vehiclePosition,
  lineColor,
  error,
  nowMs,
}: {
  status: HeroStatus
  phase: TripPhase
  currentDerived: DerivedStop | undefined
  firstStop: TripStop | undefined
  lastStop: TripStop | undefined
  vehiclePosition: NonNullable<FeedEntity['vehicle']> | null
  lineColor: string
  error: string | null
  nowMs: number
}) {
  const toneClass = TONE_CLASSES[status.tone]

  // Build the right-panel content based on phase.
  let rightTitle: string | null = null
  let rightStation: string | null = null
  let rightTime: string | null = null
  let rightSubtext: string | null = null

  if (phase === 'active' && currentDerived) {
    rightTitle = 'Next stop'
    rightStation = currentDerived.stop.stationName
    if (currentDerived.etaEpoch != null) {
      const eta = new Date(currentDerived.etaEpoch * 1000)
      rightTime = formatClockTime(eta)
      const diffMin = Math.round((eta.getTime() - nowMs) / 60_000)
      if (diffMin > 0) rightSubtext = `in ${diffMin} min`
      else if (diffMin === 0) rightSubtext = 'arriving now'
      else rightSubtext = 'arriving'
    } else if (currentDerived.stop.arrival) {
      rightTime = currentDerived.stop.arrival
    }
  } else if (phase === 'scheduled' && firstStop) {
    rightTitle = 'Departs'
    rightStation = firstStop.stationName
    rightTime = firstStop.departure || firstStop.arrival
  } else if (phase === 'completed' && lastStop) {
    rightTitle = 'Arrived'
    rightStation = lastStop.stationName
    rightTime = lastStop.arrival
  }

  const timestampSec = vehiclePosition ? longToNumber(vehiclePosition.timestamp) : null
  const lastReported =
    timestampSec != null ? `Last reported ${formatClockTime(new Date(timestampSec * 1000))}` : null

  const hasRightPanel = rightTitle != null && rightStation != null

  return (
    <div
      className="mb-4 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900"
      style={{ borderLeftWidth: '4px', borderLeftColor: lineColor }}
    >
      <div className="flex flex-col divide-y divide-gray-100 md:flex-row md:divide-x md:divide-y-0 dark:divide-gray-800">
        {/* Left panel: status */}
        <div className="flex-1 px-5 py-4">
          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase dark:text-gray-500">
            Live status
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${toneClass.dot}`} />
            <p className={`text-2xl font-bold ${toneClass.text}`}>{status.label}</p>
          </div>
          {lastReported && (
            <p className="mt-1 text-xs text-gray-500 dark:text-white/50">{lastReported}</p>
          )}
          {error && <p className="mt-1 text-xs text-red-500">Live feed error: {error}</p>}
        </div>

        {/* Right panel: next stop / departs / arrived */}
        {hasRightPanel && (
          <div className="flex-1 px-5 py-4">
            <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase dark:text-gray-500">
              {rightTitle}
            </p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{rightStation}</p>
            <div className="mt-1 flex items-baseline gap-2 text-sm">
              {rightTime && (
                <span className="font-semibold text-gray-700 tabular-nums dark:text-white/80">
                  {rightTime}
                </span>
              )}
              {rightSubtext && (
                <span className="text-gray-500 dark:text-white/50">{rightSubtext}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function MetraTripRealtime({
  trip,
  lineSlug,
}: {
  trip: TripDetail
  lineSlug: string
}) {
  const [realtime, setRealtime] = useState<RealtimeState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [nowMs, setNowMs] = useState<number>(() => Date.now())

  const mountTimeRef = useRef<number | null>(null)
  const emptyCountRef = useRef<number>(0)
  const stoppedRef = useRef<boolean>(false)

  const load = useCallback(async () => {
    try {
      const [tripUpdates, positions] = await Promise.all([
        fetchMetraFeed('tripupdates'),
        fetchMetraFeed('positions'),
      ])
      const tu = filterFeedForTrip(tripUpdates, lineSlug, trip.trainNumber)
      const vp = filterFeedForTrip(positions, lineSlug, trip.trainNumber)
      const tripUpdate = tu.tripUpdate
      const vehiclePosition = vp.vehiclePosition

      const hasAny = Boolean(tripUpdate || vehiclePosition)
      if (hasAny) {
        emptyCountRef.current = 0
      } else {
        emptyCountRef.current += 1
      }

      const nowMinutes = minutesSinceMidnight(new Date())
      const scheduledEndPast = isTripScheduledEndPast(trip.stops, nowMinutes)

      // Completion: either the tripUpdate exists but has no upcoming stops,
      // or we've had COMPLETION_EMPTY_THRESHOLD consecutive empty fetches and
      // the scheduled end is > 15 min in the past.
      const nonSkipped =
        tripUpdate?.stopTimeUpdate?.filter((u) => u.scheduleRelationship !== 1) ?? []
      const completedByStu = Boolean(tripUpdate) && nonSkipped.length === 0
      const completedByEmpty =
        emptyCountRef.current >= COMPLETION_EMPTY_THRESHOLD && scheduledEndPast
      const stopped = completedByStu || completedByEmpty
      if (stopped) stoppedRef.current = true

      setRealtime({
        tripUpdate,
        vehiclePosition,
        fetchedAt: Date.now(),
        stopped,
      })
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }, [lineSlug, trip.trainNumber, trip.stops])

  // Keep a state-backed "now" so subtext like "in 3 min" stays fresh.
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    let active = true
    mountTimeRef.current = Date.now()

    const tick = () => {
      if (!active) return
      if (stoppedRef.current) return
      const mountedAt = mountTimeRef.current ?? Date.now()
      if (Date.now() - mountedAt > MAX_POLLING_DURATION_MS) {
        stoppedRef.current = true
        setRealtime((prev) => (prev ? { ...prev, stopped: true } : prev))
        return
      }
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      load()
    }

    tick()
    const interval = setInterval(tick, POLL_INTERVAL_MS)

    const onVisibility = () => {
      if (document.visibilityState === 'visible') tick()
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility)
    }

    return () => {
      active = false
      clearInterval(interval)
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility)
      }
    }
  }, [load])

  const derivation = useMemo(() => deriveStopState(trip.stops, realtime), [trip.stops, realtime])

  const { stops: derivedStops, tripDelayMinutes, phase } = derivation
  const lineColor = LINE_COLORS[trip.line]?.bg ?? '#6b7280'

  const hasFetched = realtime !== null
  const isStopped = realtime?.stopped ?? false

  const heroStatus = hasFetched
    ? computeHeroStatus(phase, tripDelayMinutes, trip.stops[0], minutesSinceMidnight(new Date()))
    : null
  const currentDerived = derivedStops.find((d) => d.status === 'current')

  return (
    <>
      {heroStatus && (
        <HeroStatusCard
          status={heroStatus}
          phase={phase}
          currentDerived={currentDerived}
          firstStop={trip.stops[0]}
          lastStop={trip.stops[trip.stops.length - 1]}
          vehiclePosition={realtime?.vehiclePosition ?? null}
          lineColor={lineColor}
          error={error}
          nowMs={nowMs}
        />
      )}

      {/* Stop sequence table */}
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="border-b border-gray-100 px-5 py-3 dark:border-gray-800">
          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase dark:text-gray-500">
            Stop Schedule — {trip.stops.length} stops
          </p>
        </div>
        <div className="divide-y divide-gray-50 dark:divide-gray-800">
          {derivedStops.map(({ stop, status, delayMinutes, skipped }) => {
            const rowStyle: React.CSSProperties = {}
            let rowClass = 'flex items-center gap-4 px-5 py-3 border-l-4 border-transparent'
            if (status === 'past') rowClass += ' opacity-60'
            if (skipped) rowClass += ' opacity-60'
            if (status === 'current') {
              rowStyle.borderLeftColor = lineColor
              rowStyle.backgroundColor = `${lineColor}14`
            }

            let pill: { label: string; className: string } | null = null
            if (skipped) {
              pill = {
                label: 'Skipped',
                className: 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
              }
            } else if (status === 'current') {
              pill = {
                label: 'Next stop',
                className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
              }
            }

            const nameClass =
              'flex-1 text-sm font-medium text-gray-900 dark:text-white' +
              (skipped ? ' line-through' : '')

            return (
              <div
                key={stop.sequence}
                className={rowClass}
                style={rowStyle}
                data-stop-sequence={stop.sequence}
                data-stop-status={status}
              >
                <span className="w-6 shrink-0 text-center text-xs font-medium text-gray-400 dark:text-gray-500">
                  {stop.sequence}
                </span>

                <span className={nameClass}>
                  {stop.slug ? (
                    <Link
                      href={`/metra/${lineSlug}/${stop.slug}`}
                      className="transition-colors hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      {stop.stationName}
                    </Link>
                  ) : (
                    stop.stationName
                  )}
                </span>

                {pill && (
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${pill.className}`}
                  >
                    {pill.label}
                  </span>
                )}

                <div className="flex shrink-0 items-center gap-6">
                  {stop.arrival !== stop.departure ? (
                    <>
                      <div className="text-right">
                        <p className="text-xs text-gray-400 dark:text-gray-500">Arr</p>
                        <p className="flex items-center justify-end gap-1 text-sm font-medium text-gray-900 tabular-nums dark:text-white">
                          {stop.arrival}
                          {delayMinutes != null && delayMinutes > 0 && !skipped && (
                            <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">
                              +{delayMinutes} min
                            </span>
                          )}
                          {delayMinutes != null && delayMinutes < 0 && !skipped && (
                            <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              {delayMinutes} min
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400 dark:text-gray-500">Dep</p>
                        <p className="text-sm font-medium text-gray-900 tabular-nums dark:text-white">
                          {stop.departure}
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="text-right">
                      <p className="text-xs text-gray-400 dark:text-gray-500">Time</p>
                      <p className="flex items-center justify-end gap-1 text-sm font-medium text-gray-900 tabular-nums dark:text-white">
                        {stop.departure}
                        {delayMinutes != null && delayMinutes > 0 && !skipped && (
                          <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            +{delayMinutes} min
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer: last-updated / refresh */}
      {isStopped && realtime && (
        <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-white/50">
          <span>Last updated {formatClockTime(new Date(realtime.fetchedAt))}</span>
          <button
            onClick={() => {
              stoppedRef.current = false
              emptyCountRef.current = 0
              load()
            }}
            className="rounded-full border border-gray-200 px-3 py-1 font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5"
          >
            Refresh
          </button>
        </div>
      )}
    </>
  )
}
