import Link from 'next/link'
import type { Station } from '../lib/types'
import { LINE_COLORS } from './StationDetail'

interface StationListProps {
  stations: Station[]
  lineColor: string
  stationHrefPrefix: string
  /** Short name of the current line — excluded from transfer chips */
  currentLine: string
}

function WheelchairIcon() {
  return (
    <svg
      aria-label="ADA Accessible"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="inline-block h-3.5 w-3.5 shrink-0 text-blue-500"
    >
      <circle cx="12" cy="4" r="2" />
      <path d="M10 7.5a2 2 0 0 0-2 2V14l-2.5 4.5A1 1 0 0 0 6.4 20h.2a1 1 0 0 0 .88-.52L10 15h2v4a1 1 0 0 0 2 0v-4.5A1.5 1.5 0 0 0 12.5 13H11V9.5H14a1 1 0 0 0 0-2h-4z" />
    </svg>
  )
}

export default function StationList({
  stations,
  lineColor,
  stationHrefPrefix,
  currentLine,
}: StationListProps) {
  return (
    <div>
      <h2 className="mb-5 text-xl font-semibold text-gray-900 dark:text-white">
        Stations
        <span className="ml-2 text-base font-normal text-gray-400 dark:text-gray-500">
          ({stations.length})
        </span>
      </h2>

      <div className="relative">
        {/* Vertical timeline bar */}
        <div
          className="absolute top-3 bottom-3 left-[11px] w-[3px] rounded-full"
          style={{ backgroundColor: lineColor }}
        />

        {stations.map((station) => {
          const otherLines = station.lines.filter((l) => l !== currentLine)

          return (
            <div
              key={station.slug}
              className="relative flex items-start gap-4 border-b border-gray-100 py-4 last:border-0 dark:border-gray-800"
            >
              {/* Dot */}
              <div className="relative z-10 mt-1 flex h-6 w-6 shrink-0 items-center justify-center">
                <div
                  className={`rounded-full border-2 ${
                    station.terminal ? 'h-5 w-5' : 'h-3 w-3 bg-white dark:bg-gray-950'
                  }`}
                  style={{
                    borderColor: lineColor,
                    backgroundColor: station.terminal ? lineColor : undefined,
                  }}
                />
              </div>

              {/* Row content — entire row is a link */}
              <Link
                href={`${stationHrefPrefix}/${station.slug}`}
                className="group flex min-w-0 flex-1 items-start justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 font-semibold text-gray-900 group-hover:underline dark:text-white">
                    {station.name}
                    {station.accessibility.ada && <WheelchairIcon />}
                  </p>

                  {otherLines.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {otherLines.map((line) => {
                        const colors = LINE_COLORS[line]
                        return colors ? (
                          <span
                            key={line}
                            className="rounded px-2 py-0.5 text-xs font-semibold"
                            style={{ backgroundColor: colors.bg, color: colors.text }}
                          >
                            {line}
                          </span>
                        ) : (
                          <span
                            key={line}
                            className="rounded bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                          >
                            {line}
                          </span>
                        )
                      })}
                    </div>
                  )}
                </div>

                <span className="mt-0.5 shrink-0 text-gray-300 transition group-hover:text-gray-500 dark:text-gray-600 dark:group-hover:text-gray-400">
                  →
                </span>
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}
