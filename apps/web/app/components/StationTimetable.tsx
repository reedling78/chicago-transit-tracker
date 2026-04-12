'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface StationTripEntry {
  tripId: string
  trainNumber: string
  headsign: string
  departure: string
  line: string
  lineSlug: string
  directionId: number
}

interface StationTripsData {
  weekday: StationTripEntry[]
  saturday: StationTripEntry[]
  sunday: StationTripEntry[]
}

type ServiceType = 'weekday' | 'saturday' | 'sunday'
type Direction = 'all' | 'inbound' | 'outbound'

const TAB_LABELS: Record<ServiceType, string> = {
  weekday: 'Weekday',
  saturday: 'Saturday',
  sunday: 'Sunday',
}

const DIR_LABELS: Record<Direction, string> = {
  all: 'All',
  inbound: 'Inbound',
  outbound: 'Outbound',
}

function todayServiceType(): ServiceType {
  const day = new Date().getDay()
  if (day === 6) return 'saturday'
  if (day === 0) return 'sunday'
  return 'weekday'
}

export default function StationTimetable({ slug }: { slug: string }) {
  const [data, setData] = useState<StationTripsData | null>(null)
  const [serviceType, setServiceType] = useState<ServiceType>(todayServiceType())
  const [direction, setDirection] = useState<Direction>('all')

  useEffect(() => {
    fetch(`/api/metra/station-trips/${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => setData(null))
  }, [slug])

  if (!data) return null

  const trips = data[serviceType].filter((t) => {
    if (direction === 'inbound') return t.directionId === 1
    if (direction === 'outbound') return t.directionId === 0
    return true
  })

  return (
    <div className="mt-8">
      {/* Header + filters */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xs font-semibold tracking-widest text-gray-400 uppercase dark:text-gray-500">
          Timetable
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {/* Direction filter */}
          <div className="flex overflow-hidden rounded-lg border border-gray-200 text-xs font-medium dark:border-gray-700">
            {(Object.keys(DIR_LABELS) as Direction[]).map((dir) => (
              <button
                key={dir}
                onClick={() => setDirection(dir)}
                className={`px-3 py-1.5 transition-colors ${
                  direction === dir
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                {DIR_LABELS[dir]}
              </button>
            ))}
          </div>

          {/* Day selector */}
          <div className="flex overflow-hidden rounded-lg border border-gray-200 text-xs font-medium dark:border-gray-700">
            {(Object.keys(TAB_LABELS) as ServiceType[]).map((type) => (
              <button
                key={type}
                onClick={() => setServiceType(type)}
                className={`px-3 py-1.5 transition-colors ${
                  serviceType === type
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                {TAB_LABELS[type]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {trips.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">
          No {TAB_LABELS[serviceType].toLowerCase()} service at this station.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {trips.map((trip) => (
              <Link
                key={`${trip.tripId}-${trip.departure}`}
                href={`/metra/${trip.lineSlug}/train/${trip.tripId}`}
                className="group flex items-center gap-4 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                {/* Departure time */}
                <span className="w-20 shrink-0 text-sm font-semibold text-gray-900 tabular-nums dark:text-white">
                  {trip.departure}
                </span>

                {/* Destination */}
                <span className="flex-1 truncate text-sm text-gray-600 dark:text-gray-400">
                  To {trip.headsign}
                </span>

                {/* Train number */}
                <span className="shrink-0 text-xs font-medium text-gray-400 transition-colors group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300">
                  Train {trip.trainNumber}
                </span>

                {/* Arrow */}
                <span className="shrink-0 text-gray-300 transition-colors group-hover:text-gray-500 dark:text-gray-600 dark:group-hover:text-gray-400">
                  →
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
