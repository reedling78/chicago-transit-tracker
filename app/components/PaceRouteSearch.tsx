'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { PaceRoute } from '@lib/pace-types'
import PaceRouteChip from './PaceRouteChip'

interface Props {
  routes: PaceRoute[]
}

export default function PaceRouteSearch({ routes }: Props) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return routes.filter((r) => {
      const short = r.shortName.toLowerCase()
      const long = r.longName.toLowerCase()
      return short.startsWith(q) || long.includes(q)
    })
  }, [routes, query])

  return (
    <div className="mb-8">
      <label htmlFor="pace-route-search" className="sr-only">
        Search Pace routes
      </label>
      <input
        id="pace-route-search"
        type="search"
        placeholder="Search by route number or street name…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
      />

      {query.trim() && (
        <div className="mt-4">
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No routes match your search.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {filtered.map((r) => (
                <li key={r.slug}>
                  <Link
                    href={`/pace/${r.slug}`}
                    className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 transition hover:border-gray-300 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900"
                  >
                    <PaceRouteChip
                      shortName={r.shortName}
                      color={r.color}
                      textColor={r.textColor}
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {r.longName}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
