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

const TAB_LABELS: Record<ServiceType, string> = {
  weekday: 'Weekday',
  saturday: 'Saturday',
  sunday: 'Sunday',
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

  useEffect(() => {
    fetch(`/data/metra-station-trips/${slug}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => setData(null))
  }, [slug])

  if (!data) return null

  const trips = data[serviceType]

  return (
    <div className="mt-8">
      {/* Header + tabs */}
      <div className="mb-4 flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          Timetable
        </h2>
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-xs font-medium">
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

      {trips.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">No {TAB_LABELS[serviceType].toLowerCase()} service at this station.</p>
      ) : (
        <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {trips.map((trip) => (
              <Link
                key={`${trip.tripId}-${trip.departure}`}
                href={`/metra/${trip.lineSlug}/train/${trip.tripId}`}
                className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
              >
                {/* Departure time */}
                <span className="w-20 shrink-0 text-sm font-semibold tabular-nums text-gray-900 dark:text-white">
                  {trip.departure}
                </span>

                {/* Destination */}
                <span className="flex-1 text-sm text-gray-600 dark:text-gray-400 truncate">
                  To {trip.headsign}
                </span>

                {/* Train number */}
                <span className="shrink-0 text-xs font-medium text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                  Train {trip.trainNumber}
                </span>

                {/* Arrow */}
                <span className="shrink-0 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors">
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
