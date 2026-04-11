'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useMetraFeed } from '@lib/hooks/useMetraFeed'
import {
  computeHeroStatus,
  deriveStopState,
  formatClockTime,
  isTripScheduledEndPast,
  minutesSinceMidnight,
  type RealtimeState,
  type TripStop,
} from '@lib/metra-status'
import { LINE_COLORS } from '@lib/constants'
import { filterFeedForTrip, isTripCompleted } from '@lib/metra-trip-realtime-helpers'
import MetraTripHeroStatusCard from './MetraTripHeroStatusCard'

export type { TripStop } from '@lib/metra-status'

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

const POLL_INTERVAL_MS = 30_000
const MAX_POLLING_DURATION_MS = 4 * 60 * 60 * 1000
const COMPLETION_EMPTY_THRESHOLD = 2

export default function MetraTripRealtime({
  trip,
  lineSlug,
}: {
  trip: TripDetail
  lineSlug: string
}) {
  const [realtime, setRealtime] = useState<RealtimeState | null>(null)
  const [stopped, setStopped] = useState(false)
  const [nowMs, setNowMs] = useState<number>(() => Date.now())

  const mountTimeRef = useRef<number | null>(null)
  const emptyCountRef = useRef<number>(0)
  const lastProcessedFetchRef = useRef<number | null>(null)

  const tripUpdatesFeed = useMetraFeed('tripupdates', {
    intervalMs: POLL_INTERVAL_MS,
    enabled: !stopped,
  })
  const positionsFeed = useMetraFeed('positions', {
    intervalMs: POLL_INTERVAL_MS,
    enabled: !stopped,
  })

  const error = tripUpdatesFeed.error ?? positionsFeed.error

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  // Enforce max polling duration: after the threshold, stop consuming
  // realtime feeds regardless of their state. Delayed state update driven
  // by wall-clock time, not by another piece of React state.
  /* eslint-disable react-hooks/set-state-in-effect -- time-based one-shot handoff */
  useEffect(() => {
    if (mountTimeRef.current == null) mountTimeRef.current = Date.now()
    const mountedAt = mountTimeRef.current
    const remaining = MAX_POLLING_DURATION_MS - (Date.now() - mountedAt)
    if (remaining <= 0) {
      setStopped(true)
      setRealtime((prev) => (prev ? { ...prev, stopped: true } : prev))
      return
    }
    const id = setTimeout(() => {
      setStopped(true)
      setRealtime((prev) => (prev ? { ...prev, stopped: true } : prev))
    }, remaining)
    return () => clearTimeout(id)
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  // React to new fetches from the shared hook: filter to this trip, update
  // the derived realtime state, and decide whether we should stop polling
  // because the train has completed its run. `lastProcessedFetchRef`
  // guarantees one state update per distinct fetch event, so no cascades.
  useEffect(() => {
    const latestFetchedAt = Math.max(tripUpdatesFeed.fetchedAt ?? 0, positionsFeed.fetchedAt ?? 0)
    if (latestFetchedAt === 0) return
    if (lastProcessedFetchRef.current === latestFetchedAt) return
    lastProcessedFetchRef.current = latestFetchedAt

    const tu = filterFeedForTrip(tripUpdatesFeed.data, lineSlug, trip.trainNumber)
    const vp = filterFeedForTrip(positionsFeed.data, lineSlug, trip.trainNumber)
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
    tripUpdatesFeed.fetchedAt,
    positionsFeed.fetchedAt,
    tripUpdatesFeed.data,
    positionsFeed.data,
    lineSlug,
    trip.trainNumber,
    trip.stops,
  ])

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
        <MetraTripHeroStatusCard
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
              emptyCountRef.current = 0
              lastProcessedFetchRef.current = null
              mountTimeRef.current = Date.now()
              setStopped(false)
              setRealtime((prev) => (prev ? { ...prev, stopped: false } : prev))
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
