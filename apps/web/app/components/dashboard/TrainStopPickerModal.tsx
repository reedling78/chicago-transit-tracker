'use client'

import { useEffect, useMemo, useRef } from 'react'
import type { TripStop } from '@ctt/shared'

interface TrainStopPickerModalProps {
  /** What we're picking — origin must precede destination on the trip. */
  mode: 'origin' | 'destination'
  /** All stops on the trip in `sequence` order. */
  stops: TripStop[]
  /** Currently-effective origin (used to enforce the destination-after-origin rule). */
  originSequence: number
  /** Currently-effective destination (used for the origin-before-destination rule). */
  destinationSequence: number
  /** Slug of the currently-selected stop for `mode`. */
  currentSlug: string | null
  onSelect: (slug: string) => void
  onClose: () => void
}

export default function TrainStopPickerModal({
  mode,
  stops,
  originSequence,
  destinationSequence,
  currentSlug,
  onSelect,
  onClose,
}: TrainStopPickerModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const title = mode === 'origin' ? 'Set departure station' : 'Set destination station'

  const eligibleStops = useMemo(() => {
    return stops.filter((stop) => {
      if (mode === 'origin') return stop.sequence < destinationSequence
      return stop.sequence > originSequence
    })
  }, [stops, mode, originSequence, destinationSequence])

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-xl dark:bg-gray-900"
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          >
            ×
          </button>
        </div>
        <ul className="flex-1 overflow-y-auto py-1">
          {eligibleStops.length === 0 && (
            <li className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
              No eligible stops.
            </li>
          )}
          {eligibleStops.map((stop) => {
            const selected = stop.slug === currentSlug
            return (
              <li key={stop.sequence}>
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  onClick={() => {
                    if (stop.slug) onSelect(stop.slug)
                  }}
                  disabled={!stop.slug}
                  className={[
                    'flex w-full items-center justify-between px-5 py-3 text-left text-sm transition',
                    selected
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800',
                    !stop.slug ? 'cursor-not-allowed opacity-50' : '',
                  ].join(' ')}
                >
                  <span>{stop.stationName}</span>
                  <span className="text-xs text-gray-500 tabular-nums dark:text-gray-400">
                    {mode === 'origin' ? stop.departure : stop.arrival}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
