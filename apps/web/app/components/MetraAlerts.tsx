'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { fetchMetraAlerts } from '@lib/metra-realtime'
import type { NormalizedAlert } from '@lib/types'
import type { Line } from '@lib/types'
import { LINE_COLORS, METRA_LINE_NAMES } from '@lib/constants'

function AlertCard({ alert }: { alert: NormalizedAlert }) {
  const borderColor = alert.routes[0]?.color ?? '#6b7280'

  return (
    <div
      className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md dark:border-white/10 dark:bg-white/5"
      style={{ borderLeftWidth: '4px', borderLeftColor: borderColor }}
    >
      {/* Line badges */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {alert.routes.map((route) => (
          <span
            key={route.routeId}
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
            style={{
              backgroundColor: route.color,
              color: route.textColor,
            }}
          >
            {route.routeId}
          </span>
        ))}
        {alert.routes[0] && METRA_LINE_NAMES[alert.routes[0].routeId] && (
          <span className="text-xs text-gray-500 dark:text-white/50">
            {METRA_LINE_NAMES[alert.routes[0].routeId]}
          </span>
        )}
      </div>

      {/* Header */}
      {alert.headline && (
        <h4 className="mb-2 text-base font-semibold text-gray-900 dark:text-white">
          {alert.headline}
        </h4>
      )}

      {/* Description */}
      {alert.description && (
        <p className="mb-3 text-sm leading-relaxed text-gray-600 dark:text-white/60">
          {alert.description}
        </p>
      )}

      {/* Link */}
      {alert.url && (
        <a
          href={alert.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 transition-colors hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          More info
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
            />
          </svg>
        </a>
      )}
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="mb-3 flex gap-2">
        <div className="h-5 w-12 rounded-full bg-gray-200 dark:bg-white/10" />
        <div className="h-5 w-32 rounded bg-gray-200 dark:bg-white/10" />
      </div>
      <div className="mb-2 h-5 w-3/4 rounded bg-gray-200 dark:bg-white/10" />
      <div className="mb-1 h-4 w-full rounded bg-gray-100 dark:bg-white/5" />
      <div className="mb-1 h-4 w-full rounded bg-gray-100 dark:bg-white/5" />
      <div className="h-4 w-2/3 rounded bg-gray-100 dark:bg-white/5" />
    </div>
  )
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

export default function MetraAlerts({
  line,
  limit,
  hideChips,
}: {
  line?: Line
  limit?: number
  hideChips?: boolean
}) {
  const fixedRoute = line?.metraLineCode ?? null
  const [data, setData] = useState<NormalizedAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedLine, setSelectedLine] = useState<string>(fixedRoute ?? 'all')

  const load = async () => {
    try {
      const alerts = await fetchMetraAlerts(fixedRoute ?? undefined)
      setData(alerts)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true

    async function poll() {
      try {
        const alerts = await fetchMetraAlerts(fixedRoute ?? undefined)
        if (!active) return
        setData(alerts)
        setError(null)
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        if (active) setLoading(false)
      }
    }

    poll()
    const interval = setInterval(poll, 30_000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [fixedRoute])

  const activeRoutes = useMemo(() => {
    const set = new Set<string>()
    for (const alert of data) {
      for (const route of alert.routes) {
        set.add(route.routeId)
      }
    }
    return Array.from(set).sort()
  }, [data])

  const filteredAlerts =
    selectedLine === 'all'
      ? data
      : data.filter((a) => a.routes.some((r) => r.routeId === selectedLine))

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xs font-semibold tracking-widest text-gray-400 uppercase dark:text-gray-500">
          {!loading && !error ? `${filteredAlerts.length} Service Alerts` : 'Service Alerts'}
        </h2>
      </div>

      {/* Filter chips */}
      {!hideChips && activeRoutes.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedLine('all')}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
              selectedLine === 'all'
                ? 'bg-gray-900 text-white shadow-sm dark:bg-white dark:text-gray-900'
                : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10'
            }`}
          >
            All
          </button>
          {activeRoutes.map((routeId) => {
            const isSelected = selectedLine === routeId
            const colors = LINE_COLORS[routeId]
            return (
              <button
                key={routeId}
                onClick={() => setSelectedLine(routeId)}
                title={METRA_LINE_NAMES[routeId] ?? routeId}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                  isSelected
                    ? 'shadow-sm ring-2 ring-offset-1 dark:ring-offset-gray-950'
                    : 'hover:opacity-80'
                }`}
                style={
                  isSelected
                    ? {
                        backgroundColor: colors?.bg ?? '#6b7280',
                        color: colors?.text ?? '#fff',
                      }
                    : {
                        backgroundColor: hexToRgba(colors?.bg ?? '#6b7280', 0.1),
                        border: `1px solid ${hexToRgba(colors?.bg ?? '#6b7280', 0.25)}`,
                        color: colors?.bg ?? '#6b7280',
                      }
                }
              >
                {routeId}
              </button>
            )
          })}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900/30 dark:bg-red-950/20">
          <p className="mb-3 text-sm font-medium text-red-700 dark:text-red-400">
            Failed to load alerts: {error}
          </p>
          <button
            onClick={load}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty states */}
      {!loading && !error && filteredAlerts.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-12 dark:border-white/10 dark:bg-white/5">
          <svg
            className="mb-3 h-10 w-10 text-green-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {selectedLine === 'all' ? (
            <p className="text-sm text-gray-500 dark:text-white/50">No active service alerts</p>
          ) : (
            <>
              <p className="text-sm text-gray-500 dark:text-white/50">
                No alerts for {METRA_LINE_NAMES[selectedLine] ?? selectedLine}
              </p>
              {!fixedRoute && (
                <button
                  onClick={() => setSelectedLine('all')}
                  className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Show all alerts
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Alert cards */}
      {!loading && !error && filteredAlerts.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {(limit ? filteredAlerts.slice(0, limit) : filteredAlerts).map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
          {limit && filteredAlerts.length > limit && (
            <Link
              href="/metra/alerts"
              className="block rounded-xl border border-gray-200 bg-white py-3 text-center text-sm font-medium text-blue-600 transition-colors hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-blue-400 dark:hover:bg-white/10"
            >
              View all {filteredAlerts.length} alerts →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
