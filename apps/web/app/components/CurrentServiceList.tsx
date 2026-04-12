import Link from 'next/link'
import { TONE_CLASSES, type StatusTone } from '@lib/metra-status'

export interface CurrentServiceTrain {
  trainNumber: string
  href: string
  destination: string
  nextStop: string | null
  nextStopEta: string | null
  statusLabel: string
  statusTone: StatusTone
}

export interface CurrentServiceListProps {
  trains: CurrentServiceTrain[]
  lineColor: string
  loading?: boolean
  error?: string | null
  emptyMessage?: string
}

export default function CurrentServiceList({
  trains,
  lineColor,
  loading = false,
  error = null,
  emptyMessage = 'No trains currently running.',
}: CurrentServiceListProps) {
  return (
    <div
      className="mb-8 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900"
      style={{ borderLeftWidth: '4px', borderLeftColor: lineColor }}
      data-testid="current-service-list"
    >
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-800">
        <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase dark:text-gray-500">
          Current service
        </p>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-white/50">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" aria-hidden="true" />
          Live
        </div>
      </div>

      {error && <p className="px-5 py-3 text-xs text-red-500">Live feed error: {error}</p>}

      {loading && trains.length === 0 && (
        <div className="divide-y divide-gray-50 dark:divide-gray-800">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3" aria-hidden="true">
              <div className="h-4 w-16 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
              <div className="h-4 flex-1 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
              <div className="h-5 w-20 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
            </div>
          ))}
        </div>
      )}

      {!loading && trains.length === 0 && !error && (
        <p className="px-5 py-4 text-sm text-gray-500 dark:text-white/60">{emptyMessage}</p>
      )}

      {trains.length > 0 && (
        <ul className="divide-y divide-gray-50 dark:divide-gray-800">
          {trains.map((train) => {
            const tone = TONE_CLASSES[train.statusTone]
            return (
              <li key={train.trainNumber}>
                <Link
                  href={train.href}
                  className="flex flex-col gap-2 px-5 py-3 transition-colors hover:bg-gray-50 sm:flex-row sm:items-center sm:gap-4 dark:hover:bg-white/5"
                  data-testid={`current-service-row-${train.trainNumber}`}
                >
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-semibold tracking-wide text-gray-400 uppercase dark:text-gray-500">
                      #{train.trainNumber}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                      <span className="sr-only">To </span>
                      {train.destination}
                    </p>
                    {train.nextStop && (
                      <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-white/60">
                        Next: {train.nextStop}
                        {train.nextStopEta && (
                          <>
                            <span aria-hidden="true"> · </span>
                            <span className="tabular-nums">{train.nextStopEta}</span>
                          </>
                        )}
                      </p>
                    )}
                  </div>

                  <span
                    className={`inline-flex shrink-0 items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-xs font-semibold sm:self-center ${tone.pill}`}
                    data-tone={train.statusTone}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} aria-hidden="true" />
                    {train.statusLabel}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
