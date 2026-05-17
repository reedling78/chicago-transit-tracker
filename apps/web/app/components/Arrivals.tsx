'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { LINE_COLORS } from '@lib/constants'
import type { StationSchedule, StationTrips } from '@lib/gtfs-types'
import {
  computeArrivalGroups,
  formatMinutesAway as sharedFormatMinutesAway,
  indexMetraTripUpdates,
} from '@ctt/shared'
import { useMetraFeed } from '@lib/hooks/useMetraFeed'

interface ArrivalsProps {
  slug: string
  service: 'cta' | 'metra'
  hasSchedule: boolean
  /** Station GTFS `stop_id` — enables Metra realtime merge when present. */
  metraStopId?: string | null
}

export const formatMinutesAway = sharedFormatMinutesAway

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  const period = h < 12 ? 'AM' : 'PM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${period}`
}

function formatLastUpdated(epochMs: number): string {
  return new Date(epochMs).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function SkeletonRow({ color }: { color: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: color }}>
      <div>
        <div className="mb-1.5 h-3 w-28 rounded bg-white/30" />
        <div className="h-5 w-20 rounded bg-white/30" />
      </div>
      <div className="h-7 w-14 rounded bg-white/30" />
    </div>
  )
}

export default function Arrivals({ slug, service, hasSchedule, metraStopId }: ArrivalsProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [scheduleState, setScheduleState] = useState<StationSchedule | null>(null)
  const [tripsState, setTripsState] = useState<StationTrips | null>(null)
  const [tick, setTick] = useState(0)
  const isMetra = service === 'metra'

  // Subscribe to the Metra realtime trip-updates feed only for Metra stations
  // that have a GTFS stop id we can match against. The hook shares a single
  // module-level poll across every subscriber (station page + dashboard cards).
  const metraEnabled = isMetra && hasSchedule && !!metraStopId
  const { data: feedData, fetchedAt } = useMetraFeed('tripupdates', { enabled: metraEnabled })

  useEffect(() => {
    if (!hasSchedule) return

    const schedulePromise = fetch(`/api/schedules/${slug}`).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return r.json() as Promise<StationSchedule>
    })

    // For Metra stations, also fetch station-trips so we can link each row to
    // its train detail page (and match realtime by train number). A failure
    // here is non-fatal — we still render arrivals, just without links/realtime.
    const tripsPromise: Promise<StationTrips | null> = isMetra
      ? fetch(`/api/metra/station-trips/${slug}`)
          .then((r) => (r.ok ? (r.json() as Promise<StationTrips>) : null))
          .catch(() => null)
      : Promise.resolve(null)

    Promise.all([schedulePromise, tripsPromise])
      .then(([schedule, trips]) => {
        setScheduleState(schedule)
        setTripsState(trips)
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }, [slug, isMetra, hasSchedule])

  // Refresh countdowns every 60 seconds without re-fetching the schedule.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  const realtime = useMemo(
    () => (metraEnabled ? indexMetraTripUpdates(feedData) : null),
    [metraEnabled, feedData],
  )

  const groups = useMemo(() => {
    if (!scheduleState) return []
    return computeArrivalGroups({
      schedule: scheduleState,
      trips: tripsState,
      now: new Date(),
      service,
      realtime,
      metraStopId,
    })
    // `tick` drives the 60s refresh; feedData/realtime change drives live updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleState, tripsState, service, realtime, metraStopId, fetchedAt, tick])

  if (!hasSchedule) return null

  const hasLiveRow = groups.some((g) => g.items.some((i) => i.isLive || i.isCancelled))
  const skeletonColor = '#00a1de' // Blue Line as fallback

  return (
    <div className="mb-6 overflow-hidden rounded-xl border border-gray-100 shadow-sm dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center gap-2 bg-gray-700 px-4 py-2.5 dark:bg-gray-800">
        <svg viewBox="0 0 20 20" fill="white" className="h-4 w-4 shrink-0" aria-hidden="true">
          <path d="M5 3a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h1v2H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-1V9h1a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5Zm0 1.5h10a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.5.5H5a.5.5 0 0 1-.5-.5V5a.5.5 0 0 1 .5-.5ZM8 9h4v2H8V9Z" />
        </svg>
        <p className="text-sm text-white">
          Scheduled arrivals — estimates based on{' '}
          <span className="font-semibold">{isMetra ? 'Metra' : 'CTA'} timetable</span>
        </p>
        {hasLiveRow && (
          <span className="ml-auto flex items-center gap-1.5 rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-semibold text-green-300">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-400" />
            </span>
            Live
          </span>
        )}
      </div>

      {hasLiveRow && fetchedAt && (
        <div className="bg-gray-700/60 px-4 py-1.5 text-xs text-white/70 dark:bg-gray-800/60">
          Last updated: {formatLastUpdated(fetchedAt)}
        </div>
      )}

      {loading && (
        <div>
          <div className="bg-gray-600 px-4 py-2">
            <div className="h-4 w-40 rounded bg-white/20" />
          </div>
          <SkeletonRow color={skeletonColor} />
          <SkeletonRow color={skeletonColor} />
          <div className="mt-0.5 bg-gray-600 px-4 py-2">
            <div className="h-4 w-40 rounded bg-white/20" />
          </div>
          <SkeletonRow color={skeletonColor} />
          <SkeletonRow color={skeletonColor} />
        </div>
      )}

      {!loading && error && (
        <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Schedule data unavailable for this station.
        </div>
      )}

      {!loading && !error && groups.length === 0 && (
        <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
          No upcoming departures found.
        </div>
      )}

      {!loading &&
        !error &&
        groups.map((group) => {
          const colors = LINE_COLORS[group.line]
          const bg = colors?.bg ?? '#565a5c'

          return (
            <div key={group.headsign}>
              {/* Direction header */}
              <div className="bg-gray-600 px-4 py-2 dark:bg-gray-700">
                <p className="text-sm font-semibold text-white">Service toward {group.headsign}</p>
              </div>

              {/* Arrival rows */}
              {group.items.map((arrival, i) => {
                const rowContent = (
                  <>
                    <div>
                      <p className="text-xs text-white/80">
                        {group.line} Line · {formatTime(arrival.departureMinutes)} to
                      </p>
                      <p className="text-base leading-tight font-bold text-white">
                        {group.headsign}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {arrival.isCancelled ? (
                        <span className="rounded bg-red-500/20 px-2 py-0.5 text-sm font-bold text-red-200">
                          Cancelled
                        </span>
                      ) : (
                        <>
                          <span className="text-2xl font-bold text-white tabular-nums">
                            {formatMinutesAway(arrival.minutesAway)}
                          </span>
                          {arrival.isLive ? (
                            <span
                              className="relative flex h-2.5 w-2.5"
                              title="Live — based on Metra realtime data"
                            >
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70 opacity-75" />
                              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
                            </span>
                          ) : (
                            /* Approximate indicator — distinguishes schedule from live data */
                            <span className="text-lg text-white/60" title="Scheduled estimate">
                              ≈
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </>
                )

                const rowClass =
                  'flex items-center justify-between border-t border-black/10 px-4 py-3'

                if (arrival.tripId && arrival.lineSlug) {
                  return (
                    <Link
                      key={i}
                      href={`/metra/${arrival.lineSlug}/train/${arrival.tripId}`}
                      className={`${rowClass} transition-opacity hover:opacity-90`}
                      style={{ backgroundColor: bg }}
                    >
                      {rowContent}
                    </Link>
                  )
                }

                return (
                  <div key={i} className={rowClass} style={{ backgroundColor: bg }}>
                    {rowContent}
                  </div>
                )
              })}
            </div>
          )
        })}
    </div>
  )
}
