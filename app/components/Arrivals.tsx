'use client'

import { useEffect, useRef, useState } from 'react'
import { LINE_COLORS } from './StationDetail'

interface DirectionSchedule {
  headsign: string
  line: string
  weekday: number[]
  saturday: number[]
  sunday: number[]
}

interface StationSchedule {
  directions: DirectionSchedule[]
}

interface Arrival {
  headsign: string
  line: string
  departureMinutes: number // minutes since midnight
  minutesAway: number
}

interface ArrivalsProps {
  slug: string
  service: 'cta' | 'metra'
  hasSchedule: boolean
}

function getCurrentDayType(): 'weekday' | 'saturday' | 'sunday' {
  const day = new Date().getDay() // 0=Sun, 6=Sat
  if (day === 0) return 'sunday'
  if (day === 6) return 'saturday'
  return 'weekday'
}

function getCurrentMinutes(): number {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes()
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  const period = h < 12 ? 'AM' : 'PM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${period}`
}

function computeArrivals(schedule: StationSchedule): Arrival[] {
  const dayType = getCurrentDayType()
  const nowMinutes = getCurrentMinutes()
  const arrivals: Arrival[] = []

  for (const dir of schedule.directions) {
    const times = dir[dayType]
    // Also check early next-day departures stored as minutes > 1440
    const upcoming = times.filter((t) => t > nowMinutes).slice(0, 3)

    for (const t of upcoming) {
      arrivals.push({
        headsign: dir.headsign,
        line: dir.line,
        departureMinutes: t,
        minutesAway: t - nowMinutes,
      })
    }
  }

  // Sort by direction (group them), then by time within each direction
  arrivals.sort((a, b) => {
    if (a.headsign !== b.headsign) return a.headsign.localeCompare(b.headsign)
    return a.minutesAway - b.minutesAway
  })

  return arrivals
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

export default function Arrivals({ slug, service, hasSchedule }: ArrivalsProps) {
  const [arrivals, setArrivals] = useState<Arrival[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const scheduleRef = useRef<StationSchedule | null>(null)

  useEffect(() => {
    if (!hasSchedule) return
    fetch(`/api/schedules/${slug}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<StationSchedule>
      })
      .then((data) => {
        scheduleRef.current = data
        setArrivals(computeArrivals(data))
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }, [slug, service, hasSchedule])

  // Recompute arrivals every 60 seconds without re-fetching
  useEffect(() => {
    const id = setInterval(() => {
      if (scheduleRef.current) {
        setArrivals(computeArrivals(scheduleRef.current))
      }
    }, 60_000)
    return () => clearInterval(id)
  }, [])

  if (!hasSchedule) return null

  // Group arrivals by headsign for section headers
  const grouped: { headsign: string; line: string; rows: Arrival[] }[] = []
  for (const arrival of arrivals) {
    const last = grouped[grouped.length - 1]
    if (last && last.headsign === arrival.headsign) {
      last.rows.push(arrival)
    } else {
      grouped.push({ headsign: arrival.headsign, line: arrival.line, rows: [arrival] })
    }
  }

  // Pick a representative color for skeleton state
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
          <span className="font-semibold">CTA timetable</span>
        </p>
      </div>

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

      {!loading && !error && arrivals.length === 0 && (
        <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
          No upcoming departures found.
        </div>
      )}

      {!loading &&
        !error &&
        grouped.map((group) => {
          const colors = LINE_COLORS[group.line]
          const bg = colors?.bg ?? '#565a5c'

          return (
            <div key={group.headsign}>
              {/* Direction header */}
              <div className="bg-gray-600 px-4 py-2 dark:bg-gray-700">
                <p className="text-sm font-semibold text-white">Service toward {group.headsign}</p>
              </div>

              {/* Arrival rows */}
              {group.rows.map((arrival, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between border-t border-black/10 px-4 py-3"
                  style={{ backgroundColor: bg }}
                >
                  <div>
                    <p className="text-xs text-white/80">
                      {arrival.line} Line · {formatTime(arrival.departureMinutes)} to
                    </p>
                    <p className="text-base leading-tight font-bold text-white">
                      {arrival.headsign}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-2xl font-bold text-white tabular-nums">
                      {arrival.minutesAway < 1
                        ? 'Due'
                        : arrival.minutesAway > 120
                          ? formatTime(arrival.departureMinutes)
                          : `${arrival.minutesAway} min`}
                    </span>
                    {/* Approximate indicator — distinguishes schedule from live data */}
                    <span className="text-lg text-white/60" title="Scheduled estimate">
                      ≈
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )
        })}
    </div>
  )
}
