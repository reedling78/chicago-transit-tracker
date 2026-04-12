'use client'

import { useEffect, useState } from 'react'
import type { PaceDirection } from '@lib/pace-types'

type ServiceType = 'weekday' | 'saturday' | 'sunday'

interface DirectionSchedule {
  weekday: number[]
  saturday: number[]
  sunday: number[]
}

interface ScheduleDoc {
  routes: Record<string, { directions: Record<string, DirectionSchedule> }>
}

interface Props {
  stopSlug: string
  routeSlug: string
  directions: PaceDirection[]
  initialServiceType?: ServiceType
}

function minutesToDisplay(minutes: number): string {
  const h24 = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  const period = h24 < 12 ? 'AM' : 'PM'
  const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`
}

export default function PaceScheduleTable({
  stopSlug,
  routeSlug,
  directions,
  initialServiceType = 'weekday',
}: Props) {
  const [data, setData] = useState<ScheduleDoc | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [serviceType, setServiceType] = useState<ServiceType>(initialServiceType)
  const [activeDir, setActiveDir] = useState(directions[0]?.id ?? '0')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/pace/schedules/${stopSlug}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((json: ScheduleDoc) => {
        if (!cancelled) {
          setData(json)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Unable to load schedule.')
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [stopSlug])

  if (loading) return <p className="text-sm text-gray-500">Loading schedule…</p>
  if (error) return <p className="text-sm text-red-500">Unable to load schedule.</p>

  const routeDoc = data?.routes?.[routeSlug]
  const dirDoc = routeDoc?.directions?.[activeDir]
  const times: number[] = dirDoc?.[serviceType] ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2" role="tablist" aria-label="Service type">
        {(['weekday', 'saturday', 'sunday'] as const).map((type) => (
          <button
            key={type}
            role="tab"
            aria-selected={serviceType === type}
            onClick={() => setServiceType(type)}
            className={`rounded-full px-4 py-1 text-xs font-semibold ${
              serviceType === type
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
            }`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {directions.length > 1 && (
        <div className="flex gap-2" role="tablist" aria-label="Direction">
          {directions.map((d) => (
            <button
              key={d.id}
              role="tab"
              aria-selected={activeDir === d.id}
              onClick={() => setActiveDir(d.id)}
              className={`rounded-full px-4 py-1 text-xs font-semibold ${
                activeDir === d.id
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
              }`}
            >
              {d.name}
            </button>
          ))}
        </div>
      )}

      {times.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No scheduled service for this day.
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {times.map((t, i) => (
            <li
              key={`${t}-${i}`}
              className="rounded-lg bg-gray-100 px-3 py-2 text-center text-sm font-medium text-gray-900 dark:bg-gray-800 dark:text-white"
            >
              {minutesToDisplay(t)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
